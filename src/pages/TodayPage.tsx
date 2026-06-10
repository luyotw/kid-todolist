import { useMemo, useState } from 'react';
import SortableList from '../components/SortableList';
import { formatDate } from '../lib/date';
import { getTaskPoints } from '../lib/points';
import type { OrderedItemKey } from '../lib/taskOrder';
import { buildTodayItems, countProgress } from '../lib/today';
import { useAdhoc } from '../lib/useAdhoc';
import { useCompletions } from '../lib/useCompletions';
import { useReward } from '../lib/useReward';
import { useTaskOrder } from '../lib/useTaskOrder';
import { useTasks } from '../lib/useTasks';

function todayItemKey(source: 'task' | 'adhoc', id: string): string {
  return `${source}:${id}`;
}

function parseTodayItemKey(key: string): OrderedItemKey {
  const [source, id] = key.split(':');
  return { source: source as 'task' | 'adhoc', id };
}

export default function TodayPage() {
  const now = useMemo(() => new Date(), []);
  const dateStr = formatDate(now);
  const { tasks } = useTasks();
  const { adhocToday, add: addAdhoc, remove: removeAdhoc } = useAdhoc(dateStr);
  const { completedIds, toggle } = useCompletions(dateStr);
  const { text: rewardText, defaultText: defaultReward } = useReward();
  const {
    taskOrder,
    dayOrders,
    reorderToday,
    restoreDefaultTodayOrder,
    hasOverride,
  } = useTaskOrder(dateStr);

  const items = useMemo(
    () =>
      buildTodayItems(
        tasks,
        adhocToday,
        completedIds,
        now,
        taskOrder,
        dayOrders,
      ),
    [tasks, adhocToday, completedIds, now, taskOrder, dayOrders],
  );
  const { done, total, allDone } = countProgress(items);

  const sortableItems = useMemo(
    () =>
      items.map((item) => ({
        key: todayItemKey(item.source, item.id),
        label: item.title,
      })),
    [items],
  );

  const itemByKey = useMemo(
    () =>
      new Map(
        items.map((item) => [todayItemKey(item.source, item.id), item]),
      ),
    [items],
  );

  const [adhocDraft, setAdhocDraft] = useState('');
  const [adhocPoints, setAdhocPoints] = useState(0);
  const handleAddAdhoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adhocDraft.trim()) return;
    addAdhoc(adhocDraft, adhocPoints);
    setAdhocDraft('');
    setAdhocPoints(0);
  };

  return (
    <div className="today-page">
      <p className="today-progress" aria-live="polite">
        今天 {done} / {total} 完成
      </p>

      {hasOverride && (
        <button
          type="button"
          className="today-restore-order"
          onClick={() => restoreDefaultTodayOrder(dateStr)}
        >
          恢復預設排序
        </button>
      )}

      {total === 0 ? (
        <p className="empty">
          今天沒有安排的任務。在下面臨時加一個，或去「任務」設定排程。
        </p>
      ) : (
        <SortableList
          items={sortableItems}
          onReorder={(keys) =>
            reorderToday(dateStr, keys.map(parseTodayItemKey))
          }
          listClassName="today-list"
          itemClassName={`today-row`}
          renderItem={(item) => {
            const row = itemByKey.get(item.key);
            if (!row) return null;
            return (
              <div
                className={`today-row__body${row.completed ? ' today-row--done' : ''}`}
              >
                <label>
                  <input
                    type="checkbox"
                    checked={row.completed}
                    onChange={() => toggle(row.id)}
                    aria-label={row.title}
                  />
                  <span className="today-row__title">{row.title}</span>
                  {(() => {
                    const pointSource =
                      row.source === 'task'
                        ? tasks.find((t) => t.id === row.id)
                        : adhocToday.find((item) => item.id === row.id);
                    if (!pointSource) return null;
                    return (
                      <span className="today-row__points">
                        {getTaskPoints(pointSource)} 點
                      </span>
                    );
                  })()}
                  {row.source === 'adhoc' && (
                    <span className="today-row__badge">今天</span>
                  )}
                </label>
                {row.source === 'adhoc' && (
                  <button
                    type="button"
                    className="today-row__remove"
                    aria-label={`刪除臨時任務 ${row.title}`}
                    onClick={() => removeAdhoc(row.id)}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          }}
        />
      )}

      <form className="adhoc-add" onSubmit={handleAddAdhoc}>
        <input
          className="adhoc-add__title"
          aria-label="臨時加一個今天的任務"
          placeholder="臨時加一個今天的任務"
          value={adhocDraft}
          onChange={(e) => setAdhocDraft(e.target.value)}
        />
        <label className="adhoc-add__points">
          <span>點數</span>
          <input
            type="number"
            min={0}
            aria-label="臨時任務點數"
            value={adhocPoints}
            onChange={(e) => setAdhocPoints(Number(e.target.value))}
          />
        </label>
        <button type="submit" disabled={!adhocDraft.trim()}>
          加
        </button>
      </form>

      {allDone && (
        <div className="all-done" role="status" aria-live="polite">
          <img
            src="/Bitzer.png"
            alt=""
            className="all-done__image"
            data-testid="all-done-character"
          />
          <p className="all-done__heading">今天全部完成了！</p>
          <p className="all-done__reward">
            {rewardText.trim() || defaultReward}
          </p>
        </div>
      )}
    </div>
  );
}
