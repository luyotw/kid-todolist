import { newId } from './ids';
import type { RewardItem } from '../types';
import { normalizeRewards } from './rewards';
import { storage } from './storage';

export type { RewardItem };

export const DEFAULT_COMPLETION_MESSAGE = '你今天好棒！';
/** @deprecated Use DEFAULT_COMPLETION_MESSAGE */
export const DEFAULT_REWARD = DEFAULT_COMPLETION_MESSAGE;
export const DEFAULT_POINTS_BALANCE = 0;

export const SETTINGS_KEY = 'kid-todolist:settings:v1';
export const LEGACY_REWARD_KEY = 'kid-todolist:reward:v1';

export interface ParentSettings {
  /** Shown on Today when all tasks are done. */
  completionMessage: string;
  /** Redeemable rewards (橡實-style catalog). */
  rewards: RewardItem[];
  pointsBalance: number;
}

type SettingsInput = Partial<ParentSettings> & {
  rewardText?: string;
  rewardCost?: number;
  rewards?: unknown;
};

function legacyRewardsFromInput(raw: SettingsInput): RewardItem[] {
  if (Array.isArray(raw.rewards)) {
    return normalizeRewards(raw.rewards);
  }
  if (!('rewardCost' in raw) || raw.rewardCost === undefined) return [];
  return normalizeRewards([
    {
      id: newId(),
      title: '獎勵',
      cost: raw.rewardCost,
      createdAt: Date.now(),
    },
  ]);
}

export function normalizeSettings(raw?: SettingsInput | null): ParentSettings {
  const completionMessage =
    raw?.completionMessage !== undefined && raw.completionMessage !== null
      ? raw.completionMessage
      : raw?.rewardText !== undefined && raw.rewardText !== null
        ? raw.rewardText
        : DEFAULT_COMPLETION_MESSAGE;

  return {
    completionMessage,
    rewards: legacyRewardsFromInput(raw ?? {}),
    pointsBalance:
      raw?.pointsBalance !== undefined && raw.pointsBalance >= 0
        ? Math.floor(raw.pointsBalance)
        : DEFAULT_POINTS_BALANCE,
  };
}

export function loadLocalSettings(): ParentSettings {
  const stored = storage.get<SettingsInput | null>(SETTINGS_KEY, null);
  if (stored && typeof stored === 'object') {
    if ('completionMessage' in stored || 'rewards' in stored) {
      return normalizeSettings(stored);
    }
    if ('rewardText' in stored) {
      return normalizeSettings(stored);
    }
  }

  const legacy = storage.get<string | SettingsInput>(LEGACY_REWARD_KEY, '');
  if (typeof legacy === 'string') {
    const migrated = normalizeSettings({
      rewardText: legacy.trim() || DEFAULT_COMPLETION_MESSAGE,
    });
    storage.set(SETTINGS_KEY, migrated);
    return migrated;
  }

  return normalizeSettings(null);
}

export function saveLocalSettings(settings: ParentSettings): void {
  storage.set(SETTINGS_KEY, settings);
}
