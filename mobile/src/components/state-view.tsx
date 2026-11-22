import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, spacing } from '@/lib/theme';
import { Button } from './button';

export function LoadingState({ title = 'Загружаем…' }: { title?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.accent} size="large" />
      <Text style={styles.muted}>{title}</Text>
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.center}>
      <Text style={styles.emoji}>😵</Text>
      <Text style={styles.title}>Не получилось</Text>
      <Text style={styles.muted}>{message}</Text>
      {onRetry ? <Button title="Повторить" onPress={onRetry} variant="secondary" /> : null}
    </View>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.emoji}>🌸</Text>
      <Text style={styles.title}>{title}</Text>
      {hint ? <Text style={styles.muted}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
    minHeight: 220,
  },
  emoji: {
    fontSize: 34,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.title,
    fontWeight: '700',
    textAlign: 'center',
  },
  muted: {
    color: colors.textMuted,
    fontSize: fontSize.body,
    textAlign: 'center',
    lineHeight: 20,
  },
});
