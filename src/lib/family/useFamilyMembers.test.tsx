import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import * as firestore from '../firestore';
import {
  FamilyMembersProvider,
  useFamilyMembers,
} from './useFamilyMembers';
import type { FamilyMember } from './types';

describe('useFamilyMembers', () => {
  it('subscribes to family members collection', async () => {
    const unsubscribe = vi.fn();
    vi.spyOn(firestore, 'subscribeCollection').mockImplementation(
      (path, onData) => {
        expect(path).toBe('families/fam-1/members');
        onData([
          {
            id: 'owner',
            role: 'owner',
            joinedAt: 1,
            displayName: '家長A',
          } satisfies FamilyMember & { id: string },
        ]);
        return unsubscribe;
      },
    );

    const { result } = renderHook(() => useFamilyMembers(), {
      wrapper: ({ children }) => (
        <FamilyMembersProvider familyId="fam-1">{children}</FamilyMembersProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.members).toEqual([
      {
        uid: 'owner',
        member: {
          role: 'owner',
          joinedAt: 1,
          displayName: '家長A',
        },
      },
    ]);
  });
});
