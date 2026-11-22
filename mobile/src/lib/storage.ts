import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import type { WatchProgress } from './types';

const TOKEN_KEY = 'anihub.token';
const PROGRESS_KEY = 'anihub.progress.v1';
const NICK_KEY = 'anihub.nick';
const MAX_PROGRESS = 40;

export async function readToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function writeToken(token: string | null): Promise<void> {
  try {
    if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    /* на веб-платформе SecureStore недоступен — токен просто не сохранится */
  }
}

export async function readNick(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(NICK_KEY);
  } catch {
    return null;
  }
}

export async function writeNick(nick: string): Promise<void> {
  try {
    await AsyncStorage.setItem(NICK_KEY, nick);
  } catch {
    /* ignore */
  }
}

export async function readLocalProgress(): Promise<WatchProgress[]> {
  try {
    const raw = await AsyncStorage.getItem(PROGRESS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WatchProgress[]) : [];
  } catch {
    return [];
  }
}

export async function saveLocalProgress(entry: WatchProgress): Promise<WatchProgress[]> {
  const items = (await readLocalProgress()).filter((item) => item.id !== entry.id);
  const next = [{ ...entry, updatedAt: Date.now() }, ...items]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_PROGRESS);
  try {
    await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}
