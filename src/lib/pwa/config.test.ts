import { describe, expect, it } from 'vitest';
import { PWA_APP_NAME, PWA_MANIFEST, PWA_THEME_COLOR } from './config';

describe('PWA manifest constants', () => {
  it('exports brand name, theme color, and browser display', () => {
    expect(PWA_APP_NAME).toBe('每天的事');
    expect(PWA_THEME_COLOR).toBe('#fef9f3');
    expect(PWA_MANIFEST.name).toBe('每天的事');
    expect(PWA_MANIFEST.theme_color).toBe('#fef9f3');
    expect(PWA_MANIFEST.display).toBe('browser');
  });
});
