import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../lib/auth';
import { db } from '../lib/firebase';
import { useOnlineStatus } from '../lib/cloudSync';
import FamilyInviteBanner from '../components/FamilyInviteBanner';
import {
  buildInviteUrl,
  copyInviteUrl,
  createFamily,
  createInviteToken,
  FAMILY_UI_MESSAGES,
  formatMemberLabel,
  INVITE_USER_MESSAGES,
  memberProfileFromAuth,
  roleLabel,
  useFamilyMembership,
  useFamilyMembers,
} from '../lib/family';
import {
  FamilyMembersProvider,
} from '../lib/family/useFamilyMembers';
import { pointsShortfall } from '../lib/points';
import type { RewardItem } from '../types';
import { usePoints } from '../lib/usePoints';
import { useReward } from '../lib/useReward';
import { useRewards } from '../lib/useRewards';

const COST_OPTIONS = Array.from({ length: 20 }, (_, i) => i + 1);

export default function SettingsPage() {
  const { user, configured, isGuest } = useAuth();
  const online = useOnlineStatus();
  const { membership, loading: membershipLoading, refresh } = useFamilyMembership();
  const { text, setText, defaultText } = useReward();
  const { balance } = usePoints();
  const { rewards, add, update, remove, redeem } = useRewards();
  const [draftMessage, setDraftMessage] = useState(text);
  const [newTitle, setNewTitle] = useState('');
  const [newCost, setNewCost] = useState(3);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [showInviteBanner, setShowInviteBanner] = useState(false);
  const [familyBusy, setFamilyBusy] = useState(false);
  const [familyStatus, setFamilyStatus] = useState<string | null>(null);
  const editingMessageRef = useRef(false);

  useEffect(() => {
    if (!editingMessageRef.current) {
      setDraftMessage(text);
    }
  }, [text]);

  const commitMessage = () => {
    editingMessageRef.current = false;
    if (draftMessage !== text) {
      setText(draftMessage);
    }
  };

  const handleAddReward = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    add(newTitle, newCost);
    setNewTitle('');
    setNewCost(3);
  };

  const profile = user ? memberProfileFromAuth(user) : undefined;

  const handleCreateFamily = async () => {
    if (!user || familyBusy) return;
    if (!online) {
      setFamilyStatus(INVITE_USER_MESSAGES.OFFLINE);
      return;
    }
    setFamilyBusy(true);
    setFamilyStatus(null);
    try {
      const result = await createFamily(user.uid, db, profile);
      if (!result.ok) {
        setFamilyStatus(INVITE_USER_MESSAGES[result.code]);
        return;
      }
      refresh();
      const url = buildInviteUrl(result.token);
      setInviteUrl(url);
      setShowInviteBanner(true);
    } finally {
      setFamilyBusy(false);
    }
  };

  const handleGenerateInvite = async () => {
    if (!user || !membership || familyBusy) return;
    if (!online) {
      setFamilyStatus(INVITE_USER_MESSAGES.OFFLINE);
      return;
    }
    setFamilyBusy(true);
    setFamilyStatus(null);
    try {
      const result = await createInviteToken(user.uid, membership.familyId);
      if (!result.ok) {
        setFamilyStatus(INVITE_USER_MESSAGES[result.code]);
        return;
      }
      setInviteUrl(buildInviteUrl(result.token));
    } finally {
      setFamilyBusy(false);
    }
  };

  const handleCopyInvite = async () => {
    if (!inviteUrl) return;
    const result = await copyInviteUrl(inviteUrl);
    if (result === 'copied') {
      setFamilyStatus(FAMILY_UI_MESSAGES.COPY_OK);
    }
  };

  const showFamilySection = configured && user && !isGuest;

  return (
    <div className="settings-page">
      {showInviteBanner && inviteUrl && (
        <FamilyInviteBanner
          inviteUrl={inviteUrl}
          onDismiss={() => setShowInviteBanner(false)}
        />
      )}

      {configured && isGuest && (
        <section
          className="settings-guest-notice"
          aria-labelledby="settings-guest-heading"
          data-testid="settings-guest-notice"
        >
          <h2 id="settings-guest-heading" className="settings-guest-notice__heading">
            雲端與家庭
          </h2>
          <p className="settings-guest-notice__hint">
            你目前以訪客使用，資料只會存在這台手機。若要跨裝置同步，或邀請另一位家長加入同一家庭，請點右上角「登出」後改用
            Google 登入。
          </p>
        </section>
      )}

      {showFamilySection && (
        <FamilyMembersProvider familyId={membership?.familyId ?? null}>
          <FamilySection
            membership={membership}
            membershipLoading={membershipLoading}
            familyStatus={familyStatus}
            inviteUrl={inviteUrl}
            familyBusy={familyBusy}
            onCreateFamily={() => void handleCreateFamily()}
            onGenerateInvite={() => void handleGenerateInvite()}
            onCopyInvite={() => void handleCopyInvite()}
          />
        </FamilyMembersProvider>
      )}

      <p className="settings-points" data-testid="settings-balance">
        我的點數：{balance}
      </p>

      <label className="settings-field">
        <span className="settings-field__label">
          全部完成時要顯示的訊息
        </span>
        <textarea
          className="settings-field__control settings-field__textarea"
          aria-label="全部完成訊息"
          rows={3}
          value={draftMessage}
          placeholder={defaultText}
          onFocus={() => {
            editingMessageRef.current = true;
          }}
          onBlur={commitMessage}
          onChange={(e) => setDraftMessage(e.target.value)}
        />
        <span className="settings-field__hint">
          在「今天」頁全部打勾後顯示。離開欄位時才會儲存。
        </span>
      </label>

      <section className="settings-rewards" aria-labelledby="settings-rewards-heading">
        <h2 id="settings-rewards-heading" className="settings-rewards__heading">
          可兌換獎勵
        </h2>
        <p className="settings-rewards__hint">
          像橡實一樣累積點數，完成任務後在這裡兌換。小孩看不到 app，兌現由家長處理。
        </p>

        {rewards.length === 0 ? (
          <p className="settings-rewards__empty" data-testid="rewards-empty">
            還沒有獎勵，在下方新增一個吧。
          </p>
        ) : (
          <ul className="settings-rewards__list">
            {rewards.map((reward) => (
              <RewardCard
                key={reward.id}
                reward={reward}
                balance={balance}
                onUpdate={update}
                onRemove={remove}
                onRedeem={redeem}
              />
            ))}
          </ul>
        )}

        <form className="reward-add" onSubmit={handleAddReward}>
          <input
            aria-label="新獎勵名稱"
            placeholder="例如：吃一根冰棒"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <select
            aria-label="新獎勵所需點數"
            value={newCost}
            onChange={(e) => setNewCost(Number(e.target.value))}
          >
            {COST_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} 點
              </option>
            ))}
          </select>
          <button type="submit" disabled={!newTitle.trim()}>
            新增
          </button>
        </form>
      </section>
    </div>
  );
}

