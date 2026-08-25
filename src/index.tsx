import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';

import RoutesComponent from './app.tsx';
import './index.css';
import { createPortal } from 'react-dom';
import { Toaster } from '@/components/ui/sonner';
import { KuakuaAuthProvider } from './auth.tsx';

// 飞书 SDK 组件
import { AppContainer } from '@lark-apaas/client-toolkit/components/AppContainer';

const CLIENT_BASE_PATH = process.env.CLIENT_BASE_PATH || '/';

const MainApp = () => {
  return (
    <BrowserRouter basename={CLIENT_BASE_PATH}>
      <AppContainer defaultTheme="light">
        <ErrorBoundary
          fallbackRender={({ error, resetErrorBoundary }) => (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <h2>应用出错了</h2>
              <p style={{ color: '#666' }}>{error?.message}</p>
              <button
                onClick={resetErrorBoundary}
                style={{
                  marginTop: 16,
                  padding: '8px 24px',
                  backgroundColor: '#f97415',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                重试
              </button>
            </div>
          )}
        >
          <KuakuaAuthProvider>
            <RoutesComponent />
            {createPortal(<Toaster />, document.body)}
          </KuakuaAuthProvider>
        </ErrorBoundary>
      </AppContainer>
    </BrowserRouter>
  );
};

createRoot(document.getElementById('root')!).render(<MainApp />);
