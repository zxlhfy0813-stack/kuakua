import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { useCurrentUserProfile } from '@lark-apaas/client-toolkit/hooks/useCurrentUserProfile';

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

const SESSION_KEY = 'kuakua_session';

function readSession(): { user: KuakuaUser | null; token: string } {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return { user: null, token: '' };
    const d = JSON.parse(raw);
    return { user: d?.user ?? null, token: d?.token || '' };
  } catch {
    return { user: null, token: '' };
  }
}

function writeSession(user: KuakuaUser | null, token: string) {
  if (user && token) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ user, token }));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

// 是否运行在妙搭/apaas 运行时（此时由平台自动提供登录态，无需扫码）
function isApaasRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  return !!((window as any)._IS_Spark_RUNTIME);
}

function toUser(u: any): KuakuaUser | null {
  const open_id = u?.open_id || u?.user_id || u?.lark_user_id || u?.uid || '';
  if (!open_id) return null;
  return {
    open_id,
    name: u?.name || u?.userName || '',
    avatar: u?.avatar || u?.userAvatar || '',
    email: u?.email || '',
    access_token: u?.access_token || '',
  };
}

async function exchange(code: string): Promise<void> {
  const res = await axiosForBackend({
    url: '/api/auth',
    method: 'GET',
    params: { action: 'exchange', code },
  });
  if (res.data?.loggedIn && res.data?.user && res.data?.token) {
    writeSession(res.data.user, res.data.token);
  }
}

export const KuakuaAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<KuakuaUser | null>(null);
  const [loading, setLoading] = useState(true);

  const isApaas = React.useMemo(() => isApaasRuntime(), []);

  // 妙搭/apaas 运行时：直接用平台的当前用户（自动免登）
  const apaasUser = useCurrentUserProfile();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { user: cachedUser, token } = readSession();
      if (!cachedUser || !token) {
        setUser(null);
        return;
      }
      const res = await axiosForBackend({
        url: '/api/auth',
        method: 'GET',
        params: { action: 'me' },
        headers: { 'X-Kuakua-Token': token },
      });
      if (res.data?.loggedIn && res.data?.user) {
        setUser(res.data.user);
      } else {
        setUser(null);
        writeSession(null, '');
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isApaas) {
      const { user: cachedUser } = readSession();
      if (cachedUser) setUser(cachedUser);
      refresh();
    }
  }, [isApaas, refresh]);

  // 飞书客户端内打开时免登（官方 step-3：h5sdk.ready → tt.requestAccess/requestAuthCode）
  useEffect(() => {
    if (isApaas) return;
    const { user: cachedUser, token } = readSession();
    if (cachedUser && token) return;
    const w = window as any;
    if (!w.h5sdk || typeof w.h5sdk.ready !== 'function') return;

    w.h5sdk.ready(() => {
      const tt = w.tt;
      if (!tt) {
        setLoading(false);
        return;
      }
      const handleCode = (code: string) => {
        exchange(code)
          .then(() => {
            const s = readSession();
            setUser(s.user);
            setLoading(false);
          })
          .catch(() => setLoading(false));
      };
      const requestAuthCode = () => {
        tt.requestAuthCode({
          appId: 'cli_a9a2bc6748f95cc6',
          success: (res: any) => {
            if (res && res.code) handleCode(res.code);
            else setLoading(false);
          },
          fail: () => setLoading(false),
        });
      };
      if (typeof tt.requestAccess === 'function') {
        tt.requestAccess({
          appID: 'cli_a9a2bc6748f95cc6',
          scopeList: [],
          success: (res: any) => {
            if (res && res.code) handleCode(res.code);
            else setLoading(false);
          },
          fail: (err: any) => {
            if (err && err.errno === 103) requestAuthCode();
            else setLoading(false);
          },
        });
      } else {
        requestAuthCode();
      }
    });
  }, [isApaas]);

  // 妙搭运行时：把平台用户同步进来
  useEffect(() => {
    if (isApaas) {
      const u = toUser(apaasUser);
      setUser(u);
      setLoading(false);
    }
  }, [isApaas, apaasUser]);

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
      await axiosForBackend({ url: '/api/auth', method: 'GET', params: { action: 'logout' } });
    } catch {
      // ignore
    }
    writeSession(null, '');
    setUser(null);
    window.location.href = '/';
  }, []);

  return (
    <Ctx.Provider value={{ user, loading, login, logout, refresh }}>{children}</Ctx.Provider>
  );
};
