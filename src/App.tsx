import { useState } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
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
  return <AppShell />;
}

function AppShell() {
  const { signOutUser } = useAuth();
  const [tab, setTab] = useState<Tab>('today');

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>{TAB_TITLE[tab]}</h1>
        <button
          type="button"
          className="app-header__signout"
          onClick={() => void signOutUser()}
        >
          登出
        </button>
      </header>
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
