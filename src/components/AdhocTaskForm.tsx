import { useState } from 'react'

interface AdhocTaskFormProps {
  onSubmit: (name: string) => void
  onCancel: () => void
}

export default function AdhocTaskForm({ onSubmit, onCancel }: AdhocTaskFormProps) {
  const [name, setName] = useState('')

  function handleSubmit() {
    const trimmed = name.trim()
    if (!trimmed) return
    onSubmit(trimmed)
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
