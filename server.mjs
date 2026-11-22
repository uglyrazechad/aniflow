// server.mjs — сервер комнат «Watch Party» (MVP). Front на порту 3000:
//  - /api/rooms/* — REST-API комнат (собственное обслуживание),
//  - /ws/<slug> — WebSocket (upgrade),
//  - остальное — прокси на Next.js на 3010.
// Запуск: node server.mjs (из папки anime-site). Клиент подключается: ws://<origin>/ws/<slug>.
import fs from 'node:fs';
import http from 'node:http';

// Прокси к Next (3010) будет переиспользовать TCP-соединения (keep-alive).
http.globalAgent = new http.Agent({ keepAlive: true, maxSockets: 100, keepAliveMsecs: 5000 });
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync, spawn } from 'node:child_process';
import net from 'node:net';
import { randomInt } from 'node:crypto';
import { createRequire } from 'node:module';

const wsPkg = createRequire(import.meta.url)('ws');
const WebSocket = wsPkg;
const WebSocketServer = wsPkg.WebSocketServer;
const FRONT_PORT = Number(process.env.ROOMS_PORT || 3000);
const NEXT_PORT = 3010;
const ROOMS = new Map();
const ROOMS_FILE = new URL('./data/rooms.json', import.meta.url);

// Персистентность: комнаты выживают перезапуск сервера (data/rooms.json).
// Если задан REDIS_URL и установлен ioredis — снимок дублируется в Redis.
let redis = null;

function saveRooms() {
  try {
    // publicRoom не содержит пароль (он не уходит клиенту), но на диск его кладём,
    // иначе приватная комната после перезапуска станет открытой.
    const data = [...ROOMS.values()].map((r) => ({
      ...publicRoom(r),
      password: r.password ?? null,
      lastActivity: r.lastActivity,
    }));
    const json = JSON.stringify(data);
    fs.writeFileSync(ROOMS_FILE, json);
    if (redis) redis.set('anihub:rooms', json).catch(() => {});
  } catch (e) {
    console.error('[rooms] save failed:', e);
  }
}

let saveTimer = null;
function markDirty() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(saveRooms, 500);
}

function loadRooms() {
  try {
    hydrateRooms(JSON.parse(fs.readFileSync(ROOMS_FILE, 'utf8')));
  } catch {
    // Файл не существует — продолжаем с пустым списком.
  }
}

function hydrateRooms(arr) {
  if (!Array.isArray(arr)) return;
  for (const d of arr) {
    if (!d?.slug || ROOMS.has(d.slug)) continue;
    const messages = d.messages ?? [];
    const room = {
      slug: d.slug,
      hostId: d.hostId ?? null,
      animeId: d.animeId ?? null,
      name: d.name,
      password: d.password ?? null,
      isPublic: d.isPublic ?? true,
      maxMembers: d.maxMembers ?? 20,
      state: { playbackRate: 1, pauseOnBuffering: false, ...(d.state ?? {}) },
      members: [],
      messages,
      bans: new Set(d.bans ?? []),
      rate: new Map(),
      sockets: new Set(),
      messageSeq: messages.length,
      createdAt: d.createdAt ?? Date.now(),
      lastActivity: d.lastActivity ?? Date.now(),
      cleanupTimer: null,
    };
    ROOMS.set(room.slug, room);
  }
  if (ROOMS.size) console.log(`[rooms] загружено комнат: ${ROOMS.size}`);
}

// --- Авторизация по Bearer-токену мобильного приложения ---
const TOKEN_TTL = 60_000;
const TOKEN_CACHE = new Map();

const bearerToken = (req) => {
  const header = req.headers?.authorization ?? '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
};

