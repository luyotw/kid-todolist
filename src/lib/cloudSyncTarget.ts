import { normalizeChildId } from './family/childId';
import { familyPaths } from './family/paths';
import type { UserMembership } from './family/types';

export interface CloudSyncPaths {
  tasks: string;
  completions: string;
  adhoc: string;
  settings: string;
}

export interface CloudSyncTarget {
  enabled: boolean;
  familyId?: string;
  childId?: string;
  paths: CloudSyncPaths;
}

const disabledPaths: CloudSyncPaths = {
  tasks: '',
  completions: '',
  adhoc: '',
  settings: '',
};

/** 依 membership 決定家庭雲端同步目標；無 membership 時不啟用雲端。 */
export function resolveCloudSyncTarget(
  membership: UserMembership | null,
): CloudSyncTarget {
  if (!membership) {
    return { enabled: false, paths: disabledPaths };
  }

  const { familyId } = membership;
  const childId = normalizeChildId(membership.activeChildId);

  return {
    enabled: true,
    familyId,
    childId,
    paths: {
      tasks: familyPaths.tasks(familyId, childId),
      completions: familyPaths.completions(familyId, childId),
      adhoc: familyPaths.adhoc(familyId, childId),
      settings: familyPaths.settings(familyId, childId),
    },
  };
}
