import { storage } from './storage';
import { normalizeTaskPoints } from './points';

export const DEFAULT_REWARD = '你今天好棒！';
export const DEFAULT_REWARD_COST = 1;
export const DEFAULT_POINTS_BALANCE = 0;

export const SETTINGS_KEY = 'kid-todolist:settings:v1';
export const LEGACY_REWARD_KEY = 'kid-todolist:reward:v1';

export interface ParentSettings {
  rewardText: string;
  rewardCost: number;
  pointsBalance: number;
}

export function normalizeSettings(
  raw?: Partial<ParentSettings> | null,
): ParentSettings {
  const rewardText = raw?.rewardText?.trim()
    ? raw.rewardText
    : DEFAULT_REWARD;
  return {
    rewardText,
    rewardCost:
      raw?.rewardCost !== undefined
        ? normalizeTaskPoints(raw.rewardCost)
        : DEFAULT_REWARD_COST,
    pointsBalance:
      raw?.pointsBalance !== undefined && raw.pointsBalance >= 0
        ? Math.floor(raw.pointsBalance)
        : DEFAULT_POINTS_BALANCE,
  };
}

export function loadLocalSettings(): ParentSettings {
  const stored = storage.get<ParentSettings | null>(SETTINGS_KEY, null);
  if (stored && typeof stored === 'object' && 'rewardText' in stored) {
    return normalizeSettings(stored);
  }

  const legacy = storage.get<string | ParentSettings>(LEGACY_REWARD_KEY, '');
  if (typeof legacy === 'string') {
    const migrated = normalizeSettings({
      rewardText: legacy.trim() || DEFAULT_REWARD,
    });
    storage.set(SETTINGS_KEY, migrated);
    return migrated;
  }

  return normalizeSettings(null);
}

export function saveLocalSettings(settings: ParentSettings): void {
  storage.set(SETTINGS_KEY, settings);
}
