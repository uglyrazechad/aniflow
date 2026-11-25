import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { describeError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors, fontSize, spacing } from '@/lib/theme';

export default function RegisterScreen() {
  const { signUp, busy } = useAuth();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    try {
      const result = await signUp(email.trim(), password, displayName.trim());
      if (result.needsVerification) {
        setSent(result.message ?? 'Подтвердите почту и войдите');
        return;
      }
      router.replace('/profile');
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
        <Text style={styles.title}>Создать аккаунт</Text>
        <Text style={styles.subtitle}>Избранное, история и комнаты будут на всех устройствах.</Text>
      </View>

      {sent ? (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Проверьте почту</Text>
          <Text style={styles.noticeText}>{sent}</Text>
          <Button
            title="Ввести код из письма"
            variant="secondary"
            onPress={() => router.replace({ pathname: '/verify', params: { email: email.trim() } })}
          />
        </View>
      ) : (
        <View style={styles.form}>
          <TextField
            label="Почта"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <TextField
            label="Как вас показывать в комнате"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Ник"
            maxLength={40}
          />
          <TextField
            label="Пароль"
            value={password}
            onChangeText={setPassword}
            placeholder="минимум 6 символов"
            secureTextEntry
            textContentType="newPassword"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            title="Зарегистрироваться"
            onPress={submit}
            loading={busy}
            disabled={!email.trim() || password.length < 6}
          />

          <Pressable onPress={() => router.replace('/login')} style={styles.switch}>
            <Text style={styles.switchText}>
              Уже есть аккаунт? <Text style={styles.link}>Войти</Text>
            </Text>
          </Pressable>
        </View>
      )}
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
    lineHeight: 21,
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
  notice: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.lg,
    gap: spacing.md,
  },
  noticeTitle: {
    color: colors.text,
    fontSize: fontSize.title,
    fontWeight: '800',
  },
  noticeText: {
    color: colors.textMuted,
    fontSize: fontSize.body,
    lineHeight: 21,
  },
});
