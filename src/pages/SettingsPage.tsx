import { useEffect, useRef, useState } from 'react';
import { pointsShortfall } from '../lib/points';
import type { RewardItem } from '../types';
import { usePoints } from '../lib/usePoints';
import { useReward } from '../lib/useReward';
import { useRewards } from '../lib/useRewards';

const COST_OPTIONS = Array.from({ length: 20 }, (_, i) => i + 1);

export default function SettingsPage() {
  const { text, setText, defaultText } = useReward();
  const { balance } = usePoints();
  const { rewards, add, update, remove, redeem } = useRewards();
  const [draftMessage, setDraftMessage] = useState(text);
  const [newTitle, setNewTitle] = useState('');
  const [newCost, setNewCost] = useState(3);
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

  return (
    <div className="settings-page">
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
