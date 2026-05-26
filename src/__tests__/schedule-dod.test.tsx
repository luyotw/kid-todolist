import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import App from '../App'
import { saveTasks, saveDayRecord, saveReward, loadTasks } from '../lib/storage'
import type { Task } from '../types'

const WEDNESDAY = new Date('2026-05-27T12:00:00')
const SATURDAY = new Date('2026-05-30T12:00:00')
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

describe('Schedule DoD', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('DoD: weekday task shows on weekday, hidden on weekend', () => {
    seedTasks([{ id: '1', name: '寫作業', days: [1, 2, 3, 4, 5], order: 0 }])

    vi.setSystemTime(WEDNESDAY)
    const { unmount } = renderHome()
    expect(screen.getByText('寫作業')).toBeInTheDocument()
    unmount()

    vi.setSystemTime(SATURDAY)
    renderHome()
    expect(screen.queryByText('寫作業')).not.toBeInTheDocument()
  })

  it('DoD: weekend task shows on weekend, hidden on weekday', () => {
    seedTasks([{ id: '1', name: '整理房間', days: [0, 6], order: 0 }])

    vi.setSystemTime(SATURDAY)
    const { unmount } = renderHome()
    expect(screen.getByText('整理房間')).toBeInTheDocument()
    unmount()

    vi.setSystemTime(WEDNESDAY)
    renderHome()
    expect(screen.queryByText('整理房間')).not.toBeInTheDocument()
  })

  it('DoD: everyday task shows all week', () => {
    seedTasks([{ id: '1', name: '刷牙', days: [], order: 0 }])

    for (const day of [WEDNESDAY, SATURDAY, SUNDAY, MONDAY]) {
      vi.setSystemTime(day)
      const { unmount } = renderHome()
      expect(screen.getByText('刷牙')).toBeInTheDocument()
      unmount()
    }
  })

  it('DoD: empty state when no tasks scheduled today', () => {
    vi.setSystemTime(WEDNESDAY)
    seedTasks([{ id: '1', name: '週末任務', days: [0, 6], order: 0 }])
    renderHome()
    expect(screen.getByText('今天沒有任務')).toBeInTheDocument()
  })

  it('DoD: mixed schedule shows only today tasks in order', () => {
    vi.setSystemTime(WEDNESDAY)
    seedTasks([
      { id: '1', name: 'A', days: [3], order: 0 },
      { id: '2', name: 'B', days: [0, 6], order: 1 },
      { id: '3', name: 'C', days: [], order: 2 },
    ])
    renderHome()
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('C')).toBeInTheDocument()
    expect(screen.queryByText('B')).not.toBeInTheDocument()
  })

  it('DoD: progress and all-done reward count only visible tasks', async () => {
    const user = userEvent.setup()
    vi.setSystemTime(WEDNESDAY)
    saveReward({ text: '看電影' })
    seedTasks([
      { id: '1', name: '今日任務', days: [3], order: 0 },
      { id: '2', name: '非今日', days: [6], order: 1 },
    ])

    renderHome()
    expect(screen.getByText(/0\/1 完成/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /今日任務/ }))
    expect(screen.getByText('全部完成！')).toBeInTheDocument()
    expect(screen.getByText('看電影')).toBeInTheDocument()
  })

  it('DoD: single-day schedule shows/hides correctly', () => {
    seedTasks([{ id: '1', name: '游泳', days: [3], order: 0 }])

    vi.setSystemTime(WEDNESDAY)
    const { unmount: u1 } = renderHome()
    expect(screen.getByText('游泳')).toBeInTheDocument()
    u1()

    vi.setSystemTime(new Date('2026-05-28T12:00:00'))
    renderHome()
    expect(screen.queryByText('游泳')).not.toBeInTheDocument()
  })

  it('DoD: list updates across Sunday-Monday boundary', () => {
    seedTasks([
      { id: '1', name: '週末', days: [0, 6], order: 0 },
      { id: '2', name: '平日', days: [1, 2, 3, 4, 5], order: 1 },
    ])

    vi.setSystemTime(SUNDAY)
    const { unmount } = renderHome()
    expect(screen.getByText('週末')).toBeInTheDocument()
    expect(screen.queryByText('平日')).not.toBeInTheDocument()
    unmount()

    vi.setSystemTime(MONDAY)
    renderHome()
    expect(screen.queryByText('週末')).not.toBeInTheDocument()
    expect(screen.getByText('平日')).toBeInTheDocument()
  })

  it('DoD: homepage reflects schedule edit for today', async () => {
    const user = userEvent.setup()
    vi.setSystemTime(WEDNESDAY)
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

  it('DoD: deleted task no longer on homepage', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.setSystemTime(WEDNESDAY)
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

  it('DoD: settings shows all tasks, homepage shows today only', () => {
    vi.setSystemTime(WEDNESDAY)
    seedTasks([
      { id: '1', name: '今日', days: [3], order: 0 },
      { id: '2', name: '非今日', days: [6], order: 1 },
    ])

    render(
      <MemoryRouter initialEntries={['/settings']}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByText('今日')).toBeInTheDocument()
    expect(screen.getByText('非今日')).toBeInTheDocument()
  })

  it('DoD: adhoc tasks always show today', () => {
    vi.setSystemTime(WEDNESDAY)
    seedTasks([{ id: '1', name: '週末任務', days: [0, 6], order: 0 }])
    saveDayRecord({
      date: '2026-05-27',
      completed: {},
      adhocTasks: [{ id: 'adhoc-1', name: '臨時任務' }],
    })
    renderHome()
    expect(screen.getByText('臨時任務')).toBeInTheDocument()
  })

  it('DoD: saving without weekday selection defaults to everyday', async () => {
    const user = userEvent.setup()
    vi.setSystemTime(WEDNESDAY)

    render(
      <MemoryRouter initialEntries={['/settings']}>
        <App />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: /新增任務/ }))
    await user.type(screen.getByPlaceholderText('任務名稱'), '默認')
    await user.click(screen.getByRole('button', { name: '確認' }))

    expect(loadTasks()[0].days).toEqual([])

    await user.click(screen.getByRole('link', { name: /今日任務/ }))
    expect(screen.getByText('默認')).toBeInTheDocument()
  })
})
