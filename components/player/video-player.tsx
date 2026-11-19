'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Check,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Settings2,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type Hls from 'hls.js';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn, formatTime } from '@/lib/utils';

interface VideoPlayerProps {
  title: string;
  subtitle?: string;
  poster?: string;
  src: string;
  type?: 'hls' | 'mp4';
  autoPlay?: boolean;
  /** Секунда, с которой нужно начать воспроизведение при монтировании. */
  initialTime?: number;
  /** Окно заставки: пока текущая секунда внутри, показываем «Пропустить заставку». */
  intro?: { start: number; end: number };
  onProgress?: (time: number, duration: number) => void;
  onEnded?: () => void;
  className?: string;
}

interface QualityLevel {
  height: number;
  index: number;
}

export function VideoPlayer({
  title,
  subtitle,
  poster,
  src,
  type = 'hls',
  autoPlay = false,
  initialTime = 0,
  intro,
  onProgress,
  onEnded,
  className,
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideTimer = useRef<number | undefined>(undefined);

  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [levels, setLevels] = useState<QualityLevel[]>([]);
  const [selectedLevel, setSelectedLevel] = useState(-1);
  const [currentHeight, setCurrentHeight] = useState(0);
  const playbackRef = useRef({ time: 0, playing: false });

  // Последняя известная позиция — для сохранения прогресса.
  const latestRef = useRef({ time: 0, duration: 0 });
  const savedAtRef = useRef(0);
  const initialTimeRef = useRef(initialTime);

  const reportProgress = useCallback(
    (time: number, duration: number) => {
      latestRef.current = { time, duration };
      onProgress?.(time, duration);
    },
    [onProgress],
  );

  // --- Загрузка потока: HLS через hls.js с адаптивным качеством или прямой MP4 ---
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const isMp4 = type === 'mp4' || /\.mp4($|\?)/i.test(src);
    const resumeAt = playbackRef.current.time;
    const resumePlaying = playbackRef.current.playing;

    let cancelled = false;
    let hls: Hls | null = null;
    let networkRetried = false;

    setLoading(true);
    setError(null);
    setLevels([]);
    setSelectedLevel(-1);
    setCurrentHeight(0);

    const restorePosition = () => {
      const startAt = resumeAt > 0.5 ? resumeAt : initialTimeRef.current;
      if (startAt > 0.5) {
        try {
          video.currentTime = startAt;
        } catch {
          /* некоторые браузеры не дают выставить время до загрузки */
        }
      }
      if (autoPlay || resumePlaying) void video.play().catch(() => undefined);
    };

    if (isMp4) {
      video.src = src;
      const onLoaded = () => {
        setLoading(false);
        restorePosition();
      };
      video.addEventListener('loadedmetadata', onLoaded, { once: true });
      video.load();

      return () => {
        cancelled = true;
        video.removeEventListener('loadedmetadata', onLoaded);
        video.removeAttribute('src');
        video.load();
      };
    }

    const startPlayback = async () => {
      const { default: HlsPlayer } = await import('hls.js');
      if (cancelled) return;

      if (HlsPlayer.isSupported()) {
        hls = new HlsPlayer({ enableWorker: true, backBufferLength: 90 });
        hlsRef.current = hls;

        hls.attachMedia(video);
        hls.on(HlsPlayer.Events.MEDIA_ATTACHED, () => hls?.loadSource(src));
        hls.on(HlsPlayer.Events.MANIFEST_PARSED, (_event, data) => {
          const byHeight = new Map<number, number>();
          data.levels.forEach((level, index) => {
            if (level.height && !byHeight.has(level.height)) byHeight.set(level.height, index);
          });
          setLevels(
            [...byHeight.entries()]
              .sort((a, b) => b[0] - a[0])
              .map(([height, index]) => ({ height, index })),
          );
          setLoading(false);
          restorePosition();
        });
        hls.on(HlsPlayer.Events.LEVEL_SWITCHED, (_event, data) => {
          setCurrentHeight(hls?.levels[data.level]?.height ?? 0);
        });
        hls.on(HlsPlayer.Events.ERROR, (_event, data) => {
          if (!data.fatal) return;

          if (data.type === HlsPlayer.ErrorTypes.NETWORK_ERROR && !networkRetried) {
            networkRetried = true;
            hls?.startLoad();
            return;
          }
          if (data.type === HlsPlayer.ErrorTypes.MEDIA_ERROR) {
            hls?.recoverMediaError();
            return;
          }

          setError('Не удалось загрузить поток. Попробуйте другую озвучку или серию.');
          setLoading(false);
          hls?.destroy();
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src;
        video.addEventListener(
          'loadedmetadata',
          () => {
            setLoading(false);
            restorePosition();
          },
          { once: true },
        );
        video.load();
      } else {
        setError('Браузер не поддерживает воспроизведение HLS.');
        setLoading(false);
      }
    };

    void startPlayback();

    return () => {
      cancelled = true;
      hls?.destroy();
      hlsRef.current = null;
      video.removeAttribute('src');
      video.load();
    };
  }, [src, type, autoPlay, reloadKey]);

  // Громкость
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
    video.muted = muted;
  }, [volume, muted]);

  // Fullscreen listener
  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Досохраняем позицию, когда страница уходит в фон (закрытие вкладки, переключение приложения).
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === 'hidden') {
        reportProgress(latestRef.current.time, latestRef.current.duration);
      }
    };
    document.addEventListener('visibilitychange', flush);
    return () => document.removeEventListener('visibilitychange', flush);
  }, [reportProgress]);

  const applyLevel = useCallback((index: number) => {
    setSelectedLevel(index);
    const hls = hlsRef.current;
    if (hls) hls.currentLevel = index;
  }, []);

  const scheduleHide = useCallback(() => {
    window.clearTimeout(hideTimer.current);
    if (!videoRef.current || videoRef.current.paused || menuOpen) return;
    hideTimer.current = window.setTimeout(() => setControlsVisible(false), 3000);
  }, [menuOpen]);

  const revealControls = useCallback(() => {
    setControlsVisible(true);
    scheduleHide();
  }, [scheduleHide]);

  useEffect(() => {
    setControlsVisible(true);
    scheduleHide();
    return () => window.clearTimeout(hideTimer.current);
  }, [playing, scheduleHide]);

  const togglePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      try {
        await video.play();
      } catch {
        setError('Браузер заблокировал автовоспроизведение. Нажмите «Play» ещё раз.');
      }
    } else {
      video.pause();
    }
  }, []);

  const seekTo = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;
    const max = video.duration || 0;
    const next = Math.min(Math.max(time, 0), max);
    video.currentTime = next;
    setCurrentTime(next);
  }, []);

  const seekBy = useCallback(
    (delta: number) => {
      const video = videoRef.current;
      if (!video) return;
      seekTo(video.currentTime + delta);
    },
    [seekTo],
  );

  const toggleMute = () => setMuted((value) => !value);

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    const video = videoRef.current as (HTMLVideoElement & {
      webkitEnterFullscreen?: () => void;
    }) | null;

    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
      return;
    }

    if (container?.requestFullscreen) {
      await container.requestFullscreen().catch(() => undefined);
    } else {
      video?.webkitEnterFullscreen?.();
    }
  }, []);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case ' ':
      case 'k':
        event.preventDefault();
        void togglePlay();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        seekBy(-5);
        revealControls();
        break;
      case 'ArrowRight':
        event.preventDefault();
        seekBy(5);
        revealControls();
        break;
      case 'ArrowUp':
        event.preventDefault();
        setVolume((value) => Math.min(1, Number((value + 0.1).toFixed(2))));
        revealControls();
        break;
      case 'ArrowDown':
        event.preventDefault();
        setVolume((value) => Math.max(0, Number((value - 0.1).toFixed(2))));
        revealControls();
        break;
      case 'm':
        toggleMute();
        break;
      case 'f':
        void toggleFullscreen();
        break;
      default:
        break;
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;
  const showControls = controlsVisible || !playing || menuOpen;

  const showSkipIntro =
    intro != null &&
    currentTime >= intro.start &&
    currentTime < intro.end - 1 &&
    (duration === 0 || intro.end < duration * 0.5);

  const selectedQuality =
    selectedLevel >= 0
      ? levels.find((level) => level.index === selectedLevel)?.height
      : undefined;
  const qualityLabel = selectedQuality ? `${selectedQuality}p` : 'Авто';
  const qualityBadge = selectedQuality
    ? `${selectedQuality}p`
    : currentHeight
      ? `${currentHeight}p`
      : 'HD';

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerMove={revealControls}
      onPointerLeave={() => playing && !menuOpen && setControlsVisible(false)}
      className={cn(
        'group/player relative aspect-video w-full select-none overflow-hidden rounded-2xl bg-black ring-1 ring-white/10 outline-none focus-visible:ring-2 focus-visible:ring-primary [&:fullscreen]:aspect-auto [&:fullscreen]:h-screen [&:fullscreen]:rounded-none',
        className,
      )}
      aria-label={`Плеер: ${title}`}
    >
      <video
        ref={videoRef}
        poster={poster}
        playsInline
        preload="metadata"
        className="h-full w-full bg-black object-contain"
        onClick={() => {
          setStarted(true);
          void togglePlay();
        }}
        onPlay={() => {
          setPlaying(true);
          setStarted(true);
          playbackRef.current.playing = true;
        }}
        onPause={() => {
          setPlaying(false);
          playbackRef.current.playing = false;
          const video = videoRef.current;
          if (video) reportProgress(video.currentTime, video.duration || latestRef.current.duration);
        }}
        onTimeUpdate={(event) => {
          const video = event.currentTarget;
          setCurrentTime(video.currentTime);
          playbackRef.current.time = video.currentTime;
          latestRef.current.time = video.currentTime;

          // Пишем прогресс не чаще раза в 5 секунд, чтобы не дёргать хранилище.
          if (video.currentTime - savedAtRef.current >= 5) {
            savedAtRef.current = video.currentTime;
            reportProgress(video.currentTime, video.duration || latestRef.current.duration);
          }
        }}
        onDurationChange={(event) => {
          const value = event.currentTarget.duration || 0;
          latestRef.current.duration = value;
          setDuration(value);
        }}
        onProgress={(event) => {
          const video = event.currentTarget;
          setBuffered(video.buffered.length ? video.buffered.end(video.buffered.length - 1) : 0);
        }}
        onWaiting={() => setLoading(true)}
        onPlaying={() => setLoading(false)}
        onCanPlay={() => setLoading(false)}
        onEnded={() => {
          setPlaying(false);
          latestRef.current.time = 0;
          onProgress?.(0, latestRef.current.duration);
          onEnded?.();
        }}
        onError={() => {
          if (hlsRef.current) return;
          setError('Не удалось загрузить видео. Проверьте соединение и попробуйте снова.');
          setLoading(false);
        }}
        onLoadedMetadata={(event) => {
          const value = event.currentTarget.duration || 0;
          latestRef.current.duration = value;
          setDuration(value);
        }}
      />

      {/* Верхняя панель */}
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-4 bg-gradient-to-b from-black/80 via-black/30 to-transparent p-4 pb-10 transition-opacity duration-300',
          showControls ? 'opacity-100' : 'opacity-0',
        )}
      >
        <div className="min-w-0">
          <p className="line-clamp-1 text-sm font-semibold text-white">{title}</p>
          {subtitle ? <p className="line-clamp-1 text-xs text-white/60">{subtitle}</p> : null}
        </div>
        <span className="shrink-0 rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-[11px] font-medium text-white/80 backdrop-blur-md">
          {qualityBadge}
        </span>
      </div>

      {/* Оверлей «нажмите play» */}
      <AnimatePresence>
        {!started && !error ? (
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setStarted(true);
              void togglePlay();
            }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-gradient-to-t from-black/80 via-black/30 to-black/50"
            aria-label="Начать просмотр"
          >
            {poster ? (
              <img
                src={poster}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-35"
              />
            ) : null}
            <span className="relative flex h-20 w-20 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white shadow-2xl backdrop-blur-md transition-transform duration-300 hover:scale-105">
              <Play className="h-8 w-8 translate-x-0.5 fill-white" />
            </span>
            <span className="relative text-sm font-medium text-white/80">Смотреть</span>
          </motion.button>
        ) : null}
      </AnimatePresence>

      {/* Буферизация */}
      {loading && !error ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/50 backdrop-blur-md">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </span>
        </div>
      ) : null}

      {/* Ошибка */}
      {error ? (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-black/80 px-6 text-center backdrop-blur-sm">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
            <AlertTriangle className="h-6 w-6" />
          </span>
          <p className="max-w-md text-sm text-white/80">{error}</p>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setError(null);
              setReloadKey((key) => key + 1);
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Повторить
          </Button>
        </div>
      ) : null}

      {/* Пропуск заставки */}
      {showSkipIntro && intro ? (
        <button
          type="button"
          onClick={() => {
            seekTo(intro.end);
            revealControls();
          }}
          className="absolute bottom-24 right-3 z-30 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-black/65 px-3.5 py-2.5 text-xs font-medium text-white shadow-lg backdrop-blur-md transition-colors hover:border-white/30 hover:bg-black/80 sm:bottom-28 sm:text-sm"
        >
          <SkipForward className="h-4 w-4" />
          Пропустить заставку
        </button>
      ) : null}

      {/* Нижние органы управления */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 pb-3 pt-10 transition-opacity duration-300',
          showControls ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        {/* Прогресс */}
        <div className="group/progress relative mb-2 flex h-6 items-center">
          <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/20">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-white/25"
              style={{ width: `${Math.min(bufferedPercent, 100)}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-brand-400 to-teal-400"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span
            className="pointer-events-none absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white opacity-0 shadow-md transition-opacity group-hover/progress:opacity-100"
            style={{ left: `calc(${progress}% - 6px)` }}
          />
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(currentTime, duration || 0)}
            onChange={(event) => seekTo(Number(event.target.value))}
            aria-label="Перемотка"
            className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent opacity-0"
          />
        </div>

        <div className="flex items-center gap-1.5 text-white">
          <button
            type="button"
            onClick={() => void togglePlay()}
            aria-label={playing ? 'Пауза' : 'Воспроизвести'}
            className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-white/10"
          >
            {playing ? <Pause className="h-5 w-5 fill-white" /> : <Play className="h-5 w-5 fill-white" />}
          </button>

          <button
            type="button"
            onClick={() => seekBy(-10)}
            aria-label="Назад на 10 секунд"
            className="hidden h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-white/10 sm:flex"
          >
            <RotateCcw className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            onClick={() => seekBy(10)}
            aria-label="Вперёд на 10 секунд"
            className="hidden h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-white/10 sm:flex"
          >
            <RotateCw className="h-[18px] w-[18px]" />
          </button>

          {/* Громкость */}
          <div className="group/volume flex items-center">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? 'Включить звук' : 'Выключить звук'}
              className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-white/10"
            >
              {muted || volume === 0 ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </button>
            <div className="hidden w-0 items-center overflow-hidden transition-all duration-200 group-hover/volume:w-24 group-hover/volume:pl-1 sm:flex">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setVolume(next);
                  setMuted(next === 0);
                }}
                aria-label="Громкость"
                className="volume-range w-full"
                style={{
                  background: `linear-gradient(to right, hsl(var(--primary)) ${
                    (muted ? 0 : volume) * 100
                  }%, rgba(255,255,255,0.25) ${(muted ? 0 : volume) * 100}%)`,
                }}
              />
            </div>
          </div>

          <span className="ml-1 text-xs tabular-nums text-white/80">
            {formatTime(currentTime)}
            <span className="mx-1 text-white/30">/</span>
            {formatTime(duration)}
          </span>

          <div className="ml-auto flex items-center gap-1">
            {levels.length > 0 ? (
              <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Настройки качества"
                    className="flex h-9 items-center gap-1.5 rounded-lg px-2 text-xs transition-colors hover:bg-white/10"
                  >
                    <Settings2 className="h-[18px] w-[18px]" />
                    <span className="hidden sm:inline">{qualityLabel}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="top" className="w-40 border-white/10 bg-black/90 text-white">
                  <DropdownMenuLabel className="text-white/50">Качество</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem
                    onClick={() => applyLevel(-1)}
                    className="focus:bg-white/10 focus:text-white"
                  >
                    <span className="flex-1">Авто</span>
                    {selectedLevel === -1 ? <Check className="h-4 w-4" /> : null}
                  </DropdownMenuItem>
                  {levels.map((level) => (
                    <DropdownMenuItem
                      key={level.height}
                      onClick={() => applyLevel(level.index)}
                      className="focus:bg-white/10 focus:text-white"
                    >
                      <span className="flex-1">{level.height}p</span>
                      {level.index === selectedLevel ? <Check className="h-4 w-4" /> : null}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}

            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              aria-label={fullscreen ? 'Выйти из полноэкранного режима' : 'Полный экран'}
              className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-white/10"
            >
              {fullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
