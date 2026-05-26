import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import App from '../App'
import { saveTasks } from '../lib/storage'

const WEDNESDAY = new Date('2026-05-27T12:00:00')

describe('Mobile layout', () => {
  beforeEach(() => {
    vi.setSystemTime(WEDNESDAY)
    localStorage.clear()
  })

  it('wraps long task names without horizontal overflow', () => {
    const longName = '超'.repeat(40)
    saveTasks([{ id: '1', name: longName, days: [3], order: 0 }])

    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    const nameEl = screen.getByText(longName)
    expect(nameEl).toHaveClass('break-words')

    const page = container.querySelector('.pt-safe-top')
    expect(page).toBeTruthy()
    if (page) {
      expect(page.scrollWidth).toBeLessThanOrEqual(page.clientWidth + 1)
    }
  })
})
