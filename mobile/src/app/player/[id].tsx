import { useEvent, useEventListener } from 'expo';
import { router, useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { SeekBar } from '@/components/seek-bar';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatTime } from '@/lib/format';
import { saveLocalProgress } from '@/lib/storage';
import { colors, fontSize, radius, spacing } from '@/lib/theme';
import { useFetch } from '@/lib/use-fetch';
import { contentTypeFor } from '@/lib/video';
import type { WatchProgress } from '@/lib/types';

const RATES = [0.75, 1, 1.25, 1.5];

export default function PlayerScreen() {
  const params = useLocalSearchParams<{
    id: string;
    episode?: string;
    translation?: string;
    start?: string;
    title?: string;
  }>();
  const id = String(params.id);
  const episode = Math.max(1, Number(params.episode ?? 1) || 1);
  const translation = params.translation ? Number(params.translation) : undefined;
  const startAt = Math.max(0, Number(params.start ?? 0) || 0);
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const payload = useFetch(
    () => api.player({ id, episode, translation: translation ?? null }),
    [id, episode, translation],
  );

  const player = useVideoPlayer(null, (instance) => {
    instance.timeUpdateEventInterval = 1;
  });
  const videoRef = useRef<VideoView>(null);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState(player.status);
  const [rateIndex, setRateIndex] = useState(1);
  const [subtitleLabel, setSubtitleLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });

  useEventListener(player, 'statusChange', ({ status: next, error: issue }) => {
    setStatus(next);
    setDuration(player.duration || 0);
    if (issue) setError(issue.message);
  });

  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    setTime(currentTime);
    if (player.duration) setDuration(player.duration);
  });

  // Загружаем поток и ставим позицию из «Продолжить просмотр».
  useEffect(() => {
    const src = payload.data?.stream.src;
    if (!src) return;
    startedRef.current = false;
    setError(null);

    (async () => {
      try {
        await player.replaceAsync({ uri: src, contentType: contentTypeFor(payload.data?.stream.type) });
        if (startAt > 0) player.currentTime = startAt;
        player.play();
      } catch (issue) {
        setError(issue instanceof Error ? issue.message : 'Поток недоступен');
      }
    })();
  }, [payload.data?.stream.src, payload.data?.stream.type, player, startAt]);

  const saveProgress = useCallback(() => {
    const position = player.currentTime;
    if (!Number.isFinite(position) || position < 5) return;
    const entry: WatchProgress = {
      id,
      title: String(params.title ?? payload.data?.translation?.title ?? id),
      posterUrl: undefined,
      season: 1,
      episode,
      translationId: translation ?? 0,
      translationTitle: payload.data?.translation?.title,
      position,
      duration: player.duration || 0,
      updatedAt: Date.now(),
    };
    if (token) api.saveProgress(token, entry).catch(() => undefined);
    else saveLocalProgress(entry).catch(() => undefined);
  }, [episode, id, params.title, payload.data?.translation?.title, player, token, translation]);

  useEffect(() => {
    const timer = setInterval(saveProgress, 15000);
    return () => {
      clearInterval(timer);
      saveProgress();
    };
  }, [saveProgress]);

  const togglePlay = () => {
    if (player.playing) player.pause();
    else player.play();
  };

  const skip = (seconds: number) => {
    const next = Math.min(Math.max(0, player.currentTime + seconds), player.duration || Infinity);
    player.currentTime = next;
  };

  const cycleRate = () => {
    const nextIndex = (rateIndex + 1) % RATES.length;
    setRateIndex(nextIndex);
    player.playbackRate = RATES[nextIndex];
  };

  const cycleSubtitles = () => {
    const tracks = player.availableSubtitleTracks;
    if (!tracks.length) return;
    if (!player.subtitleTrack) {
      player.subtitleTrack = tracks[0];
      setSubtitleLabel(tracks[0].label ?? tracks[0].language ?? 'CC');
    } else {
      player.subtitleTrack = null;
      setSubtitleLabel(null);
    }
  };

  const sourceLabel = useMemo(
    () => payload.data?.translation?.title ?? 'Озвучка по умолчанию',
    [payload.data?.translation?.title],
  );

  const loading = !payload.data && payload.loading;

  return (
    <View style={styles.root}>
      <View style={[styles.videoWrap, { paddingTop: insets.top }]}>
        <VideoView
          ref={videoRef}
          player={player}
          style={styles.video}
          nativeControls={false}
          contentFit="contain"
          fullscreenOptions={{ enable: true }}
        />

        <View style={styles.topBar}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            hitSlop={12}
            style={styles.roundButton}
          >
            <Text style={styles.roundIcon}>‹</Text>
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>
            {String(params.title ?? 'Плеер')} · серия {episode}
          </Text>
        </View>

        {loading ? (
          <View style={styles.centerOverlay}>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={styles.overlayText}>Готовим поток…</Text>
          </View>
        ) : null}

        {payload.error || error ? (
          <View style={styles.centerOverlay}>
            <Text style={styles.overlayText}>{payload.error ?? error}</Text>
            <Button title="Повторить" size="sm" variant="secondary" onPress={payload.reload} />
          </View>
        ) : null}

        {!payload.error && !error ? (
          <Pressable style={styles.centerTap} onPress={togglePlay}>
            {!isPlaying && status !== 'loading' ? <Text style={styles.playIcon}>▶</Text> : null}
          </Pressable>
        ) : null}

        <View style={styles.controls}>
          <SeekBar
            position={time}
            duration={duration}
            onSeek={(position) => {
              player.currentTime = position;
              setTime(position);
            }}
            disabled={!duration}
          />
          <View style={styles.controlsRow}>
            <Text style={styles.timeText}>{formatTime(time)}</Text>
            <View style={styles.controlsButtons}>
              <Pressable onPress={() => skip(-10)} style={styles.smallButton}>
                <Text style={styles.smallButtonText}>−10</Text>
              </Pressable>
              <Pressable onPress={togglePlay} style={[styles.smallButton, styles.playButton]}>
                <Text style={styles.playButtonText}>{isPlaying ? '❚❚' : '▶'}</Text>
              </Pressable>
              <Pressable onPress={() => skip(10)} style={styles.smallButton}>
                <Text style={styles.smallButtonText}>+10</Text>
              </Pressable>
              <Pressable onPress={cycleRate} style={styles.smallButton}>
                <Text style={styles.smallButtonText}>{RATES[rateIndex]}×</Text>
              </Pressable>
              <Pressable onPress={cycleSubtitles} style={[styles.smallButton, subtitleLabel && styles.smallButtonActive]}>
                <Text style={styles.smallButtonText}>CC</Text>
              </Pressable>
              <Pressable onPress={() => videoRef.current?.enterFullscreen()} style={styles.smallButton}>
                <Text style={styles.smallButtonText}>⛶</Text>
              </Pressable>
            </View>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.info}>
        <Text style={styles.infoTitle}>{String(params.title ?? 'Просмотр')}</Text>
        <Text style={styles.infoMeta}>
          Серия {episode} · {sourceLabel}
        </Text>
        <Text style={styles.infoHint}>
          Позиция сохраняется автоматически. Выйдите и вернитесь — продолжим с того же места.
        </Text>
        <Button
          title="Смотреть вместе с друзьями"
          variant="secondary"
          onPress={() =>
            router.push({
              pathname: '/room/create',
              params: { animeId: id, title: String(params.title ?? ''), episode: String(episode) },
            })
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  videoWrap: {
    backgroundColor: '#000',
    aspectRatio: 16 / 9,
    width: '100%',
    justifyContent: 'center',
  },
  video: {
    ...StyleSheet.absoluteFill,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  roundButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(8,8,12,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundIcon: {
    color: '#fff',
    fontSize: 24,
    marginTop: -2,
  },
  title: {
    flex: 1,
    color: '#fff',
    fontSize: fontSize.small,
    fontWeight: '700',
  },
  centerOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(8,8,12,0.55)',
  },
  centerTap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 46,
  },
  overlayText: {
    color: colors.text,
    fontSize: fontSize.body,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  controls: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    bottom: 0,
    paddingBottom: spacing.xs,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  controlsButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    minWidth: 36,
  },
  smallButton: {
    minWidth: 32,
    height: 28,
    paddingHorizontal: 6,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallButtonActive: {
    backgroundColor: colors.accent,
  },
  smallButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  playButton: {
    backgroundColor: colors.accent,
    minWidth: 38,
  },
  playButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  info: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  infoTitle: {
    color: colors.text,
    fontSize: fontSize.title,
    fontWeight: '800',
  },
  infoMeta: {
    color: colors.textMuted,
    fontSize: fontSize.small,
  },
  infoHint: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
});
