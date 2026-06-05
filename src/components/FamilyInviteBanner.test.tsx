import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import * as copyInviteUrlModule from '../lib/family/copyInviteUrl';
import FamilyInviteBanner from './FamilyInviteBanner';

describe('FamilyInviteBanner', () => {
  it('shows copy success feedback', async () => {
    vi.spyOn(copyInviteUrlModule, 'copyInviteUrl').mockResolvedValue('copied');

    render(
      <FamilyInviteBanner
        inviteUrl="http://localhost/?join=abc"
        onDismiss={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: '複製連結' }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('已複製到剪貼簿');
    });
  });
});
