import { usePoints } from '../lib/usePoints';
import { useReward } from '../lib/useReward';

export default function SettingsPage() {
  const { text, setText, defaultText } = useReward();
  const { balance, rewardCost, setRewardCost, redeem } = usePoints();

  const shortfall = Math.max(0, rewardCost - balance);
  const canRedeem = shortfall === 0;

  const handleRedeem = () => {
    redeem();
  };

  return (
    <div className="settings-page">
      <p className="settings-points" data-testid="settings-balance">
        目前點數：{balance}
      </p>

      <label className="settings-field">
        <span className="settings-field__label">
          全部完成時要顯示的獎勵文字
        </span>
        <textarea
          aria-label="獎勵文字"
          rows={3}
          value={text}
          placeholder={defaultText}
          onChange={(e) => setText(e.target.value)}
        />
        <span className="settings-field__hint">
          小孩看不到這個 app，獎勵的兌現要靠家長自己。
        </span>
      </label>

      <label className="settings-field">
        <span className="settings-field__label">兌換所需點數</span>
        <input
          type="number"
          min={1}
          aria-label="兌換所需點數"
          value={rewardCost}
          onChange={(e) => setRewardCost(Number(e.target.value))}
        />
      </label>

      <div className="settings-redeem">
        <button
          type="button"
          aria-label="兌換獎勵"
          data-testid="redeem-button"
          disabled={!canRedeem}
          onClick={handleRedeem}
        >
          兌換獎勵
        </button>
        {!canRedeem && (
          <p role="status" data-testid="redeem-shortfall">
            還差 {shortfall} 點
          </p>
        )}
      </div>
    </div>
  );
}