/** Проверяет токен через /api/mobile/me и кэширует результат на минуту. */
async function resolveIdentity(token) {
  if (typeof token !== 'string' || token.length < 20) return null;

  const cached = TOKEN_CACHE.get(token);
  if (cached && cached.exp > Date.now()) return cached.identity;

  let identity = null;
  try {
    const res = await fetch(`http://127.0.0.1:${NEXT_PORT}/api/mobile/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      const user = data?.user;
      if (user?.id) {
        identity = {
          userId: `user:${user.id}`,
          nick: String(user.profile?.displayName || user.username || 'Зритель').slice(0, 20),
        };
      }
    }
  } catch {
    identity = null;
  }

  TOKEN_CACHE.set(token, {
    identity,
    exp: Date.now() + (identity ? TOKEN_TTL : 15_000),
  });
  if (TOKEN_CACHE.size > 5000) {
    for (const [key, value] of TOKEN_CACHE) {
      if (value.exp <= Date.now()) TOKEN_CACHE.delete(key);
    }
  }
  return identity;
}


const genSlug = (n = 6) => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < n; i++) s += chars[randomInt(0, chars.length)];
  return s;
};

const sanitizeText = (s, max = 500) =>
  String(s ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, max);

const createRoom = ({ animeId, name, password, isPublic, maxMembers, episode } = {}, hostId = null) => {
  const slug = genSlug(6);
  const room = {
    slug,
    animeId: animeId ?? null,
    name: (name || 'Смотрим вместе').slice(0, 60),
    password: password ? String(password).slice(0, 16) : null,
    isPublic: isPublic !== false,
    maxMembers: Math.min(50, Math.max(2, Number(maxMembers) || 20)),
    hostId,
    state: {
      episode: Math.min(200, Math.max(1, Number(episode) > 0 ? Math.trunc(Number(episode)) : 1)),
      time: 0,
      paused: true,
      playbackRate: 1,
      quality: null,
      translationId: null,
      updatedBy: null,
      hostMode: false,
      pauseOnBuffering: false,
      busy: null,
      waiting: [],
      serverTime: Date.now(),
    },
    members: [],
    messages: [],
    bans: new Set(),
    rate: new Map(),
    sockets: new Set(),
    messageSeq: 0,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    cleanupTimer: null,
  };
  ROOMS.set(slug, room);
  markDirty();
  return room;
};

const publicMember = (m) => ({
  userId: m.userId,
  nick: m.nick,
  isHost: m.isHost,
  muted: m.muted,
  waiting: Boolean(m.waiting),
  authed: Boolean(m.authed),
  joinedAt: m.joinedAt,
});

const publicRoom = (r) => ({
  slug: r.slug,
  hostId: r.hostId,
  animeId: r.animeId,
  name: r.name,
  isPublic: r.isPublic,
  maxMembers: r.maxMembers,
  createdAt: r.createdAt,
  state: r.state,
  members: r.members.map(publicMember),
  messages: r.messages.slice(-100),
  bans: [...r.bans],
});

const broadcast = (room, type, data = {}) => {
  const payload = JSON.stringify({ type, ...data });
  for (const ws of room.sockets) {
    if (ws.readyState === WebSocket.OPEN) ws.send(payload);
  }
};

const sendTo = (ws, type, data = {}) => {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type, ...data }));
};

// Пустая комната живёт 12 часов: ссылку можно кинуть другу и вернуться позже.
const EMPTY_ROOM_TTL = 12 * 60 * 60 * 1000;

function startCleanup(room) {
  if (room.cleanupTimer) clearTimeout(room.cleanupTimer);
  room.cleanupTimer = setTimeout(() => {
    if (room.members.length === 0) {
      ROOMS.delete(room.slug);
      broadcast(room, 'room-end', { slug: room.slug });
      markDirty();
    }
  }, EMPTY_ROOM_TTL);
}

function promoteNextHost(room) {
  const next = [...room.members]
    .filter((m) => m.userId !== room.hostId)
    .sort((a, b) => a.joinedAt - b.joinedAt)[0];
  if (!next) return;

  const prevHostId = room.hostId;
  room.hostId = next.userId;
  for (const m of room.members) m.isHost = m.userId === next.userId;
  broadcast(room, 'host-transferred', {
    userId: next.userId,
    prevHostId,
    room: publicRoom(room),
  });
  markDirty();
}

function onLeave(room, ws) {
  const member = room.members.find((m) => m.socket === ws);
  if (!member) return;
  const wasHost = member.isHost || room.hostId === member.userId;
  room.members = room.members.filter((m) => m.socket !== ws);
  room.sockets.delete(ws);
  if (member.waiting) {
    member.waiting = false;
    const waiting = room.members.filter((m) => m.waiting);
    room.state.waiting = waiting.map((m) => ({ userId: m.userId, nick: m.nick }));
    if (room.state.pauseOnBuffering && !waiting.length && room.state.busy) {
      room.state.paused = false;
      room.state.busy = null;
      room.state.serverTime = Date.now();
      broadcast(room, 'state', { state: { ...room.state } });
    }
  }
  markDirty();
  broadcast(room, 'member-left', { userId: member.userId, nick: member.nick });
  // Хост вышел — права переходят самому «старому» участнику.
  if (wasHost && room.members.length > 0) promoteNextHost(room);
  if (room.members.length === 0) startCleanup(room);
}

const wss = new WebSocketServer({ noServer: true });

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); }
    });
    req.on('error', reject);
  });

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.end();
    return;
  }
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'POST' && url.pathname === '/api/rooms/create') {
    const body = await readBody(req);
    const identity = await resolveIdentity(bearerToken(req));
    const room = createRoom(body, identity?.userId ?? null);
    res.statusCode = 201;
    res.end(JSON.stringify({ slug: room.slug, hostId: room.hostId }));
    return;
  }

  const m = url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9_-]+)$/);
  if (m && req.method === 'GET') {
    const room = ROOMS.get(m[1]);
    if (!room) {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'Комната не найдена' }));
      return;
    }
    res.end(JSON.stringify(publicRoom(room)));
    return;
  }

  const patch = url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9_-]+)$/);
  if (patch && req.method === 'PATCH') {
    const room = ROOMS.get(patch[1]);
    if (!room) {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'Комната не найдена' }));
      return;
    }
    const body = await readBody(req);
    const identity = await resolveIdentity(bearerToken(req));
    // Хозяин — и тот, кто в room.members с флагом isHost, и тот, чей userId совпадает с room.hostId
    // (уже не в members, например, после покидания комнаты — hostId сохраняется).
    const isHost =
      (identity && identity.userId === room.hostId) ||
      room.members.some((mb) => mb.userId === body.userId && mb.isHost) ||
      room.hostId === body.userId;
    if (!isHost) {
      res.statusCode = 403;
      res.end(JSON.stringify({ error: 'Доступно только хосту' }));
      return;
    }
    const willBePublic = body.isPublic !== undefined ? Boolean(body.isPublic) : room.isPublic;
    const nextPassword =
      body.password !== undefined
        ? body.password
          ? String(body.password).slice(0, 16)
          : null
        : room.password;
    if (!willBePublic && !nextPassword) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Для приватной комнаты задайте пароль' }));
      return;
    }
    if (body.name !== undefined) room.name = sanitizeText(body.name, 60);
    if (body.isPublic !== undefined) {
      room.isPublic = Boolean(body.isPublic);
    }
    if (body.password !== undefined) room.password = nextPassword;
    // Публичная комната не должна требовать забытый пароль.
    if (room.isPublic) room.password = null;
    if (body.maxMembers !== undefined) room.maxMembers = Math.min(50, Math.max(2, Number(body.maxMembers) || 20));
    broadcast(room, 'room-updated', { room: publicRoom(room) });
    markDirty();
    res.end(JSON.stringify(publicRoom(room)));
    return;
  }

  if (url.pathname === '/api/health') {
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  proxyToNext(req, res);
});

function proxyToNext(req, res) {
  const proxyReq = http.request(
    {
      host: '127.0.0.1',
      port: NEXT_PORT,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: `localhost:${FRONT_PORT}` },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );
  proxyReq.on('error', () => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'upstream недоступен' }));
  });
  req.pipe(proxyReq);
}

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, 'http://localhost');
  const m = url.pathname.match(/^\/ws\/([A-Za-z0-9_-]+)$/);
  if (!m) {
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.destroy();
    return;
  }
  const room = ROOMS.get(m[1]);
  if (!room) {
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req, room);
  });
});

wss.on('connection', (ws, req, room) => {
  const member = {
    userId: `socket:${randomInt(1, 1_000_000_000)}`,
    nick: '',
    isHost: false,
    muted: false,
    waiting: false,
    authed: false,
    joinedAt: Date.now(),
    events: [],
    socket: ws,
  };
  room.members.push(member);
  room.sockets.add(ws);
  // Сообщения обрабатываем строго по очереди: join с проверкой токена асинхронный.
  let chain = Promise.resolve();
  ws.on('close', () => onLeave(room, ws));
  ws.on('error', () => onLeave(room, ws));
  ws.on('message', (raw) => {
    chain = chain
      .then(async () => {
        let msg;
        try {
          msg = JSON.parse(raw.toString());
        } catch {
          return;
        }
        const current = room.members.find((mb) => mb.socket === ws);
        if (!current) return;
        if (msg.type !== 'ping' && !allowEvent(current)) {
          sendTo(ws, 'rate-limit', { scope: 'events' });
          return;
        }
        await handleEvent(room, current, msg, ws);
      })
      .catch(() => {});
  });
});

/** Ограничение частоты: не больше 20 событий за 5 секунд с одного сокета. */
function allowEvent(member) {
  const now = Date.now();
  member.events = member.events.filter((t) => now - t < 5000);
  if (member.events.length >= 20) return false;
  member.events.push(now);
  return true;
}

const clampTime = (value) => Math.min(Math.max(Number(value) || 0, 0), 100000);

async function handleEvent(room, member, msg, ws) {
  const { type } = msg;
  const hostOnly = room.state.hostMode && room.hostId !== member.userId;
  room.lastActivity = Date.now();

  switch (type) {
    case 'join': {
      const identity = await resolveIdentity(msg.token);
      if (room.bans.has(member.userId)) {
        sendTo(ws, 'error', { code: 'banned', message: 'Вы забанены в этой комнате' });
        ws.close(4000, 'забанены');
        return;
      }
      const wanted = identity?.userId
        ?? (typeof msg.userId === 'string' && msg.userId ? msg.userId : null);
      if (wanted && room.bans.has(wanted)) {
        room.members = room.members.filter((m) => m.socket !== ws);
        room.sockets.delete(ws);
        sendTo(ws, 'error', { code: 'banned', message: 'Вы забанены в этой комнате' });
        ws.close(4000, 'забанены');
        return;
      }
      if (!room.isPublic && room.password && (!msg.password || String(msg.password) !== room.password)) {
        room.members = room.members.filter((m) => m.socket !== ws);
        room.sockets.delete(ws);
        sendTo(ws, 'error', { code: 'password', message: 'Неверный пароль комнаты' });
        ws.close(4001, 'Неверный пароль');
        return;
      }
      if (wanted) {
        // Реконнект: убираем старую сессию этого же пользователя, чтобы не было дублей.
        for (const stale of [...room.members]) {
          if (stale.userId === wanted && stale.socket !== ws) {
            room.members = room.members.filter((m) => m.socket !== stale.socket);
            room.sockets.delete(stale.socket);
            stale.socket?.close(4005, 'Переподключение');
          }
        }
        member.userId = wanted;
      }
      member.nick = sanitizeText(msg.nick, 20) || identity?.nick || `Гость${randomInt(100000, 999999)}`;
      member.authed = Boolean(identity);
      if (room.hostId === null) room.hostId = member.userId;
      member.isHost = room.hostId === member.userId;
      member.joinedAt = Date.now();
      if (room.members.length > room.maxMembers) {
        // Не выкидываем случайного участника (мог вылететь хост) — отклоняем нового.
        room.members = room.members.filter((m) => m.socket !== ws);
        room.sockets.delete(ws);
        sendTo(ws, 'error', { code: 'full', message: 'Комната переполнена' });
        ws.close(4002, 'Комната переполнена');
        return;
      }
      broadcast(room, 'member-joined', { member: publicMember(member) });
      markDirty();
      sendTo(ws, 'room-state', {
        state: room.state,
        members: room.members.map(publicMember),
        hostId: room.hostId,
      });
      sendTo(ws, 'history', { messages: room.messages.slice(-100) });
      break;
    }

    case 'leave':
      onLeave(room, ws);
      break;

    case 'ping':
      break;

    case 'host-mode':
      if (!member.isHost) break;
      room.state.hostMode = Boolean(msg.enable);
      broadcast(room, 'host-mode', { enable: room.state.hostMode, userId: member.userId });
      markDirty();
      break;

    case 'host-transfer': {
      if (!member.isHost) break;
      const target = room.members.find((m) => m.userId === msg.userId && !m.isHost);
      if (!target) break;
      const prevHost = room.hostId;
      room.hostId = target.userId;
      target.isHost = true;
      member.isHost = false;
      broadcast(room, 'host-transferred', {
        userId: target.userId,
        prevHostId: prevHost,
        room: publicRoom(room),
      });
      markDirty();
      break;
    }

    case 'kick': {
      if (!member.isHost) break;
      const target = room.members.find((m) => m.userId === msg.userId && m.userId !== member.userId);
      if (!target) break;
      room.members = room.members.filter((m) => m.userId !== target.userId);
      room.sockets.delete(target.socket);
      markDirty();
      broadcast(room, 'kicked', { userId: target.userId, nick: target.nick });
      target.socket?.close(4003, 'Вас кикнули');
      if (room.members.length === 0) startCleanup(room);
      break;
    }

    case 'ban': {
      if (!member.isHost) break;
      const target = room.members.find((m) => m.userId === msg.userId && m.userId !== member.userId);
      if (!target) break;
      room.bans.add(target.userId);
      room.members = room.members.filter((m) => m.userId !== target.userId);
      room.sockets.delete(target.socket);
      markDirty();
      broadcast(room, 'banned', { userId: target.userId, nick: target.nick });
      target.socket?.close(4004, 'Забанены');
      if (room.members.length === 0) startCleanup(room);
      break;
    }

    case 'mute': {
      if (!member.isHost) break;
      const target = room.members.find((m) => m.userId === msg.userId);
      if (!target) break;
      target.muted = !target.muted;
      markDirty();
      broadcast(room, 'muted', { userId: target.userId, muted: target.muted });
      break;
    }

    case 'play':
    case 'pause':
    case 'seek': {
      if (hostOnly) break;
      const wasPaused = room.state.paused;
      if (type === 'play') room.state.paused = false;
      if (type === 'pause') room.state.paused = true;
      // Play снимает «ждём буферизацию»: комната поехала дальше.
      if (type === 'play' && room.state.busy) {
        room.state.busy = null;
        for (const m of room.members) m.waiting = false;
        room.state.waiting = [];
      }
      // Время от «play» принимаем только при старте с паузы: иначе опоздавший
      // гость, нажав Play, отмотал бы всю комнату назад.
      if (typeof msg.time === 'number' && (type !== 'play' || wasPaused)) {
        room.state.time = clampTime(msg.time);
      }
      room.state.updatedBy = member.userId;
      room.state.serverTime = Date.now();
      markDirty();
      broadcast(room, 'state', { state: { ...room.state } });
      break;
    }

    case 'sync': {
      if (typeof msg.paused === 'boolean') room.state.busy = msg.paused ? member.userId : null;
      if (typeof msg.time === 'number') room.state.time = Math.min(Math.max(msg.time, 0), 100000);
      if (!msg.paused) {
        room.state.paused = false;
        room.state.busy = null;
      }
      room.state.serverTime = Date.now();
      markDirty();
      broadcast(room, 'state', { state: { ...room.state } });
      break;
    }

    case 'episode': {
      if (hostOnly) break;
      room.state.episode = Math.min(200, Math.max(1, Math.trunc(Number(msg.episode)) || 1));
      room.state.updatedBy = member.userId;
      room.state.serverTime = Date.now();
      markDirty();
      broadcast(room, 'state', { state: { ...room.state } });
      break;
    }

    case 'quality': {
      if (hostOnly) break;
      room.state.quality = msg.quality ? String(msg.quality).slice(0, 10) : null;
      room.state.updatedBy = member.userId;
      room.state.serverTime = Date.now();
      markDirty();
      broadcast(room, 'state', { state: { ...room.state } });
      break;
    }

    case 'translation': {
      if (hostOnly) break;
      room.state.translationId = typeof msg.translationId === 'number' ? msg.translationId : null;
      room.state.updatedBy = member.userId;
      room.state.serverTime = Date.now();
      markDirty();
      broadcast(room, 'state', { state: { ...room.state } });
      break;
    }

    case 'rate': {
      if (hostOnly) break;
      const rate = Number(msg.rate ?? msg.playbackRate);
      if (!Number.isFinite(rate) || rate <= 0) break;
      room.state.playbackRate = Math.min(Math.max(rate, 0.25), 2);
      room.state.updatedBy = member.userId;
      room.state.serverTime = Date.now();
      markDirty();
      broadcast(room, 'state', { state: { ...room.state } });
      break;
    }

    case 'pause-on-buffering': {
      if (!member.isHost) break;
      room.state.pauseOnBuffering = Boolean(msg.enable);
      room.state.serverTime = Date.now();
      markDirty();
      broadcast(room, 'state', { state: { ...room.state } });
      break;
    }

    // Буферизация: клиент сообщает, что ждёт загрузку. Если хост включил
    // «пауза всем», комната встаёт на паузу, пока все не догрузятся.
    case 'waiting':
    case 'buffering': {
      const waiting = Boolean(msg.waiting ?? msg.buffering);
      if (member.waiting === waiting) break;
      member.waiting = waiting;
      const waitingMembers = room.members.filter((m) => m.waiting);
      room.state.waiting = waitingMembers.map((m) => ({ userId: m.userId, nick: m.nick }));

      if (room.state.pauseOnBuffering) {
        if (waiting && !room.state.paused) {
          room.state.time = typeof msg.time === 'number' ? clampTime(msg.time) : room.state.time;
          room.state.paused = true;
          room.state.busy = member.userId;
          room.state.serverTime = Date.now();
          broadcast(room, 'state', { state: { ...room.state } });
        } else if (!waitingMembers.length && room.state.busy) {
          room.state.paused = false;
          room.state.busy = null;
          room.state.serverTime = Date.now();
          broadcast(room, 'state', { state: { ...room.state } });
        }
      }

      markDirty();
      broadcast(room, 'waiting', {
        userId: member.userId,
        nick: member.nick,
        waiting,
        members: waitingMembers.map(publicMember),
      });
      break;
    }

    case 'msg': {
      const text = sanitizeText(msg.text, 500);
      if (!text) break;
      const times = room.rate.get(member.userId) ?? [];
      const recent = times.filter((t) => Date.now() - t < 10000);
      if (recent.length >= 5) {
        sendTo(ws, 'rate-limit', {});
        break;
      }
      recent.push(Date.now());
      room.rate.set(member.userId, recent);
      const message = {
        id: ++room.messageSeq,
        userId: member.userId,
        nick: member.nick,
        text,
        emoji: msg.emoji ? sanitizeText(msg.emoji, 1) : null,
        time: Date.now(),
      };
      room.messages.push(message);
      markDirty();
      broadcast(room, 'msg', { message });
      break;
    }

    case 'reaction': {
      const emoji = sanitizeText(msg.emoji, 1);
      if (!emoji) break;
      broadcast(room, 'reaction', { emoji, userId: member.userId, nick: member.nick, time: Date.now() });
      break;
    }

    case 'typing':
      broadcast(room, 'typing', { userId: member.userId, typing: Boolean(msg.typing) });
      break;
  }
}

loadRooms();

/** Необязательный Redis: если установлен ioredis и задан REDIS_URL — берём снимок оттуда. */
async function initRedis() {
  const url = process.env.REDIS_URL;
  if (!url) return;

  try {
    const { default: Redis } = await import('ioredis');
    const client = new Redis(url, { maxRetriesPerRequest: 2, enableOfflineQueue: false });
    client.on('error', () => {});
    const saved = await client.get('anihub:rooms');
    if (saved) hydrateRooms(JSON.parse(saved));
    redis = client;
    console.log('[rooms] Redis подключён');
  } catch {
    console.warn('[rooms] Redis недоступен — работаем с data/rooms.json');
    redis = null;
  }
}

initRedis();

server.listen(FRONT_PORT, '0.0.0.0', () => {
  console.log(`[front] порт ${FRONT_PORT}, Next.js на ${NEXT_PORT}`);
});

// Поднимаем Next.js на 3010 (статика + SSR).
const here = path.dirname(fileURLToPath(import.meta.url));
const nextBin = path.join(here, 'node_modules', 'next', 'dist', 'bin', 'next');
spawn(process.execPath, [nextBin, 'start', '-p', String(NEXT_PORT)], {
  cwd: here,
  stdio: 'inherit',
});

// --- Самовосстановление (фоновые процессы перезапускаются каждые 30 секунд). ---
const electronPath = path.join(here, 'desktop', 'node_modules', 'electron', 'dist', 'electron.exe');
const electronMain = path.join(here, 'desktop', 'main.js');
const cfPath = path.join(process.env.LOCALAPPDATA ?? '', 'AniHub', 'cloudflared.exe');
const cfLog = path.join(process.env.LOCALAPPDATA ?? '', 'AniHub', 'cloudflared.log');
const urlFile = path.join(process.env.LOCALAPPDATA ?? '', 'AniHub', 'public-url.txt');

function isRunning(exeName) {
  try {
    const out = execSync(`tasklist /FI "IMAGENAME eq ${exeName}" /NH`, { encoding: 'utf8' });
    return out.split(/\r?\n/).some((line) => line.trim().toUpperCase().startsWith(exeName.toUpperCase()));
  } catch {
    return false;
  }
}

let cfChild = null;
let electronChild = null;
// Один раз на старте смотрим, не запущены ли процессы от прошлой сессии.
// Дальше обходимся без tasklist каждые 30 секунд — он блокировал event loop.
let cfRunning = isRunning('cloudflared.exe');
let electronRunning = isRunning('electron.exe');

function portUp(port) {
  return new Promise((resolve) => {
    const s = net.connect(port, '127.0.0.1');
    s.on('connect', () => { s.destroy(); resolve(true); });
    s.on('error', () => resolve(false));
  });
}

function extractTunnelUrl() {
  try {
    const content = fs.readFileSync(cfLog, 'utf8');
    const urls = [...content.matchAll(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/g)].map((m) => m[0]);
    return urls.length ? urls[urls.length - 1] : null;
  } catch {
    return null;
  }
}

function refreshPublicUrl() {
  const url = extractTunnelUrl();
  if (url) fs.writeFileSync(urlFile, url);
  return url;
}

let lastLoggedTunnel = null;
function logIfNewTunnel() {
  const url = refreshPublicUrl();
  if (url && url !== lastLoggedTunnel) {
    console.log('[front] туннель:', url);
    lastLoggedTunnel = url;
  }
}
function startCloudflared() {
  if (!fs.existsSync(cfPath) || cfRunning) return;
  const fd = fs.openSync(cfLog, 'a');
  cfChild = spawn(cfPath, ['tunnel', '--url', 'http://localhost:3000', '--no-autoupdate'], { stdio: ['ignore', 'ignore', fd], windowsHide: true });
  cfRunning = true;
  cfChild.once('exit', () => {
    cfRunning = false;
    cfChild = null;
  });
  console.log('[front] запущен cloudflared (tunnel)');
}

function startElectron() {
  if (!fs.existsSync(electronPath) || electronRunning) return;
  electronChild = spawn(electronPath, [electronMain], { stdio: 'ignore', windowsHide: true });
  electronRunning = true;
  electronChild.once('exit', () => {
    electronRunning = false;
    electronChild = null;
  });
  console.log('[front] запущен electron (окно браузера)');
}

async function startNextIfDown() {
  if (await portUp(NEXT_PORT)) return;
  console.log('[front] перезапуск Next (3010)...');
  spawn(process.execPath, [nextBin, 'start', '-p', String(NEXT_PORT)], { cwd: here, stdio: 'inherit' });
}

startCloudflared();
setTimeout(() => startElectron(), 11000);
setInterval(() => {
  startCloudflared();
  logIfNewTunnel();
  startElectron();
  portUp(NEXT_PORT).then((up) => {
    if (!up) startNextIfDown();
  }).catch(() => {});
}, 30_000);

setInterval(() => {
  const now = Date.now();
  for (const room of ROOMS.values()) {
    if (room.members.length === 0 && now - room.lastActivity > 12 * 60 * 60 * 1000) {
      ROOMS.delete(room.slug);
      broadcast(room, 'room-end', { slug: room.slug });
      markDirty();
    }
  }
}, 60 * 1000);
