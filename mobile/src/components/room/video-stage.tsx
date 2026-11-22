import { useEventListener } from 'expo';
import { VideoView, type VideoPlayer } from 'expo-video';
import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SeekBar } from '@/components/seek-bar';
import { formatTime } from '@/lib/format';
import type { ReactionBurst } from '@/lib/room/use-room';
import { colors, fontSize, radius, spacing } from '@/lib/theme';

interface Props {
  player: VideoPlayer;
  playing: boolean;
  duration: number;
  canControl: boolean;
  episode: number;
  episodesTotal: number;
  waitingNames: string[];
  reactions: ReactionBurst[];
  buffering: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onSkip: (delta: number) => void;
  onRate: (rate: number) => void;
  onEpisode: (episode: number) => void;
}

const RATES = [0.75, 1, 1.25, 1.5];

export function VideoStage({
  player,
  playing,
  duration,
  canControl,
  episode,
  episodesTotal,
  waitingNames,
  reactions,
  buffering,
  onTogglePlay,
  onSeek,
  onSkip,
  onRate,
  onEpisode,
}: Props) {
  const videoRef = useRef<VideoView>(null);
  const [time, setTime] = useState(0);
  const [rateIndex, setRateIndex] = useState(1);

  useEventListener(player, 'timeUpdate', ({ currentTime }) => setTime(currentTime));

  const cycleRate = () => {
    const next = (rateIndex + 1) % RATES.length;
    setRateIndex(next);
    onRate(RATES[next]);
  };

  return (
    <View style={styles.wrap}>
      <VideoView
        ref={videoRef}
        player={player}
        style={StyleSheet.absoluteFill}
        nativeControls={false}
        contentFit="contain"
        fullscreenOptions={{ enable: true }}
      />

      <Pressable style={styles.tapArea} onPress={canControl ? onTogglePlay : undefined}>
        {!playing && !buffering ? <Text style={styles.playIcon}>▶</Text> : null}
      </Pressable>

      <View style={styles.reactionRail} pointerEvents="none">
        {reactions.map((burst) => (
          <View key={burst.id} style={styles.reaction}>
            <Text style={styles.reactionEmoji}>{burst.emoji}</Text>
            <Text style={styles.reactionNick} numberOfLines={1}>
              {burst.nick}
            </Text>
          </View>
        ))}
      </View>

      {waitingNames.length ? (
        <View style={styles.waiting}>
          <Text style={styles.waitingText}>ждём {waitingNames.join(', ')}</Text>
        </View>
      ) : null}

      {!canControl ? (
        <View style={styles.locked}>
          <Text style={styles.lockedText}>управляет хост · серия {episode}</Text>
        </View>
      ) : null}

      <View style={styles.controls}>
        <SeekBar
          position={time}
          duration={duration}
          onSeek={canControl ? onSeek : () => undefined}
          disabled={!canControl}
        />
        <View style={styles.row}>
          <Text style={styles.time}>{formatTime(time)}</Text>
          <View style={styles.buttons}>
            <Pressable onPress={() => onSkip(-10)} disabled={!canControl} style={styles.button}>
              <Text style={styles.buttonText}>−10</Text>
            </Pressable>
            <Pressable
              onPress={onTogglePlay}
              disabled={!canControl}
              style={[styles.button, styles.playButton]}
            >
              <Text style={styles.buttonText}>{playing ? '❚❚' : '▶'}</Text>
            </Pressable>
            <Pressable onPress={() => onSkip(10)} disabled={!canControl} style={styles.button}>
              <Text style={styles.buttonText}>+10</Text>
            </Pressable>
            <Pressable onPress={() => onEpisode(episode - 1)} disabled={!canControl || episode <= 1} style={styles.button}>
              <Text style={styles.buttonText}>‹</Text>
            </Pressable>
            <Pressable
              onPress={() => onEpisode(episode + 1)}
              disabled={!canControl || episode >= episodesTotal}
              style={styles.button}
            >
              <Text style={styles.buttonText}>›</Text>
            </Pressable>
            <Pressable onPress={cycleRate} disabled={!canControl} style={styles.button}>
              <Text style={styles.buttonText}>{RATES[rateIndex]}×</Text>
            </Pressable>
            <Pressable onPress={() => videoRef.current?.enterFullscreen()} style={styles.button}>
              <Text style={styles.buttonText}>⛶</Text>
            </Pressable>
          </View>
          <Text style={[styles.time, styles.timeRight]}>{formatTime(duration)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    justifyContent: 'flex-end',
  },
  tapArea: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 44,
  },
  reactionRail: {
    position: 'absolute',
    right: spacing.md,
    bottom: 80,
    gap: spacing.xs,
    alignItems: 'flex-end',
  },
  reaction: {
    alignItems: 'center',
    backgroundColor: 'rgba(8,8,12,0.6)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  reactionEmoji: {
    fontSize: 20,
  },
  reactionNick: {
    color: colors.textMuted,
    fontSize: 9,
    maxWidth: 70,
  },
  waiting: {
    position: 'absolute',
    top: spacing.md,
    alignSelf: 'center',
    backgroundColor: 'rgba(8,8,12,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255,201,74,0.5)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  waitingText: {
    color: colors.gold,
    fontSize: fontSize.caption,
    fontWeight: '700',
  },
  locked: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(8,8,12,0.6)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  lockedText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  controls: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  buttons: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
  },
  button: {
    minWidth: 30,
    height: 26,
    borderRadius: radius.sm,
    paddingHorizontal: 5,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    backgroundColor: colors.accent,
    minWidth: 36,
  },
  buttonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  time: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontVariant: ['tabular-nums'],
    minWidth: 34,
  },
  timeRight: {
    textAlign: 'right',
  },
});
