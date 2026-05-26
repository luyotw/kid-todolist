import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import App from '../App'
import { saveTasks, loadTasks } from '../lib/storage'
import type { Task } from '../types'

function seedTasks(tasks: Task[]) {
  saveTasks(tasks)
}

describe('Task List', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('displays all tasks with names and day labels', () => {
    seedTasks([
      { id: '1', name: '刷牙', days: [1, 3, 5], order: 0 },
      { id: '2', name: '運動', days: [], order: 1 },
    ])

    render(
      <MemoryRouter initialEntries={['/settings']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByText('刷牙')).toBeInTheDocument()
    expect(screen.getByText('一、三、五')).toBeInTheDocument()
    expect(screen.getByText('運動')).toBeInTheDocument()
    expect(screen.getByText('每天')).toBeInTheDocument()
  })

  it('removes task from localStorage after delete confirmation', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    seedTasks([
      { id: '1', name: '刷牙', days: [1], order: 0 },
      { id: '2', name: '運動', days: [], order: 1 },
    ])

    render(
      <MemoryRouter initialEntries={['/settings']}>
        <App />
      </MemoryRouter>,
    )

    const deleteButtons = screen.getAllByRole('button', { name: '刪除' })
    await user.click(deleteButtons[0])

    const tasks = loadTasks()
    expect(tasks).toHaveLength(1)
    expect(tasks[0].name).toBe('運動')
  })

  it('shows empty state message when no tasks exist', () => {
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByText(/還沒有任務/)).toBeInTheDocument()
  })
})
