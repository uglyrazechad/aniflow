import { Image } from 'expo-image';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fontSize, radius, spacing } from '@/lib/theme';
import type { AnimeSummary } from '@/lib/types';

interface Props {
  anime: AnimeSummary;
  width?: number;
  style?: StyleProp<ViewStyle>;
  subtitle?: string;
}

export function AnimeCard({ anime, width = 124, style, subtitle }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={anime.title}
      onPress={() => router.push(`/anime/${anime.id}`)}
      style={({ pressed }) => [{ width }, pressed && styles.pressed, style]}
    >
      <View style={[styles.poster, { height: width * 1.45 }]}>
        {anime.posterUrl ? (
          <Image
            source={{ uri: anime.posterUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={180}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.posterFallback]}>
            <Text style={styles.fallbackText}>{anime.title.slice(0, 1)}</Text>
          </View>
        )}
        {typeof anime.rating === 'number' && anime.rating > 0 ? (
          <View style={styles.rating}>
            <Text style={styles.ratingText}>★ {anime.rating.toFixed(1)}</Text>
          </View>
        ) : null}
        {anime.episodesTotal ? (
          <View style={styles.episodes}>
            <Text style={styles.episodesText}>{anime.episodesTotal} эп.</Text>
          </View>
        ) : null}
      </View>
      <Text numberOfLines={2} style={styles.title}>
        {anime.title}
      </Text>
      <Text numberOfLines={1} style={styles.meta}>
        {subtitle ?? [anime.year, anime.status].filter(Boolean).join(' · ')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.85,
  },
  poster: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  posterFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  fallbackText: {
    color: colors.text,
    fontSize: 40,
    fontWeight: '800',
  },
  rating: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    backgroundColor: 'rgba(8,8,12,0.78)',
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ratingText: {
    color: colors.gold,
    fontSize: fontSize.caption,
    fontWeight: '700',
  },
  episodes: {
    position: 'absolute',
    bottom: spacing.xs,
    right: spacing.xs,
    backgroundColor: 'rgba(124,92,255,0.9)',
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  episodesText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  title: {
    color: colors.text,
    fontSize: fontSize.small,
    fontWeight: '600',
    marginTop: spacing.sm,
    lineHeight: 17,
  },
  meta: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
    marginTop: 2,
  },
});
