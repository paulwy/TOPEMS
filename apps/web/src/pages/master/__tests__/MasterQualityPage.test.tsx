import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import MasterQualityPage from '../MasterQualityPage';

vi.mock('@/api/master/quality', () => ({
  qualityApi: {
    getDashboard: vi.fn().mockResolvedValue({ data: { total_entities: 20, total_checks: 100, passed: 90, failed: 10, pass_rate: 0.9 } }),
    getScore: vi.fn().mockResolvedValue({ data: { score: 88, grade: 'A' } }),
    listChecks: vi.fn().mockResolvedValue({ data: [] }),
    listRules: vi.fn().mockResolvedValue({ data: [] }),
    getSuggestions: vi.fn().mockResolvedValue({ data: [] }),
    getFixHistory: vi.fn().mockResolvedValue({ data: [] }),
    runCheck: vi.fn().mockResolvedValue({ data: {} }),
    createRule: vi.fn().mockResolvedValue({ data: {} }),
    deleteRule: vi.fn().mockResolvedValue({ data: {} }),
    approveSuggestion: vi.fn().mockResolvedValue({ data: {} }),
    rejectSuggestion: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

describe('MasterQualityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders quality tabs（总览/检查记录/规则管理/建议与修复）', async () => {
    renderWithProviders(<MasterQualityPage />);
    await waitFor(() => {
      expect(screen.getByText('总览')).toBeInTheDocument();
      expect(screen.getByText('规则管理')).toBeInTheDocument();
      expect(screen.getByText('建议与修复')).toBeInTheDocument();
    });
  });
});
