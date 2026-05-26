import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import App from '../App'
import { saveTasks, loadTasks } from '../lib/storage'

describe('Reorder Tasks', () => {
  beforeEach(() => {
    localStorage.clear()
    saveTasks([
      { id: '1', name: '刷牙', days: [], order: 0 },
      { id: '2', name: '運動', days: [], order: 1 },
      { id: '3', name: '閱讀', days: [], order: 2 },
    ])
  })

  it('moves task down when down button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <App />
      </MemoryRouter>,
    )

    const downButtons = screen.getAllByRole('button', { name: '下移' })
    await user.click(downButtons[0])

    const tasks = loadTasks().sort((a, b) => a.order - b.order)
    expect(tasks[0].name).toBe('運動')
    expect(tasks[1].name).toBe('刷牙')
    expect(tasks[2].name).toBe('閱讀')
  })

  it('does not show up button on first item', () => {
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <App />
      </MemoryRouter>,
    )

    const upButtons = screen.getAllByRole('button', { name: '上移' })
    const items = screen.getAllByText(/刷牙|運動|閱讀/)
    expect(items[0]).toHaveTextContent('刷牙')
    expect(upButtons).toHaveLength(2)
  })

  it('does not show down button on last item', () => {
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <App />
      </MemoryRouter>,
    )

    const downButtons = screen.getAllByRole('button', { name: '下移' })
    expect(downButtons).toHaveLength(2)
  })
})
