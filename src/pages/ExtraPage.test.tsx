import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../lib/testUtils';
import ExtraPage from './ExtraPage';
import TodayPage from './TodayPage';
import { storage } from '../lib/storage';
import { SETTINGS_KEY } from '../lib/settings';
import { ALL_WEEKDAYS, type Task } from '../types';

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

describe('ExtraPage', () => {
  it('shows extra-specific empty state and progress copy', () => {
    freezeDate('2026-01-10T08:00:00');
    seedTasks([]);
    renderWithProviders(<ExtraPage />);
    expect(screen.getByText(/額外沒有安排的任務/)).toBeInTheDocument();
    expect(screen.getByText('額外 0 / 0 完成')).toBeInTheDocument();
  });

  it('keeps adhoc tasks off the today page', () => {
    freezeDate('2026-01-05T08:00:00');
    seedTasks([everyday('a', '刷牙')]);
    const { unmount } = renderWithProviders(<ExtraPage />);

    const input = screen.getByLabelText('臨時加一個額外的任務');
    fireEvent.change(input, { target: { value: '買電池' } });
    fireEvent.click(screen.getByRole('button', { name: '加' }));

    expect(screen.getByRole('checkbox', { name: '買電池' })).toBeInTheDocument();

    unmount();
    renderWithProviders(<TodayPage />);
    expect(screen.queryByRole('checkbox', { name: '買電池' })).not.toBeInTheDocument();
  });

  it('shows all-done only on extra when extra list is complete', () => {
    freezeDate('2026-01-05T08:00:00');
    seedTasks([everyday('a', '刷牙')]);
    const { unmount } = renderWithProviders(<ExtraPage />);

    fireEvent.click(screen.getByRole('checkbox', { name: '刷牙' }));
    expect(screen.getByTestId('all-done-character')).toBeInTheDocument();

    unmount();
    renderWithProviders(<TodayPage />);
    expect(screen.queryByTestId('all-done-character')).not.toBeInTheDocument();
  });
});
