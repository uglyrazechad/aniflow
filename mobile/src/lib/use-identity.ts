import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import { useAuth } from './auth';
import { readNick, writeNick } from './storage';

const GUEST_ID_KEY = 'anihub.guest-id';

function randomGuestId(): string {
  return `guest-${Math.random().toString(36).slice(2, 10)}`;
}

function randomNick(): string {
  return `Гость${Math.floor(100000 + Math.random() * 899999)}`;
}

export interface Identity {
  userId: string;
  nick: string;
  ready: boolean;
}

/** Кто мы в комнате: аккаунт (user:<id>) или гость (guest-xxxx). */
export function useIdentity(): Identity {
  const { user } = useAuth();
  const [guest, setGuest] = useState<{ id: string; nick: string } | null>(null);

  useEffect(() => {
    if (user) return;
    let cancelled = false;

    (async () => {
      try {
        let id = await AsyncStorage.getItem(GUEST_ID_KEY);
        if (!id) {
          id = randomGuestId();
          await AsyncStorage.setItem(GUEST_ID_KEY, id);
        }
        const savedNick = await readNick();
        const nick = savedNick || randomNick();
        if (!savedNick) await writeNick(nick);
        if (!cancelled) setGuest({ id, nick });
      } catch {
        if (!cancelled) setGuest({ id: randomGuestId(), nick: randomNick() });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (user) {
    return {
      userId: `user:${user.id}`,
      nick: user.profile.displayName || user.username,
      ready: true,
    };
  }

  return {
    userId: guest?.id ?? '',
    nick: guest?.nick ?? '',
    ready: Boolean(guest),
  };
}
