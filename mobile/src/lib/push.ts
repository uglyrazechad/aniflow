import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const INVITE_CHANNEL = 'invites';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Запрашивает разрешение и возвращает Expo push-токен (null, если недоступно). */
export async function registerPushToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  try {
    await Notifications.setNotificationChannelAsync(INVITE_CHANNEL, {
      name: 'Приглашения в комнаты',
      importance: Notifications.AndroidImportance.HIGH, // eslint-disable-line import/namespace
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7c5cff',
    });

    const current = await Notifications.getPermissionsAsync();
    let status = current.status;
    if (status !== 'granted') {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return null;

    const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
    const projectId = extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) {
      // Без projectId Expo Push Service не работает — нужен `eas init`.
      console.warn('[push] не задан projectId, push-уведомления отключены');
      return null;
    }

    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch (error) {
    console.warn('[push] регистрация не удалась', error);
    return null;
  }
}

export function inviteUrl(slug: string): string {
  return `/room/${slug}`;
}
