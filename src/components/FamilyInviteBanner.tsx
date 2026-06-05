import { useState } from 'react';
import { copyInviteUrl, FAMILY_UI_MESSAGES } from '../lib/family';

interface FamilyInviteBannerProps {
  inviteUrl: string;
  onDismiss: () => void;
}

export default function FamilyInviteBanner({
  inviteUrl,
  onDismiss,
}: FamilyInviteBannerProps) {
  const [status, setStatus] = useState<string | null>(null);

  const handleCopy = async () => {
    const result = await copyInviteUrl(inviteUrl);
    if (result === 'copied') {
      setStatus(FAMILY_UI_MESSAGES.COPY_OK);
    }
  };

  return (
    <div
      className="family-invite-banner"
      role="dialog"
      aria-modal="true"
      aria-labelledby="family-invite-banner-title"
      data-testid="family-invite-banner"
    >
      <h2 id="family-invite-banner-title">家庭已建立</h2>
      <p>分享以下連結，邀請另一位家長加入：</p>
      <p className="family-invite-banner__url" data-testid="family-invite-url">
        {inviteUrl}
      </p>
      {status && (
        <p className="family-invite-banner__status" role="status">
          {status}
        </p>
      )}
      <div className="family-invite-banner__actions">
        <button type="button" onClick={() => void handleCopy()}>
          複製連結
        </button>
        <button type="button" onClick={onDismiss}>
          關閉
        </button>
      </div>
    </div>
  );
}
