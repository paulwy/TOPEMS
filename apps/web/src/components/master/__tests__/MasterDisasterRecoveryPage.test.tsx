import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import MasterDisasterRecoveryPage from '../MasterDisasterRecoveryPage';

vi.mock('@/api/master/disasterRecovery', () => ({
  disasterRecoveryApi: {
    getRecoveryStatus: vi.fn().mockResolvedValue({
      data: { state: 'healthy', pending_jobs: 2, last_recovery_at: '2026-11-01T00:00:00Z' },
    }),
    listRecoveryPoints: vi.fn().mockResolvedValue({
      data: {
        items: [
          {
            id: 'P1',
            created_at: '2026-11-01',
            snapshot_type: 'full',
            size_bytes: 1024,
            created_by: 'admin',
          },
        ],
        total: 1,
      },
    }),
    getPlanProgress: vi
      .fn()
      .mockResolvedValue({ data: { current_step: 1, total_steps: 3, status: 'running' } }),
    getContinuityScore: vi
      .fn()
      .mockResolvedValue({ data: { score: 85, coverage_percentage: 90, risk_level: 'low' } }),
    listContinuityPlans: vi.fn().mockResolvedValue({ data: { items: [], total: 0 } }),
    getReplicationStatus: vi.fn().mockResolvedValue({
      data: { source_region: 'cn-east', target_region: 'cn-south', status: 'active' },
    }),
    getRegionHealth: vi.fn().mockResolvedValue({ data: [] }),
    getFailoverHistory: vi.fn().mockResolvedValue({ data: [] }),
    createRecoveryPoint: vi.fn().mockResolvedValue({ data: {} }),
    restoreFromPoint: vi.fn().mockResolvedValue({ data: {} }),
    createRecoveryPlan: vi.fn().mockResolvedValue({ data: {} }),
    executeRecoveryPlan: vi.fn().mockResolvedValue({ data: {} }),
    testRecovery: vi.fn().mockResolvedValue({ data: {} }),
    createContinuityPlan: vi.fn().mockResolvedValue({ data: {} }),
    testContinuityPlan: vi.fn().mockResolvedValue({ data: {} }),
    initiateFailover: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

describe('MasterDisasterRecoveryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders DR tabs（恢复点/恢复计划/业务连续性/复制与切换）', async () => {
    renderWithProviders(<MasterDisasterRecoveryPage />);
    await waitFor(() => {
      expect(screen.getByText('恢复点')).toBeInTheDocument();
      expect(screen.getByText('业务连续性')).toBeInTheDocument();
    });
  });

  it('renders recovery status metric value（healthy）', async () => {
    renderWithProviders(<MasterDisasterRecoveryPage />);
    await waitFor(() => {
      expect(screen.getByText('healthy')).toBeInTheDocument();
    });
  });
});
