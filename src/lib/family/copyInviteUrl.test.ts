import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { copyInviteUrl } from './copyInviteUrl';

describe('copyInviteUrl', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns copied when clipboard succeeds', async () => {
    vi.mocked(navigator.clipboard.writeText).mockResolvedValue(undefined);
    await expect(copyInviteUrl('http://localhost/?join=abc')).resolves.toBe(
      'copied',
    );
  });

  it('falls back to prompt when clipboard fails', async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValue(
      new Error('denied'),
    );
    const prompt = vi.spyOn(window, 'prompt').mockReturnValue(null);
    await expect(copyInviteUrl('http://localhost/?join=abc')).resolves.toBe(
      'prompted',
    );
    expect(prompt).toHaveBeenCalledWith(
      '複製邀請連結：',
      'http://localhost/?join=abc',
    );
  });
});
