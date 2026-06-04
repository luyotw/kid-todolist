import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('./lib/firebase', () => ({
  isFirebaseConfigured: false,
  auth: {},
  db: {},
  app: {},
}));

vi.mock('./lib/auth', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    user: null,
    loading: false,
    configured: false,
    isGuest: false,
    continueAsGuest: vi.fn(),
    signInWithGoogle: vi.fn(),
    signOutUser: vi.fn(),
  }),
}));

describe('App unconfigured dev mode', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('shows setup hint and main navigation without forcing login', () => {
    render(<App />);
    expect(screen.getByText(/尚未設定 Firebase/)).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: '主要導覽' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '使用 Google 登入' })).not.toBeInTheDocument();
  });
});
