import { useMemo, useState } from 'react';
import SortableList from '../components/SortableList';
import { useTasks } from '../lib/useTasks';
import { getTaskPoints } from '../lib/points';
import {
  ALL_WEEKDAYS,
  SCHOOL_DAYS,
  WEEKEND,
  type Task,
  type Weekday,
} from '../types';

const WEEKDAY_LABELS: Record<Weekday, string> = {
  0: '日',
  1: '一',
  2: '二',
  3: '三',
  4: '四',
  5: '五',
  6: '六',
};

export default function TasksPage() {
  const { tasks, create, update, remove, reorder } = useTasks();
  const [newTitle, setNewTitle] = useState('');
  const [newWeekdays, setNewWeekdays] = useState<Weekday[]>(ALL_WEEKDAYS);
  const [newPoints, setNewPoints] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);

  const sortableItems = useMemo(
    () => tasks.map((task) => ({ key: task.id, label: task.title })),
    [tasks],
  );

  const taskById = useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks],
  );

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || newWeekdays.length === 0) return;
    create(newTitle, newWeekdays, newPoints);
    setNewTitle('');
    setNewWeekdays(ALL_WEEKDAYS);
    setNewPoints(0);
  };

  return (
    <div className="tasks-page">
      <form className="task-add" onSubmit={handleAdd}>
        <input
          aria-label="新任務"
          placeholder="加一個任務，例如「刷牙」"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
        <label className="task-points-field">
          <span>點數</span>
          <input
            type="number"
            min={0}
            aria-label="新任務點數"
            value={newPoints}
            onChange={(e) => setNewPoints(Number(e.target.value))}
          />
        </label>
        <WeekdayPicker value={newWeekdays} onChange={setNewWeekdays} />
        <button
          type="submit"
          disabled={!newTitle.trim() || newWeekdays.length === 0}
        >
          加
        </button>
      </form>

      {tasks.length === 0 ? (
        <p className="empty">還沒設定任務。在上面加一個吧。</p>
      ) : (
        <>
          <p className="tasks-order-hint">
            長按左側 ⋮⋮ 拖曳調整每天預設順序；單日調整請至「今天」。
          </p>
          <SortableList
            items={sortableItems}
            onReorder={reorder}
            listClassName="task-list"
            itemClassName="task-row"
            renderItem={(item) => {
              const task = taskById.get(item.key);
              if (!task) return null;
              return (
                <TaskRow
                  task={task}
                  editing={editingId === task.id}
                  onStartEdit={() => setEditingId(task.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onSave={(title, weekdays, points) => {
                    update(task.id, { title, weekdays, points });
                    setEditingId(null);
                  }}
                  onDelete={() => {
                    if (confirm(`刪掉「${task.title}」？`)) remove(task.id);
                  }}
                />
              );
            }}
          />
        </>
      )}
    </div>
  );
}

interface TaskRowProps {
  task: Task;
  editing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (title: string, weekdays: Weekday[], points: number) => void;
  onDelete: () => void;
}

function TaskRow({
  task,
  editing,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
}: TaskRowProps) {
  const [draftTitle, setDraftTitle] = useState(task.title);
  const [draftWeekdays, setDraftWeekdays] = useState<Weekday[]>(task.weekdays);
  const [draftPoints, setDraftPoints] = useState(getTaskPoints(task));

  if (editing) {
    return (
      <div className="task-row__body task-row--editing">
        <input
          aria-label="編輯任務"
          value={draftTitle}
          autoFocus
          onChange={(e) => setDraftTitle(e.target.value)}
        />
        <label className="task-points-field">
          <span>點數</span>
          <input
            type="number"
            min={0}
            aria-label="編輯任務點數"
            value={draftPoints}
            onChange={(e) => setDraftPoints(Number(e.target.value))}
          />
        </label>
        <WeekdayPicker value={draftWeekdays} onChange={setDraftWeekdays} />
        <div className="task-row__actions">
          <button
            type="button"
            onClick={() => onSave(draftTitle, draftWeekdays, draftPoints)}
            disabled={!draftTitle.trim() || draftWeekdays.length === 0}
          >
            存
          </button>
          <button
            type="button"
            onClick={() => {
              setDraftTitle(task.title);
              setDraftWeekdays(task.weekdays);
              setDraftPoints(getTaskPoints(task));
              onCancelEdit();
            }}
          >
            取消
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="task-row__body">
      <span className="task-title">{task.title}</span>
      <span className="task-points" aria-label="點數">
        {getTaskPoints(task)} 點
      </span>
      <span className="task-schedule" aria-label="排程">
        {formatWeekdays(task.weekdays)}
      </span>
      <button type="button" aria-label={`編輯 ${task.title}`} onClick={onStartEdit}>
        編輯
      </button>
      <button type="button" aria-label={`刪除 ${task.title}`} onClick={onDelete}>
        刪除
      </button>
    </div>
  );
}

function WeekdayPicker({
  value,
  onChange,
}: {
  value: Weekday[];
  onChange: (next: Weekday[]) => void;
}) {
  const toggle = (day: Weekday) => {
    if (value.includes(day)) {
      onChange(value.filter((d) => d !== day));
    } else {
      onChange([...value, day]);
    }
  };

  return (
    <div className="weekday-picker" role="group" aria-label="星期幾出現">
      <div className="weekday-presets">
        <button
          type="button"
          onClick={() => onChange([...ALL_WEEKDAYS])}
          aria-pressed={isSameSet(value, ALL_WEEKDAYS)}
        >
          每天
        </button>
        <button
          type="button"
          onClick={() => onChange([...SCHOOL_DAYS])}
          aria-pressed={isSameSet(value, SCHOOL_DAYS)}
        >
          上學日
        </button>
        <button
          type="button"
          onClick={() => onChange([...WEEKEND])}
          aria-pressed={isSameSet(value, WEEKEND)}
        >
          假日
        </button>
      </div>
      <div className="weekday-days">
        {ALL_WEEKDAYS.map((day) => {
          const active = value.includes(day);
          return (
            <button
              key={day}
              type="button"
              className={active ? 'active' : ''}
              aria-pressed={active}
              aria-label={`星期${WEEKDAY_LABELS[day]}`}
              onClick={() => toggle(day)}
            >
              {WEEKDAY_LABELS[day]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function formatWeekdays(weekdays: Weekday[]): string {
  if (weekdays.length === 0) return '不排程';
  if (isSameSet(weekdays, ALL_WEEKDAYS)) return '每天';
  if (isSameSet(weekdays, SCHOOL_DAYS)) return '上學日';
  if (isSameSet(weekdays, WEEKEND)) return '假日';
  return weekdays.map((d) => WEEKDAY_LABELS[d]).join('、');
}

function isSameSet(a: Weekday[], b: Weekday[]): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  return b.every((x) => setA.has(x));
}
