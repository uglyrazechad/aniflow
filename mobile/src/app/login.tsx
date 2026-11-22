import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { describeError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors, fontSize, spacing } from '@/lib/theme';

export default function LoginScreen() {
  const { signIn, busy } = useAuth();
  const params = useLocalSearchParams<{ next?: string }>();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    try {
      await signIn(login.trim(), password);
      if (params.next) router.replace(String(params.next));
      else if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch (issue) {
      setError(describeError(issue));
    }
  };

  return (
    <Screen scroll keyboard>
      <View style={styles.head}>
        <Text style={styles.logo}>
          Ani<Text style={styles.accent}>Hub</Text>
        </Text>
        <Text style={styles.title}>С возвращением</Text>
        <Text style={styles.subtitle}>Аккаунт сайта подходит и для приложения.</Text>
      </View>

      <View style={styles.form}>
        <TextField
          label="Почта или ник"
          value={login}
          onChangeText={setLogin}
          placeholder="you@example.com"
          keyboardType="email-address"
          textContentType="username"
        />
        <TextField
          label="Пароль"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
          textContentType="password"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button title="Войти" onPress={submit} loading={busy} disabled={!login.trim() || !password} />

        <Pressable onPress={() => router.replace('/register')} style={styles.switch}>
          <Text style={styles.switchText}>
            Нет аккаунта? <Text style={styles.link}>Зарегистрироваться</Text>
          </Text>
        </Pressable>

        <Pressable onPress={() => router.back()} style={styles.switch}>
          <Text style={styles.muted}>Продолжить без входа</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: {
    marginTop: spacing.xxl,
    marginBottom: spacing.xl,
    gap: spacing.xs,
  },
  logo: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
  },
  accent: {
    color: colors.accent,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.heading,
    fontWeight: '800',
    marginTop: spacing.md,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: fontSize.body,
  },
  form: {
    gap: spacing.md,
  },
  error: {
    color: colors.danger,
    fontSize: fontSize.small,
  },
  switch: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  switchText: {
    color: colors.textMuted,
    fontSize: fontSize.small,
  },
  link: {
    color: colors.accent,
    fontWeight: '700',
  },
  muted: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
  },
});
