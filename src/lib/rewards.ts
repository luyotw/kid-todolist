import { newId } from './ids';
import { normalizeTaskPoints } from './points';
import type { RewardItem } from '../types';

export function normalizeRewardItem(
  raw: Partial<RewardItem> & { id?: string },
): RewardItem | null {
  const title = raw.title?.trim() ?? '';
  if (!title || !raw.id) return null;
  return {
    id: raw.id,
    title,
    cost: normalizeTaskPoints(raw.cost ?? 1),
    createdAt:
      typeof raw.createdAt === 'number' && Number.isFinite(raw.createdAt)
        ? raw.createdAt
        : Date.now(),
  };
}

export function normalizeRewards(raw: unknown): RewardItem[] {
  if (!Array.isArray(raw)) return [];
  const items: RewardItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const normalized = normalizeRewardItem(entry as Partial<RewardItem>);
    if (normalized) items.push(normalized);
  }
  return items.sort((a, b) => a.createdAt - b.createdAt);
}

export function createReward(
  rewards: RewardItem[],
  title: string,
  cost: number,
): RewardItem[] {
  const trimmed = title.trim();
  if (!trimmed) return rewards;
  const item = normalizeRewardItem({
    id: newId(),
    title: trimmed,
    cost,
    createdAt: Date.now(),
  });
  if (!item) return rewards;
  return [...rewards, item];
}

export function updateReward(
  rewards: RewardItem[],
  id: string,
  patch: Partial<Pick<RewardItem, 'title' | 'cost'>>,
): RewardItem[] {
  return rewards.map((reward) => {
    if (reward.id !== id) return reward;
    const next: RewardItem = { ...reward };
    if (patch.title !== undefined) {
      const trimmed = patch.title.trim();
      if (!trimmed) return reward;
      next.title = trimmed;
    }
    if (patch.cost !== undefined) {
      next.cost = normalizeTaskPoints(patch.cost);
    }
    return next;
  });
}

export function deleteReward(rewards: RewardItem[], id: string): RewardItem[] {
  return rewards.filter((reward) => reward.id !== id);
}

export function findReward(
  rewards: RewardItem[],
  id: string,
): RewardItem | undefined {
  return rewards.find((reward) => reward.id === id);
}
