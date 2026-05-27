import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import TodayPage from './TodayPage';
import { storage } from '../lib/storage';
import { ALL_WEEKDAYS, SCHOOL_DAYS, type Task } from '../types';

const TASKS_KEY = 'kid-todolist:tasks:v1';

function freezeDate(iso: string) {
  vi.setSystemTime(new Date(iso));
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

function seedTasks(tasks: Task[]) {
  storage.set(TASKS_KEY, tasks);
}

const everyday = (id: string, title: string): Task => ({
  id,
  title,
  weekdays: ALL_WEEKDAYS,
  createdAt: 0,
});

describe('TodayPage', () => {
  it('shows empty state when no tasks scheduled today', () => {
    freezeDate('2026-01-10T08:00:00'); // Saturday
    seedTasks([
      { id: 'a', title: '寫聯絡簿', weekdays: SCHOOL_DAYS, createdAt: 0 },
    ]);
    render(<TodayPage />);
    expect(screen.getByText(/今天沒有安排的任務/)).toBeInTheDocument();
    expect(screen.getByText('今天 0 / 0 完成')).toBeInTheDocument();
  });

  it('lists today tasks, lets the user check, and shows reward banner when all done', () => {
    freezeDate('2026-01-05T08:00:00'); // Monday
    seedTasks([everyday('a', '刷牙'), everyday('b', '寫功課')]);
    render(<TodayPage />);

    expect(screen.getByText('今天 0 / 2 完成')).toBeInTheDocument();
    expect(screen.queryByText('今天全部完成了！')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: '刷牙' }));
    expect(screen.getByText('今天 1 / 2 完成')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: '寫功課' }));
    expect(screen.getByText('今天 2 / 2 完成')).toBeInTheDocument();
    expect(screen.getByText('今天全部完成了！')).toBeInTheDocument();
  });

  it('resets completions across days (no carry-over)', () => {
    freezeDate('2026-01-05T08:00:00');
    seedTasks([everyday('a', '刷牙')]);
    const { unmount } = render(<TodayPage />);
    fireEvent.click(screen.getByRole('checkbox', { name: '刷牙' }));
    expect(screen.getByText('今天 1 / 1 完成')).toBeInTheDocument();
    unmount();

    freezeDate('2026-01-06T08:00:00');
    render(<TodayPage />);
    expect(screen.getByText('今天 0 / 1 完成')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: '刷牙' })).not.toBeChecked();
  });

  it('preserves completions when re-opened on the same day', () => {
    freezeDate('2026-01-05T08:00:00');
    seedTasks([everyday('a', '刷牙')]);
    const { unmount } = render(<TodayPage />);
    fireEvent.click(screen.getByRole('checkbox', { name: '刷牙' }));
    unmount();

    render(<TodayPage />);
    expect(screen.getByRole('checkbox', { name: '刷牙' })).toBeChecked();
    expect(screen.getByText('今天 1 / 1 完成')).toBeInTheDocument();
  });
});
