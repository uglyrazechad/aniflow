'use client';

import { useEffect, useImperativeHandle, useRef, useState } from 'react';

import { VideoPlayer, type VideoPlayerHandle } from '@/components/player/video-player';
import { Loader2 } from 'lucide-react';

import type { AnimeLike, PlayerStream, RoomState } from '@/lib/room-types';

interface Props {
  anime: AnimeLike;
  state: RoomState;
  handle: React.Ref<VideoPlayerHandle>;
  className?: string;
  onUserPlay: (time?: number) => void;
  onUserPause: () => void;
  onUserSeek: (time: number) => void;
}

export function RoomVideoPlayer({ anime, state, handle, className, onUserPlay, onUserPause, onUserSeek }: Props) {
  const handleRef = useRef<VideoPlayerHandle | null>(null);
  const [stream, setStream] = useState<PlayerStream | null>(null);
  const lastSyncRef = useRef(0);
  const lastPlayTryRef = useRef(0);
  // Пока применяем чужое состояние, не рассылаем свои play/pause/seek обратно.
  const suppressRef = useRef(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  const suppress = () => {
    suppressRef.current = Date.now() + 600;
  };

  useImperativeHandle(handle, () => ({
    play: () => {
      suppress();
      void handleRef.current?.play();
    },
    pause: () => {
      suppress();
      handleRef.current?.pause();
    },
    seek: (time: number) => {
      suppress();
      handleRef.current?.seek(time);
    },
    getTime: () => handleRef.current?.getTime() ?? 0,
    isPlaying: () => handleRef.current?.isPlaying() ?? false,
    setQuality: (height: number) => handleRef.current?.setQuality(height),
  }));

  // Грузим поток на смену серии / озвучки.
  useEffect(() => {
    if (!anime.id) return undefined;
    let cancelled = false;
    const q = new URLSearchParams({ id: String(anime.id), episode: String(state.episode) });
    if (state.translationId) q.set('translation', String(state.translationId));
    fetch(`/api/player?${q}`)
      .then(async (r) => {
        const data = (await r.json().catch(() => ({}))) as { stream?: PlayerStream; error?: string };
        if (!cancelled && data.stream) setStream(data.stream);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [anime.id, state.episode, state.translationId]);

  // Страховка от поздней загрузки потока: метаданные приходят после первого
  // state-события, поэтому позицию догоняем ещё и по таймеру.
  useEffect(() => {
    if (!stream) return undefined;
    const id = window.setInterval(() => {
      const h = handleRef.current;
      const s = stateRef.current;
      if (!h) return;
      const lag = Math.max(0, Date.now() - s.serverTime) / 1000;
      const target = Math.max(0, s.time + (s.paused ? 0 : lag));
      if (s.time > 0 && Math.abs(h.getTime() - target) > 2.5) {
        suppress();
        h.seek(target);
      }
      if (s.paused && h.isPlaying() && Date.now() - lastSyncRef.current > 3000) {
        suppress();
        h.pause();
      }
    }, 2000);
    return () => window.clearInterval(id);
  }, [stream]);

  // Синхронизация с состоянием комнаты: позиция, пауза, качество.
  useEffect(() => {
    if (!stream) return;
    const h = handleRef.current;
    if (!h) return;

    const now = Date.now();
    const lag = Math.max(0, now - state.serverTime) / 1000;
    const target = Math.max(0, state.time + (state.paused ? 0 : lag));
    const drift = Math.abs(h.getTime() - target);

    if (state.time > 0 && drift > 1.2 && now - lastSyncRef.current > 500) {
      lastSyncRef.current = now;
      suppress();
      h.seek(target);
    }

    if (state.paused) {
      if (h.isPlaying() && now - lastSyncRef.current > 1500) {
        suppress();
        h.pause();
      }
    } else if (!h.isPlaying() && now - lastPlayTryRef.current > 1500) {
      // Автовоспроизведение может быть заблокировано браузером — большой Play
      // остаётся на экране, и его нажатие продолжит с текущей позиции комнаты.
      lastPlayTryRef.current = now;
      suppress();
      h.play();
    }

    const quality = state.quality ? Number(state.quality) : 0;
    if (quality > 0) h.setQuality(quality);
  }, [state, stream]);

  // Локальные действия тоже помечаем, чтобы эхо не ломало вещание.
  const markLocal = () => {
    lastSyncRef.current = Date.now();
  };

  if (!stream) {
    return (
      <div className="aspect-video w-full animate-pulse rounded-2xl bg-black/50 backdrop-blur-sm flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className={`relative aspect-video w-full rounded-2xl bg-black ring-1 ring-white/10 ${className ?? ''}`}>
      <VideoPlayer
        ref={handleRef}
        className="h-full w-full"
        title={anime.title}
        subtitle={`Серия ${state.episode}`}
        poster={anime.posterUrl}
        src={stream.src}
        type={stream.type}
        onPlay={() => {
          if (Date.now() < suppressRef.current) return;
          markLocal();
          const s = stateRef.current;
          const player = handleRef.current;
          const current = player?.getTime() ?? 0;
          const lag = Math.max(0, Date.now() - s.serverTime) / 1000;
          const target = s.time + (s.paused ? 0 : lag);
          // Локальный плеер отстал (только загрузился / гость открыл комнату):
          // сначала догоняем комнату, потом уже сообщаем о воспроизведении.
          if (s.time > 0 && Math.abs(current - target) > 1.2) {
            player?.seek(target);
            if (s.paused) onUserPlay(target);
            return;
          }
          // Комната уже играет — догоняем молча, иначе гость отмотал бы всех.
          if (!s.paused && s.time > 0) return;
          onUserPlay(current);
        }}
        onPause={() => {
          if (Date.now() < suppressRef.current) return;
          markLocal();
          onUserPause();
        }}
        onSeek={(time) => {
          if (Date.now() < suppressRef.current) return;
          markLocal();
          onUserSeek(time);
        }}
      />
    </div>
  );
}
