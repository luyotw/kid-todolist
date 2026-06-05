import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PwaUpdateBanner from './PwaUpdateBanner';

vi.mock('../lib/pwa/register', () => ({
  subscribePwaUpdate: (listener: () => void) => {
    listener();
    return () => {};
  },
  applyPwaUpdate: vi.fn(),
}));

describe('PwaUpdateBanner', () => {
  it('shows update prompt and calls applyPwaUpdate on tap', async () => {
    const user = userEvent.setup();
    const { applyPwaUpdate } = await import('../lib/pwa/register');

    render(<PwaUpdateBanner />);

    expect(screen.getByTestId('pwa-update-banner')).toBeInTheDocument();
    expect(screen.getByText('有新版本可以使用')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '立即更新' }));
    expect(applyPwaUpdate).toHaveBeenCalled();
  });
});
