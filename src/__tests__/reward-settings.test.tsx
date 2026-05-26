import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import App from '../App'
import { loadReward, saveTasks, saveReward } from '../lib/storage'

const WEDNESDAY = new Date('2026-05-27T12:00:00')

function renderSettings() {
  return render(
    <MemoryRouter initialEntries={['/settings']}>
      <App />
    </MemoryRouter>,
  )
}

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  )
}

function seedWednesdayTask() {
  saveTasks([{ id: '1', name: '寫作業', days: [3], order: 0 }])
}

function taskButton(name: string) {
  return screen.getByRole('button', { name: new RegExp(name) })
}

function rewardInput() {
  return screen.getByRole('textbox', { name: '獎勵文字' })
}

describe('Reward settings', () => {
  beforeEach(() => {
    vi.setSystemTime(WEDNESDAY)
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows completion reward section and input on settings page', () => {
    renderSettings()
    expect(screen.getByRole('heading', { name: '完成獎勵' })).toBeInTheDocument()
    expect(rewardInput()).toBeInTheDocument()
  })

  it('saves reward text when user enters and blurs the input', async () => {
    const user = userEvent.setup()
    renderSettings()

    await user.type(rewardInput(), '看 30 分鐘卡通')
    await user.tab()

    expect(loadReward().text).toBe('看 30 分鐘卡通')
  })

  it('displays previously saved reward when revisiting settings', async () => {
    const user = userEvent.setup()
    saveReward({ text: '看 30 分鐘卡通' })

    const { unmount } = renderSettings()
    expect(rewardInput()).toHaveValue('看 30 分鐘卡通')
    unmount()

    renderSettings()
    expect(rewardInput()).toHaveValue('看 30 分鐘卡通')

    await user.clear(rewardInput())
    await user.type(rewardInput(), '吃冰淇淋')
    await user.tab()
    expect(loadReward().text).toBe('吃冰淇淋')
  })

  it('shows updated reward on home after changing it in settings when all tasks done', async () => {
    const user = userEvent.setup()
    seedWednesdayTask()
    saveReward({ text: '看電影' })

    renderHome()
    await user.click(taskButton('寫作業'))
    expect(screen.getByText('看電影')).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /設定/ }))
    await user.clear(rewardInput())
    await user.type(rewardInput(), '吃冰淇淋')
    await user.tab()

    await user.click(screen.getByRole('link', { name: /今日任務/ }))
    expect(screen.getByText('吃冰淇淋')).toBeInTheDocument()
    expect(screen.queryByText('看電影')).not.toBeInTheDocument()
  })
})
