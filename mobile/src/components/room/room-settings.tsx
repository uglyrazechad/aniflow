import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { colors, fontSize, radius, spacing } from '@/lib/theme';

interface Props {
  visible: boolean;
  slug: string;
  isPublic: boolean;
  hostMode: boolean;
  pauseOnBuffering: boolean;
  saving: boolean;
  onClose: () => void;
  onToggleHostMode: (enable: boolean) => void;
  onToggleBuffering: (enable: boolean) => void;
  onSavePrivacy: (isPublic: boolean, password: string | null) => void;
  onInvite: (username: string) => Promise<string>;
}

export function RoomSettings({
  visible,
  slug,
  isPublic,
  hostMode,
  pauseOnBuffering,
  saving,
  onClose,
  onToggleHostMode,
  onToggleBuffering,
  onSavePrivacy,
  onInvite,
}: Props) {
  const insets = useSafeAreaInsets();
  const [privateRoom, setPrivateRoom] = useState(!isPublic);
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setPrivateRoom(!isPublic);
    setPassword('');
    setInviteMessage(null);
  }, [visible, isPublic]);

  const savePrivacy = () => {
    if (!privateRoom) {
      onSavePrivacy(true, null);
      return;
    }
    if (password.trim().length < 3) {
      setInviteMessage('Для приватной комнаты нужен пароль (минимум 3 символа)');
      return;
    }
    onSavePrivacy(false, password.trim());
  };

  const sendInvite = async () => {
    const name = username.trim().replace(/^@/, '');
    if (!name) return;
    setInviteBusy(true);
    setInviteMessage(null);
    try {
      setInviteMessage(await onInvite(name));
      setUsername('');
    } finally {
      setInviteBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <View style={styles.handle} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <Text style={styles.title}>Настройки комнаты</Text>
          <Text style={styles.code}>Код: {slug}</Text>

          <View style={styles.group}>
            <Text style={styles.groupTitle}>Управление</Text>
            <Row
              title="Управляет только хост"
              hint="Гости смотрят, перемотка и пауза — у вас"
              value={hostMode}
              onChange={onToggleHostMode}
            />
            <Row
              title="Пауза всем при буферизации"
              hint="Комната ждёт, пока все догрузят видео"
              value={pauseOnBuffering}
              onChange={onToggleBuffering}
            />
          </View>

          <View style={styles.group}>
            <Text style={styles.groupTitle}>Доступ</Text>
            <Row
              title="Приватная комната"
              hint="Вход только по паролю"
              value={privateRoom}
              onChange={setPrivateRoom}
            />
            {privateRoom ? (
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder={isPublic ? 'Новый пароль' : 'Новый пароль (оставьте пустым — не менять)'}
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                secureTextEntry
                maxLength={16}
              />
            ) : null}
            <Button
              title="Сохранить доступ"
              variant="secondary"
              loading={saving}
              onPress={savePrivacy}
            />
          </View>

          <View style={styles.group}>
            <Text style={styles.groupTitle}>Пригласить друга</Text>
            <Text style={styles.hint}>
              Нужен ник на AniHub и приложение с включёнными уведомлениями.
            </Text>
            <View style={styles.inviteRow}>
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="@nickname"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, styles.inviteInput]}
                autoCapitalize="none"
                maxLength={24}
              />
              <Button
                title="Пуш"
                size="sm"
                loading={inviteBusy}
                disabled={!username.trim()}
                onPress={sendInvite}
              />
            </View>
            {inviteMessage ? <Text style={styles.message}>{inviteMessage}</Text> : null}
          </View>

          <Button title="Готово" onPress={onClose} />
        </ScrollView>
      </View>
    </Modal>
  );
}

function Row({
  title,
  hint,
  value,
  onChange,
}: {
  title: string;
  hint: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.hint}>{hint}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.accent }}
        thumbColor="#ffffff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
    maxHeight: '82%',
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.heading,
    fontWeight: '800',
  },
  code: {
    color: colors.textMuted,
    fontSize: fontSize.small,
    marginTop: -spacing.md,
  },
  group: {
    gap: spacing.md,
  },
  groupTitle: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  hint: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
    lineHeight: 16,
  },
  input: {
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: fontSize.body,
  },
  inviteRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  inviteInput: {
    flex: 1,
  },
  message: {
    color: colors.success,
    fontSize: fontSize.caption,
    lineHeight: 17,
  },
});
