import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { AuthProvider } from './auth';
import { FamilyMembershipProvider } from './family/useFamilyMembership';
import { ParentDataProvider } from './parentData';

export function renderWithProviders(ui: ReactElement, uid: string | null = null) {
  return render(
    <AuthProvider>
      <FamilyMembershipProvider uid={uid}>
        <ParentDataProvider>{ui}</ParentDataProvider>
      </FamilyMembershipProvider>
    </AuthProvider>,
  );
}
