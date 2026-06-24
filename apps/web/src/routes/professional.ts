import React from 'react';
import { Navigate } from 'react-router-dom';
import type { RouteConfig } from './utils';
import { lazyWithRetry } from './utils';

const lazy = lazyWithRetry;

const LimsSamplePage = lazy(() => import('../pages/lims/LimsSamplePage'));
const LimsProcessPage = lazy(() => import('../pages/lims/LimsProcessPage'));
const LimsTaskPage = lazy(() => import('../pages/lims/LimsTaskPage'));
const LimsInstrumentPage = lazy(() => import('../pages/lims/LimsInstrumentPage'));
const QmsStandardPage = lazy(() => import('../pages/qms/QmsQualityControlPage'));
const QmsCheckPage = lazy(() => import('../pages/qms/QmsInspectionPage'));
const QmsIssuePage = lazy(() => import('../pages/qms/QmsNonconformancePage'));
const QmsAuditPage = lazy(() => import('../pages/qms/QmsAuditManagementPage'));
const EhsHazardPage = lazy(() => import('../pages/ehs/EhsHazardPage'));
const EhsCheckPage = lazy(() => import('../pages/ehs/EhsCheckPage'));
const EhsPlanPage = lazy(() => import('../pages/ehs/EhsPlanPage'));
const EhsDrillPage = lazy(() => import('../pages/ehs/EhsDrillPage'));
const SrmDashboardPage = lazy(() => import('../pages/srm/SrmDashboardPage'));
const SrmSupplierPage = lazy(() => import('../pages/srm/SrmSupplierPage'));
const SrmEvaluationPage = lazy(() => import('../pages/srm/SrmEvaluationPage'));
const SrmOrderPage = lazy(() => import('../pages/srm/SrmOrderPage'));
const SrmContractPage = lazy(() => import('../pages/srm/SrmContractPage'));
const SrmFinancePage = lazy(() => import('../pages/srm/SrmFinancePage'));
const SupplierDetailPage = lazy(() => import('../pages/wms/SupplierDetailPage'));
const PdmProcessPage = lazy(() => import('../pages/pdm/PdmProcessPage'));
const PdmStepPage = lazy(() => import('../pages/pdm/PdmStepPage'));
const PdmFormulaPage = lazy(() => import('../pages/pdm/PdmFormulaPage'));
const PdmBatchPage = lazy(() => import('../pages/pdm/PdmBatchPage'));
const PdmStatsPage = lazy(() => import('../pages/pdm/PdmStatsPage'));
const Gispage = lazy(() => import('../pages/bi/Gispage'));
const Impage = lazy(() => import('../pages/shared/Impage'));
const MailPage = lazy(() => import('../pages/common/MailPage'));
const IntegrationDashboardPage = lazy(
  () => import('../pages/integration/IntegrationDashboardPage')
);
const IntegrationLimsQmsPage = lazy(() => import('../pages/integration/IntegrationLimsQmsPage'));
const IntegrationMesErpPage = lazy(() => import('../pages/integration/IntegrationMesErpPage'));
const IntegrationWmsScmPage = lazy(() => import('../pages/integration/IntegrationWmsScmPage'));
const IntegrationEventsPage = lazy(() => import('../pages/integration/IntegrationEventsPage'));
const IntegrationExternalErpOverviewPage = lazy(
  () => import('../pages/integration/IntegrationExternalErpOverviewPage')
);
const MobileWorkstationPage = lazy(() => import('../pages/mes/MobileWorkstationPage'));
const PerformanceMonitorPage = lazy(() => import('../pages/system/PerformanceMonitorPage'));
const ExternalErpMappingPage = lazy(() => import('../pages/integration/ExternalErpMappingPage'));
const ExternalErpConnectionsPage = lazy(
  () => import('../pages/integration/ExternalErpConnectionsPage')
);
const ConversionRulesPage = lazy(() => import('../pages/integration/ConversionRulesPage'));

const LimsSampleDetailPage = lazy(() => import('../pages/lims/LimsSampleDetailPage'));
const LimsTaskDetailPage = lazy(() => import('../pages/lims/LimsTaskDetailPage'));
const LimsInstrumentMaintenancePage = lazy(
  () => import('../pages/lims/LimsInstrumentMaintenancePage')
);

const QmsStandardDetailPage = lazy(() => import('../pages/qms/QmsStandardDetailPage'));
const QmsAuditManagementPage = lazy(() => import('../pages/qms/QmsAuditManagementPage'));

