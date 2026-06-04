import { describe, expect, it } from 'vitest';
import {
  createReward,
  deleteReward,
  normalizeRewards,
  updateReward,
} from './rewards';

describe('rewards', () => {
  it('creates and updates rewards', () => {
    const created = createReward([], '冰棒', 3);
    expect(created).toHaveLength(1);
    expect(created[0].title).toBe('冰棒');
    expect(created[0].cost).toBe(3);

    const updated = updateReward(created, created[0].id, { cost: 5 });
    expect(updated[0].cost).toBe(5);
  });

  it('drops invalid entries when normalizing', () => {
    expect(
      normalizeRewards([
        { id: 'a', title: '  ', cost: 1, createdAt: 0 },
        { id: 'b', title: '貼紙', cost: 2, createdAt: 1 },
      ]),
    ).toHaveLength(1);
  });

  it('deletes a reward by id', () => {
    const list = createReward([], '故事', 1);
    const id = list[0].id;
    expect(deleteReward(list, id)).toHaveLength(0);
  });
});
