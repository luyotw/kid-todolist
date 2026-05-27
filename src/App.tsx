import { useState } from 'react';
import TasksPage from './pages/TasksPage';
import TodayPage from './pages/TodayPage';

type Tab = 'today' | 'tasks';

export default function App() {
  const [tab, setTab] = useState<Tab>('today');

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>{tab === 'today' ? '今天' : '任務'}</h1>
      </header>
      <main className="app-main">
        {tab === 'today' ? <TodayPage /> : <TasksPage />}
      </main>
      <nav className="app-tabbar" aria-label="主要導覽">
        <button
          type="button"
          className={tab === 'today' ? 'active' : ''}
          onClick={() => setTab('today')}
        >
          今天
        </button>
        <button
          type="button"
          className={tab === 'tasks' ? 'active' : ''}
          onClick={() => setTab('tasks')}
        >
          任務
        </button>
      </nav>
    </div>
  );
}
