import React from 'react';
import { Navigate } from 'react-router-dom';
import type { RouteConfig } from './utils';
import { lazyWithRetry } from './utils';

const lazy = lazyWithRetry;

const LimsSamplePage = lazy(() => import('../pages/lims/LimsSamplePage'));
const LimsProcessPage = lazy(() => import('../pages/lims/LimsProcessPage'));
const LimsTaskPage = lazy(() => import('../pages/lims/LimsTaskPage'));
const LimsInstrumentPage = lazy(() => import('../pages/lims/LimsInstrumentPage'));
const LimsReagentPage = lazy(() => import('../pages/lims/ReagentPage'));
const LimsBarcodePage = lazy(() => import('../pages/lims/BarcodePage'));
const LimsInstrumentManagePage = lazy(() => import('../pages/lims/InstrumentPage'));
const QmsStandardPage = lazy(() => import('../pages/qms/QmsStandardListPage'));
const QmsCheckPage = lazy(() => import('../pages/qms/QmsInspectionPage'));
const QmsIssuePage = lazy(() => import('../pages/qms/QmsNonconformancePage'));
const QmsAuditPage = lazy(() => import('../pages/qms/QmsAuditManagementPage'));
const EhsHazardPage = lazy(() => import('../pages/ehs/EhsHazardPage'));
const EhsCheckPage = lazy(() => import('../pages/ehs/EhsCheckPage'));
const EhsDrillPage = lazy(() => import('../pages/ehs/EhsDrillPage'));
const EhsPlanPage = lazy(() => import('../pages/ehs/EhsPlanPage'));
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
const PerformanceMonitorPage = lazy(() => import('../pages/admin/PerformanceMonitorPage'));
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
const LimsInstrumentDataPage = lazy(() => import('../pages/lims/LimsInstrumentDataPage'));
const SampleReceivePage = lazy(() => import('../pages/lims/SampleReceivePage'));
const InspectionTaskPage = lazy(() => import('../pages/lims/InspectionTaskPage'));

const QmsStandardDetailPage = lazy(() => import('../pages/qms/QmsStandardDetailPage'));
const QmsAuditManagementPage = lazy(() => import('../pages/qms/QmsAuditManagementPage'));
const QmsApqpPage = lazy(() => import('../pages/qms/QmsApqpPage'));
const QmsQualityCostPage = lazy(() => import('../pages/qms/QmsQualityCostPage'));
const QmsSpcPage = lazy(() => import('../pages/qms/QmsSpcPage'));
const QmsEightDPage = lazy(() => import('../pages/qms/QmsEightDPage'));
const QmsFmeaPage = lazy(() => import('../pages/qms/QmsFmeaPage'));

const EhsHazardDetailPage = lazy(() => import('../pages/ehs/EhsHazardDetailPage'));
const EhsIncidentReportPage = lazy(() => import('../pages/ehs/EhsIncidentReportPage'));
const EnvironmentPage = lazy(() => import('../pages/ehs/EnvironmentPage'));
const HealthManagementPage = lazy(() => import('../pages/ehs/HealthManagementPage'));
const EmergencyPage = lazy(() => import('../pages/ehs/EmergencyPage'));
const TrainingPage = lazy(() => import('../pages/ehs/TrainingPage'));
const CompliancePage = lazy(() => import('../pages/ehs/CompliancePage'));
const HazardPage = lazy(() => import('../pages/ehs/HazardPage'));

