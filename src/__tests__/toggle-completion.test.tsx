import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import App from '../App'
import {
  saveTasks,
  saveReward,
  loadDayRecord,
  todayStr,
} from '../lib/storage'
import type { Task } from '../types'

const WEDNESDAY = new Date('2026-05-27T12:00:00')
const THURSDAY = new Date('2026-05-28T12:00:00')

function seedTasks(tasks: Task[]) {
  saveTasks(tasks)
}

function seedThreeWednesdayTasks() {
  seedTasks([
    { id: '1', name: '任務甲', days: [3], order: 0 },
    { id: '2', name: '任務乙', days: [3], order: 1 },
    { id: '3', name: '任務丙', days: [3], order: 2 },
  ])
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

function taskButton(name: string) {
  return screen.getByRole('button', { name: new RegExp(name) })
}

describe('Toggle task completion', () => {
  beforeEach(() => {
    vi.setSystemTime(WEDNESDAY)
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('toggle and progress', () => {
    beforeEach(() => {
      seedThreeWednesdayTasks()
    })

    it('shows 1/3 after completing one of three tasks', async () => {
      const user = userEvent.setup()
      renderHome()

      await user.click(taskButton('任務甲'))
      expect(screen.getByText(/1\/3 完成/)).toBeInTheDocument()
    })

    it('returns to 0/3 when toggling completion off', async () => {
      const user = userEvent.setup()
      renderHome()

      await user.click(taskButton('任務甲'))
      await user.click(taskButton('任務甲'))
      expect(screen.getByText(/0\/3 完成/)).toBeInTheDocument()
    })

    it('increments and decrements progress across multiple tasks', async () => {
      const user = userEvent.setup()
      renderHome()

      await user.click(taskButton('任務甲'))
      await user.click(taskButton('任務乙'))
      expect(screen.getByText(/2\/3 完成/)).toBeInTheDocument()

      await user.click(taskButton('任務甲'))
      expect(screen.getByText(/1\/3 完成/)).toBeInTheDocument()
    })

    it('shows checkmark when done and hides it when undone', async () => {
      const user = userEvent.setup()
      renderHome()

      const btn = taskButton('任務甲')
      await user.click(btn)
      expect(btn).toHaveTextContent('✓')

      await user.click(taskButton('任務甲'))
      expect(taskButton('任務甲')).not.toHaveTextContent('✓')
    })

    it('updates progress percentage in footer', async () => {
      const user = userEvent.setup()
      renderHome()

      expect(screen.getByText('進度 0%')).toBeInTheDocument()
      await user.click(taskButton('任務甲'))
      expect(screen.getByText('進度 33%')).toBeInTheDocument()
      await user.click(taskButton('任務甲'))
      expect(screen.getByText('進度 0%')).toBeInTheDocument()
    })
  })

  describe('all-done reward boundaries', () => {
    it('shows reward when all tasks done and reward text is set', async () => {
      const user = userEvent.setup()
      saveReward({ text: '看電影' })
      seedThreeWednesdayTasks()
      renderHome()

      await user.click(taskButton('任務甲'))
      await user.click(taskButton('任務乙'))
      await user.click(taskButton('任務丙'))

      expect(screen.getByText('全部完成！')).toBeInTheDocument()
      expect(screen.getByText('看電影')).toBeInTheDocument()
    })

    it('hides reward when unchecking after all done', async () => {
      const user = userEvent.setup()
      saveReward({ text: '看電影' })
      seedThreeWednesdayTasks()
      renderHome()

      await user.click(taskButton('任務甲'))
      await user.click(taskButton('任務乙'))
      await user.click(taskButton('任務丙'))
      expect(screen.getByText('全部完成！')).toBeInTheDocument()

      await user.click(taskButton('任務丙'))
      expect(screen.queryByText('全部完成！')).not.toBeInTheDocument()
      expect(screen.getByText(/2\/3 完成/)).toBeInTheDocument()
    })

    it('does not show reward when reward text is empty', async () => {
      const user = userEvent.setup()
      saveReward({ text: '' })
      seedThreeWednesdayTasks()
      renderHome()

      await user.click(taskButton('任務甲'))
      await user.click(taskButton('任務乙'))
      await user.click(taskButton('任務丙'))

      expect(screen.queryByText('全部完成！')).not.toBeInTheDocument()
    })

    it('does not show all-done on empty task list', () => {
      renderHome()
      expect(screen.getByText(/0\/0 完成/)).toBeInTheDocument()
      expect(screen.queryByText('全部完成！')).not.toBeInTheDocument()
    })

    it('does not show reward when tasks remain incomplete', async () => {
      const user = userEvent.setup()
      saveReward({ text: '看電影' })
      seedThreeWednesdayTasks()
      renderHome()

      await user.click(taskButton('任務甲'))
      expect(screen.queryByText('全部完成！')).not.toBeInTheDocument()
    })
  })

  describe('same-day persistence', () => {
    it('keeps completion after unmount and remount on the same day', async () => {
      const user = userEvent.setup()
      seedThreeWednesdayTasks()
      const { unmount } = renderHome()

      await user.click(taskButton('任務甲'))
      expect(screen.getByText(/1\/3 完成/)).toBeInTheDocument()
      unmount()

      renderHome()
      expect(screen.getByText(/1\/3 完成/)).toBeInTheDocument()
      expect(taskButton('任務甲')).toHaveTextContent('✓')
    })

    it('persists completed state to localStorage', async () => {
      const user = userEvent.setup()
      seedThreeWednesdayTasks()
      renderHome()

      await user.click(taskButton('任務甲'))
      const record = loadDayRecord(todayStr())
      expect(record.completed['1']).toBe(true)
    })
  })

  describe('next-day reset and mixed lists', () => {
    it('resets completion for scheduled task on the next day', async () => {
      const user = userEvent.setup()
      seedTasks([{ id: '1', name: '晨操', days: [3, 4], order: 0 }])

      const { unmount } = renderHome()
      await user.click(taskButton('晨操'))
      expect(screen.getByText(/1\/1 完成/)).toBeInTheDocument()
      unmount()

      vi.setSystemTime(THURSDAY)
      renderHome()
      expect(screen.getByText(/0\/1 完成/)).toBeInTheDocument()
      expect(taskButton('晨操')).not.toHaveTextContent('✓')
    })

    it('does not show yesterday adhoc task on the next day', async () => {
      const user = userEvent.setup()
      const { unmount } = renderHome()

      await addAdhocTask(user, '昨天的事')
      await user.click(taskButton('昨天的事'))
      unmount()

      vi.setSystemTime(THURSDAY)
      renderHome()
      expect(screen.queryByText('昨天的事')).not.toBeInTheDocument()
    })

    it('requires both scheduled and adhoc tasks for all-done reward', async () => {
      const user = userEvent.setup()
      saveReward({ text: '看電影' })
      seedTasks([{ id: '1', name: '寫作業', days: [3], order: 0 }])
      renderHome()

      await addAdhocTask(user, '臨時補充')
      await user.click(taskButton('寫作業'))
      expect(screen.queryByText('全部完成！')).not.toBeInTheDocument()

      await user.click(taskButton('臨時補充'))
      expect(screen.getByText('全部完成！')).toBeInTheDocument()
      expect(screen.getByText('看電影')).toBeInTheDocument()
    })
  })
})
