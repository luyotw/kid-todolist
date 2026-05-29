import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const signOutUser = vi.fn();

let mockUser: {
  uid: string;
  displayName: string;
  photoURL: string;
  email: string;
} | null = {
  uid: 'u1',
  displayName: '家長小明',
  photoURL: 'https://example.com/a.jpg',
  email: 'a@example.com',
};

vi.mock('./lib/firebase', () => ({
  isFirebaseConfigured: true,
  auth: {},
  db: {},
  app: {},
}));

vi.mock('./lib/auth', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    user: mockUser,
    loading: false,
    configured: true,
    signInWithGoogle: vi.fn(),
    signOutUser: () => {
      signOutUser();
      mockUser = null;
    },
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
  beforeEach(() => {
    mockUser = {
      uid: 'u1',
      displayName: '家長小明',
      photoURL: 'https://example.com/a.jpg',
      email: 'a@example.com',
    };
    signOutUser.mockClear();
  });

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

  it('signs out and shows login screen when confirmed', () => {
    const { rerender } = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '登出' }));
    fireEvent.click(screen.getAllByRole('button', { name: '登出' })[1]!);
    expect(signOutUser).toHaveBeenCalled();

    rerender(<App />);
    expect(
      screen.getByRole('button', { name: '使用 Google 登入' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: '主要導覽' }),
    ).not.toBeInTheDocument();
  });
});
