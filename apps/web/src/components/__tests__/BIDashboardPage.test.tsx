import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import BIDashboardPage from '../bi/BIDashboardPage';
import {
  fetchDashboards,
  createDashboard,
  deleteDashboard,
  cloneDashboard,
  updateDashboard,
  fetchDashboardTemplates,
  createDashboardFromTemplate,
} from '@/api/bi';

vi.mock('@/api/bi', () => ({
  fetchDashboards: vi.fn(),
  createDashboard: vi.fn(),
  deleteDashboard: vi.fn(),
  cloneDashboard: vi.fn(),
  updateDashboard: vi.fn(),
  fetchDashboardTemplates: vi.fn(),
  createDashboardFromTemplate: vi.fn(),
  fetchWidgets: vi.fn(),
}));

describe('BIDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetchDashboards as vi.Mock).mockResolvedValue({
      success: true,
      data: { items: [], total: 0 },
    });
    (fetchDashboardTemplates as vi.Mock).mockResolvedValue({
      success: true,
      data: [],
    });
  });

  it('should render without crashing', () => {
    render(<BIDashboardPage />);
    expect(true).toBe(true);
  });

  it('should have dashboard API methods defined', () => {
    expect(fetchDashboards).toBeDefined();
    expect(createDashboard).toBeDefined();
    expect(deleteDashboard).toBeDefined();
    expect(cloneDashboard).toBeDefined();
    expect(updateDashboard).toBeDefined();
    expect(fetchDashboardTemplates).toBeDefined();
    expect(createDashboardFromTemplate).toBeDefined();
  });

  it('should fetch dashboards on mount', async () => {
    render(<BIDashboardPage />);
    expect(fetchDashboards).toHaveBeenCalled();
  });
});
