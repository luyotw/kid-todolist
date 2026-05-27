import { useMemo, useState } from 'react';
import { formatDate } from '../lib/date';
import { buildTodayItems, countProgress } from '../lib/today';
import { useAdhoc } from '../lib/useAdhoc';
import { useCompletions } from '../lib/useCompletions';
import { useTasks } from '../lib/useTasks';

export default function TodayPage() {
  const now = useMemo(() => new Date(), []);
  const dateStr = formatDate(now);
  const { tasks } = useTasks();
  const { adhocToday, add: addAdhoc, remove: removeAdhoc } = useAdhoc(dateStr);
  const { completedIds, toggle } = useCompletions(dateStr);

  const items = useMemo(
    () => buildTodayItems(tasks, adhocToday, completedIds, now),
    [tasks, adhocToday, completedIds, now],
  );
  const { done, total, allDone } = countProgress(items);

  const [adhocDraft, setAdhocDraft] = useState('');
  const handleAddAdhoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adhocDraft.trim()) return;
    addAdhoc(adhocDraft);
    setAdhocDraft('');
  };

  return (
    <div className="today-page">
      <p className="today-progress" aria-live="polite">
        今天 {done} / {total} 完成
      </p>

      {total === 0 ? (
        <p className="empty">
          今天沒有安排的任務。在下面臨時加一個，或去「任務」設定排程。
        </p>
      ) : (
        <ul className="today-list">
          {items.map((item) => (
            <li
              key={`${item.source}:${item.id}`}
              className={`today-row${item.completed ? ' today-row--done' : ''}`}
            >
              <label>
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={() => toggle(item.id)}
                  aria-label={item.title}
                />
                <span className="today-row__title">{item.title}</span>
                {item.source === 'adhoc' && (
                  <span className="today-row__badge">今天</span>
                )}
              </label>
              {item.source === 'adhoc' && (
                <button
                  type="button"
                  className="today-row__remove"
                  aria-label={`刪除臨時任務 ${item.title}`}
                  onClick={() => removeAdhoc(item.id)}
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <form className="adhoc-add" onSubmit={handleAddAdhoc}>
        <input
          aria-label="臨時加一個今天的任務"
          placeholder="臨時加一個今天的任務"
          value={adhocDraft}
          onChange={(e) => setAdhocDraft(e.target.value)}
        />
        <button type="submit" disabled={!adhocDraft.trim()}>
          加
        </button>
      </form>

      {allDone && (
        <p className="all-done" role="status">
          今天全部完成了！
        </p>
      )}
    </div>
  );
}
