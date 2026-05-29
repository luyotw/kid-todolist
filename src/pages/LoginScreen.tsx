import { useState } from 'react';
import { useAuth } from '../lib/auth';

export default function LoginScreen() {
  const { configured, signInWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);

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
          } catch {
            setError('登入失敗，請再試一次。');
          }
        }}
      >
        使用 Google 登入
      </button>
      {error && <p className="login-screen__error">{error}</p>}
    </div>
  );
}
