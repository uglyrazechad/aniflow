import React, { useRef, useState } from 'react';
import { StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { colors } from '@/lib/theme';

interface Props {
  position: number;
  duration: number;
  onSeek: (seconds: number) => void;
  disabled?: boolean;
}

/** Полоса перемотки: тап и перетаскивание пальцем. */
export function SeekBar({ position, duration, onSeek, disabled = false }: Props) {
  const [width, setWidth] = useState(0);
  const [preview, setPreview] = useState<number | null>(null);
  const widthRef = useRef(0);

  const progress = duration > 0 ? Math.min(1, Math.max(0, (preview ?? position) / duration)) : 0;

  const seekFromTouch = (event: GestureResponderEvent) => {
    if (!widthRef.current || !duration) return;
    const ratio = Math.min(1, Math.max(0, event.nativeEvent.locationX / widthRef.current));
    setPreview(ratio * duration);
  };

  const commit = () => {
    if (preview != null) onSeek(preview);
    setPreview(null);
  };

  return (
    <View
      style={styles.hit}
      onLayout={(event) => {
        widthRef.current = event.nativeEvent.layout.width;
        setWidth(event.nativeEvent.layout.width);
      }}
      onStartShouldSetResponder={() => !disabled}
      onMoveShouldSetResponder={() => !disabled}
      onResponderGrant={seekFromTouch}
      onResponderMove={seekFromTouch}
      onResponderRelease={commit}
      onResponderTerminate={() => setPreview(null)}
    >
      <View style={styles.track}>
        <View style={[styles.fill, { width: width * progress }]} />
        <View style={[styles.knob, { left: Math.max(0, width * progress - 7) }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hit: {
    height: 28,
    justifyContent: 'center',
  },
  track: {
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.22)',
    overflow: 'visible',
  },
  fill: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  knob: {
    position: 'absolute',
    top: -4.5,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#fff',
  },
});
