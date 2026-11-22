import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { ScreenHeader } from '@/components/header';
import { Screen } from '@/components/screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/state-view';
import { api, describeError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors, fontSize, radius, spacing } from '@/lib/theme';
import type { FavoriteEntry } from '@/lib/types';

export default function FavoritesScreen() {
  const { token, ready } = useAuth();
  const [items, setItems] = useState<FavoriteEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = React.useCallback(() => {
    if (!token) {
      setLoading(false);
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    api
      .favorites(token)
      .then((result) => setItems(result.items))
      .catch((issue) => setError(describeError(issue)))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  if (!ready || loading) {
    return (
      <Screen>
        <ScreenHeader title="Избранное" />
        <LoadingState />
      </Screen>
    );
  }

  if (!token) {
    return (
      <Screen>
        <ScreenHeader title="Избранное" />
        <View style={styles.center}>
          <EmptyState title="Нужен вход" hint="Избранное хранится в аккаунте AniHub." />
          <Button title="Войти" onPress={() => router.push('/login')} />
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ScreenHeader title="Избранное" />
        <ErrorState message={error} onRetry={load} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="Избранное" subtitle={`${items.length} тайтлов`} />
      {items.length ? (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/anime/${item.id}`)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={styles.poster}>
                {item.posterUrl ? (
                  <Image source={{ uri: item.posterUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                ) : null}
              </View>
              <View style={styles.info}>
                <Text style={styles.title} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.meta}>В избранном</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          )}
        />
      ) : (
        <EmptyState title="Пока пусто" hint="Откройте тайтл и нажмите «В избранное»." />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  pressed: {
    opacity: 0.85,
  },
  poster: {
    width: 54,
    height: 78,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  meta: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
  },
  chevron: {
    color: colors.textMuted,
    fontSize: 22,
    paddingRight: spacing.sm,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
});
