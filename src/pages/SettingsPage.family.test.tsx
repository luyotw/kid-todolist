import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import SettingsPage from './SettingsPage';
import { ParentDataProvider } from '../lib/parentData';
import { FamilyMembershipProvider } from '../lib/family/useFamilyMembership';
import * as familyService from '../lib/family/familyService';
import * as copyInviteUrlModule from '../lib/family/copyInviteUrl';
import { INVITE_USER_MESSAGES } from '../lib/family/inviteValidation';

const mockUseFamilyMembers = vi.fn();

vi.mock('../lib/auth', () => ({
  useAuth: () => ({
    user: {
      uid: 'user-1',
      displayName: '家長A',
      email: 'parent@example.com',
    },
    configured: true,
    isGuest: false,
  }),
}));

vi.mock('../lib/cloudSyncTarget', () => ({
  resolveCloudSyncTarget: () => ({
    enabled: false,
    paths: {
      tasks: '',
      completions: '',
      adhoc: '',
      settings: '',
    },
  }),
}));

vi.mock('../lib/cloudSync', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/cloudSync')>();
  return {
    ...actual,
    useOnlineStatus: vi.fn(() => true),
  };
});

vi.mock('../lib/family/useFamilyMembership', () => ({
  FamilyMembershipProvider: ({ children }: { children: React.ReactNode }) => children,
  useFamilyMembership: vi.fn(),
}));

vi.mock('../lib/family/useFamilyMembers', () => ({
  FamilyMembersProvider: ({ children }: { children: React.ReactNode }) => children,
  useFamilyMembers: () => mockUseFamilyMembers(),
}));

vi.mock('../lib/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/firestore')>();
  return {
    ...actual,
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
  };
});

vi.mock('../lib/family/familyService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/family/familyService')>();
  return {
    ...actual,
    createFamily: vi.fn(),
    createInviteToken: vi.fn(),
  };
});

import { useFamilyMembership } from '../lib/family/useFamilyMembership';
import { useOnlineStatus } from '../lib/cloudSync';

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
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mockUseFamilyMembers.mockReturnValue({ members: [], loading: false });
    vi.mocked(useOnlineStatus).mockReturnValue(true);
  });

  it('shows create-family entry when user has no membership', () => {
    vi.mocked(useFamilyMembership).mockReturnValue({
      membership: null,
      loading: false,
      refresh: vi.fn(),
    });

    renderSettings();
    expect(screen.getByTestId('settings-family-section')).toBeInTheDocument();
    expect(screen.getByTestId('create-family-button')).toBeInTheDocument();
  });

  it('shows member list and invite actions when user has a family', () => {
    vi.mocked(useFamilyMembership).mockReturnValue({
      membership: { familyId: 'fam-1', activeChildId: '_default' },
      loading: false,
      refresh: vi.fn(),
    });
    mockUseFamilyMembers.mockReturnValue({
      members: [
        {
          uid: 'user-1',
          member: { role: 'owner', joinedAt: 1, displayName: '家長A' },
        },
      ],
      loading: false,
    });

    renderSettings();
    expect(screen.getByTestId('settings-family-members')).toBeInTheDocument();
    expect(screen.getByTestId('family-member-user-1')).toBeInTheDocument();
    expect(screen.getByTestId('generate-invite-button')).toBeInTheDocument();
    expect(screen.getByTestId('copy-invite-button')).toBeInTheDocument();
  });

  it('shows offline message when generating invite while offline', async () => {
    vi.mocked(useFamilyMembership).mockReturnValue({
      membership: { familyId: 'fam-1', activeChildId: '_default' },
      loading: false,
      refresh: vi.fn(),
    });
    vi.mocked(useOnlineStatus).mockReturnValue(false);

    renderSettings();
    await userEvent.click(screen.getByTestId('generate-invite-button'));

    expect(screen.getByRole('status')).toHaveTextContent(
      INVITE_USER_MESSAGES.OFFLINE,
    );
    expect(familyService.createInviteToken).not.toHaveBeenCalled();
  });

  it('shows offline message when creating family while offline', async () => {
    vi.mocked(useFamilyMembership).mockReturnValue({
      membership: null,
      loading: false,
      refresh: vi.fn(),
    });
    vi.mocked(useOnlineStatus).mockReturnValue(false);

    renderSettings();
    await userEvent.click(screen.getByTestId('create-family-button'));

    expect(screen.getByRole('status')).toHaveTextContent(
      INVITE_USER_MESSAGES.OFFLINE,
    );
    expect(familyService.createFamily).not.toHaveBeenCalled();
  });

  it('shows copy success status after copying invite link', async () => {
    vi.mocked(useFamilyMembership).mockReturnValue({
      membership: { familyId: 'fam-1', activeChildId: '_default' },
      loading: false,
      refresh: vi.fn(),
    });
    vi.spyOn(copyInviteUrlModule, 'copyInviteUrl').mockResolvedValue('copied');
    vi.mocked(familyService.createInviteToken).mockResolvedValue({
      ok: true,
      token: 'tok-1',
    });

    renderSettings();
    await userEvent.click(screen.getByTestId('generate-invite-button'));

    await waitFor(() => {
      expect(screen.getByTestId('settings-invite-url')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('copy-invite-button'));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('已複製到剪貼簿');
    });
  });
});
