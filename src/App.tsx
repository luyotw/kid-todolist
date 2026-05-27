import { useState } from 'react';
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
  const [tab, setTab] = useState<Tab>('today');

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>{TAB_TITLE[tab]}</h1>
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
