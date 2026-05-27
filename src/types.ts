/**
 * Weekday numbers follow JS `Date#getDay`: 0=Sun, 1=Mon, ..., 6=Sat.
 * Empty array means the task is never auto-scheduled (e.g. one-off only).
 */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Task {
  id: string;
  title: string;
  weekdays: Weekday[];
  createdAt: number;
}

/** One-off task that only shows on a specific date (`YYYY-MM-DD`). */
export interface AdhocTask {
  id: string;
  title: string;
  date: string;
  createdAt: number;
}

export const ALL_WEEKDAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];
export const SCHOOL_DAYS: Weekday[] = [1, 2, 3, 4, 5];
export const WEEKEND: Weekday[] = [0, 6];
