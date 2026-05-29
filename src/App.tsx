import { useState } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import {
  ParentDataProvider,
  useDataSync,
} from './lib/parentData';
import LoginScreen from './pages/LoginScreen';
import SettingsPage from './pages/SettingsPage';
import TasksPage from './pages/TasksPage';
import TodayPage from './pages/TodayPage';

type Tab = 'today' | 'tasks' | 'settings';

const TAB_TITLE: Record<Tab, string> = {
  today: '今天',
  tasks: '任務',
  settings: '設定',
};

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

function AuthGate() {
  const { user, loading, configured } = useAuth();

  if (configured && loading) {
    return <div className="app-loading">載入中…</div>;
  }
  if (configured && !user) {
    return <LoginScreen />;
  }
  return (
    <ParentDataProvider>
      <DataReadyGate />
    </ParentDataProvider>
  );
}

function DataReadyGate() {
  const { configured } = useAuth();
  const sync = useDataSync();

  if (configured && !sync.ready) {
    return <div className="app-loading">載入資料中…</div>;
  }
  return <AppShell />;
}

function AppShell() {
  const { user, signOutUser, configured } = useAuth();
  const sync = useDataSync();
  const [tab, setTab] = useState<Tab>('today');
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const displayName =
    user?.displayName || user?.email?.split('@')[0] || '家長';

  const handleSignOut = () => {
    setConfirmSignOut(false);
    void signOutUser();
  };

  return (
    <div className="app-shell">
      {!configured && (
        <div className="app-status app-status--setup" role="status">
          尚未設定 Firebase。請複製 <code>.env.example</code> 為{' '}
          <code>.env.local</code> 並填入你的 Firebase 專案設定，再重新啟動。
        </div>
      )}
      <header className="app-header">
        <div className="app-header__title-row">
          <h1>{TAB_TITLE[tab]}</h1>
          {configured && user && (
            <div className="app-header__identity" data-testid="user-identity">
              {user.photoURL && (
                <img
                  src={user.photoURL}
                  alt={displayName}
                  className="app-header__avatar"
                />
              )}
              <span className="app-header__name">{displayName}</span>
            </div>
          )}
        </div>
        {configured && (
          <button
            type="button"
            className="app-header__signout"
            onClick={() => setConfirmSignOut(true)}
          >
            登出
          </button>
        )}
      </header>

      <StatusBanners sync={sync} />

      {confirmSignOut && (
        <div className="confirm-dialog" role="dialog" aria-modal="true">
          <p>確定要登出嗎？</p>
          <div className="confirm-dialog__actions">
            <button type="button" onClick={() => setConfirmSignOut(false)}>
              取消
            </button>
            <button type="button" onClick={handleSignOut}>
              登出
            </button>
          </div>
        </div>
      )}

      <main className="app-main">
        {tab === 'today' && <TodayPage />}
        {tab === 'tasks' && <TasksPage />}
        {tab === 'settings' && <SettingsPage />}
      </main>
      <nav className="app-tabbar" aria-label="主要導覽">
        {(['today', 'tasks', 'settings'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            className={tab === t ? 'active' : ''}
            onClick={() => setTab(t)}
          >
            {TAB_TITLE[t]}
          </button>
        ))}
      </nav>
    </div>
  );
}

function StatusBanners({ sync }: { sync: ReturnType<typeof useDataSync> }) {
  if (sync.error) {
    return (
      <div className="app-status app-status--error" role="alert">
        {sync.error}
      </div>
    );
  }
  if (sync.offline) {
    return (
      <div className="app-status app-status--offline" role="status">
        目前離線，顯示的是快取資料。
      </div>
    );
  }
  return null;
}
