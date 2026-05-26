import type { Task, Reward, DayRecord } from '../types'

const KEYS = {
  tasks: 'kid-todo:tasks',
  reward: 'kid-todo:reward',
  dayRecords: 'kid-todo:day-records',
} as const

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

export function loadTasks(): Task[] {
  return read<Task[]>(KEYS.tasks, [])
}

export function saveTasks(tasks: Task[]): void {
  write(KEYS.tasks, tasks)
}

export function loadReward(): Reward {
  return read<Reward>(KEYS.reward, { text: '' })
}

export function saveReward(reward: Reward): void {
  write(KEYS.reward, reward)
}

export function loadDayRecord(date: string): DayRecord {
  const all = read<Record<string, DayRecord>>(KEYS.dayRecords, {})
  return all[date] ?? { date, completed: {}, adhocTasks: [] }
}

export function saveDayRecord(record: DayRecord): void {
  const all = read<Record<string, DayRecord>>(KEYS.dayRecords, {})
  all[record.date] = record
  write(KEYS.dayRecords, all)
}

export function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
