'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HelpCircle, Link2, Settings2, Trash2 } from 'lucide-react';

import type { VideoPlayerHandle } from '@/components/player/video-player';
import { Button } from '@/components/ui/button';
import { RoomClient } from '@/lib/room-ws';
import type { AnimeLike, RoomMember, RoomMessage, RoomRoom, RoomState } from '@/lib/room-types';

import { Chat } from './chat';
import { HelpModal } from './help-modal';
import { OnboardingModal } from './onboarding-modal';
import { Participants } from './participants';
import { RoomVideoPlayer } from './room-video-player';
import { SettingsModal } from './settings-modal';

interface Props {
  room: RoomRoom;
  anime: AnimeLike;
}

function guestId() {
  // SSR-рендер страницы комнаты не имеет sessionStorage. Сохраняем id и тогда, и тогда,
  // чтобы SSR-HTML и клиентский id всегда совпадали (hydration-мисматч).
  const read = () => (typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem('room-user'));
  const stored = read();
  if (stored) return stored;
  const id = `guest-${Math.random().toString(36).slice(2, 8)}`;
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('room-user', id);
  } catch {
    /* sessionStorage недоступен — id всё равно возвращаем */
  }
  return id;
}

function initials(name: string) {
  return (
    name
      .replace(/\s+/g, '')
      .slice(0, 2)
      .toUpperCase() || '?'
  );
}

