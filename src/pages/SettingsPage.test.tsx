import { describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../lib/testUtils';
import SettingsPage from './SettingsPage';
import { SETTINGS_KEY } from '../lib/settings';

describe('SettingsPage', () => {
  it('shows the default reward text initially and persists edits', () => {
    const { unmount } = renderWithProviders(<SettingsPage />);
    const field = screen.getByLabelText('獎勵文字') as HTMLTextAreaElement;
    expect(field.value).toBe('你今天好棒！');

    fireEvent.change(field, { target: { value: '可以吃一根冰棒' } });
    expect(field.value).toBe('可以吃一根冰棒');

    unmount();
    renderWithProviders(<SettingsPage />);
    const reopened = screen.getByLabelText('獎勵文字') as HTMLTextAreaElement;
    expect(reopened.value).toBe('可以吃一根冰棒');
  });

  it('redeems reward when balance is sufficient', () => {
    window.localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        rewardText: '冰棒',
        rewardCost: 3,
        pointsBalance: 5,
      }),
    );

    renderWithProviders(<SettingsPage />);
    expect(screen.getByTestId('settings-balance')).toHaveTextContent('5');

    fireEvent.click(screen.getByTestId('redeem-button'));

    expect(screen.getByTestId('settings-balance')).toHaveTextContent('2');
    expect(screen.getByTestId('redeem-button')).toBeDisabled();
  });

  it('blocks redemption and shows shortfall when balance is insufficient', () => {
    window.localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        rewardText: '冰棒',
        rewardCost: 5,
        pointsBalance: 2,
      }),
    );

    renderWithProviders(<SettingsPage />);

    expect(screen.getByTestId('redeem-button')).toBeDisabled();
    expect(screen.getByTestId('redeem-shortfall')).toBeInTheDocument();
    expect(screen.getByTestId('settings-balance')).toHaveTextContent('2');
  });

  it('persists reward cost edits', () => {
    renderWithProviders(<SettingsPage />);

    const costField = screen.getByLabelText('兌換所需點數');
    fireEvent.change(costField, { target: { value: '4' } });

    expect((costField as HTMLInputElement).value).toBe('4');
  });
});
