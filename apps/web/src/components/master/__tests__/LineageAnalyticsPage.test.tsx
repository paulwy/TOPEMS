import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import LineageAnalyticsPage from '../LineageAnalyticsPage';

vi.mock('@/api/master/lineageAnalytics', () => ({
  lineageAnalyticsApi: {
    getGraph: vi.fn().mockResolvedValue({
      success: true,
      data: { nodes: [{ node_id: 'N1', name: 'dim_customer' }], edges: [], version: 3 },
    }),
    getPropagationRules: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getPropagationLog: vi.fn().mockResolvedValue({ success: true, data: [] }),
    register: vi.fn().mockResolvedValue({ success: true }),
    remove: vi.fn().mockResolvedValue({ success: true }),
    analyzeImpact: vi.fn().mockResolvedValue({ success: true, data: null }),
    simulateChange: vi.fn().mockResolvedValue({ success: true, data: null }),
    propagate: vi.fn().mockResolvedValue({ success: true }),
    addPropagationRule: vi.fn().mockResolvedValue({ success: true }),
    rollbackPropagation: vi.fn().mockResolvedValue({ success: true }),
    export: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('LineageAnalyticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page heading（血缘分析工作台）', async () => {
    renderWithProviders(<LineageAnalyticsPage />);
    expect(await screen.findByText('血缘分析工作台')).toBeInTheDocument();
  });

  it('renders the three tabs（血缘登记/影响分析/变更传播）', async () => {
    renderWithProviders(<LineageAnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText('血缘登记')).toBeInTheDocument();
      expect(screen.getByText('影响分析')).toBeInTheDocument();
      expect(screen.getByText('变更传播')).toBeInTheDocument();
    });
  });
});
