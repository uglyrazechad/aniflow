import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { colors, fontSize, radius, spacing } from '@/lib/theme';
import type { RoomMember } from '@/lib/types';

interface Props {
  members: RoomMember[];
  hostId: string | null;
  myId: string;
  isHost: boolean;
  onKick: (userId: string) => void;
  onBan: (userId: string) => void;
  onMute: (userId: string) => void;
  onTransfer: (userId: string) => void;
}

export function ParticipantsPanel({
  members,
  hostId,
  myId,
  isHost,
  onKick,
  onBan,
  onMute,
  onTransfer,
}: Props) {
  return (
    <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
      {members.map((member) => {
        const isRoomHost = member.isHost || member.userId === hostId;
        const isMe = member.userId === myId;

        return (
          <View key={member.userId} style={styles.row}>
            <Avatar name={member.nick} size={40} host={isRoomHost} />
            <View style={styles.info}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>
                  {member.nick}
                  {isMe ? ' (вы)' : ''}
                </Text>
                {isRoomHost ? <Text style={styles.badge}>хост</Text> : null}
                {member.authed ? <Text style={styles.authed}>аккаунт</Text> : null}
              </View>
              <Text style={styles.status}>
                {member.waiting ? 'ждём загрузку…' : member.muted ? 'заглушён' : 'смотрит'}
              </Text>
            </View>

            {isHost && !isMe ? (
              <View style={styles.actions}>
                <Pressable onPress={() => onMute(member.userId)} style={styles.action}>
                  <Text style={styles.actionText}>{member.muted ? '🔊' : '🔇'}</Text>
                </Pressable>
                <Pressable onPress={() => onTransfer(member.userId)} style={styles.action}>
                  <Text style={styles.actionText}>♛</Text>
                </Pressable>
                <Pressable onPress={() => onKick(member.userId)} style={styles.action}>
                  <Text style={styles.actionText}>↩</Text>
                </Pressable>
                <Pressable onPress={() => onBan(member.userId)} style={[styles.action, styles.danger]}>
                  <Text style={styles.actionText}>⛔</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  name: {
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: '700',
    flexShrink: 1,
  },
  badge: {
    color: '#1a1305',
    backgroundColor: colors.gold,
    borderRadius: radius.sm,
    paddingHorizontal: 5,
    paddingVertical: 1,
    fontSize: 10,
    fontWeight: '800',
    overflow: 'hidden',
  },
  authed: {
    color: colors.success,
    fontSize: 10,
    fontWeight: '700',
  },
  status: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
  },
  actions: {
    flexDirection: 'row',
    gap: 4,
  },
  action: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  danger: {
    borderColor: 'rgba(255,92,108,0.4)',
  },
  actionText: {
    fontSize: 13,
  },
});
