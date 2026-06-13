import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const { reloadApp } = vi.hoisted(() => ({
  reloadApp: vi.fn(),
}));
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
    isGuest: false,
    continueAsGuest: vi.fn(),
    signInWithGoogle: vi.fn(),
    signOutUser: () => {
      signOutUser();
      mockUser = null;
    },
  }),
}));

vi.mock('./lib/pwa/standalone', () => ({
  reloadApp: () => reloadApp(),
}));

vi.mock('./lib/firestore', () => ({
  paths: {
    tasks: (uid: string) => `users/${uid}/tasks`,
    adhoc: (uid: string) => `users/${uid}/adhoc`,
    completions: (uid: string) => `users/${uid}/completions`,
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
    reloadApp.mockClear();
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

  it('shows a persistent icon-only reload button in the header', () => {
    render(<App />);

    const button = screen.getByRole('button', { name: '重新整理' });
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(reloadApp).toHaveBeenCalled();
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
    expect(screen.getByRole('button', { name: '訪客' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '訪客' })).toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: '主要導覽' }),
    ).not.toBeInTheDocument();
  });
});

describe('App tasks sheet', () => {
  beforeEach(() => {
    mockUser = {
      uid: 'u1',
      displayName: '家長小明',
      photoURL: 'https://example.com/a.jpg',
      email: 'a@example.com',
    };
    signOutUser.mockClear();
    reloadApp.mockClear();
  });

  it('shows manage-tasks button between refresh and sign-out on today tab', () => {
    render(<App />);
    const actions = screen
      .getByRole('button', { name: '重新整理' })
      .closest('.app-header__actions');
    expect(actions).not.toBeNull();
    const labels = within(actions!).getAllByRole('button').map((button) => {
      return button.getAttribute('aria-label');
    });
    expect(labels).toEqual(['重新整理', '管理任務', '登出']);
  });

  it('hides manage-tasks button on settings tab', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '設定' }));
    expect(
      screen.queryByRole('button', { name: '管理任務' }),
    ).not.toBeInTheDocument();
  });

  it('opens task management in a bottom sheet', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '管理任務' }));
    expect(screen.getByLabelText('新任務')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: '管理任務' })).toBeInTheDocument();
  });

  it('closes the bottom sheet via backdrop or close control', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '管理任務' }));
    expect(screen.getByLabelText('新任務')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('bottom-sheet-backdrop'));
    expect(screen.queryByLabelText('新任務')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '管理任務' }));
    fireEvent.click(screen.getByRole('button', { name: '關閉' }));
    expect(screen.queryByLabelText('新任務')).not.toBeInTheDocument();
  });

  it('shows only today and settings tabs', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: '今天' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '設定' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '任務' })).not.toBeInTheDocument();
  });

  it('closes the sheet when switching to settings', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '管理任務' }));
    expect(screen.getByLabelText('新任務')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '設定' }));
    expect(screen.queryByLabelText('新任務')).not.toBeInTheDocument();
  });

  it('reflects new scheduled tasks on today after closing the sheet', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '管理任務' }));
    await user.type(screen.getByLabelText('新任務'), '刷牙');
    await user.click(screen.getByRole('button', { name: '加' }));
    await user.click(screen.getByRole('button', { name: '關閉' }));

    expect(screen.getByRole('checkbox', { name: '刷牙' })).toBeInTheDocument();
  });
});
