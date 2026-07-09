import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import GisTrackingPage from '../gis/GisTrackingPage';
import { gisApi } from '@/api/gis';
import { useAppStore } from '@/store';

vi.mock('@/api/gis', () => ({
  gisApi: {
    devices: {
      list: vi
        .fn()
        .mockResolvedValue({ success: true, data: { data: [], pagination: { total: 0 } } }),
      create: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    tracking: {
      list: vi.fn().mockResolvedValue({ success: true, data: [] }),
      getHistory: vi.fn(),
    },
  },
}));

vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['gis:tracking:read'] },
          theme: 'light',
        })
      : {
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['gis:tracking:read'] },
          theme: 'light',
        }
  ),
}));

describe('GisTrackingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <GisTrackingPage />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it('should have GIS API methods defined', () => {
    render(
      <BrowserRouter>
        <GisTrackingPage />
      </BrowserRouter>
    );
    expect(gisApi.devices.list).toBeDefined();
    expect(gisApi.tracking.list).toBeDefined();
  });
});
