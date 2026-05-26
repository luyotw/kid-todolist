import { useState } from 'react'
import { loadTasks, saveTasks } from '../lib/storage'
import type { Task } from '../types'
import TaskForm from '../components/TaskForm'

export default function SettingsPage() {
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks())
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  function persist(updated: Task[]) {
    saveTasks(updated)
    setTasks(updated)
  }

  function addTask(name: string, days: number[]) {
    const maxOrder = tasks.reduce((max, t) => Math.max(max, t.order), -1)
    const newTask: Task = {
      id: crypto.randomUUID(),
      name,
      days,
      order: maxOrder + 1,
    }
    persist([...tasks, newTask])
    setShowForm(false)
  }

  function deleteTask(id: string) {
    if (!window.confirm('確定要刪除這個任務嗎？')) return
    const updated = tasks.filter((t) => t.id !== id)
    persist(updated)
  }

  function updateTask(id: string, name: string, days: number[]) {
    const updated = tasks.map((t) => (t.id === id ? { ...t, name, days } : t))
    persist(updated)
    setEditingId(null)
  }

  function moveTask(index: number, direction: -1 | 1) {
    const sorted = [...tasks].sort((a, b) => a.order - b.order)
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= sorted.length) return
    ;[sorted[index], sorted[targetIndex]] = [sorted[targetIndex], sorted[index]]
    const reordered = sorted.map((t, i) => ({ ...t, order: i }))
    persist(reordered)
  }

  const sortedTasks = [...tasks].sort((a, b) => a.order - b.order)

  const DAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']

  return (
    <div className="px-4 pt-safe-top pb-24">
      <header className="pt-6 pb-4 text-center">
        <h1 className="text-2xl font-bold text-indigo-900">任務管理</h1>
      </header>

      <div className="mx-auto max-w-sm space-y-4">
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="w-full min-h-[44px] bg-indigo-500 text-white font-medium rounded-xl active:scale-[0.98] transition-all"
          >
            新增任務
          </button>
        )}

        {showForm && (
          <TaskForm onSubmit={addTask} onCancel={() => setShowForm(false)} />
        )}

        {sortedTasks.length === 0 && !showForm ? (
          <div className="text-center text-gray-400 mt-12">
            <p className="text-4xl mb-3">📋</p>
            <p>還沒有任務，點上方按鈕新增第一個任務吧！</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {sortedTasks.map((task, index) => (
              <li key={task.id}>
                {editingId === task.id ? (
                  <TaskForm
                    initialName={task.name}
                    initialDays={task.days}
                    onSubmit={(name, days) => updateTask(task.id, name, days)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div className="bg-white rounded-xl border-2 border-gray-200 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-medium text-gray-800 truncate">
                          {task.name}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {task.days.length === 0
                            ? '每天'
                            : task.days.map((d) => DAY_LABELS[d]).join('、')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        {index > 0 && (
                          <button
                            type="button"
                            onClick={() => moveTask(index, -1)}
                            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg bg-gray-100 text-gray-600"
                            aria-label="上移"
                          >
                            ↑
                          </button>
                        )}
                        {index < sortedTasks.length - 1 && (
                          <button
                            type="button"
                            onClick={() => moveTask(index, 1)}
                            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg bg-gray-100 text-gray-600"
                            aria-label="下移"
                          >
                            ↓
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setEditingId(task.id)}
                          className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg bg-gray-100 text-gray-600"
                          aria-label="編輯"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteTask(task.id)}
                          className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg bg-red-50 text-red-500"
                          aria-label="刪除"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
