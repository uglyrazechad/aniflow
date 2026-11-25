import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { api, describeError } from '@/lib/api';
import { colors, fontSize, spacing } from '@/lib/theme';

export default function VerifyScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      await api.verifyEmail(email.trim(), code.trim());
      setDone(true);
    } catch (issue) {
      setError(describeError(issue));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError(null);
    try {
      await api.resendVerify(email.trim());
      setResent('Письмо отправлено повторно. Проверьте «Спам», если его нет.');
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
        <Text style={styles.title}>Подтверждение почты</Text>
        <Text style={styles.subtitle}>
          Код из письма нужен один раз — он подтверждает, что почта ваша.
        </Text>
      </View>

      {done ? (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Почта подтверждена</Text>
          <Text style={styles.noticeText}>Теперь войдите в аккаунт приложения.</Text>
          <Button
            title="Войти"
            onPress={() => router.replace({ pathname: '/login', params: { login: email.trim() } })}
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
            label="Код из письма"
            value={code}
            onChangeText={setCode}
            placeholder="6 цифр"
            keyboardType="number-pad"
            maxLength={6}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {resent ? <Text style={styles.ok}>{resent}</Text> : null}

          <Button
            title="Подтвердить"
            onPress={submit}
            loading={busy}
            disabled={!email.trim() || code.trim().length < 4}
          />

          <Pressable onPress={resend} style={styles.switch}>
            <Text style={styles.switchText}>
              Письмо не пришло? <Text style={styles.link}>Отправить ещё раз</Text>
            </Text>
          </Pressable>
          <Pressable onPress={() => router.replace('/login')} style={styles.switch}>
            <Text style={styles.switchText}>
              Уже подтверждено? <Text style={styles.link}>Войти</Text>
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
  ok: {
    color: colors.accent,
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
