import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import EhsCheckPage from '../ehs/EhsCheckPage';
import { ehsApi } from '@/api/ehs';
import { useNotificationStore, useAuthStore } from '@/store';

vi.mock('@/api/ehs', () => ({
  ehsApi: {
    listChecks: vi
      .fn()
      .mockResolvedValue({ success: true, data: { data: [], pagination: { total: 0 } } }),
    getCheck: vi.fn(),
    createCheck: vi.fn(),
    updateCheck: vi.fn(),
    deleteCheck: vi.fn(),
  },
}));

vi.mock('@/store', () => ({
  useNotificationStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          addNotification: vi.fn(),
          notifications: [],
        })
      : {
          addNotification: vi.fn(),
          notifications: [],
        }
  ),
  useAuthStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          user: null,
        })
      : {
          user: null,
        }
  ),
}));

describe('EhsCheckPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <EhsCheckPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should have check API methods defined', () => {
    expect(ehsApi.listChecks).toBeDefined();
    expect(ehsApi.createCheck).toBeDefined();
    expect(ehsApi.getCheck).toBeDefined();
    expect(ehsApi.updateCheck).toBeDefined();
  });
});
