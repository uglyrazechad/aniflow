import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { AnimeCard } from '@/components/anime-card';
import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ErrorState, LoadingState } from '@/components/state-view';
import { api, describeError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatTime } from '@/lib/format';
import { readLocalProgress } from '@/lib/storage';
import { colors, fontSize, radius, spacing } from '@/lib/theme';
import { useFetch } from '@/lib/use-fetch';
import type { WatchProgress } from '@/lib/types';

export default function HomeScreen() {
  const { user, token, ready } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [continueItems, setContinueItems] = useState<WatchProgress[]>([]);
  const home = useFetch(() => api.home(), []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const items = token ? (await api.progress(token)).items : await readLocalProgress();
        if (!cancelled) setContinueItems(items.slice(0, 10));
      } catch {
        if (!cancelled) setContinueItems([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, ready]);

  const onRefresh = async () => {
    setRefreshing(true);
    home.reload();
    setTimeout(() => setRefreshing(false), 900);
  };

  if (home.loading && !home.data) {
    return (
      <Screen>
        <LoadingState title="Собираем каталог" />
      </Screen>
    );
  }

  if (home.error && !home.data) {
    return (
      <Screen>
        <ErrorState message={home.error} onRetry={home.reload} />
      </Screen>
    );
  }

  const featured = home.data?.featured;

  return (
    <Screen
      scroll
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
    >
      <View style={styles.topbar}>
        <View>
          <Text style={styles.logo}>
            Ani<Text style={styles.logoAccent}>Hub</Text>
          </Text>
          <Text style={styles.tagline}>смотри вместе, где бы ты ни был</Text>
        </View>
        <View style={styles.topActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Поиск"
            onPress={() => router.push('/search')}
            style={styles.iconButton}
          >
            <Text style={styles.icon}>⌕</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Профиль"
            onPress={() => router.push(user ? '/profile' : '/login')}
            style={styles.iconButton}
          >
            {user ? (
              <Avatar name={user.profile.displayName || user.username} size={30} />
            ) : (
              <Text style={styles.icon}>☰</Text>
            )}
          </Pressable>
        </View>
      </View>

      <View style={styles.partyRow}>
        <Pressable
          onPress={() => router.push('/room/create')}
          style={({ pressed }) => [styles.partyCard, styles.partyPrimary, pressed && styles.pressed]}
        >
          <Text style={styles.partyEmoji}>🎬</Text>
          <Text style={styles.partyTitle}>Создать комнату</Text>
          <Text style={styles.partyHint}>позови друзей и смотрите синхронно</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/room/join')}
          style={({ pressed }) => [styles.partyCard, pressed && styles.pressed]}
        >
          <Text style={styles.partyEmoji}>🔑</Text>
          <Text style={styles.partyTitle}>Войти по коду</Text>
          <Text style={styles.partyHint}>есть код или ссылка от друга?</Text>
        </Pressable>
      </View>

      {featured ? (
        <Pressable
          onPress={() => router.push(`/anime/${featured.id}`)}
          style={({ pressed }) => [styles.hero, pressed && styles.pressed]}
        >
          {featured.posterUrl ? (
            <Image source={{ uri: featured.posterUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : null}
          <View style={styles.heroShade} />
          <View style={styles.heroBody}>
            <Text style={styles.heroBadge}>В центре внимания</Text>
            <Text style={styles.heroTitle} numberOfLines={2}>
              {featured.title}
            </Text>
            <Text style={styles.heroMeta} numberOfLines={1}>
              {[featured.year, featured.type === 'anime' ? 'фильм' : 'сериал', featured.genres?.slice(0, 2).join(', ')]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            <View style={styles.heroButtons}>
              <Button title="Смотреть" size="sm" onPress={() => router.push(`/anime/${featured.id}`)} />
              <Button
                title="В комнату"
                size="sm"
                variant="secondary"
                onPress={() =>
                  router.push({ pathname: '/room/create', params: { animeId: featured.id, title: featured.title } })
                }
              />
            </View>
          </View>
        </Pressable>
      ) : null}

      {continueItems.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Продолжить просмотр</Text>
          <FlatList
            horizontal
            data={continueItems}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.row}
            renderItem={({ item }) => (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/player/[id]',
                    params: {
                      id: item.id,
                      episode: String(item.episode),
                      translation: String(item.translationId || ''),
                      start: String(Math.floor(item.position)),
                      title: item.title,
                    },
                  })
                }
                style={({ pressed }) => [styles.continueCard, pressed && styles.pressed]}
              >
                {item.posterUrl ? (
                  <Image source={{ uri: item.posterUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                ) : null}
                <View style={styles.continueShade} />
                <Text style={styles.continueTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.continueMeta}>
                  Серия {item.episode} · {formatTime(item.position)}
                </Text>
              </Pressable>
            )}
          />
        </View>
      ) : null}

      {home.data?.sections.map((section) => (
        <View key={section.key} style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionHint}>
              {section.key === 'ongoing' ? 'сейчас выходят' : section.subtitle}
            </Text>
          </View>
          <FlatList
            horizontal
            data={section.items}
            keyExtractor={(item) => `${section.key}-${item.id}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.row}
            renderItem={({ item }) => <AnimeCard anime={item} style={styles.cardGap} />}
          />
        </View>
      ))}

      {home.error ? <Text style={styles.softError}>{describeError(home.error)}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  topbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  logoAccent: {
    color: colors.accent,
  },
  tagline: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
    marginTop: 2,
  },
  topActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    color: colors.text,
    fontSize: 19,
  },
  partyRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  partyCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
    minHeight: 108,
    justifyContent: 'center',
  },
  partyPrimary: {
    borderColor: 'rgba(124,92,255,0.55)',
    backgroundColor: 'rgba(124,92,255,0.12)',
  },
  partyEmoji: {
    fontSize: 20,
  },
  partyTitle: {
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: '700',
  },
  partyHint: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
    lineHeight: 15,
  },
  hero: {
    height: 340,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'flex-end',
  },
  heroShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(8,8,12,0.35)',
  },
  heroBody: {
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: 'rgba(8,8,12,0.55)',
  },
  heroBadge: {
    color: colors.pink,
    fontSize: fontSize.caption,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroTitle: {
    color: colors.text,
    fontSize: fontSize.hero,
    fontWeight: '900',
    lineHeight: 32,
  },
  heroMeta: {
    color: colors.textMuted,
    fontSize: fontSize.small,
  },
  heroButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  section: {
    gap: spacing.md,
  },
  sectionHead: {
    gap: 2,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.title,
    fontWeight: '800',
  },
  sectionHint: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
  },
  row: {
    gap: spacing.md,
    paddingRight: spacing.sm,
  },
  cardGap: {
    marginRight: 0,
  },
  continueCard: {
    width: 190,
    height: 112,
    borderRadius: radius.md,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: colors.surfaceAlt,
  },
  continueShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(8,8,12,0.5)',
  },
  continueTitle: {
    color: colors.text,
    fontSize: fontSize.small,
    fontWeight: '700',
    paddingHorizontal: spacing.sm,
  },
  continueMeta: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  pressed: {
    opacity: 0.86,
  },
  softError: {
    color: colors.danger,
    fontSize: fontSize.caption,
    textAlign: 'center',
  },
});
