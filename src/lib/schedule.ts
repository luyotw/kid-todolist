import type { Task, Weekday } from '../types';

export function isTaskScheduledOn(task: Task, date: Date): boolean {
  const weekday = date.getDay() as Weekday;
  return task.weekdays.includes(weekday);
}
