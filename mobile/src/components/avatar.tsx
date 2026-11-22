import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius } from '@/lib/theme';
import { initials } from '@/lib/format';

interface Props {
  name: string;
  size?: number;
  host?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Avatar({ name, size = 38, host = false, style }: Props) {
  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: host ? colors.gold : colors.border,
        },
        style,
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.38 }]}>{initials(name)}</Text>
      {host ? <View style={styles.crown}><Text style={styles.crownText}>♛</Text></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
    borderWidth: 1.5,
  },
  text: {
    color: colors.text,
    fontWeight: '700',
  },
  crown: {
    position: 'absolute',
    top: -6,
    right: -4,
    backgroundColor: colors.gold,
    borderRadius: radius.pill,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crownText: {
    color: '#1a1305',
    fontSize: 10,
    fontWeight: '900',
  },
});
