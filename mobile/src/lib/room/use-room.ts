import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { roomSocketUrl } from '../api';
import type {
  ConnectionStatus,
  RoomEvent,
  RoomInfo,
  RoomMember,
  RoomMessage,
  RoomState,
} from '../types';
import { RoomSocket } from './socket';
import { clockSkew } from './sync';

interface Options {
  slug: string;
  token: string | null;
  userId: string;
  nick: string;
  password?: string;
  /** Вызывается, когда сервер закрыл комнату (кик, бан, переполнение). */
  onClosed?: (message: string) => void;
  /** Вызывается при неверном пароле — экран вернёт форму входа. */
  onPasswordError?: (message: string) => void;
}

export interface ReactionBurst {
  id: number;
  emoji: string;
  nick: string;
}

export function useRoom({ slug, token, userId, nick, password, onClosed, onPasswordError }: Options) {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [state, setState] = useState<RoomState | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [hostId, setHostId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [reactions, setReactions] = useState<ReactionBurst[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [system, setSystem] = useState<string[]>([]);
  const [typing, setTyping] = useState<Record<string, boolean>>({});
  const [waitingNames, setWaitingNames] = useState<string[]>([]);

  const socketRef = useRef<RoomSocket | null>(null);
  const skewRef = useRef(0);
  const optionsRef = useRef({ token, userId, nick, password, onClosed, onPasswordError });
  optionsRef.current = { token, userId, nick, password, onClosed, onPasswordError };
  const hostIdRef = useRef<string | null>(null);
  hostIdRef.current = hostId;
  const membersRef = useRef<RoomMember[]>([]);
  membersRef.current = members;
  const reactionSeq = useRef(0);
  const systemRef = useRef(0);

  const pushSystem = useCallback((text: string) => {
    systemRef.current += 1;
    setSystem((items) => [...items.slice(-30), text]);
  }, []);

  const handleEvent = useCallback(
    (event: RoomEvent) => {
      const type = event.type;

      if (type === 'error') {
        const message = String(event.message ?? 'Ошибка комнаты');
        setError(message);
        if (String(event.code) === 'password') {
          optionsRef.current.onPasswordError?.(message);
        }
        if (['banned', 'full', 'kicked'].includes(String(event.code))) {
          optionsRef.current.onClosed?.(message);
        }
        return;
      }

      if (type === 'room-state') {
        const next = event.state as RoomState | undefined;
        if (next) {
          skewRef.current = clockSkew(next.serverTime);
          setState(next);
          setWaitingNames((next.waiting ?? []).map((item) => item.nick));
        }
        if (Array.isArray(event.members)) setMembers(event.members as RoomMember[]);
        if (event.hostId !== undefined) setHostId((event.hostId as string | null) ?? null);
        return;
      }

      if (type === 'room-updated') {
        const room = event.room as RoomInfo | undefined;
        if (room) {
          setMembers(room.members ?? []);
          setHostId(room.hostId ?? null);
          setRoomName(room.name);
          setIsPublic(room.isPublic);
          setState(room.state);
          skewRef.current = clockSkew(room.state.serverTime);
        }
        return;
      }

      if (type === 'state') {
        const next = event.state as RoomState | undefined;
        if (!next) return;
        skewRef.current = clockSkew(next.serverTime);
        setState(next);
        setWaitingNames((next.waiting ?? []).map((item) => item.nick));
        return;
      }

      if (type === 'history') {
        setMessages((event.messages as RoomMessage[]) ?? []);
        return;
      }

      if (type === 'member-joined') {
        const member = event.member as RoomMember | undefined;
        if (!member) return;
        setMembers((items) =>
          items.some((item) => item.userId === member.userId) ? items : [...items, member],
        );
        pushSystem(`${member.nick} в комнате`);
        return;
      }

      if (type === 'member-left') {
        const leftId = String(event.userId ?? '');
        const leaving = membersRef.current.find((item) => item.userId === leftId);
        setMembers((items) => items.filter((item) => item.userId !== leftId));
        if (leaving) pushSystem(`${leaving.nick} вышел`);
        return;
      }

      if (type === 'host-transferred') {
        setHostId(String(event.userId ?? ''));
        const room = event.room as RoomInfo | undefined;
        if (room) {
          setMembers(room.members ?? []);
          setHostId(room.hostId ?? null);
        }
        const newHost = (event.room as RoomInfo | undefined)?.members.find(
          (item) => item.userId === event.userId,
        );
        pushSystem(`Хост — ${newHost?.nick ?? 'новый участник'}`);
        return;
      }

      if (type === 'msg') {
        const message = event.message as RoomMessage | undefined;
        if (message) setMessages((items) => [...items.slice(-199), message]);
        return;
      }

      if (type === 'reaction') {
        const emoji = String(event.emoji ?? '');
        if (!emoji) return;
        reactionSeq.current += 1;
        const burst: ReactionBurst = {
          id: reactionSeq.current,
          emoji,
          nick: String(event.nick ?? ''),
        };
        setReactions((items) => [...items.slice(-7), burst]);
        setTimeout(() => {
          setReactions((items) => items.filter((item) => item.id !== burst.id));
        }, 2600);
        return;
      }

      if (type === 'typing') {
        const id = String(event.userId ?? '');
        setTyping((items) => ({ ...items, [id]: Boolean(event.typing) }));
        return;
      }

      if (type === 'waiting') {
        const list = (event.members as RoomMember[] | undefined) ?? [];
        setWaitingNames(list.map((item) => item.nick));
        return;
      }

      if (type === 'rate-limit') {
        setError('Слишком часто — подождите пару секунд');
        return;
      }

      if (type === 'banned' || type === 'kicked') {
        optionsRef.current.onClosed?.(
          type === 'banned' ? 'Вас забаннили в комнате' : 'Вас исключили из комнаты',
        );
      }
    },
    [pushSystem],
  );

  const handleRef = useRef(handleEvent);
  handleRef.current = handleEvent;

  useEffect(() => {
    const socket = new RoomSocket(roomSocketUrl(slug), {
      onStatus: setStatus,
      onOpen: () => {
        const opts = optionsRef.current;
        socket.send({
          type: 'join',
          userId: opts.userId,
          nick: opts.nick,
          password: opts.password ?? '',
          ...(opts.token ? { token: opts.token } : {}),
        });
      },
      onEvent: (event) => handleRef.current(event),
    });

    socketRef.current = socket;
    socket.start();

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [slug]);

  // Автоочистка «печатает» через 3 секунды без обновлений.
  useEffect(() => {
    const timer = setInterval(() => {
      setTyping((items) => {
        const next = { ...items };
        let changed = false;
        for (const key of Object.keys(next)) {
          if (!next[key]) {
            delete next[key];
            changed = true;
          }
        }
        return changed ? next : items;
      });
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const send = useCallback((message: Record<string, unknown>) => {
    socketRef.current?.send(message);
  }, []);

  const isHost = Boolean(hostId && hostId === userId);

  const actions = useMemo(
    () => ({
      play: (time: number) => send({ type: 'play', time }),
      pause: (time: number) => send({ type: 'pause', time }),
      seek: (time: number) => send({ type: 'seek', time }),
      setEpisode: (episode: number) => send({ type: 'episode', episode }),
      setRate: (rate: number) => send({ type: 'rate', rate }),
      setTranslation: (translationId: number | null) =>
        send({ type: 'translation', translationId }),
      setQuality: (quality: string | null) => send({ type: 'quality', quality }),
      setHostMode: (enable: boolean) => send({ type: 'host-mode', enable }),
      setPauseOnBuffering: (enable: boolean) => send({ type: 'pause-on-buffering', enable }),
      setWaiting: (waiting: boolean, time?: number) =>
        send({ type: 'waiting', waiting, time }),
      syncNow: (time: number, paused: boolean) => send({ type: 'sync', time, paused }),
      chat: (text: string, emoji?: string) => send({ type: 'msg', text, emoji }),
      reaction: (emoji: string) => send({ type: 'reaction', emoji }),
      typing: (isTyping: boolean) => send({ type: 'typing', typing: isTyping }),
      transferHost: (targetId: string) => send({ type: 'host-transfer', userId: targetId }),
      kick: (targetId: string) => send({ type: 'kick', userId: targetId }),
      ban: (targetId: string) => send({ type: 'ban', userId: targetId }),
      mute: (targetId: string) => send({ type: 'mute', userId: targetId }),
    }),
    [send],
  );

  return {
    status,
    state,
    members,
    messages,
    hostId,
    roomName,
    isPublic,
    isHost,
    userId,
    reactions,
    typing,
    waitingNames,
    error,
    system,
    skewRef,
    actions,
    send,
    clearError: () => setError(null),
  };
}
