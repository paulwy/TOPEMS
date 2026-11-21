import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import MasterVersioningPage from '../MasterVersioningPage';

vi.mock('@/api/master/versioning', () => ({
  versioningApi: {
    listHistory: vi.fn().mockResolvedValue({ data: { items: [], total: 0 } }),
    queryAuditLog: vi.fn().mockResolvedValue({ data: { items: [], total: 0 } }),
    getResourcePermissions: vi.fn().mockResolvedValue({ data: [] }),
    getComplianceAudit: vi.fn().mockResolvedValue({
      data: { total_changes: 0, retention_days: 90, violations: [], has_violations: false },
    }),
    createSnapshot: vi.fn().mockResolvedValue({ data: {} }),
    createBranch: vi.fn().mockResolvedValue({ data: {} }),
    mergeBranch: vi.fn().mockResolvedValue({ data: {} }),
    restoreVersion: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

describe('MasterVersioningPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders versioning tabs（版本历史/分支管理/审计日志/权限管理）', async () => {
    renderWithProviders(<MasterVersioningPage />);
    await waitFor(() => {
      expect(screen.getByText('版本历史')).toBeInTheDocument();
      expect(screen.getByText('分支管理')).toBeInTheDocument();
      expect(screen.getByText('审计日志')).toBeInTheDocument();
      expect(screen.getByText('权限管理')).toBeInTheDocument();
    });
  });
});
