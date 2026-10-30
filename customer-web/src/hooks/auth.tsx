/** Ngữ cảnh tài khoản: đăng nhập / đăng nhập lại / hồ sơ cho customer-web */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { PublicUserDTO } from '@shared/types';
import { clearToken, TOKEN_KEY } from '../lib/api';

interface AuthState {
  user: PublicUserDTO | null;
  logged: boolean;
  ready: boolean;
}

interface AuthContextValue {
  user: PublicUserDTO | null;
  logged: boolean;
  ready: boolean;
  setUser: (u: PublicUserDTO | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, logged: false, ready: false });

  useEffect(() => {
    let alive = true;
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setState({ user: null, logged: false, ready: true });
      return () => { alive = false; };
    }
    import('../lib/api').then(({ instance }) =>
      instance
        .get('/auth/me')
        .then((res) => {
          if (!alive) return;
          const body = res.data as { success: boolean; data: { user: PublicUserDTO } };
          if (body.success) setState({ user: body.data.user, logged: true, ready: true });
          else setState({ user: null, logged: false, ready: true });
        })
        .catch(() => {
          if (!alive) return;
          clearToken();
          setState({ user: null, logged: false, ready: true });
        })
    );
    const onExpired = () => setState({ user: null, logged: false, ready: true });
    window.addEventListener('nc:auth-expired', onExpired);
    return () => {
      alive = false;
      window.removeEventListener('nc:auth-expired', onExpired);
    };
  }, []);

  const logout = useCallback(async () => {
    const { post } = await import('../lib/api');
    try { await post('/auth/logout'); } catch { /* bỏ qua */ }
    clearToken();
    setState({ user: null, logged: false, ready: true });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: state.user,
      logged: state.logged,
      ready: state.ready,
      setUser: (u) => setState({ user: u, logged: !!u, ready: true }),
      logout,
    }),
    [state, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải dùng trong AuthProvider');
  return ctx;
}
