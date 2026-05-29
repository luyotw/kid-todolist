import { describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../lib/testUtils';
import SettingsPage from './SettingsPage';

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
});
