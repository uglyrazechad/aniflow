import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { api, ApiError, describeError } from './api';
import { readToken, writeNick, writeToken } from './storage';
import type { SafeUser } from './types';

interface AuthContextValue {
  token: string | null;
  user: SafeUser | null;
  ready: boolean;
  busy: boolean;
  error: string | null;
  signIn: (login: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ needsVerification: boolean; message?: string }>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SafeUser | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const saved = await readToken();
      if (!saved) {
        if (!cancelled) setReady(true);
        return;
      }

      try {
        const { user: me } = await api.me(saved);
        if (!cancelled) {
          setToken(saved);
          setUser(me);
        }
      } catch (issue) {
        if (issue instanceof ApiError && issue.status === 401) {
          await writeToken(null);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (login: string, password: string) => {
    setBusy(true);
    setError(null);
    try {
      const result = await api.login(login, password);
      await writeToken(result.token);
      setToken(result.token);
      setUser(result.user);
      await writeNick(result.user.profile.displayName || result.user.username);
    } catch (issue) {
      setError(describeError(issue));
      throw issue;
    } finally {
      setBusy(false);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    setBusy(true);
    setError(null);
    try {
      const result = await api.register(email, password, displayName);
      if (!result.token || !result.user) {
        return {
          needsVerification: true,
          message: result.message ?? 'Код подтверждения отправлен на почту',
        };
      }
      await writeToken(result.token);
      setToken(result.token);
      setUser(result.user);
      await writeNick(result.user.profile.displayName || result.user.username);
      return { needsVerification: false };
    } catch (issue) {
      setError(describeError(issue));
      throw issue;
    } finally {
      setBusy(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    const current = token;
    setToken(null);
    setUser(null);
    await writeToken(null);
    if (current) api.logout(current).catch(() => undefined);
  }, [token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      ready,
      busy,
      error,
      signIn,
      signUp,
      signOut,
      clearError: () => setError(null),
    }),
    [token, user, ready, busy, error, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth должен вызываться внутри AuthProvider');
  return context;
}
