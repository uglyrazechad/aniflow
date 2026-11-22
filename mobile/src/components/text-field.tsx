import React from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, fontSize, radius, spacing } from '@/lib/theme';

interface Props extends TextInputProps {
  label: string;
  hint?: string;
  error?: string | null;
}

export function TextField({ label, hint, error, style, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.input, error && styles.inputError, style]}
        autoCapitalize="none"
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
    fontWeight: '600',
  },
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: fontSize.body,
  },
  inputError: {
    borderColor: colors.danger,
  },
  hint: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
  },
  error: {
    color: colors.danger,
    fontSize: fontSize.caption,
  },
});
