import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/__tests__/test-utils';

import IntegrationMesErpPage from '../IntegrationMesErpPage';

// CrudPage 包装页：apiAdapter.list 调 integrationApi.listMesErpSyncs（@/api/integration）。
vi.mock('@/api/integration', () => ({
  integrationApi: {
    listMesErpSyncs: vi.fn().mockResolvedValue({
      success: true,
      data: [{ id: 'ME1', synced: true, source: 'mes', target: 'erp' }],
    }),
    syncMesErp: vi.fn(),
    createMesErpSync: vi.fn(),
  },
}));

describe('IntegrationMesErpPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders schema title heading（MES-ERP 同步）', () => {
    renderWithProviders(<IntegrationMesErpPage />);
    expect(
      screen.getByRole('heading', { name: 'MES-ERP 同步' })
    ).toBeInTheDocument();
  });
});
