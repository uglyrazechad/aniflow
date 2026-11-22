import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { AnimeCard } from '@/components/anime-card';
import { Button } from '@/components/button';
import { ScreenHeader } from '@/components/header';
import { Screen } from '@/components/screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/state-view';
import { api, describeError } from '@/lib/api';
import { colors, fontSize, radius, spacing } from '@/lib/theme';
import type { AnimeSummary, GenreOption } from '@/lib/types';

const PAGE_LIMIT = 24;

export default function SearchScreen() {
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [genre, setGenre] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AnimeSummary[]>([]);
  const [genres, setGenres] = useState<GenreOption[]>([]);
  const [statuses, setStatuses] = useState<GenreOption[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const cardWidth = useMemo(() => {
    const available = width - spacing.lg * 2 - spacing.md * 2;
    return Math.floor(available / 3);
  }, [width]);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const load = useCallback(
    async (nextPage: number, append: boolean) => {
      requestRef.current += 1;
      const requestId = requestRef.current;
      setLoading(true);
      setError(null);

      try {
        if (debounced.length >= 2) {
          const result = await api.search(debounced);
          if (requestId !== requestRef.current) return;
          setItems(result.items);
          setHasMore(false);
          setPage(1);
          return;
        }

        const result = await api.catalog({
          genre: genre ?? undefined,
          status: status ?? undefined,
          page: nextPage,
          limit: PAGE_LIMIT,
        });
        if (requestId !== requestRef.current) return;
        setItems((current) => (append ? [...current, ...result.items] : result.items));
        setHasMore(result.hasMore);
        setPage(result.page);
        setGenres(result.genres ?? []);
        setStatuses(result.statuses ?? []);
      } catch (issue) {
        if (requestId === requestRef.current) setError(describeError(issue));
      } finally {
        if (requestId === requestRef.current) setLoading(false);
      }
    },
    [debounced, genre, status],
  );

  useEffect(() => {
    load(1, false);
  }, [load]);

  const filtersActive = Boolean(genre || status);

  return (
    <Screen>
      <ScreenHeader title="Каталог" subtitle="Поиск по названию и фильтры" />

      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Название аниме…"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          autoCorrect={false}
          returnKeyType="search"
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={10}>
            <Text style={styles.clear}>✕</Text>
          </Pressable>
        ) : null}
      </View>

      {!debounced ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Pressable
            onPress={() => {
              setGenre(null);
              setStatus(null);
            }}
            style={[styles.chip, !filtersActive && styles.chipActive]}
          >
            <Text style={[styles.chipText, !filtersActive && styles.chipTextActive]}>Все</Text>
          </Pressable>
          {statuses.map((item) => (
            <Pressable
              key={item.slug}
              onPress={() => {
                setStatus(status === item.slug ? null : item.slug);
                setGenre(null);
              }}
              style={[styles.chip, status === item.slug && styles.chipActive]}
            >
              <Text style={[styles.chipText, status === item.slug && styles.chipTextActive]}>
                {item.title}
              </Text>
            </Pressable>
          ))}
          {genres.slice(0, 14).map((item) => (
            <Pressable
              key={item.slug}
              onPress={() => {
                setGenre(genre === item.slug ? null : item.slug);
                setStatus(null);
              }}
              style={[styles.chip, genre === item.slug && styles.chipActive]}
            >
              <Text style={[styles.chipText, genre === item.slug && styles.chipTextActive]}>
                {item.title}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.results}
        keyboardShouldPersistTaps="handled"
      >
        {loading && !items.length ? <LoadingState title="Ищем тайтлы" /> : null}
        {error && !items.length ? <ErrorState message={error} onRetry={() => load(1, false)} /> : null}
        {!loading && !error && !items.length ? (
          <EmptyState title="Ничего не нашлось" hint="Попробуйте другое название или фильтр" />
        ) : null}

        <View style={styles.grid}>
          {items.map((anime) => (
            <AnimeCard key={anime.id} anime={anime} width={cardWidth} />
          ))}
        </View>

        {error && items.length ? <Text style={styles.softError}>{error}</Text> : null}

        {!debounced && hasMore ? (
          <Button
            title={loading ? 'Загружаем…' : 'Показать ещё'}
            variant="secondary"
            loading={loading}
            onPress={() => load(page + 1, true)}
            style={styles.more}
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 46,
  },
  searchIcon: {
    color: colors.textMuted,
    fontSize: 18,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.body,
    paddingVertical: 0,
  },
  clear: {
    color: colors.textMuted,
    fontSize: 14,
  },
  chips: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingRight: spacing.lg,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: fontSize.small,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  results: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  more: {
    marginTop: spacing.sm,
  },
  softError: {
    color: colors.danger,
    fontSize: fontSize.caption,
    textAlign: 'center',
  },
});
