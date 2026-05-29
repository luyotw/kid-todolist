import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('index.html installability hooks', () => {
  const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

  it('links manifest and sets theme-color for PWA install', () => {
    expect(html).toMatch(/rel=["']manifest["']/);
    expect(html).toMatch(/theme-color.*#fef9f3/i);
  });
});
