import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { authApi, checkoutApi, type User } from './api';
import { identifyPurchaser } from './purchases';

const TOKEN_KEY = 'mayo_auth_token';

export type AuthStatus =
  | 'loading' // bootstrapping from storage
  | 'signedOut' // no token
  | 'pendingActivation' // token issued, waiting for the magic link to be clicked
  | 'signedIn'; // token activated, user loaded

interface AuthState {
  status: AuthStatus;
  token: string | null;
  user: User | null;
  /**
   * Paywall gate: has the user started the app-subscription trial?
   * Loaded together with the user, so it's a boolean whenever signedIn.
   */
  hasAccess: boolean | null;
  /** Request a login: stores the issued token and moves to pendingActivation. */
  requestLogin: (email: string) => Promise<void>;
  /** Poll once for activation; returns true and signs in when activated. */
  refreshActivation: () => Promise<boolean>;
  /** Poll once for trial status (paywall screen); returns the fresh value. */
  refreshAccess: () => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  const persistToken = useCallback(async (value: string | null) => {
    setToken(value);
    if (value) await SecureStore.setItemAsync(TOKEN_KEY, value);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  }, []);

  // Bootstrap from secure storage on launch.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await SecureStore.getItemAsync(TOKEN_KEY);
      if (cancelled) return;
      if (!stored) {
        setStatus('signedOut');
        return;
      }
      setToken(stored);
      try {
        const activated = await authApi.checkTokenStatus(stored);
        if (cancelled) return;
        if (activated) {
          const [me, access] = await Promise.all([
            authApi.validateToken(stored),
            checkoutApi.getSubscriptionStatus(stored),
          ]);
          if (cancelled) return;
          setUser(me);
          setHasAccess(access);
          setStatus('signedIn');
          // Tie RevenueCat purchases to this user (no-op without a key / in Expo Go).
          identifyPurchaser(me.email).catch(() => {});
        } else {
          setStatus('pendingActivation');
        }
      } catch {
        // Token invalid/expired or backend unreachable — fall back to signed out.
        if (cancelled) return;
        await persistToken(null);
        setStatus('signedOut');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [persistToken]);

  const requestLogin = useCallback(
    async (email: string) => {
      const res = await authApi.register(email.trim().toLowerCase());
      await persistToken(res.token);
      setUser(null);
      setHasAccess(null);
      setStatus('pendingActivation');
    },
    [persistToken],
  );

  const refreshActivation = useCallback(async () => {
    if (!token) return false;
    const activated = await authApi.checkTokenStatus(token);
    if (!activated) return false;
    const [me, access] = await Promise.all([
      authApi.validateToken(token),
      checkoutApi.getSubscriptionStatus(token),
    ]);
    setUser(me);
    setHasAccess(access);
    setStatus('signedIn');
    identifyPurchaser(me.email).catch(() => {});
    return true;
  }, [token]);

  const refreshAccess = useCallback(async () => {
    if (!token) return false;
    const access = await checkoutApi.getSubscriptionStatus(token);
    setHasAccess(access);
    return access;
  }, [token]);

  const signOut = useCallback(async () => {
    await persistToken(null);
    setUser(null);
    setHasAccess(null);
    setStatus('signedOut');
  }, [persistToken]);

  const value = useMemo<AuthState>(
    () => ({
      status,
      token,
      user,
      hasAccess,
      requestLogin,
      refreshActivation,
      refreshAccess,
      signOut,
    }),
    [status, token, user, hasAccess, requestLogin, refreshActivation, refreshAccess, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
