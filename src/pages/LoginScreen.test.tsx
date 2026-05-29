import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LoginScreen from './LoginScreen';

const signInWithGoogle = vi.fn();

vi.mock('../lib/auth', () => ({
  useAuth: () => ({
    configured: true,
    signInWithGoogle,
  }),
}));

describe('LoginScreen auth feedback', () => {
  it('shows alert when sign-in fails', async () => {
    signInWithGoogle.mockRejectedValueOnce(new Error('auth/network-error'));
    render(<LoginScreen />);

    fireEvent.click(screen.getByRole('button', { name: '使用 Google 登入' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/登入失敗/);
  });

  it('shows alert when user closes the popup', async () => {
    signInWithGoogle.mockRejectedValueOnce({ code: 'auth/popup-closed-by-user' });
    render(<LoginScreen />);

    fireEvent.click(screen.getByRole('button', { name: '使用 Google 登入' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/已取消登入/);
  });
});
