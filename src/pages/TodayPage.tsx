import { useMemo } from 'react';
import { formatDate } from '../lib/date';
import { countProgress, getTodayTasks } from '../lib/today';
import { useCompletions } from '../lib/useCompletions';
import { useTasks } from '../lib/useTasks';

export default function TodayPage() {
  const now = useMemo(() => new Date(), []);
  const dateStr = formatDate(now);
  const { tasks } = useTasks();
  const { completedIds, toggle } = useCompletions(dateStr);

  const items = useMemo(
    () => getTodayTasks(tasks, completedIds, now),
    [tasks, completedIds, now],
  );
  const { done, total, allDone } = countProgress(items);

  return (
    <div className="today-page">
      <p className="today-progress" aria-live="polite">
        今天 {done} / {total} 完成
      </p>

      {total === 0 ? (
        <p className="empty">
          今天沒有安排的任務。去「任務」加一個，或設定星期幾出現。
        </p>
      ) : (
        <ul className="today-list">
          {items.map(({ task, completed }) => (
            <li
              key={task.id}
              className={`today-row${completed ? ' today-row--done' : ''}`}
            >
              <label>
                <input
                  type="checkbox"
                  checked={completed}
                  onChange={() => toggle(task.id)}
                  aria-label={task.title}
                />
                <span className="today-row__title">{task.title}</span>
              </label>
            </li>
          ))}
        </ul>
      )}

      {allDone && (
        <p className="all-done" role="status">
          今天全部完成了！
        </p>
      )}
    </div>
  );
}