const EhsHazardDetailPage = lazy(() => import('../pages/ehs/EhsHazardDetailPage'));
const EhsIncidentReportPage = lazy(() => import('../pages/ehs/EhsIncidentReportPage'));

export const professionalRoutes: RouteConfig[] = [
  {
    path: '/lims',
    element: React.createElement(Navigate, {
      to: '/lims/samples',
      replace: true,
    }),
    requiredPermissions: [],
    module: 'lims',
    action: 'read',
  },
  {
    path: '/lims/samples',
    element: LimsSamplePage,
    requiredPermissions: [],
    module: 'lims',
    action: 'read',
  },
  {
    path: '/lims/processes',
    element: LimsProcessPage,
    requiredPermissions: [],
    module: 'lims',
    action: 'read',
  },
  {
    path: '/lims/tasks',
    element: LimsTaskPage,
    requiredPermissions: [],
    module: 'lims',
    action: 'read',
  },
  {
    path: '/lims/instruments',
    element: LimsInstrumentPage,
    requiredPermissions: [],
    module: 'lims',
    action: 'read',
  },
  {
    path: '/lims/sample/:id',
    element: LimsSampleDetailPage,
    requiredPermissions: [],
    module: 'lims',
    action: 'read',
  },
  {
    path: '/lims/task/:id',
    element: LimsTaskDetailPage,
    requiredPermissions: [],
    module: 'lims',
    action: 'read',
  },
  {
    path: '/lims/instrument/:id',
    element: LimsInstrumentMaintenancePage,
    requiredPermissions: [],
    module: 'lims',
    action: 'read',
  },
  {
    path: '/qms',
    element: React.createElement(Navigate, {
      to: '/qms/standards',
      replace: true,
    }),
    requiredPermissions: ['qms:read'],
    module: 'qms',
    action: 'read',
  },
  {
    path: '/qms/standards',
    element: QmsStandardPage,
    requiredPermissions: ['qms:read'],
    module: 'qms',
    action: 'read',
  },
  {
    path: '/qms/checks',
    element: QmsCheckPage,
    requiredPermissions: ['qms:read'],
    module: 'qms',
    action: 'read',
  },
  {
    path: '/qms/issues',
    element: QmsIssuePage,
    requiredPermissions: ['qms:read'],
    module: 'qms',
    action: 'read',
  },
  {
    path: '/qms/improvements',
    element: QmsAuditPage,
    requiredPermissions: ['qms:read'],
    module: 'qms',
    action: 'read',
  },
  {
    path: '/qms/standard/:id',
    element: QmsStandardDetailPage,
    requiredPermissions: ['qms:read'],
    module: 'qms',
    action: 'read',
  },
  {
    path: '/qms/audit',
    element: QmsAuditManagementPage,
    requiredPermissions: ['qms:read'],
    module: 'qms',
    action: 'read',
  },
  {
    path: '/ehs',
    element: React.createElement(Navigate, {
      to: '/ehs/hazards',
      replace: true,
    }),
    requiredPermissions: ['ehs:read'],
    module: 'ehs',
    action: 'read',
  },
  {
    path: '/ehs/hazards',
    element: EhsHazardPage,
    requiredPermissions: ['ehs:read'],
    module: 'ehs',
    action: 'read',
  },
  {
    path: '/ehs/checks',
    element: EhsCheckPage,
    requiredPermissions: ['ehs:read'],
    module: 'ehs',
    action: 'read',
  },
  {
    path: '/ehs/plans',
    element: EhsPlanPage,
    requiredPermissions: ['ehs:read'],
    module: 'ehs',
    action: 'read',
  },
  {
    path: '/ehs/drills',
    element: EhsDrillPage,
    requiredPermissions: ['ehs:read'],
    module: 'ehs',
    action: 'read',
  },
  {
    path: '/ehs/hazard/:id',
    element: EhsHazardDetailPage,
    requiredPermissions: ['ehs:read'],
    module: 'ehs',
    action: 'read',
  },
  {
    path: '/ehs/incident',
    element: EhsIncidentReportPage,
    requiredPermissions: ['ehs:read'],
    module: 'ehs',
    action: 'read',
  },
  {
    path: '/srm',
    element: React.createElement(Navigate, {
      to: '/srm/dashboard',
      replace: true,
    }),
    requiredPermissions: ['srm:read'],
    module: 'srm',
    action: 'read',
  },
  {
    path: '/srm/dashboard',
    element: SrmDashboardPage,
    requiredPermissions: ['srm:read'],
    module: 'srm',
    action: 'read',
  },
  {
    path: '/srm/suppliers',
    element: SrmSupplierPage,
    requiredPermissions: ['srm:read'],
    module: 'srm',
    action: 'read',
  },
  {
    path: '/srm/suppliers/:id',
    element: SupplierDetailPage,
    requiredPermissions: ['srm:read'],
    module: 'srm',
    action: 'read',
  },
  {
    path: '/srm/evaluations',
    element: SrmEvaluationPage,
    requiredPermissions: ['srm:read'],
    module: 'srm',
    action: 'read',
  },
  {
    path: '/srm/orders',
    element: SrmOrderPage,
    requiredPermissions: ['srm:read'],
    module: 'srm',
    action: 'read',
  },
  {
    path: '/srm/contracts',
    element: SrmContractPage,
    requiredPermissions: ['srm:read'],
    module: 'srm',
    action: 'read',
  },
  {
    path: '/srm/finance',
    element: SrmFinancePage,
    requiredPermissions: ['srm:read'],
    module: 'srm',
    action: 'read',
  },
  {
    path: '/pdm',
    element: React.createElement(Navigate, {
      to: '/pdm/processes',
      replace: true,
    }),
    requiredPermissions: ['pdm:read'],
    module: 'pdm',
    action: 'read',
  },
  {
    path: '/pdm/processes',
    element: PdmProcessPage,
    requiredPermissions: ['pdm:read'],
    module: 'pdm',
    action: 'read',
  },
  {
    path: '/pdm/steps',
    element: PdmStepPage,
    requiredPermissions: ['pdm:read'],
    module: 'pdm',
    action: 'read',
  },
  {
    path: '/pdm/formulas',
    element: PdmFormulaPage,
    requiredPermissions: ['pdm:read'],
    module: 'pdm',
    action: 'read',
  },
  {
    path: '/pdm/batches',
    element: PdmBatchPage,
    requiredPermissions: ['pdm:read'],
    module: 'pdm',
    action: 'read',
  },
  {
    path: '/pdm/stats',
    element: PdmStatsPage,
    requiredPermissions: ['pdm:read'],
    module: 'pdm',
    action: 'read',
  },
  {
    path: '/gis',
    element: Gispage,
    requiredPermissions: ['gis:read'],
    module: 'gis',
    action: 'read',
  },
  {
    path: '/im',
    element: Impage,
    requiredPermissions: ['im:read'],
    module: 'im',
    action: 'read',
  },
  {
    path: '/mail',
    element: MailPage,
    requiredPermissions: ['mail:read'],
    module: 'mail',
    action: 'read',
  },
  {
    path: '/integration/external-erp',
    element: ExternalErpConnectionsPage,
    requiredPermissions: [],
    module: 'integration',
    action: 'read',
  },
  {
    path: '/integration/external-erp/:connectionId/mappings',
    element: ExternalErpMappingPage,
    requiredPermissions: [],
    module: 'integration',
    action: 'read',
  },
  {
    path: '/integration',
    element: React.createElement(Navigate, {
      to: '/integration/dashboard',
      replace: true,
    }),
    requiredPermissions: [],
    module: 'integration',
    action: 'read',
  },
  {
    path: '/integration/dashboard',
    element: IntegrationDashboardPage,
    requiredPermissions: [],
    module: 'integration',
    action: 'read',
  },
  {
    path: '/integration/lims-qms',
    element: IntegrationLimsQmsPage,
    requiredPermissions: [],
    module: 'integration',
    action: 'read',
  },
  {
    path: '/integration/mes-erp',
    element: IntegrationMesErpPage,
    requiredPermissions: [],
    module: 'integration',
    action: 'read',
  },
  {
    path: '/integration/wms-scm',
    element: IntegrationWmsScmPage,
    requiredPermissions: [],
    module: 'integration',
    action: 'read',
  },
  {
    path: '/integration/events',
    element: IntegrationEventsPage,
    requiredPermissions: [],
    module: 'integration',
    action: 'read',
  },
  {
    path: '/integration/rules',
    element: ConversionRulesPage,
    requiredPermissions: [],
    module: 'integration',
    action: 'read',
  },
  {
    path: '/integration/external-erp-overview',
    element: IntegrationExternalErpOverviewPage,
    requiredPermissions: [],
    module: 'integration',
    action: 'read',
  },
  {
    path: '/mobile-workstation',
    element: MobileWorkstationPage,
    requiredPermissions: [],
    module: 'mobile',
    action: 'read',
  },
  {
    path: '/performance',
    element: PerformanceMonitorPage,
    requiredPermissions: [],
    module: 'performance',
    action: 'read',
  },
];
