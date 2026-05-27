import { useState } from 'react';
import { useTasks } from '../lib/useTasks';
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
  const { tasks, create, update, remove } = useTasks();
  const [newTitle, setNewTitle] = useState('');
  const [newWeekdays, setNewWeekdays] = useState<Weekday[]>(ALL_WEEKDAYS);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || newWeekdays.length === 0) return;
    create(newTitle, newWeekdays);
    setNewTitle('');
    setNewWeekdays(ALL_WEEKDAYS);
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
        <ul className="task-list">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              editing={editingId === task.id}
              onStartEdit={() => setEditingId(task.id)}
              onCancelEdit={() => setEditingId(null)}
              onSave={(title, weekdays) => {
                update(task.id, { title, weekdays });
                setEditingId(null);
              }}
              onDelete={() => {
                if (confirm(`刪掉「${task.title}」？`)) remove(task.id);
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

interface TaskRowProps {
  task: Task;
  editing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (title: string, weekdays: Weekday[]) => void;
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

  if (editing) {
    return (
      <li className="task-row task-row--editing">
        <input
          aria-label="編輯任務"
          value={draftTitle}
          autoFocus
          onChange={(e) => setDraftTitle(e.target.value)}
        />
        <WeekdayPicker value={draftWeekdays} onChange={setDraftWeekdays} />
        <div className="task-row__actions">
          <button
            type="button"
            onClick={() => onSave(draftTitle, draftWeekdays)}
            disabled={!draftTitle.trim() || draftWeekdays.length === 0}
          >
            存
          </button>
          <button
            type="button"
            onClick={() => {
              setDraftTitle(task.title);
              setDraftWeekdays(task.weekdays);
              onCancelEdit();
            }}
          >
            取消
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="task-row">
      <span className="task-title">{task.title}</span>
      <span className="task-schedule" aria-label="排程">
        {formatWeekdays(task.weekdays)}
      </span>
      <button type="button" aria-label={`編輯 ${task.title}`} onClick={onStartEdit}>
        編輯
      </button>
      <button type="button" aria-label={`刪除 ${task.title}`} onClick={onDelete}>
        刪除
      </button>
    </li>
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
