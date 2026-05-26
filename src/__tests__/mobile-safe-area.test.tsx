import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import App from '../App'

describe('Mobile safe area', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('applies pt-safe-top on home and settings content', () => {
    const { container, unmount } = render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(container.querySelector('.pt-safe-top')).toBeInTheDocument()
    unmount()

    render(
      <MemoryRouter initialEntries={['/settings']}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByText('任務管理').closest('.pt-safe-top')).toBeInTheDocument()
  })

  it('applies safe-area-bottom on tab bar', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    const nav = screen.getByRole('navigation', { name: '主要導覽' })
    expect(nav).toHaveClass('safe-area-bottom')
  })

  it('defines safe-area inset rules in index.css', () => {
    const css = readFileSync(join(process.cwd(), 'src/index.css'), 'utf-8')
    expect(css).toMatch(/safe-area-inset-top/)
    expect(css).toMatch(/safe-area-inset-bottom/)
  })
})
