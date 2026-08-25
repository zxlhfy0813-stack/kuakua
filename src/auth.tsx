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

export const KuakuaAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<KuakuaUser | null>(null);
  const [loading, setLoading] = useState(true);

  const isApaas = React.useMemo(() => isApaasRuntime(), []);

  // 妙搭/apaas 运行时：直接用平台的当前用户（自动免登）
  const apaasUser = useCurrentUserProfile();

  const refresh = useCallback(async () => {
    setLoading(true);
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
    if (!isApaas) {
      refresh();
    }
  }, [isApaas, refresh]);

  // 飞书客户端内打开时：用飞书 JS-SDK 免登自动拿账号（需飞书后台配 H5 可信域名 + 开启免登）
  useEffect(() => {
    if (isApaas) return;
    if (document.cookie.indexOf('kuakua_session') >= 0) return;
    const w = window as any;
    const h5sdk = w.h5sdk;
    const tt = w.tt;
    if (!h5sdk || typeof h5sdk.ready !== 'function' || !tt) return;
    h5sdk.ready(() => {
      const requestAuthCode = () => {
        tt.requestAuthCode({
          appId: 'cli_a9a2bc6748f95cc6',
          success: (res: any) => {
            if (res && res.code) {
              window.location.href = `/api/auth?code=${encodeURIComponent(res.code)}`;
            } else {
              setLoading(false);
            }
          },
          fail: () => setLoading(false),
        });
      };
      if (typeof tt.requestAccess === 'function') {
        tt.requestAccess({
          appID: 'cli_a9a2bc6748f95cc6',
          scopeList: [],
          success: (res: any) => {
            if (res && res.code) {
              window.location.href = `/api/auth?code=${encodeURIComponent(res.code)}`;
            } else {
              setLoading(false);
            }
          },
          fail: (err: any) => {
            if (err && err.errno === 103) {
              requestAuthCode();
            } else {
              setLoading(false);
            }
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
