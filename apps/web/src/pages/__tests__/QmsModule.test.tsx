import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import QmsDashboardPage from '../qms/QmsDashboardPage';
import QmsQualityControlPage from '../qms/QmsQualityControlPage';
import QmsInspectionPage from '../qms/QmsInspectionPage';
import QmsNonconformancePage from '../qms/QmsNonconformancePage';
import { qmsApi } from '@/api/qms';
import { useAppStore } from '@/store';

vi.mock('@/api/qms', () => ({
  qmsApi: {
    dashboard: {
      getStatistics: vi.fn().mockResolvedValue({ data: {} }),
    },
    qualityControl: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      implement: vi.fn(),
    },
    inspections: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      execute: vi.fn(),
      approve: vi.fn(),
    },
    nonconformances: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      approve: vi.fn(),
      close: vi.fn(),
    },
    standards: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    audits: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
  inspectionApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  nonconformanceApi: {
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
          user: { permissions: ['qms:dashboard:read'] },
          theme: 'light',
        })
      : {
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['qms:dashboard:read'] },
          theme: 'light',
        }
  ),
}));

describe('QmsModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('QmsDashboardPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <QmsDashboardPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });

    it('should have dashboard API methods defined', () => {
      expect(qmsApi.dashboard.getStatistics).toBeDefined();
    });
  });

  describe('QmsQualityControlPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <QmsQualityControlPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });

    it('should have quality control API methods defined', () => {
      expect(qmsApi.qualityControl.list).toBeDefined();
      expect(qmsApi.qualityControl.get).toBeDefined();
      expect(qmsApi.qualityControl.create).toBeDefined();
      expect(qmsApi.qualityControl.update).toBeDefined();
      expect(qmsApi.qualityControl.delete).toBeDefined();
      expect(qmsApi.qualityControl.implement).toBeDefined();
    });
  });

  describe('QmsInspectionPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <QmsInspectionPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });

    it('should have inspection API methods defined', () => {
      expect(qmsApi.inspections.list).toBeDefined();
      expect(qmsApi.inspections.get).toBeDefined();
      expect(qmsApi.inspections.create).toBeDefined();
      expect(qmsApi.inspections.update).toBeDefined();
      expect(qmsApi.inspections.delete).toBeDefined();
      expect(qmsApi.inspections.execute).toBeDefined();
      expect(qmsApi.inspections.approve).toBeDefined();
    });
  });

  describe('QmsNonconformancePage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <QmsNonconformancePage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });

    it('should have nonconformance API methods defined', () => {
      expect(qmsApi.nonconformances.list).toBeDefined();
      expect(qmsApi.nonconformances.get).toBeDefined();
      expect(qmsApi.nonconformances.create).toBeDefined();
      expect(qmsApi.nonconformances.update).toBeDefined();
      expect(qmsApi.nonconformances.delete).toBeDefined();
      expect(qmsApi.nonconformances.approve).toBeDefined();
      expect(qmsApi.nonconformances.close).toBeDefined();
    });
  });
});
