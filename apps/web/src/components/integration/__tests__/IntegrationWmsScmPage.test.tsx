import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/__tests__/test-utils';

import IntegrationWmsScmPage from '../IntegrationWmsScmPage';

// CrudPage 包装页：apiAdapter.list 调 integrationApi.listWmsScmSyncs（@/api/integration）。
vi.mock('@/api/integration', () => ({
  integrationApi: {
    listWmsScmSyncs: vi.fn().mockResolvedValue({
      success: true,
      data: [{ id: 'WS1', synced: false, source: 'wms', target: 'scm' }],
    }),
    syncWmsScm: vi.fn(),
    createWmsScmSync: vi.fn(),
  },
}));

describe('IntegrationWmsScmPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders schema title heading（WMS-SCM 同步）', () => {
    renderWithProviders(<IntegrationWmsScmPage />);
    expect(screen.getByRole('heading', { name: 'WMS-SCM 同步' })).toBeInTheDocument();
  });
});
