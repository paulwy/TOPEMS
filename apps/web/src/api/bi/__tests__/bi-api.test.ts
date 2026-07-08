import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../client', () => {
  const mockBiClient = {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  };
  return {
    apiClient: { bi: mockBiClient },
    default: { bi: mockBiClient },
  };
});

describe('BI Module API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Dashboard API', () => {
    it('fetchDashboards should call GET /dashboard', async () => {
      const { fetchDashboards } = await import('../dashboard');
      await fetchDashboards();
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.get).toHaveBeenCalledWith('/dashboard');
    });

    it('fetchDashboard should call GET /dashboard/:id', async () => {
      const { fetchDashboard } = await import('../dashboard');
      await fetchDashboard('dash-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.get).toHaveBeenCalledWith('/dashboard/dash-001');
    });

    it('createDashboard should call POST /dashboard with data', async () => {
      const { createDashboard } = await import('../dashboard');
      const data = { name: 'Test Dashboard', description: 'Test' };
      await createDashboard(data);
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.post).toHaveBeenCalledWith('/dashboard', data);
    });

    it('updateDashboard should call PUT /dashboard/:id with data', async () => {
      const { updateDashboard } = await import('../dashboard');
      const data = { name: 'Updated Dashboard' };
      await updateDashboard('dash-001', data);
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.put).toHaveBeenCalledWith('/dashboard/dash-001', data);
    });

    it('deleteDashboard should call DELETE /dashboard/:id', async () => {
      const { deleteDashboard } = await import('../dashboard');
      await deleteDashboard('dash-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.delete).toHaveBeenCalledWith('/dashboard/dash-001');
    });

    it('cloneDashboard should call POST /dashboard/:id/clone', async () => {
      const { cloneDashboard } = await import('../dashboard');
      await cloneDashboard('dash-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.post).toHaveBeenCalledWith('/dashboard/dash-001/clone');
    });

    it('fetchPublicDashboards should call GET /dashboard/public', async () => {
      const { fetchPublicDashboards } = await import('../dashboard');
      await fetchPublicDashboards();
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.get).toHaveBeenCalledWith('/dashboard/public');
    });

    it('fetchUserDashboards should call GET /dashboard/user/:ownerId', async () => {
      const { fetchUserDashboards } = await import('../dashboard');
      await fetchUserDashboards('user-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.get).toHaveBeenCalledWith('/dashboard/user/user-001');
    });

    it('fetchDashboardTemplates should call GET /dashboard/template', async () => {
      const { fetchDashboardTemplates } = await import('../dashboard');
      await fetchDashboardTemplates();
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.get).toHaveBeenCalledWith('/dashboard/template');
    });

    it('fetchDashboardTemplate should call GET /dashboard/template/:id', async () => {
      const { fetchDashboardTemplate } = await import('../dashboard');
      await fetchDashboardTemplate('temp-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.get).toHaveBeenCalledWith('/dashboard/template/temp-001');
    });

    it('createDashboardTemplate should call POST /dashboard/template with data', async () => {
      const { createDashboardTemplate } = await import('../dashboard');
      const data = { name: 'Test Template' };
      await createDashboardTemplate(data);
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.post).toHaveBeenCalledWith('/dashboard/template', data);
    });

    it('createDashboardFromTemplate should call POST /dashboard/template/:templateId/create', async () => {
      const { createDashboardFromTemplate } = await import('../dashboard');
      const data = { name: 'New Dashboard' };
      await createDashboardFromTemplate('temp-001', data);
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.post).toHaveBeenCalledWith('/dashboard/template/temp-001/create', data);
    });
  });

  describe('Report API', () => {
    it('fetchReports should call GET /analytics/report with params', async () => {
      const { fetchReports } = await import('../report');
      await fetchReports({ page: 1, pageSize: 10 });
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.get).toHaveBeenCalledWith('/analytics/report', { params: { page: 1, pageSize: 10 } });
    });

    it('fetchReport should call GET /analytics/report/:id', async () => {
      const { fetchReport } = await import('../report');
      await fetchReport('rep-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.get).toHaveBeenCalledWith('/analytics/report/rep-001');
    });

    it('createReport should call POST /analytics/report with data', async () => {
      const { createReport } = await import('../report');
      const data = { name: 'Test Report' };
      await createReport(data);
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.post).toHaveBeenCalledWith('/analytics/report', data);
    });

    it('updateReport should call PUT /analytics/report/:id with data', async () => {
      const { updateReport } = await import('../report');
      const data = { name: 'Updated Report' };
      await updateReport('rep-001', data);
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.put).toHaveBeenCalledWith('/analytics/report/rep-001', data);
    });

    it('deleteReport should call DELETE /analytics/report/:id', async () => {
      const { deleteReport } = await import('../report');
      await deleteReport('rep-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.delete).toHaveBeenCalledWith('/analytics/report/rep-001');
    });

    it('exportReport should call POST /analytics/report/:id/export with format', async () => {
      const { exportReport } = await import('../report');
      await exportReport('rep-001', 'pdf');
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.post).toHaveBeenCalledWith('/analytics/report/rep-001/export', { format: 'pdf' });
    });

    it('listExportJobs should call GET /analytics/report/:reportId/exports', async () => {
      const { listExportJobs } = await import('../report');
      await listExportJobs('rep-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.get).toHaveBeenCalledWith('/analytics/report/rep-001/exports');
    });

    it('downloadExport should call GET /analytics/report/exports/:jobId/download', async () => {
      const { downloadExport } = await import('../report');
      await downloadExport('job-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.get).toHaveBeenCalledWith('/analytics/report/exports/job-001/download', { responseType: 'blob' });
    });

    it('createSchedule should call POST /analytics/report/:reportId/schedules', async () => {
      const { createSchedule } = await import('../report');
      const data = { cron: '0 0 * * *', email: 'test@example.com' };
      await createSchedule('rep-001', data);
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.post).toHaveBeenCalledWith('/analytics/report/rep-001/schedules', data);
    });

    it('runSchedule should call POST /analytics/report/schedules/:scheduleId/run', async () => {
      const { runSchedule } = await import('../report');
      await runSchedule('sch-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.post).toHaveBeenCalledWith('/analytics/report/schedules/sch-001/run');
    });

    it('toggleSchedule should call POST /analytics/report/schedules/:scheduleId/toggle', async () => {
      const { toggleSchedule } = await import('../report');
      await toggleSchedule('sch-001', true);
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.post).toHaveBeenCalledWith('/analytics/report/schedules/sch-001/toggle', { enabled: true });
    });
  });

  describe('Widget API', () => {
    it('fetchWidgets should call GET /widget', async () => {
      const { fetchWidgets } = await import('../widget');
      await fetchWidgets();
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.get).toHaveBeenCalledWith('/widget');
    });

    it('fetchWidgetsByDashboard should call GET /widget/dashboard/:dashboardId', async () => {
      const { fetchWidgetsByDashboard } = await import('../widget');
      await fetchWidgetsByDashboard('dash-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.get).toHaveBeenCalledWith('/widget/dashboard/dash-001');
    });

    it('fetchWidget should call GET /widget/:id', async () => {
      const { fetchWidget } = await import('../widget');
      await fetchWidget('widget-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.get).toHaveBeenCalledWith('/widget/widget-001');
    });

    it('createWidget should call POST /widget with data', async () => {
      const { createWidget } = await import('../widget');
      const data = { name: 'Test Widget', type: 'chart' };
      await createWidget(data);
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.post).toHaveBeenCalledWith('/widget', data);
    });

    it('updateWidget should call PUT /widget/:id with data', async () => {
      const { updateWidget } = await import('../widget');
      const data = { name: 'Updated Widget' };
      await updateWidget('widget-001', data);
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.put).toHaveBeenCalledWith('/widget/widget-001', data);
    });

    it('deleteWidget should call DELETE /widget/:id', async () => {
      const { deleteWidget } = await import('../widget');
      await deleteWidget('widget-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.delete).toHaveBeenCalledWith('/widget/widget-001');
    });

    it('fetchWidgetData should call GET /widget/:id/data', async () => {
      const { fetchWidgetData } = await import('../widget');
      await fetchWidgetData('widget-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.get).toHaveBeenCalledWith('/widget/widget-001/data');
    });
  });

  describe('Dataset API', () => {
    it('listDatasets should call GET /datasets with params', async () => {
      const { listDatasets } = await import('../dataset');
      await listDatasets({ page: 1, pageSize: 10 });
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.get).toHaveBeenCalledWith('/datasets', { params: { page: 1, pageSize: 10 } });
    });

    it('getDataset should call GET /datasets/:id', async () => {
      const { getDataset } = await import('../dataset');
      await getDataset('ds-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.get).toHaveBeenCalledWith('/datasets/ds-001');
    });

    it('createDataset should call POST /datasets with data', async () => {
      const { createDataset } = await import('../dataset');
      const data = { name: 'Test Dataset' };
      await createDataset(data);
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.post).toHaveBeenCalledWith('/datasets', data);
    });

    it('updateDataset should call PUT /datasets/:id with data', async () => {
      const { updateDataset } = await import('../dataset');
      const data = { name: 'Updated Dataset' };
      await updateDataset('ds-001', data);
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.put).toHaveBeenCalledWith('/datasets/ds-001', data);
    });

    it('deleteDataset should call DELETE /datasets/:id', async () => {
      const { deleteDataset } = await import('../dataset');
      await deleteDataset('ds-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.delete).toHaveBeenCalledWith('/datasets/ds-001');
    });

    it('queryDataset should call POST /datasets/query with params', async () => {
      const { queryDataset } = await import('../dataset');
      const params = { dataset_id: 'ds-001', filters: [] };
      await queryDataset(params);
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.post).toHaveBeenCalledWith('/datasets/query', params);
    });

    it('testSqlQuery should call POST /datasets/test-sql with data', async () => {
      const { testSqlQuery } = await import('../dataset');
      await testSqlQuery('ds-001', 'SELECT * FROM test');
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.post).toHaveBeenCalledWith('/datasets/test-sql', { data_source_id: 'ds-001', sql: 'SELECT * FROM test' });
    });

    it('publishDataset should call POST /datasets/:id/publish', async () => {
      const { publishDataset } = await import('../dataset');
      await publishDataset('ds-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.post).toHaveBeenCalledWith('/datasets/ds-001/publish');
    });

    it('refreshDataset should call POST /datasets/:id/refresh', async () => {
      const { refreshDataset } = await import('../dataset');
      await refreshDataset('ds-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.post).toHaveBeenCalledWith('/datasets/ds-001/refresh');
    });

    it('getDatasetPreview should call GET /datasets/:id/preview with limit', async () => {
      const { getDatasetPreview } = await import('../dataset');
      await getDatasetPreview('ds-001', 100);
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.get).toHaveBeenCalledWith('/datasets/ds-001/preview', { params: { limit: 100 } });
    });
  });

  describe('DataSource API', () => {
    it('listDataSources should call GET /data-sources with params', async () => {
      const { listDataSources } = await import('../dataSource');
      await listDataSources({ page: 1, pageSize: 10 });
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.get).toHaveBeenCalledWith('/data-sources', { params: { page: 1, pageSize: 10 } });
    });

    it('getDataSource should call GET /data-sources/:id', async () => {
      const { getDataSource } = await import('../dataSource');
      await getDataSource('ds-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.get).toHaveBeenCalledWith('/data-sources/ds-001');
    });

    it('createDataSource should call POST /data-sources with data', async () => {
      const { createDataSource } = await import('../dataSource');
      const data = { name: 'Test Data Source', type: 'mysql' };
      await createDataSource(data);
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.post).toHaveBeenCalledWith('/data-sources', data);
    });

    it('updateDataSource should call PUT /data-sources/:id with data', async () => {
      const { updateDataSource } = await import('../dataSource');
      const data = { name: 'Updated Data Source' };
      await updateDataSource('ds-001', data);
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.put).toHaveBeenCalledWith('/data-sources/ds-001', data);
    });

    it('deleteDataSource should call DELETE /data-sources/:id', async () => {
      const { deleteDataSource } = await import('../dataSource');
      await deleteDataSource('ds-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.delete).toHaveBeenCalledWith('/data-sources/ds-001');
    });

    it('testDataSource should call POST /data-sources/:id/test', async () => {
      const { testDataSource } = await import('../dataSource');
      await testDataSource('ds-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.post).toHaveBeenCalledWith('/data-sources/ds-001/test');
    });

    it('refreshDataSource should call POST /data-sources/:id/refresh', async () => {
      const { refreshDataSource } = await import('../dataSource');
      await refreshDataSource('ds-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.post).toHaveBeenCalledWith('/data-sources/ds-001/refresh');
    });
  });

  describe('Comparison API', () => {
    it('listComparisons should call GET /comparison-analysis with params', async () => {
      const { listComparisons } = await import('../comparison');
      await listComparisons({ page: 1, pageSize: 10 });
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.get).toHaveBeenCalledWith('/comparison-analysis', { params: { page: 1, pageSize: 10 } });
    });

    it('getComparison should call GET /comparison-analysis/:id', async () => {
      const { getComparison } = await import('../comparison');
      await getComparison('comp-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.get).toHaveBeenCalledWith('/comparison-analysis/comp-001');
    });

    it('createComparison should call POST /comparison-analysis with data', async () => {
      const { createComparison } = await import('../comparison');
      const data = { name: 'Test Comparison' };
      await createComparison(data);
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.post).toHaveBeenCalledWith('/comparison-analysis', data);
    });

    it('updateComparison should call PUT /comparison-analysis/:id with data', async () => {
      const { updateComparison } = await import('../comparison');
      const data = { name: 'Updated Comparison' };
      await updateComparison('comp-001', data);
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.put).toHaveBeenCalledWith('/comparison-analysis/comp-001', data);
    });

    it('deleteComparison should call DELETE /comparison-analysis/:id', async () => {
      const { deleteComparison } = await import('../comparison');
      await deleteComparison('comp-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.delete).toHaveBeenCalledWith('/comparison-analysis/comp-001');
    });

    it('runComparison should call POST /comparison-analysis/:id/run', async () => {
      const { runComparison } = await import('../comparison');
      await runComparison('comp-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.post).toHaveBeenCalledWith('/comparison-analysis/comp-001/run');
    });

    it('getComparisonResult should call GET /comparison-analysis/:id/result', async () => {
      const { getComparisonResult } = await import('../comparison');
      await getComparisonResult('comp-001');
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.get).toHaveBeenCalledWith('/comparison-analysis/comp-001/result');
    });
  });

  describe('Analytics API', () => {
    it('fetchSummaryDashboard should call GET /analytics/summary', async () => {
      const { fetchSummaryDashboard } = await import('../analytics');
      await fetchSummaryDashboard();
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.get).toHaveBeenCalledWith('/analytics/summary');
    });

    it('fetchAnalyticsOverview should call GET /analytics/overview', async () => {
      const { fetchAnalyticsOverview } = await import('../analytics');
      await fetchAnalyticsOverview();
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.get).toHaveBeenCalledWith('/analytics/overview');
    });

    it('fetchModuleAnalytics should call GET /analytics/:moduleId', async () => {
      const { fetchModuleAnalytics } = await import('../analytics');
      await fetchModuleAnalytics('quality');
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.get).toHaveBeenCalledWith('/analytics/quality');
    });

    it('fetchRsSummary should call GET /rs/summary', async () => {
      const { fetchRsSummary } = await import('../analytics');
      await fetchRsSummary();
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.get).toHaveBeenCalledWith('/rs/summary');
    });

    it('fetchQmsSummary should call GET /qms/summary', async () => {
      const { fetchQmsSummary } = await import('../analytics');
      await fetchQmsSummary();
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.get).toHaveBeenCalledWith('/qms/summary');
    });

    it('fetchLimsSummary should call GET /lims/summary', async () => {
      const { fetchLimsSummary } = await import('../analytics');
      await fetchLimsSummary();
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.get).toHaveBeenCalledWith('/lims/summary');
    });

    it('fetchPdmSummary should call GET /pdm/summary', async () => {
      const { fetchPdmSummary } = await import('../analytics');
      await fetchPdmSummary();
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.get).toHaveBeenCalledWith('/pdm/summary');
    });

    it('fetchEhsSummary should call GET /ehs/summary', async () => {
      const { fetchEhsSummary } = await import('../analytics');
      await fetchEhsSummary();
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.get).toHaveBeenCalledWith('/ehs/summary');
    });

    it('fetchSrmSummary should call GET /srm/summary', async () => {
      const { fetchSrmSummary } = await import('../analytics');
      await fetchSrmSummary();
      const { apiClient } = await import('../../client');
      expect(apiClient.bi.get).toHaveBeenCalledWith('/srm/summary');
    });
  });
});