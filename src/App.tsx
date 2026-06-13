import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPen, faRefresh, faSignOut } from '@fortawesome/free-solid-svg-icons';
import BottomSheet from './components/BottomSheet';
import { AuthProvider, useAuth } from './lib/auth';
import {
  ParentDataProvider,
  useDataSync,
  usePoints,
} from './lib/parentData';
import {
  acceptInvite,
  captureJoinTokenFromLocation,
  clearLocationJoinParam,
  clearPendingJoinToken,
  FamilyMembershipProvider,
  INVITE_USER_MESSAGES,
  memberProfileFromAuth,
  readPendingJoinToken,
  useFamilyMembership,
} from './lib/family';
import { useOnlineStatus } from './lib/cloudSync';
import { reloadApp } from './lib/pwa/standalone';
import LoginScreen from './pages/LoginScreen';
import SettingsPage from './pages/SettingsPage';
import TasksPage from './pages/TasksPage';
import TodayPage from './pages/TodayPage';

type Tab = 'today' | 'settings';

const TAB_TITLE: Record<Tab, string> = {
  today: '今天',
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
  const { user, loading, configured, isGuest } = useAuth();

  if (configured && loading) {
    return <div className="app-loading">載入中…</div>;
  }
  if (configured && !user && !isGuest) {
    return <LoginScreen />;
  }
  return (
    <FamilyMembershipProvider uid={user && !isGuest ? user.uid : null}>
      <ParentDataProvider>
        <DataReadyGate />
      </ParentDataProvider>
    </FamilyMembershipProvider>
  );
}

function DataReadyGate() {
  const { configured, user, isGuest } = useAuth();
  const { loading: membershipLoading } = useFamilyMembership();
  const sync = useDataSync();

  if (configured && user && !isGuest && membershipLoading) {
    return <div className="app-loading">載入資料中…</div>;
  }
  if (configured && !sync.ready) {
    return <div className="app-loading">載入資料中…</div>;
  }
  return <AppShell />;
}

function JoinFlowHandler() {
  const { user, isGuest, configured } = useAuth();
  const online = useOnlineStatus();
  const { refresh } = useFamilyMembership();
  const [message, setMessage] = useState<string | null>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    captureJoinTokenFromLocation();
  }, []);

  useEffect(() => {
    if (!configured || !user || isGuest || processedRef.current) return;
    const token = readPendingJoinToken();
    if (!token) return;

    processedRef.current = true;
    void (async () => {
      const profile = memberProfileFromAuth(user);
      const result = await acceptInvite(user.uid, token, {
        online,
        profile: Object.keys(profile).length > 0 ? profile : undefined,
      });
      clearPendingJoinToken();
      clearLocationJoinParam();
      if (result.ok) {
        refresh();
        setMessage(INVITE_USER_MESSAGES[result.code]);
      } else {
        setMessage(INVITE_USER_MESSAGES[result.code]);
      }
    })();
  }, [configured, user, isGuest, online, refresh]);

  if (!message) return null;
  return (
    <div
      className="app-status app-status--info"
      role="status"
      data-testid="join-flow-status"
    >
      <span>{message}</span>
      <button
        type="button"
        className="app-status__dismiss"
        aria-label="關閉"
        onClick={() => setMessage(null)}
      >
        關閉
      </button>
    </div>
  );
}

function AppShell() {
  const { user, isGuest, signOutUser, configured } = useAuth();
  const sync = useDataSync();
  const { balance } = usePoints();
  const [tab, setTab] = useState<Tab>('today');
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [tasksSheetOpen, setTasksSheetOpen] = useState(false);

  const displayName = isGuest
    ? '訪客'
    : user?.displayName || user?.email?.split('@')[0] || '家長';

  useEffect(() => {
    if (tab !== 'today' && tasksSheetOpen) {
      setTasksSheetOpen(false);
    }
  }, [tab, tasksSheetOpen]);

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
          <span className="app-header__points" data-testid="points-balance">
            點數 {balance}
          </span>
          {configured && (user || isGuest) && (
            <div className="app-header__identity" data-testid="user-identity">
              {user?.photoURL && (
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
        {configured && (user || isGuest) && (
          <div className="app-header__actions">
            <button
              type="button"
              className="app-header__refresh"
              aria-label="重新整理"
              onClick={() => reloadApp()}
            >
              <FontAwesomeIcon icon={faRefresh} aria-hidden />
            </button>
            {tab === 'today' && (
              <button
                type="button"
                className="app-header__tasks"
                aria-label="管理任務"
                onClick={() => setTasksSheetOpen(true)}
              >
                <FontAwesomeIcon icon={faPen} aria-hidden />
              </button>
            )}
            <button
              type="button"
              className="app-header__signout"
              aria-label="登出"
              onClick={() => setConfirmSignOut(true)}
            >
              <FontAwesomeIcon icon={faSignOut} aria-hidden />
            </button>
          </div>
        )}
      </header>

      <StatusBanners sync={sync} />
      <JoinFlowHandler />

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

      <BottomSheet
        open={tasksSheetOpen}
        onClose={() => setTasksSheetOpen(false)}
        ariaLabel="管理任務"
      >
        <TasksPage />
      </BottomSheet>

      <main
        className={tasksSheetOpen ? 'app-main app-main--locked' : 'app-main'}
        aria-hidden={tasksSheetOpen ? true : undefined}
      >
        {tab === 'today' && <TodayPage />}
        {tab === 'settings' && <SettingsPage />}
      </main>
      <nav className="app-tabbar" aria-label="主要導覽">
        {(['today', 'settings'] as Tab[]).map((t) => (
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
