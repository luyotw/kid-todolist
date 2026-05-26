import { useState } from 'react'
import { DAY_LABELS } from '../lib/constants'

interface TaskFormProps {
  initialName?: string
  initialDays?: number[]
  onSubmit: (name: string, days: number[]) => void
  onCancel: () => void
}

export default function TaskForm({
  initialName = '',
  initialDays = [],
  onSubmit,
  onCancel,
}: TaskFormProps) {
  const [name, setName] = useState(initialName)
  const [days, setDays] = useState<number[]>(initialDays)
  const [everyday, setEveryday] = useState(initialDays.length === 0 && initialName !== '')

  function toggleDay(day: number) {
    setEveryday(false)
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    )
  }

  function toggleEveryday() {
    setEveryday(true)
    setDays([])
  }

  function handleSubmit() {
    const trimmed = name.trim()
    if (!trimmed) return
    onSubmit(trimmed, everyday ? [] : days)
  }

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 p-4 space-y-4">
      <input
        type="text"
        placeholder="任務名稱"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />

      <div className="flex flex-wrap gap-2">
        {DAY_LABELS.map((label, i) => (
          <button
            key={i}
            type="button"
            onClick={() => toggleDay(i)}
            className={`min-w-[44px] min-h-[44px] rounded-lg font-medium text-sm transition-colors ${
              !everyday && days.includes(i)
                ? 'bg-indigo-500 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={toggleEveryday}
          className={`min-h-[44px] px-3 rounded-lg font-medium text-sm transition-colors ${
            everyday ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          每天
        </button>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          className="flex-1 min-h-[44px] bg-indigo-500 text-white font-medium rounded-lg active:scale-[0.98] transition-all"
        >
          確認
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 min-h-[44px] bg-gray-100 text-gray-600 font-medium rounded-lg active:scale-[0.98] transition-all"
        >
          取消
        </button>
      </div>
    </div>
  )
}
