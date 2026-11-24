import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { Button } from '@/components/button';
import { ScreenHeader } from '@/components/header';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { api, describeError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors, fontSize, radius, spacing } from '@/lib/theme';
import type { AnimeSummary } from '@/lib/types';

export default function CreateRoomScreen() {
  const { user, token, ready } = useAuth();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [results, setResults] = useState<AnimeSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<AnimeSummary | null>(null);
  const [episodesTotal, setEpisodesTotal] = useState(1);
  const [episode, setEpisode] = useState('1');
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (debounced.length < 2 || selected) {
      setResults([]);
      setSearching(false);
      return undefined;
    }

    let cancelled = false;
    setSearching(true);
    api
      .search(debounced)
      .then((result) => {
        if (!cancelled) setResults(result.items.slice(0, 12));
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debounced, selected]);

  const pick = (anime: AnimeSummary) => {
    setSelected(anime);
    setQuery(anime.title);
    setResults([]);
    setName((current) => current || anime.title);
    setEpisodesTotal(Math.min(Math.max(anime.episodesTotal ?? 1, 1), 200));
    api
      .anime(anime.id)
      .then((result) => {
        const total = result.anime.episodesTotal ?? 1;
        setEpisodesTotal(Math.min(Math.max(total, 1), 200));
      })
      .catch(() => undefined);
  };

  const reset = () => {
    setSelected(null);
    setQuery('');
    setResults([]);
    setEpisode('1');
    setEpisodesTotal(1);
  };

  const create = async () => {
    if (!token || !selected) return;
    const roomName = name.trim() || selected.title;
    const episodeNumber = Math.min(Math.max(Number(episode) || 1, 1), episodesTotal);

    setError(null);
    setBusy(true);
    try {
      const result = await api.createRoom(token, {
        animeId: selected.id,
        name: roomName,
        isPublic,
        episode: episodeNumber,
        ...(isPublic ? {} : { password: password.trim() }),
      });
      router.replace({
        pathname: '/room/[slug]',
        params: { slug: result.slug, ...(isPublic ? {} : { password: password.trim() }) },
      });
    } catch (issue) {
      setError(describeError(issue));
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return (
      <Screen>
        <ScreenHeader title="Новая комната" />
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  if (!user) {
    return (
      <Screen>
        <ScreenHeader title="Новая комната" />
        <View style={styles.center}>
          <Text style={styles.guestEmoji}>🎬</Text>
          <Text style={styles.guestTitle}>Нужен аккаунт</Text>
          <Text style={styles.hint}>
            Комнату создаёт хост с аккаунтом AniHub — так её можно приглашать и восстанавливать.
          </Text>
          <Button title="Войти" onPress={() => router.push('/login')} />
          <Button title="Создать аккаунт" variant="secondary" onPress={() => router.push('/register')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll keyboard>
      <ScreenHeader title="Новая комната" subtitle="Совместный просмотр" />

      <View style={styles.section}>
        <Text style={styles.label}>Тайтл</Text>
        {selected ? (
          <View style={styles.selected}>
            <View style={styles.poster}>
              {selected.posterUrl ? (
                <Image
                  source={{ uri: selected.posterUrl }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ) : null}
            </View>
            <View style={styles.selectedInfo}>
              <Text style={styles.selectedTitle} numberOfLines={2}>
                {selected.title}
              </Text>
              <Text style={styles.hint}>{episodesTotal} серий</Text>
            </View>
            <Button title="Сменить" size="sm" variant="secondary" onPress={reset} />
          </View>
        ) : (
          <>
            <TextField
              label="Поиск аниме"
              value={query}
              onChangeText={(value) => {
                setQuery(value);
                setResults([]);
              }}
              placeholder="Например, Атака титанов"
              returnKeyType="search"
            />
            {searching ? <ActivityIndicator color={colors.accent} style={styles.spinner} /> : null}
            {results.length ? (
              <ScrollView style={styles.results} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {results.map((anime) => (
                  <Pressable
                    key={anime.id}
                    onPress={() => pick(anime)}
                    style={({ pressed }) => [styles.result, pressed && styles.pressed]}
                  >
                    <View style={styles.resultPoster}>
                      {anime.posterUrl ? (
                        <Image
                          source={{ uri: anime.posterUrl }}
                          style={StyleSheet.absoluteFill}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                          recyclingKey={anime.id}
                        />
                      ) : null}
                    </View>
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultTitle} numberOfLines={1}>
                        {anime.title}
                      </Text>
                      <Text style={styles.hint}>
                        {[anime.year, anime.episodesTotal ? `${anime.episodesTotal} серий` : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
            {debounced.length >= 2 && !searching && !results.length ? (
              <Text style={styles.hint}>Ничего не нашлось — попробуйте другое название.</Text>
            ) : null}
          </>
        )}
      </View>

      <View style={styles.section}>
        <TextField
          label="Название комнаты"
          value={name}
          onChangeText={setName}
          placeholder={selected?.title ?? 'Например, вечерний марафон'}
          maxLength={60}
        />
        <TextField
          label="Серия"
          value={episode}
          onChangeText={(value) => setEpisode(value.replace(/[^0-9]/g, '') || '1')}
          placeholder="1"
          keyboardType="number-pad"
          maxLength={3}
          hint={`В комнате можно менять серию · всего ${episodesTotal}`}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={styles.switchTitle}>Публичная комната</Text>
            <Text style={styles.hint}>Вход по коду без пароля. Приватная — только по паролю.</Text>
          </View>
          <Switch
            value={isPublic}
            onValueChange={setIsPublic}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor="#ffffff"
          />
        </View>
        {!isPublic ? (
          <TextField
            label="Пароль комнаты"
            value={password}
            onChangeText={setPassword}
            placeholder="минимум 3 символа"
            secureTextEntry
            maxLength={16}
            hint="Передайте код и пароль друзьям."
          />
        ) : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        title="Создать комнату"
        onPress={create}
        loading={busy}
        disabled={!selected || (!isPublic && password.trim().length < 3)}
        style={styles.submit}
      />
      <Text style={styles.footnote}>
        Хост управляет паузой и перемоткой. Гости подключаются по коду из шапки комнаты.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  guestEmoji: {
    fontSize: 40,
  },
  guestTitle: {
    color: colors.text,
    fontSize: fontSize.heading,
    fontWeight: '800',
  },
  section: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
    fontWeight: '600',
  },
  selected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  poster: {
    width: 48,
    height: 68,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  selectedInfo: {
    flex: 1,
    gap: 3,
  },
  selectedTitle: {
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: '700',
  },
  spinner: {
    alignSelf: 'flex-start',
  },
  results: {
    maxHeight: 260,
  },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: {
    opacity: 0.8,
  },
  resultPoster: {
    width: 38,
    height: 54,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  resultInfo: {
    flex: 1,
    gap: 2,
  },
  resultTitle: {
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  switchText: {
    flex: 1,
    gap: 2,
  },
  switchTitle: {
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  hint: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
    lineHeight: 17,
  },
  error: {
    color: colors.danger,
    fontSize: fontSize.small,
  },
  submit: {
    marginBottom: spacing.md,
  },
  footnote: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
    lineHeight: 17,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
});