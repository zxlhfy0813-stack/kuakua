import React from 'react';
import { Loader2 } from 'lucide-react';
import { useKuakuaAuth } from '@/auth';

const LoginGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, login } = useKuakuaAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-6">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-3xl font-bold text-primary-foreground">
          夸
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">夸夸平台</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            请使用飞书扫码登录后使用
          </p>
        </div>
        <button
          onClick={login}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-base font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
        >
          <span>飞书扫码登录</span>
        </button>
        <p className="text-xs text-muted-foreground">登录后自动进入夸夸平台</p>
      </div>
    );
  }

  return <>{children}</>;
};

export default LoginGate;
