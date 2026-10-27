/** Phiên đăng nhập admin: token + user (ADMIN/STAFF), tự hết phiên khi refresh thất bại */
import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { PublicUserDTO } from '@shared/types';
import { TOKEN_KEY, USER_KEY, post, errMessage } from '../lib/api';

export interface AuthCtx {
  user: PublicUserDTO | null;
  token: string | null;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  reset: () => void;
}

const AuthContext = createContext<AuthCtx | null>(null);

function readUser(): PublicUserDTO | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as PublicUserDTO) : null;
  } catch {
    return null;
  }
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUserDTO | null>(() => readUser());
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));

  const signIn = useCallback(async (email: string, password: string) => {
    const r = await post<{ accessToken: string; user: PublicUserDTO }>('/auth/login', { email, password });
    if (r.data.user.role === 'CUSTOMER') {
      throw new Error('Tài khoản khách không thể vào khu quản trị. Dùng tài khoản ADMIN/STAFF.');
    }
    localStorage.setItem(TOKEN_KEY, r.data.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(r.data.user));
    setToken(r.data.accessToken);
    setUser(r.data.user);
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider value={{ user, token, isAdmin, signIn, reset }}>{children}</AuthContext.Provider>
  );
}

export function useAdminAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAdminAuth phải nằm trong AdminAuthProvider');
  return ctx;
}

void errMessage;
