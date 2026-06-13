import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_COMPLETION_MESSAGE,
  DEFAULT_POINTS_BALANCE,
  LEGACY_REWARD_KEY,
  SETTINGS_KEY,
  loadLocalSettings,
  normalizeSettings,
} from './settings';
import { storage } from './storage';

describe('normalizeSettings', () => {
  it('defaults completion message and empty rewards', () => {
    expect(normalizeSettings(null)).toEqual({
      completionMessage: DEFAULT_COMPLETION_MESSAGE,
      rewards: [],
      pointsBalance: DEFAULT_POINTS_BALANCE,
    });
  });

  it('preserves explicit rewards and balance', () => {
    expect(
      normalizeSettings({
        completionMessage: '太棒了',
        rewards: [
          { id: 'r1', title: '冰棒', cost: 3, createdAt: 1 },
        ],
        pointsBalance: 10,
      }),
    ).toEqual({
      completionMessage: '太棒了',
      rewards: [
        { id: 'r1', title: '冰棒', cost: 3, createdAt: 1 },
      ],
      pointsBalance: 10,
    });
  });

  it('migrates legacy rewardText and rewardCost', () => {
    const settings = normalizeSettings({
      rewardText: '你今天好棒！',
      rewardCost: 5,
      pointsBalance: 2,
    });
    expect(settings.completionMessage).toBe('你今天好棒！');
    expect(settings.rewards).toHaveLength(1);
    expect(settings.rewards[0].title).toBe('獎勵');
    expect(settings.rewards[0].cost).toBe(5);
    expect(settings.pointsBalance).toBe(2);
  });

  it('preserves empty completion message', () => {
    expect(normalizeSettings({ completionMessage: '' }).completionMessage).toBe(
      '',
    );
  });

  it('preserves taskOrder, dayOrders, and extraDayOrders when present', () => {
    expect(
      normalizeSettings({
        taskOrder: ['a', 'b'],
        dayOrders: {
          '2026-01-05': [{ source: 'task', id: 'a' }],
        },
        extraDayOrders: {
          '2026-01-05': [{ source: 'adhoc', id: 'x' }],
        },
      }),
    ).toMatchObject({
      taskOrder: ['a', 'b'],
      dayOrders: {
        '2026-01-05': [{ source: 'task', id: 'a' }],
      },
      extraDayOrders: {
        '2026-01-05': [{ source: 'adhoc', id: 'x' }],
      },
    });
  });

  it('works without taskOrder or dayOrders for backward compatibility', () => {
    expect(normalizeSettings(null)).not.toHaveProperty('taskOrder');
    expect(normalizeSettings(null)).not.toHaveProperty('dayOrders');
  });
});

describe('loadLocalSettings', () => {
  beforeEach(() => {
    storage.remove(SETTINGS_KEY);
    storage.remove(LEGACY_REWARD_KEY);
  });

  it('migrates legacy reward string to settings object', () => {
    storage.set(LEGACY_REWARD_KEY, '可以吃冰棒');
    expect(loadLocalSettings()).toEqual({
      completionMessage: '可以吃冰棒',
      rewards: [],
      pointsBalance: DEFAULT_POINTS_BALANCE,
    });
    expect(storage.get(SETTINGS_KEY, null)).toEqual({
      completionMessage: '可以吃冰棒',
      rewards: [],
      pointsBalance: DEFAULT_POINTS_BALANCE,
    });
  });
});
