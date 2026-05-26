import { useState, useEffect } from 'react'
import {
  loadTasks,
  loadReward,
  loadDayRecord,
  saveDayRecord,
  todayStr,
} from '../lib/storage'
import type { DayRecord } from '../types'
import { DAY_LABELS } from '../lib/constants'
import { buildTodayTaskList } from '../lib/schedule'
import AdhocTaskForm from '../components/AdhocTaskForm'

export default function HomePage() {
  const today = todayStr()
  const dayOfWeek = new Date().getDay()

  const [tasks] = useState(() => loadTasks())
  const [record, setRecord] = useState<DayRecord>(() => loadDayRecord(today))
  const [showAdhocForm, setShowAdhocForm] = useState(false)
  const reward = loadReward()

  const allTasks = buildTodayTaskList(tasks, dayOfWeek, record.adhocTasks)

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

  function addAdhocTask(name: string) {
    setRecord((prev) => ({
      ...prev,
      adhocTasks: [
        ...prev.adhocTasks,
        { id: crypto.randomUUID(), name },
      ],
    }))
    setShowAdhocForm(false)
  }

  return (
    <div className="px-4 pt-safe-top pb-24">
      <header className="pt-6 pb-4 text-center">
        <h1 className="text-2xl font-bold text-indigo-900">每日任務</h1>
        <p className="text-sm text-gray-500 mt-1">
          星期{DAY_LABELS[dayOfWeek]} &middot; {doneCount}/{totalCount} 完成
        </p>
      </header>

      <div className="mx-auto max-w-sm mb-4">
        {showAdhocForm ? (
          <AdhocTaskForm
            onSubmit={addAdhocTask}
            onCancel={() => setShowAdhocForm(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowAdhocForm(true)}
            className="w-full min-h-[44px] bg-indigo-500 text-white font-medium rounded-xl active:scale-[0.98] transition-all"
          >
            新增臨時任務
          </button>
        )}
      </div>

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
          {tasks.length === 0 ? (
            <>
              <p>還沒有任務</p>
              <p className="text-sm mt-1">可點上方新增今天的臨時任務</p>
            </>
          ) : (
            <>
              <p>今天沒有排程任務</p>
              <p className="text-sm mt-1">可點上方新增今天的臨時任務</p>
            </>
          )}
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
                    className={`text-lg break-words flex-1 min-w-0 ${
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
