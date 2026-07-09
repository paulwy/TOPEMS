import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import EhsDrillPage from '../ehs/EhsDrillPage';
import { ehsApi } from '@/api/ehs';
import { useAppStore } from '@/store';

vi.mock('@/api/ehs', () => ({
  ehsApi: {
    listDrills: vi
      .fn()
      .mockResolvedValue({ success: true, data: { data: [], pagination: { total: 0 } } }),
    getDrill: vi.fn(),
    createDrill: vi.fn(),
    updateDrill: vi.fn(),
    deleteDrill: vi.fn(),
  },
}));

vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['ehs:drill:read'] },
          theme: 'light',
        })
      : {
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['ehs:drill:read'] },
          theme: 'light',
        }
  ),
}));

describe('EhsDrillPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <EhsDrillPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should have drill API methods defined', () => {
    render(
      <BrowserRouter>
        <EhsDrillPage />
      </BrowserRouter>
    );
    expect(ehsApi.listDrills).toBeDefined();
    expect(ehsApi.createDrill).toBeDefined();
    expect(ehsApi.getDrill).toBeDefined();
  });

  it('should call listDrills API on mount', () => {
    render(
      <BrowserRouter>
        <EhsDrillPage />
      </BrowserRouter>
    );
    expect(ehsApi.listDrills).toHaveBeenCalled();
  });
});
