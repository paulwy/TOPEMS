import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import EhsHazardPage from '../ehs/EhsHazardPage';
import { ehsApi } from '@/api/ehs';
import { useAppStore } from '@/store';

vi.mock('@/api/ehs', () => ({
  ehsApi: {
    listSafetyIssues: vi
      .fn()
      .mockResolvedValue({ success: true, data: { data: [], pagination: { total: 0 } } }),
    getSafetyIssue: vi.fn(),
    createSafetyIssue: vi.fn(),
    updateSafetyIssue: vi.fn(),
    deleteSafetyIssue: vi.fn(),
    startRectification: vi.fn(),
    submitRectification: vi.fn(),
    verifySafetyIssue: vi.fn(),
    closeSafetyIssue: vi.fn(),
  },
}));

vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['ehs:hazard:read'] },
          theme: 'light',
        })
      : {
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['ehs:hazard:read'] },
          theme: 'light',
        }
  ),
}));

describe('EhsHazardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <EhsHazardPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should have safety issue API methods defined', () => {
    render(
      <BrowserRouter>
        <EhsHazardPage />
      </BrowserRouter>
    );
    expect(ehsApi.listSafetyIssues).toBeDefined();
    expect(ehsApi.createSafetyIssue).toBeDefined();
    expect(ehsApi.getSafetyIssue).toBeDefined();
    expect(ehsApi.updateSafetyIssue).toBeDefined();
  });

  it('should call listSafetyIssues API on mount', () => {
    render(
      <BrowserRouter>
        <EhsHazardPage />
      </BrowserRouter>
    );
    expect(ehsApi.listSafetyIssues).toHaveBeenCalled();
  });
});
