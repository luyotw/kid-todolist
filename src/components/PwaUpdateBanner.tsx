import { useEffect, useState } from 'react';
import { applyPwaUpdate, subscribePwaUpdate } from '../lib/pwa/register';

export default function PwaUpdateBanner() {
  const [visible, setVisible] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => subscribePwaUpdate(() => setVisible(true)), []);

  if (!visible) return null;

  return (
    <div
      className="app-status app-status--setup"
      role="status"
      data-testid="pwa-update-banner"
    >
      <span>有新版本可以使用</span>
      <button
        type="button"
        className="app-status__dismiss"
        disabled={updating}
        onClick={() => {
          setUpdating(true);
          void applyPwaUpdate();
        }}
      >
        {updating ? '更新中…' : '立即更新'}
      </button>
    </div>
  );
}
