import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import AiGovernancePage from '../AiGovernancePage';

vi.mock('@/api/master/aiGovernance', () => ({
  aiGovernanceApi: {
    getSuggestions: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getModels: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getMatchResults: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getMatchRules: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getMatchStats: vi.fn().mockResolvedValue({ success: true, data: null }),
    getClassifiers: vi.fn().mockResolvedValue({ success: true, data: [] }),
    classifyEntity: vi.fn().mockResolvedValue({ success: true, data: null }),
    matchEntities: vi.fn().mockResolvedValue({ success: true, data: null }),
    analyzeEntity: vi.fn().mockResolvedValue({ success: true, data: [] }),
    approveSuggestion: vi.fn().mockResolvedValue({ success: true }),
    rejectSuggestion: vi.fn().mockResolvedValue({ success: true }),
    createMatchRule: vi.fn().mockResolvedValue({ success: true }),
    createClassifier: vi.fn().mockResolvedValue({ success: true }),
    reviewClassification: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('AiGovernancePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page heading（AI 治理工作台）', async () => {
    renderWithProviders(<AiGovernancePage />);
    expect(await screen.findByText('AI 治理工作台')).toBeInTheDocument();
  });

  it('renders the three tabs（治理建议/智能匹配/自动分类）', async () => {
    renderWithProviders(<AiGovernancePage />);
    await waitFor(() => {
      const tabs = screen.getAllByRole('tab').map((t) => t.textContent ?? '');
      expect(tabs.join()).toContain('治理建议');
      expect(tabs.join()).toContain('智能匹配');
      expect(tabs.join()).toContain('自动分类');
    });
  });
});
