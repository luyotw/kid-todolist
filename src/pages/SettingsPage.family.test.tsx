import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SettingsPage from './SettingsPage';
import { ParentDataProvider } from '../lib/parentData';
import { FamilyMembershipProvider } from '../lib/family/useFamilyMembership';

vi.mock('../lib/auth', () => ({
  useAuth: () => ({
    user: { uid: 'user-1' },
    configured: true,
    isGuest: false,
  }),
}));

vi.mock('../lib/family/useFamilyMembership', () => ({
  FamilyMembershipProvider: ({ children }: { children: React.ReactNode }) => children,
  useFamilyMembership: () => ({
    membership: null,
    loading: false,
    refresh: vi.fn(),
  }),
}));

vi.mock('../lib/family/familyService', () => ({
  createFamily: vi.fn(),
  createInviteToken: vi.fn(),
}));

function renderSettings() {
  return render(
    <FamilyMembershipProvider uid="user-1">
      <ParentDataProvider>
        <SettingsPage />
      </ParentDataProvider>
    </FamilyMembershipProvider>,
  );
}

describe('SettingsPage family section', () => {
  it('shows create-family entry when user has no membership', () => {
    renderSettings();
    expect(screen.getByTestId('settings-family-section')).toBeInTheDocument();
    expect(screen.getByTestId('create-family-button')).toBeInTheDocument();
  });
});
