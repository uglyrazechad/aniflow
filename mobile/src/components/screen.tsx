import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '@/lib/theme';

interface Props {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  keyboard?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  refreshControl?: React.ReactElement;
  edges?: { top?: boolean; bottom?: boolean };
}

/** Базовая обёртка экрана: тёмный фон, безопасные отступы, опциональная прокрутка. */
export function Screen({
  children,
  scroll = false,
  padded = true,
  keyboard = false,
  style,
  contentContainerStyle,
  refreshControl,
  edges = { top: true, bottom: true },
}: Props) {
  const insets = useSafeAreaInsets();
  const paddingTop = edges.top ? insets.top : 0;
  const paddingBottom = edges.bottom ? Math.max(insets.bottom, spacing.sm) : 0;

  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[
        padded && styles.padded,
        { paddingTop: paddingTop + (padded ? spacing.sm : 0), paddingBottom: paddingBottom + spacing.xl },
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        styles.flex,
        padded && styles.padded,
        { paddingTop, paddingBottom },
        contentContainerStyle,
      ]}
    >
      {children}
    </View>
  );

  return (
    <View style={[styles.flex, styles.background, style]}>
      {keyboard ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  background: { backgroundColor: colors.bg },
  padded: { paddingHorizontal: spacing.lg },
});
