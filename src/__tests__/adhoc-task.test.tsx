import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import App from '../App'
import { loadTasks, saveTasks, saveReward } from '../lib/storage'
import type { Task } from '../types'

const WEDNESDAY = new Date('2026-05-27T12:00:00')
const THURSDAY = new Date('2026-05-28T12:00:00')

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

async function addAdhocTask(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole('button', { name: /新增臨時任務/ }))
  await user.type(screen.getByPlaceholderText('任務名稱'), name)
  await user.click(screen.getByRole('button', { name: '確認' }))
}

describe('Adhoc task from homepage UI', () => {
  beforeEach(() => {
    vi.setSystemTime(WEDNESDAY)
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('adds task from UI and can toggle complete', async () => {
    const user = userEvent.setup()
    renderHome()

    await addAdhocTask(user, '買牛奶')
    expect(screen.getByText('買牛奶')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /買牛奶/ }))
    expect(screen.getByText(/1\/1 完成/)).toBeInTheDocument()
  })

  it('does not add task when name is only whitespace', async () => {
    const user = userEvent.setup()
    renderHome()

    await user.click(screen.getByRole('button', { name: /新增臨時任務/ }))
    await user.type(screen.getByPlaceholderText('任務名稱'), '   ')
    await user.click(screen.getByRole('button', { name: '確認' }))

    expect(screen.getByText(/0\/0 完成/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^\s+$/ })).not.toBeInTheDocument()
  })

  it('does not add adhoc task to permanent task list in settings', async () => {
    const user = userEvent.setup()
    renderHome()

    await addAdhocTask(user, '臨時補充')
    expect(loadTasks()).toHaveLength(0)

    await user.click(screen.getByRole('link', { name: /設定/ }))
    expect(screen.queryByText('臨時補充')).not.toBeInTheDocument()
  })

  it('shows adhoc add button when no permanent tasks exist', () => {
    renderHome()
    expect(screen.getByRole('button', { name: /新增臨時任務/ })).toBeInTheDocument()
    expect(screen.queryByText(/請先到設定頁面新增任務/)).not.toBeInTheDocument()
  })

  it('allows adding adhoc when no tasks scheduled today', async () => {
    const user = userEvent.setup()
    seedTasks([{ id: '1', name: '週末任務', days: [0, 6], order: 0 }])

    renderHome()
    await addAdhocTask(user, '今天補充')

    expect(screen.getByText('今天補充')).toBeInTheDocument()
    expect(screen.queryByText('週末任務')).not.toBeInTheDocument()
    expect(screen.getByText(/0\/1 完成/)).toBeInTheDocument()
  })

  it('hides adhoc task on the next day', async () => {
    const user = userEvent.setup()
    const { unmount } = renderHome()

    await addAdhocTask(user, '昨天的事')
    unmount()

    vi.setSystemTime(THURSDAY)
    renderHome()

    expect(screen.queryByText('昨天的事')).not.toBeInTheDocument()
  })

  it('still shows scheduled tasks on the next day', async () => {
    const user = userEvent.setup()
    seedTasks([{ id: '1', name: '週四任務', days: [4], order: 0 }])

    const { unmount } = renderHome()
    await addAdhocTask(user, '僅今天')
    unmount()

    vi.setSystemTime(THURSDAY)
    renderHome()

    expect(screen.queryByText('僅今天')).not.toBeInTheDocument()
    expect(screen.getByText('週四任務')).toBeInTheDocument()
  })

  it('updates progress when scheduled and adhoc tasks coexist', async () => {
    const user = userEvent.setup()
    seedTasks([{ id: '1', name: '寫作業', days: [3], order: 0 }])

    renderHome()
    await addAdhocTask(user, '臨時任務')

    expect(screen.getByText(/0\/2 完成/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /寫作業/ }))
    expect(screen.getByText(/1\/2 完成/)).toBeInTheDocument()
  })

  it('shows all-done reward when only adhoc tasks are completed', async () => {
    const user = userEvent.setup()
    saveReward({ text: '看電影' })

    renderHome()
    await addAdhocTask(user, '今天限定')
    await user.click(screen.getByRole('button', { name: /今天限定/ }))

    expect(screen.getByText('全部完成！')).toBeInTheDocument()
    expect(screen.getByText('看電影')).toBeInTheDocument()
  })
})
