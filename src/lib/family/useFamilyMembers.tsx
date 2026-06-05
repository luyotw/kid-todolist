import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { subscribeCollection } from '../firestore';
import { familyPaths } from './paths';
import type { FamilyMember } from './types';

export interface FamilyMemberRow {
  uid: string;
  member: FamilyMember;
}

interface FamilyMembersState {
  members: FamilyMemberRow[];
  loading: boolean;
}

const FamilyMembersContext = createContext<FamilyMembersState | null>(null);

export function FamilyMembersProvider({
  familyId,
  children,
}: {
  familyId: string | null;
  children: ReactNode;
}) {
  const [members, setMembers] = useState<FamilyMemberRow[]>([]);
  const [loading, setLoading] = useState(Boolean(familyId));

  useEffect(() => {
    if (!familyId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    return subscribeCollection<FamilyMember>(
      familyPaths.members(familyId),
      (items) => {
        setMembers(
          items.map((item) => ({
            uid: item.id,
            member: {
              role: item.role,
              joinedAt: item.joinedAt,
              displayName: item.displayName,
              emailLocal: item.emailLocal,
              inviteToken: item.inviteToken,
            },
          })),
        );
        setLoading(false);
      },
      () => {
        setMembers([]);
        setLoading(false);
      },
    );
  }, [familyId]);

  const value = useMemo(() => ({ members, loading }), [members, loading]);

  return (
    <FamilyMembersContext.Provider value={value}>
      {children}
    </FamilyMembersContext.Provider>
  );
}

export function useFamilyMembers(): FamilyMembersState {
  const ctx = useContext(FamilyMembersContext);
  if (!ctx) {
    throw new Error('useFamilyMembers must be used within FamilyMembersProvider');
  }
  return ctx;
}
