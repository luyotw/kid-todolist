import { useState, useEffect } from 'react'
import {
  loadTasks,
  loadReward,
  loadDayRecord,
  saveDayRecord,
  todayStr,
} from './lib/storage'
import type { Task, DayRecord } from './types'

const DAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']

function getTasksForDay(tasks: Task[], dayOfWeek: number): Task[] {
  return tasks
    .filter((t) => t.days.length === 0 || t.days.includes(dayOfWeek))
    .sort((a, b) => a.order - b.order)
}

export default function App() {
  const today = todayStr()
  const dayOfWeek = new Date().getDay()

  const [tasks] = useState<Task[]>(() => loadTasks())
  const [record, setRecord] = useState<DayRecord>(() => loadDayRecord(today))
  const reward = loadReward()

  const scheduledTasks = getTasksForDay(tasks, dayOfWeek)
  const allTasks = [
    ...scheduledTasks,
    ...record.adhocTasks.map((t) => ({ ...t, days: [], order: 999 })),
  ]

  const totalCount = allTasks.length
  const doneCount = allTasks.filter((t) => record.completed[t.id]).length
  const allDone = totalCount > 0 && doneCount === totalCount

  useEffect(() => {
    saveDayRecord(record)
  }, [record])

  function toggleTask(taskId: string) {
    setRecord((prev) => ({
      ...prev,
      completed: {
        ...prev.completed,
        [taskId]: !prev.completed[taskId],
      },
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white px-4 pt-safe-top pb-8">
      <header className="pt-6 pb-4 text-center">
        <h1 className="text-2xl font-bold text-indigo-900">每日任務</h1>
        <p className="text-sm text-gray-500 mt-1">
          星期{DAY_LABELS[dayOfWeek]} &middot; {doneCount}/{totalCount} 完成
        </p>
      </header>

      {allDone && reward.text && (
        <div className="mx-auto max-w-sm mb-6 rounded-2xl bg-gradient-to-r from-yellow-300 to-amber-400 p-5 text-center shadow-lg animate-bounce">
          <p className="text-3xl mb-2">🎉</p>
          <p className="text-lg font-bold text-amber-900">全部完成！</p>
          <p className="text-amber-800 mt-1">{reward.text}</p>
        </div>
      )}

      {totalCount === 0 ? (
        <div className="text-center text-gray-400 mt-16">
          <p className="text-5xl mb-4">📝</p>
          <p>還沒有任務</p>
          <p className="text-sm mt-1">請先到設定頁面新增任務</p>
        </div>
      ) : (
        <ul className="mx-auto max-w-sm space-y-3">
          {allTasks.map((task) => {
            const done = !!record.completed[task.id]
            return (
              <li key={task.id}>
                <button
                  type="button"
                  onClick={() => toggleTask(task.id)}
                  className={`w-full flex items-center gap-3 rounded-xl px-4 py-4 text-left transition-all active:scale-[0.98] ${
                    done
                      ? 'bg-green-50 border-2 border-green-300'
                      : 'bg-white border-2 border-gray-200'
                  }`}
                >
                  <span
                    className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm transition-colors ${
                      done
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300'
                    }`}
                  >
                    {done && '✓'}
                  </span>
                  <span
                    className={`text-lg ${
                      done ? 'line-through text-gray-400' : 'text-gray-800'
                    }`}
                  >
                    {task.name}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-8 text-center">
        <div className="mx-auto max-w-sm bg-white/60 rounded-xl p-4 border border-dashed border-gray-300">
          <p className="text-sm text-gray-400">
            進度 {totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0}%
          </p>
          <div className="mt-2 h-3 rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-500"
              style={{
                width: `${totalCount > 0 ? (doneCount / totalCount) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
