import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { ScreenHeader } from '@/components/header';
import { Screen } from '@/components/screen';
import { LoadingState } from '@/components/state-view';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatTime, timeAgo } from '@/lib/format';
import { registerPushToken } from '@/lib/push';
import { colors, fontSize, radius, spacing } from '@/lib/theme';
import type { WatchProgress } from '@/lib/types';

export default function ProfileScreen() {
  const { user, token, ready, signOut } = useAuth();
  const [history, setHistory] = useState<WatchProgress[]>([]);
  const [pushState, setPushState] = useState<'idle' | 'busy' | 'on' | 'off'>('idle');
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api
      .progress(token)
      .then((result) => setHistory(result.items.slice(0, 6)))
      .catch(() => setHistory([]));
  }, [token]);

  if (!ready) {
    return (
      <Screen>
        <ScreenHeader title="Профиль" />
        <LoadingState />
      </Screen>
    );
  }

  if (!user) {
    return (
      <Screen>
        <ScreenHeader title="Профиль" />
        <View style={styles.guest}>
          <Text style={styles.guestEmoji}>👋</Text>
          <Text style={styles.guestTitle}>Вы не вошли</Text>
          <Text style={styles.muted}>
            Войдите, чтобы сохранять историю, избранное и создавать комнаты.
          </Text>
          <Button title="Войти" onPress={() => router.push('/login')} />
          <Button title="Создать аккаунт" variant="secondary" onPress={() => router.push('/register')} />
        </View>
      </Screen>
    );
  }

  const enablePush = async () => {
    setPushState('busy');
    setNotice(null);
    const expoToken = await registerPushToken();
    if (!expoToken) {
      setPushState('off');
      setNotice('Уведомления недоступны: нет разрешения или не настроен projectId Expo.');
      return;
    }
    try {
      await api.registerPushToken(token!, expoToken);
      setPushState('on');
      setNotice('Уведомления включены — приглашения в комнаты придут на телефон.');
    } catch {
      setPushState('off');
      setNotice('Не удалось сохранить push-токен на сервере.');
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Профиль" />
      <Screen scroll padded={false} edges={{ top: false, bottom: true }}>
        <View style={styles.card}>
          <Avatar name={user.profile.displayName || user.username} size={64} />
          <View style={styles.cardInfo}>
            <Text style={styles.name}>{user.profile.displayName || user.username}</Text>
            <Text style={styles.username}>@{user.username}</Text>
            <Text style={styles.email}>{user.email}</Text>
          </View>
        </View>

        <View style={styles.quickRow}>
          <Pressable onPress={() => router.push('/favorites')} style={styles.quick}>
            <Text style={styles.quickEmoji}>★</Text>
            <Text style={styles.quickLabel}>Избранное</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/room/join')} style={styles.quick}>
            <Text style={styles.quickEmoji}>🔑</Text>
            <Text style={styles.quickLabel}>Войти по коду</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/room/create')} style={styles.quick}>
            <Text style={styles.quickEmoji}>🎬</Text>
            <Text style={styles.quickLabel}>Новая комната</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Продолжить просмотр</Text>
          {history.length ? (
            history.map((item) => (
              <Pressable
                key={item.id}
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
                style={styles.historyRow}
              >
                <View style={styles.historyInfo}>
                  <Text style={styles.historyTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.muted}>
                    Серия {item.episode} · {formatTime(item.position)} · {timeAgo(item.updatedAt)}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            ))
          ) : (
            <Text style={styles.muted}>Пока пусто — начните смотреть что-нибудь из каталога.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Уведомления</Text>
          <Text style={styles.muted}>
            Приглашения в комнаты приходят как push. Разрешение спрашивается один раз.
          </Text>
          <Button
            title={pushState === 'on' ? 'Уведомления включены' : 'Включить уведомления'}
            variant={pushState === 'on' ? 'secondary' : 'primary'}
            loading={pushState === 'busy'}
            onPress={enablePush}
          />
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        </View>

        <Button title="Выйти" variant="danger" onPress={signOut} style={styles.logout} />
      </Screen>
    </Screen>
  );
}

const styles = StyleSheet.create({
  guest: {
    flex: 1,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
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
  card: {
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: colors.text,
    fontSize: fontSize.heading,
    fontWeight: '800',
  },
  username: {
    color: colors.accent,
    fontSize: fontSize.small,
    fontWeight: '600',
  },
  email: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
  },
  quickRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  quick: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  quickEmoji: {
    fontSize: 18,
  },
  quickLabel: {
    color: colors.text,
    fontSize: fontSize.caption,
    fontWeight: '600',
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.title,
    fontWeight: '800',
    marginBottom: 2,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  historyInfo: {
    flex: 1,
    gap: 2,
  },
  historyTitle: {
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  chevron: {
    color: colors.textMuted,
    fontSize: 22,
  },
  message: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
  },
  muted: {
    color: colors.textMuted,
    fontSize: fontSize.small,
    lineHeight: 19,
  },
  notice: {
    color: colors.success,
    fontSize: fontSize.caption,
    lineHeight: 17,
  },
  logout: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xxl,
  },
});