export const professionalRoutes: RouteConfig[] = [
  {
    path: '/lims',
    element: React.createElement(Navigate, {
      to: '/lims/samples',
      replace: true,
    }),
    requiredPermissions: ['lims:read'],
    module: 'lims',
    action: 'read',
  },
  {
    path: '/lims/samples',
    element: LimsSamplePage,
    requiredPermissions: ['lims:read'],
    module: 'lims',
    action: 'read',
  },
  {
    path: '/lims/processes',
    element: LimsProcessPage,
    requiredPermissions: ['lims:read'],
    module: 'lims',
    action: 'read',
  },
  {
    path: '/lims/tasks',
    element: LimsTaskPage,
    requiredPermissions: ['lims:read'],
    module: 'lims',
    action: 'read',
  },
  {
    path: '/lims/instruments',
    element: LimsInstrumentPage,
    requiredPermissions: ['lims:read'],
    module: 'lims',
    action: 'read',
  },
  {
    path: '/lims/instruments-manage',
    element: LimsInstrumentManagePage,
    requiredPermissions: ['lims:read'],
    module: 'lims',
    action: 'read',
  },
  {
    path: '/lims/reagents',
    element: LimsReagentPage,
    requiredPermissions: ['lims:read'],
    module: 'lims',
    action: 'read',
  },
  {
    path: '/lims/barcodes',
    element: LimsBarcodePage,
    requiredPermissions: ['lims:read'],
    module: 'lims',
    action: 'read',
  },
  {
    path: '/lims/sample-receive',
    element: SampleReceivePage,
    requiredPermissions: ['lims:read'],
    module: 'lims',
    action: 'read',
  },
  {
    path: '/lims/inspection-tasks',
    element: InspectionTaskPage,
    requiredPermissions: ['lims:read'],
    module: 'lims',
    action: 'read',
  },
  {
    path: '/lims/sample/:id',
    element: LimsSampleDetailPage,
    requiredPermissions: ['lims:read'],
    module: 'lims',
    action: 'read',
  },
  {
    path: '/lims/task/:id',
    element: LimsTaskDetailPage,
    requiredPermissions: ['lims:read'],
    module: 'lims',
    action: 'read',
  },
  {
    path: '/lims/instrument/:id',
    element: LimsInstrumentMaintenancePage,
    requiredPermissions: ['lims:read'],
    module: 'lims',
    action: 'read',
  },
  {
    path: '/lims/instrument-data',
    element: LimsInstrumentDataPage,
    requiredPermissions: ['lims:read'],
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
    path: '/qms/apqp',
    element: QmsApqpPage,
    requiredPermissions: ['qms:read'],
    module: 'qms',
    action: 'read',
  },
  {
    path: '/qms/quality-cost',
    element: QmsQualityCostPage,
    requiredPermissions: ['qms:read'],
    module: 'qms',
    action: 'read',
  },
  {
    path: '/qms/spc',
    element: QmsSpcPage,
    requiredPermissions: ['qms:read'],
    module: 'qms',
    action: 'read',
  },
  {
    path: '/qms/eight-d',
    element: QmsEightDPage,
    requiredPermissions: ['qms:read'],
    module: 'qms',
    action: 'read',
  },
  {
    path: '/qms/fmea',
    element: QmsFmeaPage,
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
    path: '/ehs/drills',
    element: EhsDrillPage,
    requiredPermissions: ['ehs:read'],
    module: 'ehs',
    action: 'read',
  },
  {
    path: '/ehs/plan',
    element: EhsPlanPage,
    requiredPermissions: ['ehs:read'],
    module: 'ehs',
    action: 'read',
  },
  {
    path: '/ehs/environment',
    element: EnvironmentPage,
    requiredPermissions: ['ehs:read'],
    module: 'ehs',
    action: 'read',
  },
  {
    path: '/ehs/health',
    element: HealthManagementPage,
    requiredPermissions: ['ehs:read'],
    module: 'ehs',
    action: 'read',
  },
  {
    path: '/ehs/emergency',
    element: EmergencyPage,
    requiredPermissions: ['ehs:read'],
    module: 'ehs',
    action: 'read',
  },
  {
    path: '/ehs/training',
    element: TrainingPage,
    requiredPermissions: ['ehs:read'],
    module: 'ehs',
    action: 'read',
  },
  {
    path: '/ehs/compliance',
    element: CompliancePage,
    requiredPermissions: ['ehs:read'],
    module: 'ehs',
    action: 'read',
  },
  {
    path: '/ehs/hazard-management',
    element: HazardPage,
    requiredPermissions: ['ehs:read'],
    module: 'ehs',
    action: 'read',
  },
  {
    path: '/integration/external-erp',
    element: ExternalErpConnectionsPage,
    requiredPermissions: ['integration:read'],
    module: 'integration',
    action: 'read',
  },
  {
    path: '/integration/external-erp/:connectionId/mappings',
    element: ExternalErpMappingPage,
    requiredPermissions: ['integration:read'],
    module: 'integration',
    action: 'read',
  },
  {
    path: '/integration',
    element: React.createElement(Navigate, {
      to: '/integration/dashboard',
      replace: true,
    }),
    requiredPermissions: ['integration:read'],
    module: 'integration',
    action: 'read',
  },
  {
    path: '/integration/dashboard',
    element: IntegrationDashboardPage,
    requiredPermissions: ['integration:read'],
    module: 'integration',
    action: 'read',
  },
  {
    path: '/integration/lims-qms',
    element: IntegrationLimsQmsPage,
    requiredPermissions: ['integration:read'],
    module: 'integration',
    action: 'read',
  },
  {
    path: '/integration/mes-erp',
    element: IntegrationMesErpPage,
    requiredPermissions: ['integration:read'],
    module: 'integration',
    action: 'read',
  },
  {
    path: '/integration/wms-scm',
    element: IntegrationWmsScmPage,
    requiredPermissions: ['integration:read'],
    module: 'integration',
    action: 'read',
  },
  {
    path: '/integration/events',
    element: IntegrationEventsPage,
    requiredPermissions: ['integration:read'],
    module: 'integration',
    action: 'read',
  },
  {
    path: '/integration/rules',
    element: ConversionRulesPage,
    requiredPermissions: ['integration:read'],
    module: 'integration',
    action: 'read',
  },
  {
    path: '/integration/external-erp-overview',
    element: IntegrationExternalErpOverviewPage,
    requiredPermissions: ['integration:read'],
    module: 'integration',
    action: 'read',
  },
  {
    path: '/mobile-workstation',
    element: MobileWorkstationPage,
    requiredPermissions: ['mobile:read'],
    module: 'mobile',
    action: 'read',
  },
  {
    path: '/performance',
    element: PerformanceMonitorPage,
    requiredPermissions: ['iam:admin'],
    module: 'iam',
    action: 'admin',
  },
];
