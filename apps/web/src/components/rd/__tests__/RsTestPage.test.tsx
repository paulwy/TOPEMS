import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import RsTestPage from '../RsTestPage';

vi.mock('@/api/rd', () => ({
  rdApi: {
    listTests: vi.fn().mockResolvedValue({
      success: true,
      code: 0,
      message: '',
      data: {
        items: [
          {
            id: 'T001',
            case_no: 'TC-2026-001',
            case_name: '登录流程用例',
            case_type: 'functional',
            priority: 'high',
            status: 'passed',
            related_requirement: 'REQ-001',
          },
        ],
        total: 1,
      },
    }),
    createTest: vi.fn(),
    updateTest: vi.fn().mockResolvedValue({ success: true, data: {} }),
    deleteTest: vi.fn(),
  },
}));

describe('RsTestPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders h1 测试用例', async () => {
    renderWithProviders(<RsTestPage />);
    expect(await screen.findByRole('heading', { name: '测试用例' })).toBeInTheDocument();
  });

  it('renders test rows from mocked API', async () => {
    renderWithProviders(<RsTestPage />);
    await waitFor(() => {
      expect(screen.getByText('TC-2026-001')).toBeInTheDocument();
      expect(screen.getByText('登录流程用例')).toBeInTheDocument();
    });
  });
});
