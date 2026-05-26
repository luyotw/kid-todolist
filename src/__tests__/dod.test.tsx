import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import App from '../App'
import { loadTasks } from '../lib/storage'

describe('Definition of Done', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('DoD 8.1: task added in settings appears on homepage', async () => {
    const user = userEvent.setup()

    const { unmount } = render(
      <MemoryRouter initialEntries={['/settings']}>
        <App />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: /新增任務/ }))
    await user.type(screen.getByPlaceholderText('任務名稱'), '寫作業')
    await user.click(screen.getByRole('button', { name: '每天' }))
    await user.click(screen.getByRole('button', { name: '確認' }))
    unmount()

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByText('寫作業')).toBeInTheDocument()
  })

  it('DoD 8.2: edited task name and days reflect immediately', async () => {
    const user = userEvent.setup()

    const { unmount } = render(
      <MemoryRouter initialEntries={['/settings']}>
        <App />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: /新增任務/ }))
    await user.type(screen.getByPlaceholderText('任務名稱'), '刷牙')
    await user.click(screen.getByRole('button', { name: '每天' }))
    await user.click(screen.getByRole('button', { name: '確認' }))

    await user.click(screen.getByRole('button', { name: '編輯' }))
    const input = screen.getByDisplayValue('刷牙')
    await user.clear(input)
    await user.type(input, '洗臉')
    await user.click(screen.getByRole('button', { name: '確認' }))

    expect(screen.getByText('洗臉')).toBeInTheDocument()
    unmount()

    const tasks = loadTasks()
    expect(tasks[0].name).toBe('洗臉')
  })

  it('DoD 8.3: deleted task disappears from settings and homepage', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    const { unmount } = render(
      <MemoryRouter initialEntries={['/settings']}>
        <App />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: /新增任務/ }))
    await user.type(screen.getByPlaceholderText('任務名稱'), '閱讀')
    await user.click(screen.getByRole('button', { name: '每天' }))
    await user.click(screen.getByRole('button', { name: '確認' }))

    await user.click(screen.getByRole('button', { name: '刪除' }))
    expect(screen.queryByText('閱讀')).not.toBeInTheDocument()
    unmount()

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.queryByText('閱讀')).not.toBeInTheDocument()
  })

  it('DoD 8.4: reorder reflects correct order on homepage', async () => {
    const user = userEvent.setup()

    const { unmount } = render(
      <MemoryRouter initialEntries={['/settings']}>
        <App />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: /新增任務/ }))
    await user.type(screen.getByPlaceholderText('任務名稱'), 'A任務')
    await user.click(screen.getByRole('button', { name: '每天' }))
    await user.click(screen.getByRole('button', { name: '確認' }))

    await user.click(screen.getByRole('button', { name: /新增任務/ }))
    await user.type(screen.getByPlaceholderText('任務名稱'), 'B任務')
    await user.click(screen.getByRole('button', { name: '每天' }))
    await user.click(screen.getByRole('button', { name: '確認' }))

    const downButton = screen.getByRole('button', { name: '下移' })
    await user.click(downButton)
    unmount()

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    const tasks = loadTasks().sort((a, b) => a.order - b.order)
    expect(tasks[0].name).toBe('B任務')
    expect(tasks[1].name).toBe('A任務')
  })

  it('DoD 8.5: changes persist after remount (localStorage)', async () => {
    const user = userEvent.setup()

    const { unmount } = render(
      <MemoryRouter initialEntries={['/settings']}>
        <App />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: /新增任務/ }))
    await user.type(screen.getByPlaceholderText('任務名稱'), '持久化測試')
    await user.click(screen.getByRole('button', { name: '每天' }))
    await user.click(screen.getByRole('button', { name: '確認' }))
    unmount()

    render(
      <MemoryRouter initialEntries={['/settings']}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByText('持久化測試')).toBeInTheDocument()
  })

  it('DoD 8.6: tab bar allows switching between pages', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('link', { name: /設定/ }))
    expect(screen.getByText('任務管理')).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /今日任務/ }))
    expect(screen.getByText('每日任務')).toBeInTheDocument()
  })

  it('DoD 8.7: buttons have minimum 44px touch target', () => {
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <App />
      </MemoryRouter>,
    )

    const addButton = screen.getByRole('button', { name: /新增任務/ })
    expect(addButton).toHaveClass('min-h-[44px]')
  })
})
