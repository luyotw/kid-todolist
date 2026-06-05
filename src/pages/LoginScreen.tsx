import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { useOnlineStatus } from '../lib/cloudSync';
import { shouldShowOfflineLoginHint } from '../lib/pwa/offlineGate';

export default function LoginScreen() {
  const {
    configured,
    user,
    usingEmulators,
    continueAsGuest,
    signInWithGoogle,
    signInForLocalDev,
  } = useAuth();
  const online = useOnlineStatus();
  const [error, setError] = useState<string | null>(null);
  const offlineLoginHint = shouldShowOfflineLoginHint({
    configured,
    user,
    online,
  });

  if (!configured) {
    return (
      <div className="login-screen">
        <h1>每天的事</h1>
        <p className="login-screen__hint">
          尚未設定 Firebase。請複製 <code>.env.example</code> 為{' '}
          <code>.env.local</code> 並填入你的 Firebase 專案設定，再重新啟動。
          <br />
          或改用本機 Emulator：<code>npm run dev:local</code>
        </p>
      </div>
    );
  }

  if (usingEmulators) {
    return (
      <div className="login-screen">
        <h1>每天的事</h1>
        <p className="login-screen__hint" role="status">
          本機 Firebase Emulator 模式。請先執行 <code>npm run dev:local</code>{' '}
          （會一併啟動 Auth + Firestore），再點下方登入。
        </p>
        <button
          type="button"
          className="login-screen__google login-screen__emulator"
          onClick={async () => {
            setError(null);
            try {
              await signInForLocalDev();
            } catch {
              setError('本機登入失敗。請確認 Emulator 已啟動（port 9099 / 8080）。');
            }
          }}
        >
          本機測試登入
        </button>
        <button
          type="button"
          className="login-screen__guest"
          onClick={() => continueAsGuest()}
        >
          訪客
        </button>
        <p className="login-screen__guest-hint">
          訪客僅限本機使用。登入 Google 帳號可跨裝置同步，並與另一位家長共享家庭任務。
        </p>
        {error && (
          <p className="login-screen__error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="login-screen">
      <h1>每天的事</h1>
      {offlineLoginHint ? (
        <p className="login-screen__hint" role="status">
          請先連上網路，才能使用 Google 登入。
        </p>
      ) : (
        <p className="login-screen__hint">家長用 Google 帳號登入，管理小孩的任務。</p>
      )}
      {!offlineLoginHint && (
        <button
          type="button"
          className="login-screen__google"
          onClick={async () => {
            setError(null);
            try {
              await signInWithGoogle();
            } catch (err: unknown) {
              const code =
                err && typeof err === 'object' && 'code' in err
                  ? String((err as { code: string }).code)
                  : '';
              if (code === 'auth/popup-closed-by-user') {
                setError('已取消登入。');
              } else {
                setError('登入失敗，請再試一次。');
              }
            }
          }}
        >
          使用 Google 登入
        </button>
      )}
      <button
        type="button"
        className="login-screen__guest"
        onClick={() => continueAsGuest()}
      >
        訪客
      </button>
      <p className="login-screen__guest-hint">
        訪客僅限本機使用。登入 Google 帳號可跨裝置同步，並與另一位家長共享家庭任務。
      </p>
      {error && (
        <p className="login-screen__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
