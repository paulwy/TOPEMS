import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import CommercialConsolePage from '../CommercialConsolePage';

vi.mock('@/api/master/commercial', () => ({
  commercialApi: {
    listProducts: vi.fn().mockResolvedValue({ success: true, data: [] }),
    listSubscriptions: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getBillingHistory: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getRateCards: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getUsageSummary: vi.fn().mockResolvedValue({ success: true, data: null }),
    getSlaStatus: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getIncidents: vi.fn().mockResolvedValue({ success: true, data: [] }),
    createProduct: vi.fn().mockResolvedValue({ success: true }),
    updateProduct: vi.fn().mockResolvedValue({ success: true }),
    createSubscription: vi.fn().mockResolvedValue({ success: true }),
    cancelSubscription: vi.fn().mockResolvedValue({ success: true }),
    upgradeSubscription: vi.fn().mockResolvedValue({ success: true }),
    reportUsage: vi.fn().mockResolvedValue({ success: true }),
    createRateCard: vi.fn().mockResolvedValue({ success: true }),
    createSlaConfig: vi.fn().mockResolvedValue({ success: true }),
    createIncident: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('CommercialConsolePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page heading（商业化控制台）', async () => {
    renderWithProviders(<CommercialConsolePage />);
    expect(await screen.findByText('商业化控制台')).toBeInTheDocument();
  });

  it('renders product management tab content without crashing', async () => {
    renderWithProviders(<CommercialConsolePage />);
    // 列表为空时表头仍渲染（产品页默认 tab）
    await waitFor(() => {
      expect(screen.getByText('商业化控制台')).toBeInTheDocument();
    });
  });
});
