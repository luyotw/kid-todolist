import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginScreen from './LoginScreen';

const signInWithGoogle = vi.fn();
const signInForLocalDev = vi.fn();
const continueAsGuest = vi.fn();

const authState = vi.hoisted(() => ({
  usingEmulators: false,
}));

vi.mock('../lib/auth', () => ({
  useAuth: () => ({
    configured: true,
    user: null,
    usingEmulators: authState.usingEmulators,
    continueAsGuest,
    signInWithGoogle,
    signInForLocalDev,
  }),
}));

describe('LoginScreen auth feedback', () => {
  beforeEach(() => {
    authState.usingEmulators = false;
  });

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

describe('LoginScreen emulator mode', () => {
  beforeEach(() => {
    authState.usingEmulators = true;
  });

  it('shows local dev sign-in when using emulators', () => {
    render(<LoginScreen />);
    expect(screen.getByRole('button', { name: '本機測試登入' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '使用 Google 登入' })).toBeNull();
  });

  it('calls signInForLocalDev on click', async () => {
    signInForLocalDev.mockResolvedValueOnce(undefined);
    render(<LoginScreen />);
    fireEvent.click(screen.getByRole('button', { name: '本機測試登入' }));
    expect(signInForLocalDev).toHaveBeenCalled();
  });

  it('shows guest entry in emulator mode', () => {
    render(<LoginScreen />);
    expect(screen.getByRole('button', { name: '訪客' })).toBeInTheDocument();
    expect(screen.getByText(/跨裝置同步/)).toBeInTheDocument();
  });
});
