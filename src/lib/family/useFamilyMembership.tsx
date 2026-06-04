import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { subscribeDoc } from '../firestore';
import { familyPaths } from './paths';
import type { UserMembership } from './types';

interface FamilyMembershipState {
  membership: UserMembership | null;
  loading: boolean;
  refresh: () => void;
}

const FamilyMembershipContext = createContext<FamilyMembershipState | null>(null);

export function FamilyMembershipProvider({
  uid,
  children,
}: {
  uid: string | null;
  children: ReactNode;
}) {
  const [membership, setMembership] = useState<UserMembership | null>(null);
  const [loading, setLoading] = useState(Boolean(uid));
  const [version, setVersion] = useState(0);

  const refresh = useCallback(() => {
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    if (!uid) {
      setMembership(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    return subscribeDoc<UserMembership>(
      familyPaths.membership(uid),
      (data) => {
        setMembership(data);
        setLoading(false);
      },
      () => {
        setMembership(null);
        setLoading(false);
      },
    );
  }, [uid, version]);

  const value = useMemo(
    () => ({ membership, loading, refresh }),
    [membership, loading, refresh],
  );

  return (
    <FamilyMembershipContext.Provider value={value}>
      {children}
    </FamilyMembershipContext.Provider>
  );
}

export function useFamilyMembership(): FamilyMembershipState {
  const ctx = useContext(FamilyMembershipContext);
  if (!ctx) {
    throw new Error('useFamilyMembership must be used within FamilyMembershipProvider');
  }
  return ctx;
}
