import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import App from '../App'

describe('Routing', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders homepage at /', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByText('每日任務')).toBeInTheDocument()
  })

  it('renders settings page at /settings', () => {
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByText('任務管理')).toBeInTheDocument()
  })
})
