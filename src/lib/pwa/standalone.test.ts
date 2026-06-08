import { describe, expect, it, vi } from 'vitest';
import { reloadApp } from './standalone';

describe('reloadApp', () => {
  it('calls location.reload', () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { reload });
    reloadApp();
    expect(reload).toHaveBeenCalled();
  });
});
