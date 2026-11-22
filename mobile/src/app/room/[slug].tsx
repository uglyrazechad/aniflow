import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { ScreenHeader } from '@/components/header';
import { RoomView } from '@/components/room/room-view';
import { Screen } from '@/components/screen';
import { ErrorState, LoadingState } from '@/components/state-view';
import { TextField } from '@/components/text-field';
import { api } from '@/lib/api';
import { colors, fontSize, radius, spacing } from '@/lib/theme';
import { useFetch } from '@/lib/use-fetch';

export default function RoomScreen() {
  const params = useLocalSearchParams<{ slug?: string; password?: string }>();
  const slug = String(params.slug ?? '');
  const initialPassword = typeof params.password === 'string' ? params.password : '';

  const { data, error, loading, reload } = useFetch(() => api.room(slug), [slug]);
  const [password, setPassword] = useState(initialPassword);
  const [submitted, setSubmitted] = useState(initialPassword.length > 0);
  const [gateError, setGateError] = useState<string | null>(null);

  if (!slug) {
    return (
      <Screen>
        <ScreenHeader title="Комната" />
        <ErrorState message="Не указан код комнаты" />
      </Screen>
    );
  }

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title="Комната" />
        <LoadingState title="Ищем комнату…" />
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen>
        <ScreenHeader title="Комната" />
        <ErrorState message={error ?? 'Комната не найдена'} onRetry={reload} />
      </Screen>
    );
  }

  if (data.isPublic) {
    return <RoomView slug={slug} password="" initial={data} />;
  }

  if (submitted) {
    return (
      <RoomView
        slug={slug}
        password={password}
        initial={data}
        onPasswordError={(message) => {
          setSubmitted(false);
          setGateError(message);
        }}
      />
    );
  }

  return (
    <Screen scroll keyboard>
      <ScreenHeader title="Приватная комната" />
      <View style={styles.card}>
        <Text style={styles.lock}>🔒</Text>
        <Text style={styles.title}>{data.name || 'Комната'}</Text>
        <Text style={styles.hint}>
          Вход по паролю. Сейчас в комнате {data.members.length} чел. Код: {slug}
        </Text>
        <TextField
          label="Пароль комнаты"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            setGateError(null);
          }}
          placeholder="Пароль от хоста"
          secureTextEntry
          maxLength={16}
          autoFocus
          onSubmitEditing={() => password && setSubmitted(true)}
          returnKeyType="go"
          error={gateError}
        />
        <Button title="Войти в комнату" onPress={() => setSubmitted(true)} disabled={!password} />
        <Button
          title="Ввести другой код"
          variant="ghost"
          onPress={() => router.replace('/room/join')}
        />
      </View>
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
    alignItems: 'stretch',
  },
  lock: {
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
  },
});