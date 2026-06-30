import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { GisTrackingPage } from '../gis/GisTrackingPage';
import { gisApi } from '@/api/gis';
import { useAppStore } from '@/store';

vi.mock('@/api/gis');
vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector?: any) =>
    selector ? selector({
      addNotification: mockAddNotification,
      notifications: [],
      user: null,
      theme: 'light',
    }) : {
      addNotification: mockAddNotification,
      notifications: [],
      user: null,
      theme: 'light',
    }
  ),
}));

const mockAddNotification = vi.fn();

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

const mockDevices = [
  {
    id: 'dev-001',
    name: '运输车辆A',
    device_type: 'vehicle',
    latitude: 31.2304,
    longitude: 121.4737,
    status: 'online',
    last_inspected: '2024-01-15T10:00:00Z',
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  },
];

describe('GisTrackingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAppStore as vi.Mock).mockImplementation((selector?: any) =>
      selector ? selector({
        addNotification: mockAddNotification,
        notifications: [],
        user: null,
        theme: 'light',
      }) : {
        addNotification: mockAddNotification,
        notifications: [],
        user: null,
        theme: 'light',
      }
    );
    (gisApi.listDevicePoints as vi.Mock).mockResolvedValue({
      success: true,
      data: {
        data: mockDevices,
        total: 1,
        page: 1,
        pageSize: 100,
        totalPages: 1,
      },
    });

    (gisApi.getDeviceTrack as vi.Mock).mockResolvedValue({
      success: true,
      data: {
        data: [],
        total: 0,
        page: 1,
        pageSize: 100,
        totalPages: 1,
      },
    });
  });

  it('should render page title', async () => {
    renderWithProviders(<GisTrackingPage />);
    await waitFor(() => {
      expect(screen.getByText('GIS 跟踪')).toBeInTheDocument();
    });
  });

  it('should render device list', async () => {
    renderWithProviders(<GisTrackingPage />);
    await waitFor(() => {
      expect(screen.getByText('运输车辆A')).toBeInTheDocument();
    });
  });

  it('should handle API error', async () => {
    (gisApi.listDevicePoints as vi.Mock).mockRejectedValue(new Error('Network error'));
    renderWithProviders(<GisTrackingPage />);

    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    });
  });
});
