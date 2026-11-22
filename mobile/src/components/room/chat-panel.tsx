import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { colors, fontSize, radius, spacing } from '@/lib/theme';
import type { RoomMessage } from '@/lib/types';

interface Props {
  messages: RoomMessage[];
  userId: string;
  disabled?: boolean;
  onSend: (text: string) => void;
  onTyping: (typing: boolean) => void;
}

const QUICK = ['🔥', '😂', '😱', '❤️', '👏'];

export function ChatPanel({ messages, userId, disabled, onSend, onTyping }: Props) {
  const [text, setText] = useState('');
  const listRef = useRef<FlatList<RoomMessage>>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(timer);
  }, [messages.length]);

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    onTyping(false);
  };

  const onChange = (value: string) => {
    setText(value);
    onTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => onTyping(false), 2500);
  };

  return (
    <View style={styles.wrap}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          if (item.system) {
            return <Text style={styles.system}>{item.system}</Text>;
          }
          const mine = item.userId === userId;
          return (
            <View style={[styles.messageRow, mine && styles.mineRow]}>
              {!mine ? <Avatar name={item.nick} size={26} /> : null}
              <View style={[styles.bubble, mine && styles.mineBubble]}>
                {!mine ? <Text style={styles.author}>{item.nick}</Text> : null}
                <Text style={styles.text}>
                  {item.text}
                  {item.emoji ? ` ${item.emoji}` : ''}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>Тут пока тихо. Напишите первым — начнётся движ.</Text>
        }
      />

      <View style={styles.quickRow}>
        {QUICK.map((emoji) => (
          <Pressable
            key={emoji}
            onPress={() => setText((value) => `${value}${emoji}`)}
            style={styles.quick}
          >
            <Text style={styles.quickText}>{emoji}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.inputRow}>
        <TextInput
          value={text}
          onChangeText={onChange}
          placeholder={disabled ? 'Чат закрыт хостом' : 'Сообщение…'}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          editable={!disabled}
          onSubmitEditing={submit}
          returnKeyType="send"
          maxLength={500}
        />
        <Pressable
          onPress={submit}
          disabled={disabled || !text.trim()}
          style={[styles.send, (disabled || !text.trim()) && styles.sendDisabled]}
        >
          <Text style={styles.sendText}>➤</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    maxWidth: '88%',
  },
  mineRow: {
    alignSelf: 'flex-end',
  },
  bubble: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    flexShrink: 1,
  },
  mineBubble: {
    backgroundColor: colors.accentSoft,
    borderColor: 'rgba(124,92,255,0.45)',
  },
  author: {
    color: colors.accent,
    fontSize: fontSize.caption,
    fontWeight: '700',
    marginBottom: 1,
  },
  text: {
    color: colors.text,
    fontSize: fontSize.body,
    lineHeight: 20,
  },
  system: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
    textAlign: 'center',
    paddingVertical: 2,
  },
  empty: {
    color: colors.textMuted,
    fontSize: fontSize.small,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  quickRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  quick: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickText: {
    fontSize: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 42,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: fontSize.body,
  },
  send: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    opacity: 0.4,
  },
  sendText: {
    color: '#fff',
    fontSize: 16,
  },
});