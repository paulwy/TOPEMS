import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ReportBuilder from '../report/ReportBuilder';
import ReportDesignPage from '../report/ReportDesignPage';
import ReportPage from '../report/ReportPage';
import ReportViewer from '../report/ReportViewer';
import TemplateManagementPage from '../report/TemplateManagementPage';
import { reportApi } from '@/api/report';
import { useAppStore } from '@/store';

vi.mock('@/api/report', () => ({
  reportApi: {
    listReports: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    getReport: vi.fn(),
    createReport: vi.fn(),
    createReportFromTemplate: vi.fn(),
    updateReport: vi.fn(),
    deleteReport: vi.fn(),
    exportReport: vi.fn(),
    runReport: vi.fn(),
    listTemplates: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    getTemplate: vi.fn(),
    createTemplate: vi.fn(),
    updateTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
    listReportTypes: vi.fn().mockResolvedValue({ data: [] }),
    listSchedules: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    getSchedule: vi.fn(),
    createSchedule: vi.fn(),
    updateSchedule: vi.fn(),
    deleteSchedule: vi.fn(),
    executeSchedule: vi.fn(),
    getExecutionHistory: vi.fn(),
    listSubscriptions: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    getSubscription: vi.fn(),
    createSubscription: vi.fn(),
    updateSubscription: vi.fn(),
    deleteSubscription: vi.fn(),
    toggleSubscription: vi.fn(),
    getUserSubscriptions: vi.fn(),
    health: vi.fn(),
    getReportsCenterStats: vi.fn().mockResolvedValue({ data: {} }),
    exportStatsReport: vi.fn(),
  },
}));

vi.mock('@/store', () => ({
  useAppStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['report:read'] },
          theme: 'light',
        })
      : {
          addNotification: vi.fn(),
          notifications: [],
          user: { permissions: ['report:read'] },
          theme: 'light',
        }
  ),
}));

describe('ReportModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ReportBuilder', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <ReportBuilder
            onClose={vi.fn()}
            reportTypes={[]}
            onSuccess={vi.fn()}
          />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });

    it('should have report API methods defined', () => {
      expect(reportApi.createReport).toBeDefined();
      expect(reportApi.createReportFromTemplate).toBeDefined();
      expect(reportApi.listReportTypes).toBeDefined();
    });
  });

  describe('ReportDesignPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <ReportDesignPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });

    it('should have template API methods defined', () => {
      expect(reportApi.listTemplates).toBeDefined();
      expect(reportApi.getTemplate).toBeDefined();
      expect(reportApi.createTemplate).toBeDefined();
      expect(reportApi.updateTemplate).toBeDefined();
      expect(reportApi.deleteTemplate).toBeDefined();
    });
  });

  describe('ReportPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <ReportPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });

    it('should have report API methods defined', () => {
      expect(reportApi.listReports).toBeDefined();
      expect(reportApi.getReport).toBeDefined();
      expect(reportApi.deleteReport).toBeDefined();
      expect(reportApi.exportReport).toBeDefined();
      expect(reportApi.runReport).toBeDefined();
    });
  });

  describe('ReportViewer', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <ReportViewer
            report={{
              id: '1',
              config: {
                report_type: 'rs_project_progress',
                format: 'excel',
                title: '测试报表',
                columns: ['项目名称', '负责人'],
              },
              data: [],
              row_count: 0,
              created_at: '2024-01-01',
            }}
            onClose={vi.fn()}
          />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });

    it('should have report API methods defined', () => {
      expect(reportApi.getReport).toBeDefined();
      expect(reportApi.exportReport).toBeDefined();
    });
  });

  describe('TemplateManagementPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <TemplateManagementPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });

    it('should have template management API methods defined', () => {
      expect(reportApi.listTemplates).toBeDefined();
      expect(reportApi.getTemplate).toBeDefined();
      expect(reportApi.createTemplate).toBeDefined();
      expect(reportApi.updateTemplate).toBeDefined();
      expect(reportApi.deleteTemplate).toBeDefined();
    });
  });
});
