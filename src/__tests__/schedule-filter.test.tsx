import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import App from '../App'
import { saveTasks, saveDayRecord } from '../lib/storage'
import type { Task } from '../types'

const WEDNESDAY = new Date('2026-05-27T12:00:00')
const SUNDAY = new Date('2026-05-31T12:00:00')
const MONDAY = new Date('2026-06-01T12:00:00')

function seedTasks(tasks: Task[]) {
  saveTasks(tasks)
}

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  )
}

function renderSettings() {
  return render(
    <MemoryRouter initialEntries={['/settings']}>
      <App />
    </MemoryRouter>,
  )
}

describe('Homepage schedule filter', () => {
  beforeEach(() => {
    vi.setSystemTime(WEDNESDAY)
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows weekday task on Wednesday', () => {
    seedTasks([{ id: '1', name: '寫作業', days: [1, 2, 3, 4, 5], order: 0 }])
    renderHome()
    expect(screen.getByText('寫作業')).toBeInTheDocument()
  })

  it('hides Saturday-only task on Wednesday', () => {
    seedTasks([{ id: '1', name: '打掃', days: [6], order: 0 }])
    renderHome()
    expect(screen.queryByText('打掃')).not.toBeInTheDocument()
  })

  it('shows only today tasks from a mixed schedule in order', () => {
    seedTasks([
      { id: '1', name: '寫作業', days: [1, 2, 3, 4, 5], order: 0 },
      { id: '2', name: '整理房間', days: [0, 6], order: 1 },
      { id: '3', name: '刷牙', days: [], order: 2 },
    ])
    renderHome()
    expect(screen.getByText('寫作業')).toBeInTheDocument()
    expect(screen.getByText('刷牙')).toBeInTheDocument()
    expect(screen.queryByText('整理房間')).not.toBeInTheDocument()
    const buttons = screen.getAllByRole('button').filter((el) =>
      el.textContent?.match(/寫作業|刷牙/),
    )
    expect(buttons[0]).toHaveTextContent('寫作業')
    expect(buttons[1]).toHaveTextContent('刷牙')
  })

  it('displays today weekday in header', () => {
    seedTasks([{ id: '1', name: '刷牙', days: [], order: 0 }])
    renderHome()
    expect(screen.getByText(/星期三/)).toBeInTheDocument()
  })

  it('settings shows all tasks while homepage shows subset', () => {
    seedTasks([
      { id: '1', name: '寫作業', days: [1, 2, 3, 4, 5], order: 0 },
      { id: '2', name: '整理房間', days: [0, 6], order: 1 },
    ])
    renderSettings()
    expect(screen.getByText('寫作業')).toBeInTheDocument()
    expect(screen.getByText('整理房間')).toBeInTheDocument()
  })

  it('reflects schedule edit after navigating back to homepage', async () => {
    const user = userEvent.setup()
    seedTasks([{ id: '1', name: '刷牙', days: [3], order: 0 }])

    render(
      <MemoryRouter initialEntries={['/settings']}>
        <App />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: '編輯' }))
    await user.click(screen.getByRole('button', { name: '三' }))
    await user.click(screen.getByRole('button', { name: '四' }))
    await user.click(screen.getByRole('button', { name: '確認' }))

    await user.click(screen.getByRole('link', { name: /今日任務/ }))
    expect(screen.queryByText('刷牙')).not.toBeInTheDocument()
  })

  it('removes deleted task from homepage', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    seedTasks([{ id: '1', name: '閱讀', days: [], order: 0 }])

    render(
      <MemoryRouter initialEntries={['/settings']}>
        <App />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: '刪除' }))
    await user.click(screen.getByRole('link', { name: /今日任務/ }))
    expect(screen.queryByText('閱讀')).not.toBeInTheDocument()
  })

  it('shows different tasks on Sunday vs Monday', () => {
    seedTasks([
      { id: '1', name: '週末任務', days: [0, 6], order: 0 },
      { id: '2', name: '平日任務', days: [1, 2, 3, 4, 5], order: 1 },
    ])

    vi.setSystemTime(SUNDAY)
    const { unmount } = renderHome()
    expect(screen.getByText('週末任務')).toBeInTheDocument()
    expect(screen.queryByText('平日任務')).not.toBeInTheDocument()
    unmount()

    vi.setSystemTime(MONDAY)
    renderHome()
    expect(screen.queryByText('週末任務')).not.toBeInTheDocument()
    expect(screen.getByText('平日任務')).toBeInTheDocument()
  })
})

describe('Homepage empty state and progress', () => {
  beforeEach(() => {
    vi.setSystemTime(WEDNESDAY)
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows today-empty message when tasks exist but none scheduled today', () => {
    seedTasks([{ id: '1', name: '週末任務', days: [0, 6], order: 0 }])
    renderHome()
    expect(screen.getByText('今天沒有排程任務')).toBeInTheDocument()
    expect(screen.queryByText('週末任務')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /新增臨時任務/ })).toBeInTheDocument()
  })

  it('shows empty hint and adhoc entry when no tasks exist at all', () => {
    renderHome()
    expect(screen.getByText('還沒有任務')).toBeInTheDocument()
    expect(screen.getByText(/可點上方新增今天的臨時任務/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /新增臨時任務/ })).toBeInTheDocument()
  })

  it('counts progress only for visible tasks including adhoc', async () => {
    const user = userEvent.setup()
    seedTasks([
      { id: '1', name: '寫作業', days: [3], order: 0 },
      { id: '2', name: '週末任務', days: [0, 6], order: 1 },
    ])
    saveDayRecord({
      date: '2026-05-27',
      completed: {},
      adhocTasks: [{ id: 'adhoc-1', name: '臨時任務' }],
    })

    renderHome()
    expect(screen.getByText(/0\/2 完成/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /寫作業/ }))
    expect(screen.getByText(/1\/2 完成/)).toBeInTheDocument()
  })
})

describe('Default everyday and adhoc tasks', () => {
  beforeEach(() => {
    vi.setSystemTime(WEDNESDAY)
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('saves empty days when no weekday selected and 每天 not clicked', async () => {
    const user = userEvent.setup()
    const { loadTasks } = await import('../lib/storage')

    renderSettings()
    await user.click(screen.getByRole('button', { name: /新增任務/ }))
    await user.type(screen.getByPlaceholderText('任務名稱'), '默認每天')
    await user.click(screen.getByRole('button', { name: '確認' }))

    expect(loadTasks()[0].days).toEqual([])
  })

  it('shows adhoc tasks on homepage regardless of schedule', () => {
    seedTasks([{ id: '1', name: '週末任務', days: [0, 6], order: 0 }])
    saveDayRecord({
      date: '2026-05-27',
      completed: {},
      adhocTasks: [{ id: 'adhoc-1', name: '臨時補充' }],
    })

    renderHome()
    expect(screen.getByText('臨時補充')).toBeInTheDocument()
    expect(screen.queryByText('週末任務')).not.toBeInTheDocument()
  })
})
