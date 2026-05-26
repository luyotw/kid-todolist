import { describe, it, expect } from 'vitest'
import { getTasksForDay, buildTodayTaskList } from '../lib/schedule'
import type { Task } from '../types'

const weekdayTask: Task = {
  id: '1',
  name: '寫作業',
  days: [1, 2, 3, 4, 5],
  order: 0,
}

const weekendTask: Task = {
  id: '2',
  name: '整理房間',
  days: [0, 6],
  order: 1,
}

const everydayTask: Task = {
  id: '3',
  name: '刷牙',
  days: [],
  order: 2,
}

const wednesdayOnlyTask: Task = {
  id: '4',
  name: '游泳',
  days: [3],
  order: 3,
}

describe('getTasksForDay', () => {
  it('shows weekday task on Wednesday, hides on Saturday', () => {
    expect(getTasksForDay([weekdayTask], 3)).toHaveLength(1)
    expect(getTasksForDay([weekdayTask], 6)).toHaveLength(0)
  })

  it('shows weekend task on Sunday, hides on Wednesday', () => {
    expect(getTasksForDay([weekendTask], 0)).toHaveLength(1)
    expect(getTasksForDay([weekendTask], 3)).toHaveLength(0)
  })

  it('shows everyday task on any weekday', () => {
    expect(getTasksForDay([everydayTask], 0)).toHaveLength(1)
    expect(getTasksForDay([everydayTask], 3)).toHaveLength(1)
    expect(getTasksForDay([everydayTask], 6)).toHaveLength(1)
  })

  it('shows single-day task only on that day', () => {
    expect(getTasksForDay([wednesdayOnlyTask], 3)).toHaveLength(1)
    expect(getTasksForDay([wednesdayOnlyTask], 4)).toHaveLength(0)
  })

  it('returns only tasks scheduled for today from a mixed list', () => {
    const tasks = [weekdayTask, weekendTask, everydayTask, wednesdayOnlyTask]
    const result = getTasksForDay(tasks, 3)
    expect(result.map((t) => t.id)).toEqual(['1', '3', '4'])
  })

  it('sorts results by order ascending', () => {
    const tasks = [
      { id: 'b', name: 'B', days: [3], order: 2 },
      { id: 'a', name: 'A', days: [3], order: 0 },
      { id: 'c', name: 'C', days: [3], order: 1 },
    ]
    expect(getTasksForDay(tasks, 3).map((t) => t.id)).toEqual(['a', 'c', 'b'])
  })
})

describe('buildTodayTaskList', () => {
  it('appends adhoc tasks after scheduled tasks', () => {
    const result = buildTodayTaskList([weekdayTask], 3, [
      { id: 'adhoc-1', name: '臨時任務' },
    ])
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('1')
    expect(result[1].id).toBe('adhoc-1')
    expect(result[1].order).toBe(999)
  })

  it('returns correct length for progress counting', () => {
    const result = buildTodayTaskList(
      [weekdayTask, weekendTask],
      3,
      [{ id: 'adhoc-1', name: '臨時' }],
    )
    expect(result).toHaveLength(2)
  })
})
