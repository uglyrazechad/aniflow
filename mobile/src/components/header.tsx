import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fontSize, spacing } from '@/lib/theme';

interface Props {
  title?: string;
  subtitle?: string;
  back?: boolean;
  right?: React.ReactNode;
  transparent?: boolean;
}

export function ScreenHeader({ title, subtitle, back = true, right, transparent = false }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrap,
        { paddingTop: insets.top + spacing.sm },
        transparent ? styles.transparent : styles.solid,
      ]}
    >
      <View style={styles.row}>
        {back ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Назад"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            hitSlop={12}
            style={styles.back}
          >
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
        ) : null}
        <View style={styles.titles}>
          {title ? (
            <Text numberOfLines={1} style={styles.title}>
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text numberOfLines={1} style={styles.subtitle}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.right}>{right}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  solid: {
    backgroundColor: colors.bg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  transparent: {
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 40,
  },
  back: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
  },
  backIcon: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 26,
    marginTop: -2,
  },
  titles: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.title,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
    marginTop: 1,
  },
  right: {
    minWidth: 32,
    alignItems: 'flex-end',
  },
});
