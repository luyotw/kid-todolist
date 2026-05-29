import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_POINTS_BALANCE,
  DEFAULT_REWARD,
  DEFAULT_REWARD_COST,
  LEGACY_REWARD_KEY,
  SETTINGS_KEY,
  loadLocalSettings,
  normalizeSettings,
} from './settings';
import { storage } from './storage';

describe('normalizeSettings', () => {
  it('defaults missing rewardCost and pointsBalance', () => {
    expect(normalizeSettings({ rewardText: '棒' })).toEqual({
      rewardText: '棒',
      rewardCost: DEFAULT_REWARD_COST,
      pointsBalance: DEFAULT_POINTS_BALANCE,
    });
  });

  it('preserves explicit values', () => {
    expect(
      normalizeSettings({
        rewardText: '冰棒',
        rewardCost: 5,
        pointsBalance: 10,
      }),
    ).toEqual({
      rewardText: '冰棒',
      rewardCost: 5,
      pointsBalance: 10,
    });
  });

  it('falls back to default reward text when empty', () => {
    expect(normalizeSettings({ rewardText: '   ' }).rewardText).toBe(
      DEFAULT_REWARD,
    );
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
      rewardText: '可以吃冰棒',
      rewardCost: DEFAULT_REWARD_COST,
      pointsBalance: DEFAULT_POINTS_BALANCE,
    });
    expect(storage.get(SETTINGS_KEY, null)).toEqual({
      rewardText: '可以吃冰棒',
      rewardCost: DEFAULT_REWARD_COST,
      pointsBalance: DEFAULT_POINTS_BALANCE,
    });
  });
});
