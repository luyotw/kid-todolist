import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TasksPage from './TasksPage';

describe('TasksPage', () => {
  it('shows empty state when there are no tasks', () => {
    render(<TasksPage />);
    expect(screen.getByText(/還沒設定任務/)).toBeInTheDocument();
  });

  it('adds, edits, and deletes a task', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<TasksPage />);

    await user.type(screen.getByLabelText('新任務'), '刷牙');
    await user.click(screen.getByRole('button', { name: '加' }));

    expect(screen.getByText('刷牙')).toBeInTheDocument();
    expect(screen.queryByText(/還沒設定任務/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '編輯 刷牙' }));
    const editInput = screen.getByLabelText('編輯任務');
    await user.clear(editInput);
    await user.type(editInput, '刷牙刷乾淨');
    await user.click(screen.getByRole('button', { name: '存' }));

    expect(screen.getByText('刷牙刷乾淨')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '刪除 刷牙刷乾淨' }));
    expect(screen.queryByText('刷牙刷乾淨')).not.toBeInTheDocument();
    expect(screen.getByText(/還沒設定任務/)).toBeInTheDocument();
  });

  it('persists tasks across remount', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<TasksPage />);
    await user.type(screen.getByLabelText('新任務'), '寫功課');
    await user.click(screen.getByRole('button', { name: '加' }));
    unmount();

    render(<TasksPage />);
    expect(screen.getByText('寫功課')).toBeInTheDocument();
  });
});
