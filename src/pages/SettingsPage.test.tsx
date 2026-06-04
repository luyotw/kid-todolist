import { describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders } from '../lib/testUtils';
import SettingsPage from './SettingsPage';
import { SETTINGS_KEY } from '../lib/settings';

describe('SettingsPage', () => {
  it('shows the default completion message initially and persists edits', () => {
    const { unmount } = renderWithProviders(<SettingsPage />);
    const field = screen.getByLabelText('全部完成訊息') as HTMLTextAreaElement;
    expect(field.value).toBe('你今天好棒！');

    fireEvent.change(field, { target: { value: '可以吃一根冰棒' } });
    fireEvent.blur(field);
    expect(field.value).toBe('可以吃一根冰棒');

    unmount();
    renderWithProviders(<SettingsPage />);
    expect(screen.getByLabelText('全部完成訊息')).toHaveValue('可以吃一根冰棒');
  });

  it('adds rewards and redeems when balance is sufficient', () => {
    window.localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        completionMessage: '棒',
        rewards: [],
        pointsBalance: 5,
      }),
    );

    renderWithProviders(<SettingsPage />);
    expect(screen.getByTestId('settings-balance')).toHaveTextContent('5');

    fireEvent.change(screen.getByLabelText('新獎勵名稱'), {
      target: { value: '冰棒' },
    });
    fireEvent.change(screen.getByLabelText('新獎勵所需點數'), {
      target: { value: '3' },
    });
    fireEvent.click(screen.getByRole('button', { name: '新增' }));

    const card = screen.getByDisplayValue('冰棒').closest('.reward-card') as HTMLElement;
    fireEvent.click(within(card).getByRole('button', { name: '兌換 冰棒' }));

    expect(screen.getByTestId('settings-balance')).toHaveTextContent('2');
    expect(within(card).getByRole('button', { name: '兌換 冰棒' })).toBeDisabled();
  });

  it('blocks redemption and shows shortfall when balance is insufficient', () => {
    window.localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        completionMessage: '棒',
        rewards: [
          { id: 'r1', title: '冰棒', cost: 5, createdAt: 0 },
        ],
        pointsBalance: 2,
      }),
    );

    renderWithProviders(<SettingsPage />);

    const card = screen.getByDisplayValue('冰棒').closest('.reward-card') as HTMLElement;
    expect(within(card).getByRole('button', { name: '兌換 冰棒' })).toBeDisabled();
    expect(within(card).getByText(/還差 3 點/)).toBeInTheDocument();
    expect(screen.getByTestId('settings-balance')).toHaveTextContent('2');
  });

  it('lets the user clear completion message without snapping back to default', () => {
    const { unmount } = renderWithProviders(<SettingsPage />);
    const field = screen.getByLabelText('全部完成訊息') as HTMLTextAreaElement;

    fireEvent.change(field, { target: { value: '' } });
    fireEvent.blur(field);
    expect(field.value).toBe('');

    unmount();
    renderWithProviders(<SettingsPage />);
    expect(screen.getByLabelText('全部完成訊息')).toHaveValue('');
  });

  it('removes a reward from the catalog', () => {
    window.localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        completionMessage: '棒',
        rewards: [
          { id: 'r1', title: '貼紙', cost: 1, createdAt: 0 },
        ],
        pointsBalance: 0,
      }),
    );

    renderWithProviders(<SettingsPage />);
    fireEvent.click(screen.getByRole('button', { name: '刪除獎勵 貼紙' }));
    expect(screen.getByTestId('rewards-empty')).toBeInTheDocument();
  });
});
