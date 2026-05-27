import { useState } from 'react';
import { useTasks } from '../lib/useTasks';
import type { Task } from '../types';

export default function TasksPage() {
  const { tasks, create, update, remove } = useTasks();
  const [newTitle, setNewTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    create(newTitle);
    setNewTitle('');
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
        <button type="submit" disabled={!newTitle.trim()}>
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
              onSave={(title) => {
                update(task.id, { title });
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
  onSave: (title: string) => void;
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
  const [draft, setDraft] = useState(task.title);

  if (editing) {
    return (
      <li className="task-row task-row--editing">
        <input
          aria-label="編輯任務"
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
        />
        <button
          type="button"
          onClick={() => onSave(draft)}
          disabled={!draft.trim()}
        >
          存
        </button>
        <button
          type="button"
          onClick={() => {
            setDraft(task.title);
            onCancelEdit();
          }}
        >
          取消
        </button>
      </li>
    );
  }

  return (
    <li className="task-row">
      <span className="task-title">{task.title}</span>
      <button type="button" aria-label={`編輯 ${task.title}`} onClick={onStartEdit}>
        編輯
      </button>
      <button type="button" aria-label={`刪除 ${task.title}`} onClick={onDelete}>
        刪除
      </button>
    </li>
  );
}
