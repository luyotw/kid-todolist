import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import App from '../App'
import { loadTasks } from '../lib/storage'

describe('Add Task', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('adds a task with name and selected days to localStorage', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <App />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: /新增任務/ }))
    await user.type(screen.getByPlaceholderText('任務名稱'), '刷牙')
    await user.click(screen.getByRole('button', { name: '一' }))
    await user.click(screen.getByRole('button', { name: '三' }))
    await user.click(screen.getByRole('button', { name: '確認' }))

    const tasks = loadTasks()
    expect(tasks).toHaveLength(1)
    expect(tasks[0].name).toBe('刷牙')
    expect(tasks[0].days).toEqual([1, 3])
    expect(tasks[0].order).toBe(0)
  })

  it('clears days array when "每天" is selected', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <App />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: /新增任務/ }))
    await user.type(screen.getByPlaceholderText('任務名稱'), '運動')
    await user.click(screen.getByRole('button', { name: '一' }))
    await user.click(screen.getByRole('button', { name: '每天' }))
    await user.click(screen.getByRole('button', { name: '確認' }))

    const tasks = loadTasks()
    expect(tasks).toHaveLength(1)
    expect(tasks[0].days).toEqual([])
  })

  it('does not submit when name is empty', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <App />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: /新增任務/ }))
    await user.click(screen.getByRole('button', { name: '確認' }))

    const tasks = loadTasks()
    expect(tasks).toHaveLength(0)
  })
})
