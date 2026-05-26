export interface Task {
  id: string
  name: string
  /** 0=Sun, 1=Mon, ... 6=Sat; empty array = every day */
  days: number[]
  order: number
}

export interface Reward {
  text: string
}

export interface DayRecord {
  /** ISO date string, e.g. "2026-05-27" */
  date: string
  completed: Record<string, boolean>
  /** Task IDs added ad-hoc for this day only */
  adhocTasks: Array<{ id: string; name: string }>
}
