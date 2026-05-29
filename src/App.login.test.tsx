import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('./lib/firebase', () => ({
  isFirebaseConfigured: true,
  auth: {},
  db: {},
  app: {},
}));

vi.mock('./lib/auth', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    user: null,
    loading: false,
    configured: true,
    signInWithGoogle: vi.fn(),
    signOutUser: vi.fn(),
  }),
}));

describe('App login gate', () => {
  it('shows login screen without main navigation when signed out', () => {
    render(<App />);
    expect(
      screen.getByRole('button', { name: '使用 Google 登入' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: '主要導覽' }),
    ).not.toBeInTheDocument();
  });
});
