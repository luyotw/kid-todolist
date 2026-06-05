import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('index.html installability hooks', () => {
  const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
  const manifest = readFileSync(
    resolve(process.cwd(), 'public/manifest.webmanifest'),
    'utf8',
  );

  it('links a static manifest and install metadata', () => {
    expect(html).toMatch(/rel=["']manifest["']/);
    expect(html).toMatch(/manifest\.webmanifest/);
    expect(html).toMatch(/theme-color.*#fef9f3/i);
    expect(html).toMatch(/rel=["']apple-touch-icon["']/);
    expect(html).not.toMatch(/apple-mobile-web-app-capable/);
  });

  it('serves manifest as a regular browser web app', () => {
    expect(manifest).toMatch(/"display":\s*"browser"/);
    expect(manifest).toMatch(/"start_url":\s*"\/index\.html"/);
  });
});
