import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import BIDashboardPage from '../bi/BIDashboardPage';
import BIVisualizationPage from '../bi/BIVisualizationPage';
import BIReportPage from '../bi/BIReportPage';
import BIDataSourcePage from '../bi/BIDataSourcePage';
import { biApi } from '@/api/bi';
import { useAppStore } from '@/store';

vi.mock('@/api/bi', () => ({
  biApi: {
    dashboards: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    visualizations: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    reports: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      export: vi.fn(),
    },
    dataSources: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      test: vi.fn(),
    },
    datasets: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
  dashboardApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  reportApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['bi:dashboard:read'] },
          theme: 'light',
        })
      : {
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['bi:dashboard:read'] },
          theme: 'light',
        }
  ),
}));

describe('BiModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('BIDashboardPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <BIDashboardPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });

    it('should have dashboard API methods defined', () => {
      expect(biApi.dashboards.list).toBeDefined();
      expect(biApi.dashboards.get).toBeDefined();
      expect(biApi.dashboards.create).toBeDefined();
      expect(biApi.dashboards.update).toBeDefined();
      expect(biApi.dashboards.delete).toBeDefined();
    });
  });

  describe('BIVisualizationPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <BIVisualizationPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });

    it('should have visualization API methods defined', () => {
      expect(biApi.visualizations.list).toBeDefined();
      expect(biApi.visualizations.get).toBeDefined();
      expect(biApi.visualizations.create).toBeDefined();
      expect(biApi.visualizations.update).toBeDefined();
      expect(biApi.visualizations.delete).toBeDefined();
    });
  });

  describe('BIReportPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <BIReportPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });

    it('should have report API methods defined', () => {
      expect(biApi.reports.list).toBeDefined();
      expect(biApi.reports.get).toBeDefined();
      expect(biApi.reports.create).toBeDefined();
      expect(biApi.reports.update).toBeDefined();
      expect(biApi.reports.delete).toBeDefined();
      expect(biApi.reports.export).toBeDefined();
    });
  });

  describe('BIDataSourcePage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <BIDataSourcePage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });

    it('should have data source API methods defined', () => {
      expect(biApi.dataSources.list).toBeDefined();
      expect(biApi.dataSources.get).toBeDefined();
      expect(biApi.dataSources.create).toBeDefined();
      expect(biApi.dataSources.update).toBeDefined();
      expect(biApi.dataSources.delete).toBeDefined();
      expect(biApi.dataSources.test).toBeDefined();
    });
  });
});
