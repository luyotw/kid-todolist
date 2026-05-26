import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import App from '../App'
import { saveTasks } from '../lib/storage'

describe('Mobile touch targets', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('tab links meet minimum touch height', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: /今日任務/ })).toHaveClass('min-h-[44px]')
    expect(screen.getByRole('link', { name: /設定/ })).toHaveClass('min-h-[44px]')
  })

  it('task toggle buttons are full-width and tappable', () => {
    saveTasks([{ id: '1', name: '刷牙', days: [1, 2, 3, 4, 5, 6, 0], order: 0 }])
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    const btn = screen.getByRole('button', { name: /刷牙/ })
    expect(btn).toHaveClass('w-full')
  })

  it('settings add-task button meets minimum touch height', () => {
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: /新增任務/ })).toHaveClass('min-h-[44px]')
  })
})
