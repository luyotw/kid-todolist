import type { Task } from '../types'

export function getTasksForDay(tasks: Task[], dayOfWeek: number): Task[] {
  return tasks
    .filter((t) => t.days.length === 0 || t.days.includes(dayOfWeek))
    .sort((a, b) => a.order - b.order)
}

export function buildTodayTaskList(
  tasks: Task[],
  dayOfWeek: number,
  adhocTasks: Array<{ id: string; name: string }>,
): Task[] {
  const scheduled = getTasksForDay(tasks, dayOfWeek)
  return [
    ...scheduled,
    ...adhocTasks.map((t) => ({ ...t, days: [] as number[], order: 999 })),
  ]
}
