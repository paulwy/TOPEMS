import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/__tests__/test-utils';

import IntegrationLimsQmsPage from '../IntegrationLimsQmsPage';

// CrudPage 包装页：apiAdapter.list 调 integrationApi.listLimsQmsSyncs（@/api/integration）。
vi.mock('@/api/integration', () => ({
  integrationApi: {
    listLimsQmsSyncs: vi.fn().mockResolvedValue({
      success: true,
      data: [{ id: 'L1', synced: false, source: 'lims', target: 'qms' }],
    }),
    syncLimsQms: vi.fn(),
    createLimsQmsSync: vi.fn(),
  },
}));

describe('IntegrationLimsQmsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders schema title heading（LIMS-QMS 同步）', () => {
    renderWithProviders(<IntegrationLimsQmsPage />);
    expect(
      screen.getByRole('heading', { name: 'LIMS-QMS 同步' })
    ).toBeInTheDocument();
  });
});
