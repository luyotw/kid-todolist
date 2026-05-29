import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('./lib/firebase', () => ({
  isFirebaseConfigured: true,
  auth: {},
  db: {},
  app: {},
}));

vi.mock('./lib/pwa/register', () => ({
  registerSW: vi.fn(),
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

describe('App PWA offline login', () => {
  beforeEach(() => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: false,
    });
  });

  it('shows connection hint instead of Google sign-in when offline and logged out', async () => {
    render(<App />);
    expect(await screen.findByRole('status')).toHaveTextContent(/連上網路/);
    expect(screen.queryByRole('button', { name: /Google/i })).not.toBeInTheDocument();
  });
});
