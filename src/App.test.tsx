import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

const signOutUser = vi.fn();

vi.mock('./lib/firebase', () => ({
  isFirebaseConfigured: true,
  auth: {},
  db: {},
  app: {},
}));

vi.mock('./lib/auth', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    user: {
      uid: 'u1',
      displayName: '家長小明',
      photoURL: 'https://example.com/a.jpg',
      email: 'a@example.com',
    },
    loading: false,
    configured: true,
    signInWithGoogle: vi.fn(),
    signOutUser,
  }),
}));

vi.mock('./lib/firestore', () => ({
  paths: {
    tasks: (uid: string) => `users/${uid}/tasks`,
    adhoc: (uid: string) => `users/${uid}/adhoc`,
    completionsMain: (uid: string) => `users/${uid}/completions/main`,
    settings: (uid: string) => `users/${uid}/meta/settings`,
  },
  subscribeCollection: (_path: string, onData: (items: unknown[]) => void) => {
    onData([]);
    return vi.fn();
  },
  subscribeDoc: (_path: string, onData: (data: unknown) => void) => {
    onData(null);
    return vi.fn();
  },
  writeDoc: vi.fn().mockResolvedValue(undefined),
  writeSingleton: vi.fn().mockResolvedValue(undefined),
  removeDoc: vi.fn().mockResolvedValue(undefined),
}));

describe('App sign-out confirmation', () => {
  it('keeps the user signed in when sign-out is cancelled', () => {
    render(<App />);

    expect(screen.getByTestId('user-identity')).toBeInTheDocument();
    expect(screen.getByText('家長小明')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '登出' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    expect(signOutUser).not.toHaveBeenCalled();
    expect(screen.getByRole('navigation', { name: '主要導覽' })).toBeInTheDocument();
  });
});
