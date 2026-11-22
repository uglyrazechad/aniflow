import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { ScreenHeader } from '@/components/header';
import { Screen } from '@/components/screen';
import { ErrorState, LoadingState } from '@/components/state-view';
import { api, describeError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDuration, plural } from '@/lib/format';
import { colors, fontSize, radius, spacing } from '@/lib/theme';
import { useFetch } from '@/lib/use-fetch';
import type { TranslationOption } from '@/lib/types';

export default function AnimeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const details = useFetch(() => api.anime(String(id)), [id]);
  const [episode, setEpisode] = useState(1);
  const [translation, setTranslation] = useState<TranslationOption | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const anime = details.data?.anime;
  const translations = details.data?.translations ?? [];
  const episodesTotal = Math.min(anime?.episodesTotal ?? 1, 200);

  const episodes = useMemo(
    () => Array.from({ length: Math.max(1, episodesTotal) }, (_, index) => index + 1),
    [episodesTotal],
  );

  const openPlayer = (startPosition = 0, customEpisode = episode) => {
    router.push({
      pathname: '/player/[id]',
      params: {
        id: String(id),
        episode: String(customEpisode),
        translation: translation ? String(translation.id) : '',
        start: String(startPosition),
      },
    });
  };

  const addFavorite = async () => {
    if (!token || !anime) {
      setNotice('Войдите, чтобы добавить в избранное');
      return;
    }
    try {
      await api.addFavorite(token, {
        id: anime.id,
        title: anime.title,
        posterUrl: anime.posterUrl,
        year: anime.year,
        rating: anime.rating,
      });
      setNotice('Добавлено в избранное');
    } catch (issue) {
      setNotice(describeError(issue));
    }
  };

  if (details.loading && !anime) {
    return (
      <Screen>
        <ScreenHeader title="Тайтл" />
        <LoadingState title="Открываем страницу" />
      </Screen>
    );
  }

  if (details.error || !anime) {
    return (
      <Screen>
        <ScreenHeader title="Тайтл" />
        <ErrorState message={details.error ?? 'Тайтл не найден'} onRetry={details.reload} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title={anime.title} subtitle={anime.titleOrig} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.head}>
          <View style={styles.posterWrap}>
            {anime.posterUrl ? (
              <Image source={{ uri: anime.posterUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : null}
          </View>
          <View style={styles.headInfo}>
            <Text style={styles.title}>{anime.title}</Text>
            <Text style={styles.meta}>
              {[anime.year, anime.type === 'anime' ? 'фильм' : 'сериал', anime.status]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            <View style={styles.badges}>
              {anime.rating ? (
                <View style={[styles.badge, styles.badgeGold]}>
                  <Text style={styles.badgeGoldText}>★ {anime.rating.toFixed(1)}</Text>
                </View>
              ) : null}
              {anime.minimalAge ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{anime.minimalAge}+</Text>
                </View>
              ) : null}
              {anime.duration ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{formatDuration(anime.duration)}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.episodesLine}>
              {anime.episodesTotal
                ? `${anime.episodesTotal} ${plural(anime.episodesTotal, 'серия', 'серии', 'серий')}`
                : 'Серии уточняются'}
            </Text>
            {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          </View>
        </View>

        <View style={styles.actions}>
          <Button title="Смотреть" onPress={() => openPlayer()} style={styles.flex} />
          <Button
            title="Комната"
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: '/room/create',
                params: { animeId: anime.id, title: anime.title, episode: String(episode) },
              })
            }
            style={styles.flex}
          />
        </View>

        {anime.genres?.length ? (
          <View style={styles.genres}>
            {anime.genres.map((genre) => (
              <View key={genre} style={styles.genreChip}>
                <Text style={styles.genreText}>{genre}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {anime.description ? (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Описание</Text>
            <Text style={styles.description}>{anime.description}</Text>
          </View>
        ) : null}

        {translations.length > 1 ? (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Озвучка / субтитры</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {translations.map((item) => {
                const active = translation?.id === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setTranslation(active ? null : item)}
                    style={[styles.optionChip, active && styles.optionChipActive]}
                  >
                    <Text style={[styles.optionText, active && styles.optionTextActive]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {item.type === 'subtitles' ? (
                      <Text style={styles.optionHint}>субтитры</Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Серии</Text>
          <View style={styles.episodesGrid}>
            {episodes.map((number) => {
              const active = number === episode;
              return (
                <Pressable
                  key={number}
                  onPress={() => {
                    setEpisode(number);
                    openPlayer(0, number);
                  }}
                  style={[styles.episode, active && styles.episodeActive]}
                >
                  <Text style={[styles.episodeText, active && styles.episodeTextActive]}>{number}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.secondaryActions}>
          <Button
            title="Создать комнату"
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: '/room/create',
                params: { animeId: anime.id, title: anime.title, episode: String(episode) },
              })
            }
            style={styles.flex}
          />
          <Button title="☆ В избранное" variant="ghost" onPress={addFavorite} style={styles.flex} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  head: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  posterWrap: {
    width: 132,
    height: 192,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headInfo: {
    flex: 1,
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.heading,
    fontWeight: '900',
    lineHeight: 26,
  },
  meta: {
    color: colors.textMuted,
    fontSize: fontSize.small,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  badge: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeGold: {
    backgroundColor: 'rgba(255,201,74,0.12)',
    borderColor: 'rgba(255,201,74,0.4)',
  },
  badgeText: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
    fontWeight: '700',
  },
  badgeGoldText: {
    color: colors.gold,
    fontSize: fontSize.caption,
    fontWeight: '800',
  },
  episodesLine: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
  },
  notice: {
    color: colors.success,
    fontSize: fontSize.caption,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  genres: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  genreChip: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  genreText: {
    color: colors.text,
    fontSize: fontSize.caption,
    fontWeight: '600',
  },
  block: {
    gap: spacing.sm,
  },
  blockTitle: {
    color: colors.text,
    fontSize: fontSize.title,
    fontWeight: '800',
  },
  description: {
    color: colors.textMuted,
    fontSize: fontSize.body,
    lineHeight: 22,
  },
  chipsRow: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  optionChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 220,
  },
  optionChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  optionText: {
    color: colors.textMuted,
    fontSize: fontSize.small,
    fontWeight: '600',
  },
  optionTextActive: {
    color: colors.text,
  },
  optionHint: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  episodesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  episode: {
    minWidth: 46,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  episodeActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  episodeText: {
    color: colors.textMuted,
    fontSize: fontSize.small,
    fontWeight: '700',
  },
  episodeTextActive: {
    color: '#ffffff',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
