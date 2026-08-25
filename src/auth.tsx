import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

export interface KuakuaUser {
  open_id: string;
  name: string;
  avatar: string;
  email: string;
  access_token?: string;
}

interface AuthCtx {
  user: KuakuaUser | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  refresh: async () => {},
});

export const useKuakuaAuth = () => useContext(Ctx);

export const KuakuaAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<KuakuaUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await axiosForBackend({
        url: '/api/auth',
        method: 'GET',
        params: { action: 'me' },
      });
      if (res.data?.loggedIn && res.data?.user) {
        setUser(res.data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async () => {
    try {
      const res = await axiosForBackend({
        url: '/api/auth',
        method: 'GET',
        params: { action: 'login-url' },
      });
      window.location.href = res.data?.url || '/';
    } catch {
      // ignore
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await axiosForBackend({
        url: '/api/auth',
        method: 'GET',
        params: { action: 'logout' },
      });
    } catch {
      // ignore
    }
    setUser(null);
    window.location.href = '/';
  }, []);

  return (
    <Ctx.Provider value={{ user, loading, login, logout, refresh }}>{children}</Ctx.Provider>
  );
};
