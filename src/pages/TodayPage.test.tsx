import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../lib/testUtils';
import TodayPage from './TodayPage';
import { storage } from '../lib/storage';
import { SETTINGS_KEY } from '../lib/settings';
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
    renderWithProviders(<TodayPage />);
    expect(screen.getByText(/今天沒有安排的任務/)).toBeInTheDocument();
    expect(screen.getByText('今天 0 / 0 完成')).toBeInTheDocument();
  });

  it('lists today tasks, lets the user check, and shows reward banner when all done', () => {
    freezeDate('2026-01-05T08:00:00'); // Monday
    seedTasks([everyday('a', '刷牙'), everyday('b', '寫功課')]);
    renderWithProviders(<TodayPage />);

    expect(screen.getByText('今天 0 / 2 完成')).toBeInTheDocument();
    expect(screen.queryByText('今天全部完成了！')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: '刷牙' }));
    expect(screen.getByText('今天 1 / 2 完成')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: '寫功課' }));
    expect(screen.getByText('今天 2 / 2 完成')).toBeInTheDocument();
    expect(screen.getByText('今天全部完成了！')).toBeInTheDocument();
    expect(screen.getByTestId('all-done-character')).toHaveAttribute(
      'src',
      '/Bitzer.png',
    );
  });

  it('resets completions across days (no carry-over)', () => {
    freezeDate('2026-01-05T08:00:00');
    seedTasks([everyday('a', '刷牙')]);
    const { unmount } = renderWithProviders(<TodayPage />);
    fireEvent.click(screen.getByRole('checkbox', { name: '刷牙' }));
    expect(screen.getByText('今天 1 / 1 完成')).toBeInTheDocument();
    unmount();

    freezeDate('2026-01-06T08:00:00');
    renderWithProviders(<TodayPage />);
    expect(screen.getByText('今天 0 / 1 完成')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: '刷牙' })).not.toBeChecked();
  });

  it('preserves completions when re-opened on the same day', () => {
    freezeDate('2026-01-05T08:00:00');
    seedTasks([everyday('a', '刷牙')]);
    const { unmount } = renderWithProviders(<TodayPage />);
    fireEvent.click(screen.getByRole('checkbox', { name: '刷牙' }));
    unmount();

    renderWithProviders(<TodayPage />);
    expect(screen.getByRole('checkbox', { name: '刷牙' })).toBeChecked();
    expect(screen.getByText('今天 1 / 1 完成')).toBeInTheDocument();
  });

  it('adds a one-off task that shows today, counts in progress, and disappears tomorrow', () => {
    freezeDate('2026-01-05T08:00:00');
    seedTasks([everyday('a', '刷牙')]);
    const { unmount } = renderWithProviders(<TodayPage />);

    const input = screen.getByLabelText('臨時加一個今天的任務');
    fireEvent.change(input, { target: { value: '簽聯絡簿' } });
    fireEvent.click(screen.getByRole('button', { name: '加' }));

    expect(screen.getByText('簽聯絡簿')).toBeInTheDocument();
    expect(screen.getByText('今天 0 / 2 完成')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: '簽聯絡簿' }));
    expect(screen.getByText('今天 1 / 2 完成')).toBeInTheDocument();
    unmount();

    // Next day: yesterday's adhoc task is gone
    freezeDate('2026-01-06T08:00:00');
    renderWithProviders(<TodayPage />);
    expect(screen.queryByText('簽聯絡簿')).not.toBeInTheDocument();
    expect(screen.getByText('今天 0 / 1 完成')).toBeInTheDocument();
  });

  it('shows custom reward text when set, otherwise falls back to default', () => {
    freezeDate('2026-01-05T08:00:00');
    seedTasks([everyday('a', '刷牙')]);
    storage.set('kid-todolist:reward:v1', '可以吃一根冰棒');

    renderWithProviders(<TodayPage />);
    fireEvent.click(screen.getByRole('checkbox', { name: '刷牙' }));
    expect(screen.getByText('可以吃一根冰棒')).toBeInTheDocument();
  });

  it('falls back to default reward when stored text is empty', () => {
    freezeDate('2026-01-05T08:00:00');
    seedTasks([everyday('a', '刷牙')]);
    storage.set('kid-todolist:reward:v1', '   ');

    renderWithProviders(<TodayPage />);
    fireEvent.click(screen.getByRole('checkbox', { name: '刷牙' }));
    expect(screen.getByText('你今天好棒！')).toBeInTheDocument();
  });

  it('does not show the reward banner when there are zero tasks', () => {
    freezeDate('2026-01-10T08:00:00'); // Saturday with no weekend tasks
    seedTasks([
      { id: 'a', title: '上學日才有', weekdays: SCHOOL_DAYS, createdAt: 0 },
    ]);
    renderWithProviders(<TodayPage />);
    expect(screen.queryByText(/今天全部完成了/)).not.toBeInTheDocument();
  });

  it('follows day override order and can restore default', () => {
    freezeDate('2026-01-05T08:00:00');
    seedTasks([everyday('a', '刷牙'), everyday('b', '寫功課')]);
    storage.set(SETTINGS_KEY, {
      completionMessage: '你今天好棒！',
      rewards: [],
      pointsBalance: 0,
      dayOrders: {
        '2026-01-05': [
          { source: 'task', id: 'b' },
          { source: 'task', id: 'a' },
        ],
      },
    });

    renderWithProviders(<TodayPage />);
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).toHaveAttribute('aria-label', '寫功課');
    expect(checkboxes[1]).toHaveAttribute('aria-label', '刷牙');
    expect(
      screen.getByRole('button', { name: '恢復預設排序' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '恢復預設排序' }));
    expect(
      screen.queryByRole('button', { name: '恢復預設排序' }),
    ).not.toBeInTheDocument();
  });

  it('appends new adhoc at end when day override exists', () => {
    freezeDate('2026-01-05T08:00:00');
    seedTasks([everyday('a', '刷牙')]);
    storage.set(SETTINGS_KEY, {
      completionMessage: '你今天好棒！',
      rewards: [],
      pointsBalance: 0,
      dayOrders: {
        '2026-01-05': [{ source: 'task', id: 'a' }],
      },
    });

    renderWithProviders(<TodayPage />);
    const input = screen.getByLabelText('臨時加一個今天的任務');
    fireEvent.change(input, { target: { value: '臨時任務' } });
    fireEvent.click(screen.getByRole('button', { name: '加' }));

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).toHaveAttribute('aria-label', '刷牙');
    expect(checkboxes[1]).toHaveAttribute('aria-label', '臨時任務');
  });

  it('lets the user delete an adhoc task before checking it', () => {
    freezeDate('2026-01-05T08:00:00');
    seedTasks([]);
    renderWithProviders(<TodayPage />);

    const input = screen.getByLabelText('臨時加一個今天的任務');
    fireEvent.change(input, { target: { value: '寄包裹' } });
    fireEvent.click(screen.getByRole('button', { name: '加' }));

    expect(screen.getByText('寄包裹')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '刪除臨時任務 寄包裹' }));
    expect(screen.queryByText('寄包裹')).not.toBeInTheDocument();
  });
});
