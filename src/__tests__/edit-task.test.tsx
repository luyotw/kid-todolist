import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import App from '../App'
import { saveTasks, loadTasks } from '../lib/storage'

describe('Edit Task', () => {
  beforeEach(() => {
    localStorage.clear()
    saveTasks([
      { id: '1', name: '刷牙', days: [1, 3], order: 0 },
    ])
  })

  it('switches to inline edit mode when edit button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <App />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: '編輯' }))
    expect(screen.getByDisplayValue('刷牙')).toBeInTheDocument()
  })

  it('saves updated name and days to localStorage', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <App />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: '編輯' }))
    const input = screen.getByDisplayValue('刷牙')
    await user.clear(input)
    await user.type(input, '洗臉')
    await user.click(screen.getByRole('button', { name: '五' }))
    await user.click(screen.getByRole('button', { name: '確認' }))

    const tasks = loadTasks()
    expect(tasks[0].name).toBe('洗臉')
    expect(tasks[0].days).toContain(5)
  })

  it('restores original values when cancel is clicked', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <App />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: '編輯' }))
    const input = screen.getByDisplayValue('刷牙')
    await user.clear(input)
    await user.type(input, '洗臉')
    await user.click(screen.getByRole('button', { name: '取消' }))

    expect(screen.getByText('刷牙')).toBeInTheDocument()
    const tasks = loadTasks()
    expect(tasks[0].name).toBe('刷牙')
  })
})
