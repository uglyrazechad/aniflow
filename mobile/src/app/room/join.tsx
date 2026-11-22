import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { ScreenHeader } from '@/components/header';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { api, describeError } from '@/lib/api';
import { colors, fontSize, radius, spacing } from '@/lib/theme';

export default function JoinRoomScreen() {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const join = async () => {
    const slug = code.trim().toLowerCase();
    if (!slug) return;

    setBusy(true);
    setError(null);
    try {
      const room = await api.room(slug);
      router.replace({
        pathname: '/room/[slug]',
        params: {
          slug: room.slug,
          ...(room.isPublic || !password.trim() ? {} : { password: password.trim() }),
        },
      });
    } catch (issue) {
      setError(describeError(issue));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll keyboard>
      <ScreenHeader title="Войти по коду" />

      <View style={styles.card}>
        <Text style={styles.emoji}>🔑</Text>
        <Text style={styles.title}>Код комнаты</Text>
        <Text style={styles.hint}>
          Хост покажет код в шапке комнаты или пришлёт приглашение. Для приватной комнаты нужен ещё пароль.
        </Text>

        <TextField
          label="Код"
          value={code}
          onChangeText={(value) => {
            setCode(value.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase());
            setError(null);
          }}
          placeholder="например, fd7wqw"
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          maxLength={16}
          onSubmitEditing={join}
          returnKeyType="go"
        />
        <TextField
          label="Пароль (если приватная)"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            setError(null);
          }}
          placeholder="необязательно"
          secureTextEntry
          maxLength={16}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button title="Войти" onPress={join} loading={busy} disabled={!code.trim()} />
      </View>

      <Pressable onPress={() => router.replace('/room/create')} style={styles.create}>
        <Text style={styles.createText}>
          Нет кода? <Text style={styles.link}>Создать свою комнату</Text>
        </Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  emoji: {
    fontSize: 34,
    textAlign: 'center',
  },
  title: {
    color: colors.text,
    fontSize: fontSize.heading,
    fontWeight: '800',
    textAlign: 'center',
  },
  hint: {
    color: colors.textMuted,
    fontSize: fontSize.small,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  error: {
    color: colors.danger,
    fontSize: fontSize.small,
  },
  create: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  createText: {
    color: colors.textMuted,
    fontSize: fontSize.small,
  },
  link: {
    color: colors.accent,
    fontWeight: '700',
  },
});