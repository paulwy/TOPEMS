import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderWithProviders, screen } from '@/__tests__/test-utils';

import { DataTable } from '../DataTable';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (x: string) => x }),
}));

describe('DataTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when data is empty', () => {
    renderWithProviders(
      <DataTable
        data={[]}
        type='devicePoints'
      />
    );
    expect(screen.getByText('gis.index.empty_no_data')).toBeInTheDocument();
  });
});
