import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { AuthProvider } from './auth';
import { ParentDataProvider } from './parentData';

export function renderWithProviders(ui: ReactElement) {
  return render(
    <AuthProvider>
      <ParentDataProvider>{ui}</ParentDataProvider>
    </AuthProvider>,
  );
}
