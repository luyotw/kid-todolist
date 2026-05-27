import { useReward } from '../lib/useReward';

export default function SettingsPage() {
  const { text, setText, defaultText } = useReward();

  return (
    <div className="settings-page">
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
    </div>
  );
}