function FamilySection({
  membership,
  membershipLoading,
  familyStatus,
  inviteUrl,
  familyBusy,
  onCreateFamily,
  onGenerateInvite,
  onCopyInvite,
}: {
  membership: { familyId: string; activeChildId: string } | null;
  membershipLoading: boolean;
  familyStatus: string | null;
  inviteUrl: string | null;
  familyBusy: boolean;
  onCreateFamily: () => void;
  onGenerateInvite: () => void;
  onCopyInvite: () => void;
}) {
  const { members, loading: membersLoading } = useFamilyMembers();
  const [showFamilyId, setShowFamilyId] = useState(false);

  return (
    <section
      className="settings-family"
      aria-labelledby="settings-family-heading"
      data-testid="settings-family-section"
    >
      <h2 id="settings-family-heading" className="settings-family__heading">
        家庭
      </h2>
      {familyStatus && (
        <p className="settings-family__status" role="status">
          {familyStatus}
        </p>
      )}
      {membershipLoading ? (
        <p className="settings-family__hint">載入家庭資料中…</p>
      ) : membership ? (
        <div className="settings-family__invite">
          <p className="settings-family__hint">
            分享連結給另一位家長，對方登入後即可加入同一家庭。
          </p>
          {membersLoading ? (
            <p className="settings-family__hint">載入成員中…</p>
          ) : (
            <ul
              className="settings-family__members"
              data-testid="settings-family-members"
            >
              {members.map(({ uid, member }) => (
                <li key={uid} data-testid={`family-member-${uid}`}>
                  <span className="settings-family__member-name">
                    {formatMemberLabel(member, uid)}
                  </span>
                  <span className="settings-family__member-role">
                    {roleLabel(member.role)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="settings-family__family-id">
            <button
              type="button"
              className="settings-family__toggle-id"
              aria-expanded={showFamilyId}
              onClick={() => setShowFamilyId((open) => !open)}
            >
              {showFamilyId ? '隱藏家庭代碼' : '顯示家庭代碼'}
            </button>
            {showFamilyId && (
              <p
                className="settings-family__id"
                data-testid="settings-family-id"
              >
                {membership.familyId}
              </p>
            )}
          </div>
          {inviteUrl ? (
            <p className="settings-family__url" data-testid="settings-invite-url">
              {inviteUrl}
            </p>
          ) : (
            <p className="settings-family__hint">尚未產生邀請連結。</p>
          )}
          <div className="settings-family__actions">
            <button
              type="button"
              data-testid="generate-invite-button"
              onClick={onGenerateInvite}
              disabled={familyBusy}
            >
              產生邀請連結
            </button>
            <button
              type="button"
              data-testid="copy-invite-button"
              onClick={onCopyInvite}
              disabled={!inviteUrl || familyBusy}
            >
              複製連結
            </button>
          </div>
        </div>
      ) : (
        <div className="settings-family__create">
          <p className="settings-family__hint">
            建立家庭後，可產生邀請連結讓另一位家長加入。
          </p>
          <button
            type="button"
            data-testid="create-family-button"
            onClick={onCreateFamily}
            disabled={familyBusy}
          >
            建立家庭
          </button>
        </div>
      )}
    </section>
  );
}

function RewardCard({
  reward,
  balance,
  onUpdate,
  onRemove,
  onRedeem,
}: {
  reward: RewardItem;
  balance: number;
  onUpdate: (
    id: string,
    patch: Partial<Pick<RewardItem, 'title' | 'cost'>>,
  ) => void;
  onRemove: (id: string) => void;
  onRedeem: (id: string) => void;
}) {
  const [draftTitle, setDraftTitle] = useState(reward.title);
  const editingRef = useRef(false);
  const shortfall = pointsShortfall(balance, reward.cost);
  const canRedeem = shortfall === 0;

  useEffect(() => {
    if (!editingRef.current) {
      setDraftTitle(reward.title);
    }
  }, [reward.title]);

  const commitTitle = () => {
    editingRef.current = false;
    const trimmed = draftTitle.trim();
    if (trimmed && trimmed !== reward.title) {
      onUpdate(reward.id, { title: trimmed });
    } else {
      setDraftTitle(reward.title);
    }
  };

  return (
    <li className="reward-card" data-testid={`reward-card-${reward.id}`}>
      <div className="reward-card__main">
        <input
          className="reward-card__title"
          aria-label={`獎勵 ${reward.title}`}
          value={draftTitle}
          onFocus={() => {
            editingRef.current = true;
          }}
          onBlur={commitTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
        />
        <select
          className="reward-card__cost"
          aria-label={`${reward.title} 所需點數`}
          value={reward.cost}
          onChange={(e) => onUpdate(reward.id, { cost: Number(e.target.value) })}
        >
          {COST_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} 點
            </option>
          ))}
        </select>
      </div>
      <div className="reward-card__actions">
        <button
          type="button"
          className="reward-card__redeem"
          aria-label={`兌換 ${reward.title}`}
          data-testid={`redeem-${reward.id}`}
          disabled={!canRedeem}
          onClick={() => onRedeem(reward.id)}
        >
          兌換
        </button>
        <button
          type="button"
          className="reward-card__remove"
          aria-label={`刪除獎勵 ${reward.title}`}
          onClick={() => onRemove(reward.id)}
        >
          刪除
        </button>
      </div>
      {!canRedeem && (
        <p className="reward-card__shortfall" role="status">
          還差 {shortfall} 點
        </p>
      )}
    </li>
  );
}
