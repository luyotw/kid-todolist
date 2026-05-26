import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import App from '../App'

describe('TabBar', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('displays two tabs', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: /今日任務/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /設定/ })).toBeInTheDocument()
  })

  it('highlights active tab on homepage', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    const homeLink = screen.getByRole('link', { name: /今日任務/ })
    expect(homeLink).toHaveClass('text-indigo-600')
  })

  it('navigates to settings when tab is clicked', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    await user.click(screen.getByRole('link', { name: /設定/ }))
    expect(screen.getByText('任務管理')).toBeInTheDocument()
  })
})
