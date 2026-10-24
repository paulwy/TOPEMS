import apiClient from '../client';

export * from './types';

export {
  fetchDashboards,
  fetchDashboard,
  createDashboard,
  updateDashboard,
  deleteDashboard,
  cloneDashboard,
  fetchPublicDashboards,
  fetchUserDashboards,
  fetchDashboardTemplates,
  fetchDashboardTemplate,
  createDashboardTemplate,
  updateDashboardTemplate,
  deleteDashboardTemplate,
  createDashboardFromTemplate,
} from './dashboard';

export {
  fetchWidgets,
  fetchWidgetsByDashboard,
  fetchWidget,
  createWidget,
  updateWidget,
  deleteWidget,
  fetchWidgetData,
} from './widget';

export {
  listDatasets,
  getDataset,
  createDataset,
  updateDataset,
  deleteDataset,
  queryDataset,
  testSqlQuery,
  publishDataset,
  refreshDataset,
  getDatasetPreview,
  datasetCrudApi,
} from './dataset';

export {
  listRowLevelPermissions,
  getRowLevelPermission,
  createRowLevelPermission,
  updateRowLevelPermission,
  deleteRowLevelPermission,
  testRowLevelPermission,
  listDataPermissions,
  createDataPermission,
  updateDataPermission,
  deleteDataPermission,
  checkPermission,
} from './permission';

export {
  getDrillDownConfig,
  updateDrillDownConfig,
  executeDrillDown,
  getChartLinkConfig,
  updateChartLinkConfig,
  getChartAnnotations,
  createChartAnnotation,
  deleteChartAnnotation,
  exportChart,
  getFullscreenChart,
} from './visualization';

export {
  fetchSummaryDashboard,
  fetchDevelopmentAnalytics,
  fetchQualityAnalytics,
  fetchProductionAnalytics,
  fetchLaboratoryAnalytics,
  fetchAnalyticsOverview,
  fetchModuleAnalytics,
  fetchModuleData,
  fetchModuleDetailData,
  fetchRsSummary,
  fetchRsProjectTimeline,
  fetchRsExperimentSuccessRate,
  fetchRsMaterialUsage,
  fetchRsProjectRanking,
  fetchLimsSummary,
  fetchLimsSampleTimeline,
  fetchLimsTestPassRate,
  fetchLimsInstrumentUsage,
  fetchLimsSampleStatusDistribution,
  fetchQmsSummary,
  fetchQmsQualityTrend,
  fetchQmsIssueDistribution,
  fetchEhsSummary,
  fetchEhsRiskDistribution,
  fetchEhsIncidentTrend,
  fetchSrmSummary,
  fetchSrmSupplierRanking,
  fetchSrmOrderTimeline,
  fetchPdmSummary,
  fetchPdmProductionTrend,
  fetchPdmBatchStatusDistribution,
} from './analytics';

export {
  listDataSources,
  getDataSource,
  createDataSource,
  updateDataSource,
  deleteDataSource,
  testDataSource,
  refreshDataSource,
  dataSourceCrudApi,
} from './dataSource';

export {
  listComparisons,
  getComparison,
  createComparison,
  updateComparison,
  deleteComparison,
  runComparison,
  getComparisonResult,
} from './comparison';

export {
  listSyncRecords,
  getSyncRecord,
  createSyncRecord,
  updateSyncRecord,
  deleteSyncRecord,
  retrySync,
} from './sync';

export default apiClient.bi;
