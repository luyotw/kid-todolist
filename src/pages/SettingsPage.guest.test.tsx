import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SettingsPage from './SettingsPage';
import { ParentDataProvider } from '../lib/parentData';
import { FamilyMembershipProvider } from '../lib/family/useFamilyMembership';

vi.mock('../lib/auth', () => ({
  useAuth: () => ({
    user: null,
    configured: true,
    isGuest: true,
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

function renderSettings() {
  return render(
    <FamilyMembershipProvider uid={null}>
      <ParentDataProvider>
        <SettingsPage />
      </ParentDataProvider>
    </FamilyMembershipProvider>,
  );
}

describe('SettingsPage guest mode', () => {
  it('shows cloud and family login hint instead of family section', () => {
    renderSettings();

    expect(screen.getByTestId('settings-guest-notice')).toBeInTheDocument();
    expect(screen.getByText(/跨裝置同步/)).toBeInTheDocument();
    expect(screen.getByText(/另一位家長/)).toBeInTheDocument();
    expect(screen.queryByTestId('settings-family-section')).not.toBeInTheDocument();
  });
});
