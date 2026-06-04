import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('index.html installability hooks', () => {
  const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
  const viteConfig = readFileSync(resolve(process.cwd(), 'vite.config.ts'), 'utf8');

  it('sets static install metadata without duplicating plugin-injected manifest', () => {
    expect(html).not.toMatch(/rel=["']manifest["']/);
    expect(html).toMatch(/theme-color.*#fef9f3/i);
    expect(html).toMatch(/rel=["']apple-touch-icon["']/);
  });

  it('configures the PWA plugin to inject the manifest at build time', () => {
    expect(viteConfig).toMatch(/VitePWA\(/);
    expect(viteConfig).toMatch(/manifest:\s*\{/);
  });
});
