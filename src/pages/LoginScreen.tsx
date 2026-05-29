import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { useOnlineStatus } from '../lib/cloudSync';
import { shouldShowOfflineLoginHint } from '../lib/pwa/offlineGate';

export default function LoginScreen() {
  const { configured, user, signInWithGoogle } = useAuth();
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
        </p>
      </div>
    );
  }

  if (offlineLoginHint) {
    return (
      <div className="login-screen">
        <h1>每天的事</h1>
        <p className="login-screen__hint" role="status">
          請先連上網路，才能首次使用或登入。
        </p>
      </div>
    );
  }

  return (
    <div className="login-screen">
      <h1>每天的事</h1>
      <p className="login-screen__hint">家長用 Google 帳號登入，管理小孩的任務。</p>
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
      {error && (
        <p className="login-screen__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
