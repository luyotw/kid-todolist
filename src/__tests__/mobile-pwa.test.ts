import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'

const root = process.cwd()
const publicDir = join(root, 'public')

describe('PWA manifest', () => {
  const manifest = JSON.parse(
    readFileSync(join(publicDir, 'manifest.json'), 'utf-8'),
  ) as {
    name: string
    short_name: string
    display: string
    start_url: string
    icons: Array<{ src: string; sizes: string }>
  }

  it('has standalone display and app name', () => {
    expect(manifest.name).toBe('每日任務')
    expect(manifest.short_name).toBe('每日任務')
    expect(manifest.display).toBe('standalone')
    expect(manifest.start_url).toBe('/')
  })

  it('declares 192 and 512 icons that exist on disk', () => {
    const sizes = manifest.icons.map((i) => i.sizes)
    expect(sizes).toContain('192x192')
    expect(sizes).toContain('512x512')

    for (const icon of manifest.icons) {
      const file = join(publicDir, icon.src.replace(/^\//, ''))
      expect(existsSync(file), `missing ${icon.src}`).toBe(true)
    }
  })
})

describe('PWA HTML head', () => {
  const html = readFileSync(join(root, 'index.html'), 'utf-8')

  it('includes viewport-fit, manifest, and apple web app tags', () => {
    expect(html).toMatch(/viewport-fit=cover/)
    expect(html).toMatch(/rel="manifest"/)
    expect(html).toMatch(/apple-mobile-web-app-capable/)
    expect(html).toMatch(/apple-touch-icon/)
  })
})
