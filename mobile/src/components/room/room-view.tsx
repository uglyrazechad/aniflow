import { useEventListener } from 'expo';
import { router } from 'expo-router';
import { useVideoPlayer } from 'expo-video';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { ChatPanel } from '@/components/room/chat-panel';
import { ParticipantsPanel } from '@/components/room/participants-panel';
import { RoomSettings } from '@/components/room/room-settings';
import { VideoStage } from '@/components/room/video-stage';
import { api, API_URL, describeError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useIdentity } from '@/lib/use-identity';
import { useRoom } from '@/lib/room/use-room';
import { correctDrift, targetPosition } from '@/lib/room/sync';
import { colors, fontSize, radius, spacing } from '@/lib/theme';
import { contentTypeFor } from '@/lib/video';
import type { RoomInfo, TranslationOption } from '@/lib/types';

const REACTIONS = ['🔥', '😂', '😱', '❤️', '👏', '🎉'];

interface Props {
  slug: string;
  password: string;
  initial: RoomInfo;
  onPasswordError?: (message: string) => void;
}

export function RoomView({ slug, password, initial, onPasswordError }: Props) {
  const { token } = useAuth();
  const identity = useIdentity();
  const insets = useSafeAreaInsets();

  const [closedMessage, setClosedMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [tab, setTab] = useState<'chat' | 'members'>('chat');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [episodesTotal, setEpisodesTotal] = useState(1);
  const [animeTitle, setAnimeTitle] = useState('');
  const [translations, setTranslations] = useState<TranslationOption[]>([]);
  const [picker, setPicker] = useState<'episodes' | 'translations' | null>(null);
  const [buffering, setBuffering] = useState(true);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);

  const room = useRoom({
    slug,
    token,
    userId: identity.userId,
    nick: identity.nick,
    password,
    onPasswordError,
    onClosed: (message) => {
      setClosedMessage(message);
      setTimeout(() => router.replace('/'), 1600);
    },
  });

  const state = room.state ?? initial.state;
  const stateRef = useRef(state);
  stateRef.current = state;

  const player = useVideoPlayer(null, (instance) => {
    instance.timeUpdateEventInterval = 1;
  });

  const loadedKeyRef = useRef('');
  const waitingRef = useRef(false);
  const lastWaitingAt = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  // Метаданные тайтла: название, число серий, озвучки.
  useEffect(() => {
    const animeId = initial.animeId;
    if (!animeId) return;
    let cancelled = false;

    api
      .anime(String(animeId))
      .then((result) => {
        if (cancelled) return;
        setAnimeTitle(result.anime.title);
        setEpisodesTotal(Math.min(Math.max(result.anime.episodesTotal ?? 1, 1), 200));
        setTranslations(result.translations ?? []);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [initial.animeId]);

  // Загрузка потока под текущую серию/озвучку комнаты.
  useEffect(() => {
    const animeId = initial.animeId;
    if (!animeId || !identity.ready) return;

    const key = `${state.episode}:${state.translationId ?? 0}`;
    if (loadedKeyRef.current === key) return;
    loadedKeyRef.current = key;
    setStreamError(null);
    setBuffering(true);

    api
      .player({
        id: String(animeId),
        episode: state.episode,
        translation: state.translationId,
      })
      .then(async (payload) => {
        await player.replaceAsync({
          uri: payload.stream.src,
          contentType: contentTypeFor(payload.stream.type),
        });
        const target = targetPosition(stateRef.current, room.skewRef.current);
        player.currentTime = target.position;
        if (!target.paused) player.play();
      })
      .catch((issue) => {
        loadedKeyRef.current = '';
        setStreamError(describeError(issue));
      });
  }, [initial.animeId, identity.ready, state.episode, state.translationId, player, room.skewRef]);

  // Применение серверного состояния: сервер — источник истины.
  useEffect(() => {
    const current = room.state;
    if (!current) return;
    const target = targetPosition(current, room.skewRef.current);

    if (target.paused) {
      if (player.playing) player.pause();
      if (Math.abs(player.currentTime - target.position) > 0.6) {
        player.currentTime = target.position;
      }
      return;
    }

    if (Math.abs(player.currentTime - target.position) > 0.5) {
      player.currentTime = target.position;
    }
    if (!player.playing && !buffering && !streamError) player.play();
  }, [room.state?.serverTime, room.state?.paused, room.state?.episode, player, buffering, streamError, room.state, room.skewRef]);

  // Плавная коррекция дрейфа раз в секунду.
  useEffect(() => {
    const timer = setInterval(() => {
      const current = stateRef.current;
      if (!current || current.paused) return;
      if (player.status !== 'readyToPlay') return;

      const target = targetPosition(current, room.skewRef.current);
      const correction = correctDrift(player.currentTime, target.position, target.rate);
      if (correction.seekTo != null) player.currentTime = correction.seekTo;
      if (Math.abs(player.playbackRate - correction.rate) > 0.001) {
        player.playbackRate = correction.rate;
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [player, room.skewRef]);

  // События плеера: буферизация, длительность, playing.
  useEventListener(player, 'statusChange', ({ status }) => {
    setDuration(player.duration || 0);
    setPlaying(player.playing);
    const loadingNow = status === 'loading';

    if (loadingNow) {
      setBuffering(true);
      if (!waitingRef.current || Date.now() - lastWaitingAt.current > 5000) {
        waitingRef.current = true;
        lastWaitingAt.current = Date.now();
        room.actions.setWaiting(true, player.currentTime);
      }
      return;
    }

    setBuffering(false);
    if (waitingRef.current) {
      waitingRef.current = false;
      room.actions.setWaiting(false);
    }
  });

  useEventListener(player, 'playingChange', ({ isPlaying }) => setPlaying(isPlaying));
  useEventListener(player, 'timeUpdate', () => {
    if (player.duration) setDuration(player.duration);
  });

  // Хост каждые 5 секунд подтверждает позицию, чтобы гости не уезжали.
  useEffect(() => {
    if (!room.isHost) return undefined;
    const timer = setInterval(() => {
      if (player.playing) room.actions.syncNow(player.currentTime, false);
    }, 5000);
    return () => clearInterval(timer);
  }, [room.isHost, player, room.actions]);

  const canControl = room.isHost || !state.hostMode;

  const togglePlay = useCallback(() => {
    if (!canControl) {
      showToast('Управляет хост');
      return;
    }
    if (player.playing) {
      player.pause();
      room.actions.pause(player.currentTime);
    } else {
      player.play();
      room.actions.play(player.currentTime);
    }
  }, [canControl, player, room.actions, showToast]);

  const seek = useCallback(
    (time: number) => {
      if (!canControl) return;
      const next = Math.max(0, time);
      player.currentTime = next;
      room.actions.seek(next);
    },
    [canControl, player, room.actions],
  );

  const skip = useCallback(
    (delta: number) => seek(player.currentTime + delta),
    [player, seek],
  );

  const changeRate = useCallback(
    (rate: number) => {
      if (!canControl) return;
      player.playbackRate = rate;
      room.actions.setRate(rate);
    },
    [canControl, player, room.actions],
  );

  const changeEpisode = useCallback(
    (episode: number) => {
      if (!canControl) return;
      if (episode < 1 || episode > Math.max(episodesTotal, 1)) return;
      setPicker(null);
      room.actions.setEpisode(episode);
    },
    [canControl, episodesTotal, room.actions],
  );

  const changeTranslation = (translationId: number | null) => {
    if (!canControl) {
      showToast('Озвучку меняет хост');
      return;
    }
    setPicker(null);
    room.actions.setTranslation(translationId);
  };

  const shareRoom = async () => {
    try {
      await Share.share({
        message: `Смотрим вместе «${animeTitle || room.roomName || 'аниме'}» на AniHub. Код комнаты: ${slug}\n${API_URL}/room/${slug}`,
      });
    } catch {
      showToast(`Код комнаты: ${slug}`);
    }
  };

  const savePrivacy = async (isPublic: boolean, nextPassword: string | null) => {
    if (!token) {
      showToast('Войдите, чтобы менять доступ');
      return;
    }
    setSaving(true);
    try {
      await api.updateRoom(token, slug, {
        isPublic,
        ...(nextPassword ? { password: nextPassword } : {}),
      });
      showToast(isPublic ? 'Комната теперь публичная' : 'Комната закрыта паролем');
    } catch (issue) {
      showToast(describeError(issue));
    } finally {
      setSaving(false);
    }
  };

  const invite = async (username: string) => {
    if (!token) return 'Войдите, чтобы отправлять приглашения';
    try {
      const result = await api.invite(token, {
        username,
        slug,
        roomName: animeTitle || room.roomName,
      });
      if (result.ok) return `Приглашение отправлено (${result.delivered ?? 1})`;
      return result.message ?? 'Пользователь не найден в приложении';
    } catch (issue) {
      return describeError(issue);
    }
  };

  const typingNames = Object.entries(room.typing)
    .filter(([, active]) => active)
    .map(([id]) => room.members.find((member) => member.userId === id)?.nick)
    .filter((nick): nick is string => Boolean(nick));

  const memberAvatars = useMemo(() => room.members.slice(0, 6), [room.members]);

  if (!identity.ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.muted}>Подключаемся…</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.xs }]}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={styles.round}
          hitSlop={10}
        >
          <Text style={styles.roundText}>‹</Text>
        </Pressable>

        <View style={styles.topInfo}>
          <Text style={styles.topTitle} numberOfLines={1}>
            {animeTitle || room.roomName || 'Комната'}
          </Text>
          <View style={styles.topMeta}>
            <View
              style={[
                styles.dot,
                room.status === 'online' && styles.dotOnline,
                room.status === 'offline' && styles.dotOffline,
              ]}
            />
            <Text style={styles.topMetaText}>
              код {slug} · {room.members.length} в комнате
            </Text>
          </View>
        </View>

        <Pressable onPress={shareRoom} style={styles.round} hitSlop={10}>
          <Text style={styles.roundText}>⇪</Text>
        </Pressable>
        {room.isHost ? (
          <Pressable onPress={() => setSettingsOpen(true)} style={styles.round} hitSlop={10}>
            <Text style={styles.roundText}>⚙</Text>
          </Pressable>
        ) : null}
      </View>

      <VideoStage
        player={player}
        playing={playing}
        duration={duration}
        canControl={canControl}
        episode={state.episode}
        episodesTotal={Math.max(episodesTotal, 1)}
        waitingNames={room.waitingNames}
        reactions={room.reactions}
        buffering={buffering}
        onTogglePlay={togglePlay}
        onSeek={seek}
        onSkip={skip}
        onRate={changeRate}
        onEpisode={changeEpisode}
      />

      {streamError ? (
        <View style={styles.streamError}>
          <Text style={styles.streamErrorText}>{streamError}</Text>
          <Button
            title="Повторить"
            size="sm"
            variant="secondary"
            onPress={() => {
              loadedKeyRef.current = '';
              setStreamError(null);
              room.actions.syncNow(state.time, state.paused);
            }}
          />
        </View>
      ) : null}

      <View style={styles.toolbar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolbarRow}>
          <Pressable onPress={() => setPicker('episodes')} style={styles.tool}>
            <Text style={styles.toolText}>Серия {state.episode}</Text>
          </Pressable>
          <Pressable onPress={() => setPicker('translations')} style={styles.tool}>
            <Text style={styles.toolText} numberOfLines={1}>
              {translations.find((item) => item.id === state.translationId)?.title ?? 'Озвучка'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              if (!room.isHost) return;
              room.actions.setPauseOnBuffering(!state.pauseOnBuffering);
            }}
            style={[styles.tool, state.pauseOnBuffering && styles.toolActive]}
          >
            <Text style={[styles.toolText, state.pauseOnBuffering && styles.toolTextActive]}>
              {state.pauseOnBuffering ? 'Пауза при буфере' : 'Ждать буфер'}
            </Text>
          </Pressable>
          {state.hostMode ? (
            <View style={[styles.tool, styles.toolLocked]}>
              <Text style={styles.toolText}>только хост</Text>
            </View>
          ) : null}
        </ScrollView>
      </View>

      <View style={styles.membersRow}>
        <View style={styles.avatarStack}>
          {memberAvatars.map((member) => (
            <Avatar
              key={member.userId}
              name={member.nick}
              size={26}
              host={member.isHost}
              style={styles.avatarStackItem}
            />
          ))}
          {room.members.length > 6 ? (
            <Text style={styles.moreMembers}>+{room.members.length - 6}</Text>
          ) : null}
        </View>
        <View style={styles.reactionsRow}>
          {REACTIONS.map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() => room.actions.reaction(emoji)}
              style={styles.reactionButton}
            >
              <Text style={styles.reactionEmoji}>{emoji}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.tabs}>
        <Pressable onPress={() => setTab('chat')} style={[styles.tab, tab === 'chat' && styles.tabActive]}>
          <Text style={[styles.tabText, tab === 'chat' && styles.tabTextActive]}>Чат</Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('members')}
          style={[styles.tab, tab === 'members' && styles.tabActive]}
        >
          <Text style={[styles.tabText, tab === 'members' && styles.tabTextActive]}>
            Участники · {room.members.length}
          </Text>
        </Pressable>
      </View>

      {tab === 'chat' ? (
        <ChatPanel
          messages={room.messages}
          userId={identity.userId}
          onSend={(text) => room.actions.chat(text)}
          onTyping={(typing) => room.actions.typing(typing)}
        />
      ) : (
        <ParticipantsPanel
          members={room.members}
          hostId={room.hostId}
          myId={identity.userId}
          isHost={room.isHost}
          onKick={(id) => room.actions.kick(id)}
          onBan={(id) => room.actions.ban(id)}
          onMute={(id) => room.actions.mute(id)}
          onTransfer={(id) => room.actions.transferHost(id)}
        />
      )}

      {typingNames.length && tab === 'chat' ? (
        <Text style={styles.typing}>{typingNames.join(', ')} печатает…</Text>
      ) : null}

      {toast ? (
        <View style={[styles.toast, { bottom: Math.max(insets.bottom, spacing.md) + 60 }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}

      {closedMessage ? (
        <View style={styles.closed}>
          <Text style={styles.closedText}>{closedMessage}</Text>
        </View>
      ) : null}

      <RoomSettings
        visible={settingsOpen}
        slug={slug}
        isPublic={room.isPublic}
        hostMode={state.hostMode}
        pauseOnBuffering={Boolean(state.pauseOnBuffering)}
        saving={saving}
        onClose={() => setSettingsOpen(false)}
        onToggleHostMode={(enable) => room.actions.setHostMode(enable)}
        onToggleBuffering={(enable) => room.actions.setPauseOnBuffering(enable)}
        onSavePrivacy={savePrivacy}
        onInvite={invite}
      />

      <Modal visible={picker !== null} transparent animationType="slide" onRequestClose={() => setPicker(null)}>
        <Pressable style={styles.pickerBackdrop} onPress={() => setPicker(null)} />
        <View style={[styles.picker, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <Text style={styles.pickerTitle}>
            {picker === 'episodes' ? 'Выберите серию' : 'Озвучка и субтитры'}
          </Text>
          <ScrollView contentContainerStyle={styles.pickerContent}>
            {picker === 'episodes' ? (
              <View style={styles.episodesGrid}>
                {Array.from({ length: Math.max(episodesTotal, 1) }, (_, index) => index + 1).map((number) => (
                  <Pressable
                    key={number}
                    onPress={() => changeEpisode(number)}
                    style={[styles.episode, number === state.episode && styles.episodeActive]}
                  >
                    <Text style={[styles.episodeText, number === state.episode && styles.episodeTextActive]}>
                      {number}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View style={styles.translations}>
                {translations.length ? (
                  translations.map((item) => {
                    const active = state.translationId === item.id;
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => changeTranslation(active ? null : item.id)}
                        style={[styles.translation, active && styles.translationActive]}
                      >
                        <Text style={styles.translationText}>{item.title}</Text>
                        {item.type === 'subtitles' ? (
                          <Text style={styles.translationHint}>субтитры</Text>
                        ) : null}
                      </Pressable>
                    );
                  })
                ) : (
                  <Text style={styles.muted}>Список озвучек недоступен — играет стандартная.</Text>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.bg,
  },
  muted: {
    color: colors.textMuted,
    fontSize: fontSize.small,
    lineHeight: 19,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.bg,
  },
  round: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundText: {
    color: colors.text,
    fontSize: 16,
  },
  topInfo: {
    flex: 1,
    gap: 1,
  },
  topTitle: {
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: '800',
  },
  topMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.gold,
  },
  dotOnline: {
    backgroundColor: colors.success,
  },
  dotOffline: {
    backgroundColor: colors.danger,
  },
  topMetaText: {
    color: colors.textMuted,
    fontSize: 11,
  },
  streamError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255,92,108,0.12)',
  },
  streamErrorText: {
    flex: 1,
    color: colors.danger,
    fontSize: fontSize.caption,
  },
  toolbar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  toolbarRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  tool: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 190,
  },
  toolActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  toolLocked: {
    borderColor: 'rgba(255,201,74,0.5)',
  },
  toolText: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
    fontWeight: '600',
  },
  toolTextActive: {
    color: colors.text,
  },
  membersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarStackItem: {
    marginRight: -8,
  },
  moreMembers: {
    color: colors.textMuted,
    fontSize: 10,
    marginLeft: spacing.md,
  },
  reactionsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  reactionButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionEmoji: {
    fontSize: 14,
  },
  tabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  tabActive: {
    backgroundColor: colors.accentSoft,
  },
  tabText: {
    color: colors.textMuted,
    fontSize: fontSize.small,
    fontWeight: '700',
  },
  tabTextActive: {
    color: colors.text,
  },
  typing: {
    color: colors.textMuted,
    fontSize: 10,
    paddingHorizontal: spacing.lg,
    paddingBottom: 4,
  },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(25,25,36,0.96)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  toastText: {
    color: colors.text,
    fontSize: fontSize.small,
  },
  closed: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(8,8,12,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  closedText: {
    color: colors.text,
    fontSize: fontSize.title,
    fontWeight: '700',
    textAlign: 'center',
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  picker: {
    maxHeight: '70%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  pickerTitle: {
    color: colors.text,
    fontSize: fontSize.title,
    fontWeight: '800',
  },
  pickerContent: {
    paddingBottom: spacing.md,
  },
  episodesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  episode: {
    minWidth: 46,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  episodeActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  episodeText: {
    color: colors.textMuted,
    fontSize: fontSize.small,
    fontWeight: '700',
  },
  episodeTextActive: {
    color: '#ffffff',
  },
  translations: {
    gap: spacing.sm,
  },
  translation: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  translationActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  translationText: {
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  translationHint: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
    marginTop: 2,
  },
});