export function RoomPage({ room: roomProp, anime }: Props) {
  const [room, setRoom] = useState<RoomRoom>(roomProp);
  const [state, setState] = useState<RoomState>(roomProp.state);
  const stateRef = useRef<RoomState>(roomProp.state);
  const [members, setMembers] = useState<RoomMember[]>(roomProp.members);
  const [messages, setMessages] = useState<RoomMessage[]>(roomProp.messages);
  const [input, setInput] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [rateLimited, setRateLimited] = useState(false);
  const [reactions, setReactions] = useState<Array<{ emoji: string; at: number; nick: string }>>([]);
  const [hostId, setHostId] = useState<string | null>(roomProp.hostId ?? null);
  const initiallyPrivate = !roomProp.isPublic;
  const [ready, setReady] = useState(!initiallyPrivate);
  const [password, setPassword] = useState('');
  const passwordAsked = useRef(false);
  const passwordAttempts = useRef(0);
  const [connectionKey, setConnectionKey] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [tab, setTab] = useState<'chat' | 'members'>('chat');
  const [toast, setToast] = useState<string | null>(null);
  const [hostMode, setHostMode] = useState(roomProp.state.hostMode);

  const router = useRouter();
  const userId = guestId();
  const playerHandle = useRef<VideoPlayerHandle | null>(null);
  const clientRef = useRef<RoomClient | null>(null);
  const prevStateRef = useRef<RoomState>(roomProp.state);
  const rateTimer = useRef<number | undefined>(undefined);
  const reactionTimers = useRef<number[]>([]);
  const membersRef = useRef<RoomMember[]>(members);
  membersRef.current = members;

  const isHost = hostId === userId || members.some((m) => m.isHost && m.userId === userId);

  useEffect(() => setHostMode(state.hostMode), [state.hostMode]);

  const addSystem = useCallback((text: string) => {
    setMessages((m) => [...m, { id: Date.now(), userId, nick: '', text, emoji: null, time: Date.now(), system: text }]);
  }, [userId]);

  const addReaction = useCallback((emoji: string, nick: string) => {
    setReactions((r) => [...r.slice(-8), { emoji, at: Date.now(), nick }]);
    window.setTimeout(() => setReactions((r) => r.filter((x) => Date.now() - x.at < 2500)), 2500);
  }, []);

  // Пароль спрашиваем только при первом входе в уже приватную комнату.
  // Если хост сделает комнату приватной позже, текущих участников не выкидываем.
  useEffect(() => {
    if (ready || passwordAsked.current) return;
    passwordAsked.current = true;
    const answer = window.prompt('Комната приватная. Введите пароль:');
    if (answer === null) {
      router.push('/');
      return;
    }
    setPassword(answer);
    setReady(true);
  }, [ready, router]);

  // Онбординг только для хоста на первом заходе.
  useEffect(() => {
    const key = `room-onboarding-${room.slug}`;
    if (!isHost || sessionStorage.getItem(key) || messages.length > 0) return;
    sessionStorage.setItem(key, '1');
    setOnboardingOpen(true);
  }, [isHost, room.slug, messages]);

  useEffect(() => {
    if (!ready) return;
    const client = new RoomClient(
      `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws/${room.slug}`,
      userId,
      userId,
      (e) => {
        const type = e.type;
        if (type === 'error') {
          const code = String(e.code ?? '');
          if (code === 'password') {
            clientRef.current?.close();
            if (passwordAttempts.current >= 3) {
              setToast('Не удалось войти в комнату');
              window.setTimeout(() => router.push('/'), 1200);
              return;
            }
            passwordAttempts.current += 1;
            const answer = window.prompt('Неверный пароль. Попробуйте ещё раз:');
            if (answer === null) {
              router.push('/');
              return;
            }
            setPassword(answer);
            setConnectionKey((k) => k + 1);
            return;
          }
          const message = String((e as { message?: string }).message ?? 'Ошибка');
          setToast(message);
          if (code === 'banned' || code === 'full') {
            clientRef.current?.close();
            window.setTimeout(() => router.push('/'), 1500);
          }
        } else if (type === 'room-updated') {
          const next = e.room as RoomRoom | undefined;
          if (next) {
            setRoom(next);
            setHostId(next.hostId ?? null);
            setMembers(next.members ?? []);
            setState(next.state);
            stateRef.current = next.state;
            prevStateRef.current = next.state;
          }
        } else if (type === 'room-state') {
          const next = (e.state as RoomState) ?? stateRef.current;
          const nextMembers = e.members as RoomMember[] | undefined;
          if (nextMembers) setMembers(nextMembers);
          if (e.hostId !== undefined) setHostId((e.hostId as string | null) ?? null);
          const prev = prevStateRef.current;
          if (next.episode !== prev.episode) addSystem(`Серия: ${next.episode}`);
          if (next.time > 0 && Math.abs(next.time - prev.time) > 0.5 && next.updatedBy) {
            const m = membersRef.current.find((x) => x.userId === next.updatedBy);
            const t = (n: number) => String(n).padStart(2, '0');
            addSystem(`${m?.nick ?? 'Участник'} перемотал на ${Math.floor(next.time / 60)}:${t(Math.floor(next.time % 60))}`);
          }
          prevStateRef.current = next;
          stateRef.current = next;
          setState(next);
        } else if (type === 'history') {
          setMessages((e.messages as RoomMessage[]) ?? []);
        } else if (type === 'member-joined') {
          const m = e.member as RoomMember;
          if (!m) return;
          setMembers((ms) => (ms.some((x) => x.userId === m.userId) ? ms : [...ms, m]));
          addSystem(`${m.nick} зашёл`);
        } else if (type === 'member-left') {
          const m = membersRef.current.find((x) => x.userId === (e.userId as string));
          setMembers((ms) => ms.filter((x) => x.userId !== e.userId));
          addSystem(`${m?.nick ?? 'Участник'} вышел`);
        } else if (type === 'host-transferred') {
          setHostId(String(e.userId ?? ''));
          const next = e.room as RoomRoom | undefined;
          if (next) {
            setRoom(next);
            setMembers(next.members ?? []);
            setHostId(next.hostId ?? null);
          }
        } else if (type === 'msg') {
          const message = e.message as RoomMessage;
          if (!message) return;
          setMessages((ms) => [...ms.slice(-199), message]);
        } else if (type === 'reaction') {
          addReaction(String(e.emoji ?? ''), membersRef.current.find((x) => x.userId === e.userId)?.nick ?? '');
        } else if (type === 'typing') {
          setTypingUsers((ts) => {
            const nick = membersRef.current.find((x) => x.userId === e.userId)?.nick;
            if (!nick) return ts;
            const has = ts.includes(nick);
            return Boolean(e.typing) && !has ? [...ts, nick] : ts.filter((t) => t !== nick);
          });
        } else if (type === 'rate-limit') {
          setRateLimited(true);
          window.clearTimeout(rateTimer.current);
          rateTimer.current = window.setTimeout(() => setRateLimited(false), 3000);
        } else if (type === 'banned' || type === 'kicked') {
          setToast(type === 'banned' ? 'Вы забанены в этой комнате' : 'Вас исключили из комнаты');
          clientRef.current?.close();
          window.setTimeout(() => router.push('/'), 1200);
        }
      },
      password,
    );
    clientRef.current = client;
    client.start();
    return () => {
      client.close();
      clientRef.current = null;
    };
  }, [room.slug, userId, password, ready, connectionKey, addSystem, addReaction]);

  const send = useCallback((e: Record<string, unknown>) => clientRef.current?.send(e), []);

  // Хост раз в 5 секунд отправляет текущую позицию — гости не уезжают от него.
  useEffect(() => {
    if (!ready || !isHost) return undefined;
    const id = window.setInterval(() => {
      const player = playerHandle.current;
      if (!player || !player.isPlaying()) return;
      send({ type: 'sync', time: player.getTime(), paused: false });
    }, 5000);
    return () => window.clearInterval(id);
  }, [ready, isHost, send]);

  useEffect(() => {
    if (!toast) return undefined;
    const id = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(id);
  }, [toast]);

  const onUserPlay = useCallback(
    (time?: number) => send({ type: 'play', time: time ?? playerHandle.current?.getTime() ?? 0 }),
    [send],
  );
  const onUserPause = useCallback(
    () => send({ type: 'pause', time: playerHandle.current?.getTime() ?? 0 }),
    [send],
  );
  const onUserSeek = useCallback((time: number) => send({ type: 'seek', time }), [send]);
  const onKick = useCallback((userId2: string) => send({ type: 'kick', userId: userId2 }), [send]);
  const onBan = useCallback((userId2: string) => send({ type: 'ban', userId: userId2 }), [send]);
  const onMute = useCallback((userId2: string) => send({ type: 'mute', userId: userId2 }), [send]);
  const onSend = useCallback((text: string) => send({ type: 'msg', text }), [send]);
  const onExit = useCallback(() => {
    send({ type: 'leave' });
    router.push('/');
  }, [send, router]);

  const onTyping = useCallback(
    (typing: boolean) => {
      window.clearTimeout(typingTimerRef.current);
      if (typing) send({ type: 'typing', typing: true });
      typingTimerRef.current = window.setTimeout(() => send({ type: 'typing', typing: false }), 800);
    },
    [send],
  );
  const typingTimerRef = useRef<number | undefined>(undefined);

  const syncStatus = useMemo<{ label: string; ok: boolean }>(() => {
    const busy = state.busy;
    if (busy) {
      const b = membersRef.current.find((m) => m.userId === busy);
      return { label: `Ждём ${b?.nick ?? 'участника'}…`, ok: false };
    }
    const lag = Math.abs(Date.now() - state.serverTime) / 1000;
    return { label: 'Синхронизировано', ok: lag < 2 };
  }, [state, members]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/room/${room.slug}`);
      setToast('Ссылка скопирована!');
    } catch {
      setToast('Не удалось скопировать');
    }
  };

  const saveSettings = async (data: Record<string, unknown>): Promise<boolean> => {
    // userId, который сервер точно знает как хозяина: из members или hostId.
    const hostMember = membersRef.current.find((m) => m.isHost && m.userId === userId);
    const uid = hostMember ? hostMember.userId : userId;
    try {
      const res = await fetch(`/api/rooms/${room.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, ...data }),
      });
      const updated = await res.json().catch(() => null);
      if (res.ok && updated?.slug) {
        setRoom(updated);
        setHostId(updated.hostId ?? null);
        setMembers(updated.members ?? []);
        setState(updated.state);
        stateRef.current = updated.state;
        prevStateRef.current = updated.state;
        setToast('Сохранено');
        return true;
      }
      setToast((updated?.error as string) ?? 'Ошибка сохранения');
      return false;
    } catch {
      setToast('Не удалось сохранить настройки');
      return false;
    }
  };

  const onTransfer = (targetUserId: string) => send({ type: 'host-transfer', userId: targetUserId });

  if (!ready) return null;

  const roomName = room.name || `Комната ${room.slug}`;

  const header = (
    <div className="z-10 flex shrink-0 items-center gap-2 rounded-2xl border border-border/60 bg-gradient-to-r from-card/75 via-card/50 to-transparent px-3 py-2.5 backdrop-blur-sm">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/25 to-primary/10 text-xs font-semibold text-primary ring-1 ring-primary/20">
        {initials(roomName)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-foreground">{roomName}</span>
          {isHost ? (
            <span className="shrink-0 rounded-full bg-gradient-to-r from-amber-400/15 to-amber-400/5 px-2 py-0.5 text-[11px] font-semibold text-amber-400 ring-1 ring-amber-400/30">
              Вы хост
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary/80" />
            {members.length} {members.length === 1 ? 'участник' : members.length < 5 ? 'участника' : 'участников'}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Button variant="outline" size="sm" onClick={() => void copyLink()} title="Пригласить" className="gap-1.5">
          <Link2 className="h-4 w-4" />Пригласить
        </Button>
        {isHost ? (
          <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)} title="Настройки комнаты" className="gap-1.5">
            <Settings2 className="h-4 w-4" />
          </Button>
        ) : null}
        <Button variant="outline" size="sm" onClick={() => setHelpOpen(true)} title="Помощь"><HelpCircle className="h-4 w-4" /></Button>
        {isHost ? (
          <Button variant="outline" size="sm" onClick={() => send({ type: 'host-mode', enable: !hostMode })} title="Режим воспроизведения" className="font-semibold">
            Режим: {hostMode ? 'только хост' : 'все'}
          </Button>
        ) : null}
        <Button variant="outline" size="sm" onClick={onExit} title="Выйти"><Trash2 className="h-4 w-4" /></Button>
      </div>
    </div>
  );

  const tabBar = (
    <div className="flex shrink-0 items-center gap-1 rounded-xl border border-border/50 bg-background/50 p-1">
      <Button size="sm" variant={tab === 'chat' ? 'default' : 'ghost'} onClick={() => setTab('chat')} className="gap-1.5 rounded-lg">
        <span className="flex h-2 w-2 items-center justify-center">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        </span>
        Чат{tab === 'chat' ? ` (${messages.length})` : ''}
      </Button>
      <Button size="sm" variant={tab === 'members' ? 'default' : 'ghost'} onClick={() => setTab('members')} className="rounded-lg">
        Участники{tab === 'members' ? ` (${members.length})` : ''}
      </Button>
    </div>
  );

  const chat = (
    <Chat
      messages={messages}
      members={members}
      ownId={userId}
      input={input}
      setInput={setInput}
      onSend={onSend}
      onTyping={onTyping}
      typingUsers={typingUsers}
      rateLimited={rateLimited}
    />
  );

  return (
    <div className="relative h-[100dvh] gap-3 p-3 sm:p-4 lg:flex">
      <div className="flex min-w-0 flex-1 flex-col gap-3 lg:max-w-[68%]">
        {header}
        <RoomVideoPlayer
          anime={anime}
          state={state}
          handle={playerHandle}
          className="min-h-[300px] lg:min-h-[400px]"
          onUserPlay={onUserPlay}
          onUserPause={onUserPause}
          onUserSeek={onUserSeek}
        />
        <div className="shrink-0 pl-[44px]">
          <div className="text-xs font-medium text-muted-foreground">
            {syncStatus.label}
            {syncStatus.ok ? '' : ' (разница с плеером)'}
          </div>
        </div>
        <div className="lg:hidden">{tabBar}</div>
        <div className="lg:hidden flex-1 overflow-hidden">
          {tab === 'chat' ? chat : <Participants members={members} hostId={hostId} isHost={isHost} onKick={onKick} onBan={onBan} onMute={onMute} />}
        </div>
        {/* Бейдж переключения чата на мобильных */}
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          aria-label="Открыть чат"
          className="fixed bottom-3 right-3 z-30 flex h-11 min-w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-1 ring-white/20 sm:hidden"
        >
          <span className="flex items-center gap-1.5 text-xs font-semibold">
            💬
            {messages.length > 0 ? <span className="text-sm font-bold">{messages.length}</span> : null}
          </span>
        </button>
        {/* Мобильная выдвижка всего чата */}
        {chatOpen ? (
          <div className="fixed inset-0 z-40 flex flex-col sm:hidden" onClick={() => setChatOpen(false)}>
            <div className="flex min-h-0 w-full flex-1 flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex shrink-0 items-center justify-between border-b border-border/50 px-3 py-3">
                <span className="text-sm font-semibold text-foreground">Чат</span>
                <button type="button" aria-label="Закрыть чат" onClick={() => setChatOpen(false)}>✕</button>
              </div>
              <div className="min-h-0 flex-1">{chat}</div>
            </div>
          </div>
        ) : null}
      </div>
      <aside className="hidden min-h-[500px] w-full shrink-0 lg:block lg:w-[32%]">
        {tabBar}
        <div className="mt-3 flex min-h-0 flex-1 flex-col">
          {tab === 'chat' ? chat : <Participants members={members} hostId={hostId} isHost={isHost} onKick={onKick} onBan={onBan} onMute={onMute} />}
        </div>
      </aside>
      {/* Плавающие реакции поверх видео */}
      {reactions.map((r, i) => (
        <span
          key={i}
          className="pointer-events-none absolute top-1/2 left-1/2 z-30 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border/40 bg-card/90 px-3 py-1 text-lg shadow-xl"
        >
          <span className="pointer-events-none -m-1 inline-block font-semibold">{r.emoji}</span>
          <span className="pointer-events-none -mt-0.5 ml-0.5 inline-block text-[9px] text-muted-foreground">
            {r.nick}
          </span>
        </span>
      ))}
      {toast ? (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-border/60 bg-card/95 px-4 py-2 text-xs font-medium text-foreground shadow-xl">
          {toast}
        </div>
      ) : null}
      {helpOpen ? <HelpModal slug={room.slug} onClose={() => setHelpOpen(false)} /> : null}
      {onboardingOpen ? <OnboardingModal isHost={isHost} onClose={() => setOnboardingOpen(false)} /> : null}
      {settingsOpen ? (
        <SettingsModal
          room={{
            name: room.name,
            isPublic: room.isPublic,
            maxMembers: room.maxMembers,
          }}
          members={members}
          isHost={isHost}
          onSave={saveSettings}
          onTransfer={onTransfer}
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}
    </div>
  );
}
