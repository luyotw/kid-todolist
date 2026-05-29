import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../lib/testUtils';
import TasksPage from './TasksPage';

describe('TasksPage', () => {
  it('shows empty state when there are no tasks', () => {
    renderWithProviders(<TasksPage />);
    expect(screen.getByText(/還沒設定任務/)).toBeInTheDocument();
  });

  it('adds, edits, and deletes a task (default every-day schedule)', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderWithProviders(<TasksPage />);

    await user.type(screen.getByLabelText('新任務'), '刷牙');
    await user.click(screen.getByRole('button', { name: '加' }));

    expect(screen.getByText('刷牙')).toBeInTheDocument();
    expect(screen.getAllByLabelText('排程')[0]).toHaveTextContent('每天');
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

  it('switches schedule to school-days via preset', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TasksPage />);

    await user.type(screen.getByLabelText('新任務'), '寫聯絡簿');
    // Add form has its own picker; choose 上學日 in the add form (first match).
    const schoolDayButtons = screen.getAllByRole('button', { name: '上學日' });
    await user.click(schoolDayButtons[0]);
    await user.click(screen.getByRole('button', { name: '加' }));

    expect(screen.getByText('寫聯絡簿')).toBeInTheDocument();
    expect(screen.getAllByLabelText('排程')[0]).toHaveTextContent('上學日');
  });

  it('persists tasks across remount', async () => {
    const user = userEvent.setup();
    const { unmount } = renderWithProviders(<TasksPage />);
    await user.type(screen.getByLabelText('新任務'), '寫功課');
    await user.click(screen.getByRole('button', { name: '加' }));
    unmount();

    renderWithProviders(<TasksPage />);
    expect(screen.getByText('寫功課')).toBeInTheDocument();
  });
});
