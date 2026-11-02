import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import MasterGovernancePage from '../MasterGovernancePage';

vi.mock('@/api/master/governance', () => ({
  governanceApi: {
    getDimensionScores: vi.fn().mockResolvedValue({ data: [] }),
    getMaturityHistory: vi.fn().mockResolvedValue({ data: [] }),
    trackProgress: vi.fn().mockResolvedValue({ data: { current: 1, target: 3 } }),
    listWorkflows: vi.fn().mockResolvedValue({ data: [] }),
    listDataProducts: vi.fn().mockResolvedValue({ data: [] }),
    assessMaturity: vi.fn().mockResolvedValue({ data: {} }),
    createImprovementPlan: vi.fn().mockResolvedValue({ data: {} }),
    startWorkflow: vi.fn().mockResolvedValue({ data: {} }),
    approveStep: vi.fn().mockResolvedValue({ data: {} }),
    createDataProduct: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

describe('MasterGovernancePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders governance tabs（成熟度/改进计划/治理工作流/数据产品）', async () => {
    renderWithProviders(<MasterGovernancePage />);
    await waitFor(() => {
      expect(screen.getByText('成熟度')).toBeInTheDocument();
      expect(screen.getByText('治理工作流')).toBeInTheDocument();
      expect(screen.getByText('数据产品')).toBeInTheDocument();
    });
  });
});
