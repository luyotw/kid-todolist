interface FamilyInviteBannerProps {
  inviteUrl: string;
  onDismiss: () => void;
}

export default function FamilyInviteBanner({
  inviteUrl,
  onDismiss,
}: FamilyInviteBannerProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
    } catch {
      window.prompt('複製邀請連結：', inviteUrl);
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
