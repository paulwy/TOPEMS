import { Navigate, useParams } from 'react-router-dom';

const RedirectDocumentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/doc/documents/${id}`} replace />;
};

export const legacyRedirects = [
  {
    path: '/budget',
    element: (
      <Navigate
        to='/finance/budget-management'
        replace
      />
    ),
  },
  {
    path: '/assets',
    element: (
      <Navigate
        to='/finance/assets'
        replace
      />
    ),
  },
  {
    path: '/equipment',
    element: (
      <Navigate
        to='/mes/equipment'
        replace
      />
    ),
  },
  {
    path: '/system/users',
    element: (
      <Navigate
        to='/iam/users'
        replace
      />
    ),
  },
  {
    path: '/system/roles',
    element: (
      <Navigate
        to='/iam/roles'
        replace
      />
    ),
  },
  {
    path: '/system/permissions',
    element: (
      <Navigate
        to='/iam/permissions'
        replace
      />
    ),
  },
  {
    path: '/system/dictionaries',
    element: (
      <Navigate
        to='/iam/dictionaries'
        replace
      />
    ),
  },
  {
    path: '/system/audit-logs',
    element: (
      <Navigate
        to='/iam/audit-logs'
        replace
      />
    ),
  },
  {
    path: '/system/settings',
    element: (
      <Navigate
        to='/iam/settings'
        replace
      />
    ),
  },
  {
    path: '/meeting-room',
    element: (
      <Navigate
        to='/meeting-rooms'
        replace
      />
    ),
  },
  {
    path: '/finance/financial-reports',
    element: (
      <Navigate
        to='/finance/reports'
        replace
      />
    ),
  },
  {
    path: '/pm/tasks',
    element: (
      <Navigate
        to='/pm/task-management'
        replace
      />
    ),
  },
  {
    path: '/pm/gantt',
    element: (
      <Navigate
        to='/pm/gantt-chart'
        replace
      />
    ),
  },
  {
    path: '/pm/risk',
    element: (
      <Navigate
        to='/pm/risk-management'
        replace
      />
    ),
  },
  {
    path: '/pm/timeline',
    element: (
      <Navigate
        to='/pm/milestones'
        replace
      />
    ),
  },
  {
    path: '/finance/receivable',
    element: (
      <Navigate
        to='/finance/receivable-payable'
        replace
      />
    ),
  },
  {
    path: '/finance/payable',
    element: (
      <Navigate
        to='/finance/receivable-payable'
        replace
      />
    ),
  },
  {
    path: '/ai/chat',
    element: (
      <Navigate
        to='/ai/conversation'
        replace
      />
    ),
  },
  {
    path: '/ai/assistant',
    element: (
      <Navigate
        to='/ai/conversation'
        replace
      />
    ),
  },
  {
    path: '/gis/fence',
    element: (
      <Navigate
        to='/gis/geofence'
        replace
      />
    ),
  },
  {
    path: '/gis/tracking',
    element: (
      <Navigate
        to='/gis/location-tracking'
        replace
      />
    ),
  },
  {
    path: '/docs',
    element: (
      <Navigate
        to='/doc/dashboard'
        replace
      />
    ),
  },
  {
    path: '/docs/dashboard',
    element: (
      <Navigate
        to='/doc/dashboard'
        replace
      />
    ),
  },
  {
    path: '/docs/knowledge-base',
    element: (
      <Navigate
        to='/doc/knowledge-base'
        replace
      />
    ),
  },
  {
    path: '/docs/document-center',
    element: (
      <Navigate
        to='/doc/document-center'
        replace
      />
    ),
  },
  {
    path: '/docs/documents',
    element: (
      <Navigate
        to='/doc/documents'
        replace
      />
    ),
  },
  {
    path: '/docs/file/:id',
    element: <RedirectDocumentDetail />,
  },
  {
    path: '/document',
    element: (
      <Navigate
        to='/doc/dashboard'
        replace
      />
    ),
  },
  {
    path: '/document/dashboard',
    element: (
      <Navigate
        to='/doc/dashboard'
        replace
      />
    ),
  },
  {
    path: '/document/list',
    element: (
      <Navigate
        to='/doc/list'
        replace
      />
    ),
  },
  {
    path: '/document/knowledge-base',
    element: (
      <Navigate
        to='/doc/knowledge-base'
        replace
      />
    ),
  },

  // ===== IAM/Admin 模块职责分离 =====
  // IAM 路径指向新的独立 IAM 模块
  {
    path: '/iam',
    element: (
      <Navigate
        to='/iam/dashboard'
        replace
      />
    ),
  },
  {
    path: '/iam/dashboard',
    element: (
      <Navigate
        to='/iam/dashboard'
        replace
      />
    ),
  },
  {
    path: '/iam/users',
    element: (
      <Navigate
        to='/iam/user'
        replace
      />
    ),
  },
  {
    path: '/iam/roles',
    element: (
      <Navigate
        to='/iam/role'
        replace
      />
    ),
  },
  {
    path: '/iam/permissions',
    element: (
      <Navigate
        to='/iam/permission'
        replace
      />
    ),
  },
  {
    path: '/iam/accounts',
    element: (
      <Navigate
        to='/admin/account'
        replace
      />
    ),
  },
  {
    path: '/iam/bank-accounts',
    element: (
      <Navigate
        to='/admin/bank-account'
        replace
      />
    ),
  },
  {
    path: '/iam/company-structure',
    element: (
      <Navigate
        to='/iam/company-structure'
        replace
      />
    ),
  },
  // IAM 模块中不包含的功能（系统管理）重定向到 Admin
  {
    path: '/iam/dictionaries',
    element: (
      <Navigate
        to='/admin/dictionary'
        replace
      />
    ),
  },
  {
    path: '/iam/audit-logs',
    element: (
      <Navigate
        to='/admin/audit-log'
        replace
      />
    ),
  },
  {
    path: '/iam/system',
    element: (
      <Navigate
        to='/admin/system'
        replace
      />
    ),
  },
  {
    path: '/iam/system-settings',
    element: (
      <Navigate
        to='/admin/system-settings'
        replace
      />
    ),
  },
  {
    path: '/iam/plugins',
    element: (
      <Navigate
        to='/admin/plugin'
        replace
      />
    ),
  },
  {
    path: '/iam/database',
    element: (
      <Navigate
        to='/admin/database'
        replace
      />
    ),
  },
  {
    path: '/iam/migration',
    element: (
      <Navigate
        to='/admin/migration'
        replace
      />
    ),
  },
  {
    path: '/iam/debug',
    element: (
      <Navigate
        to='/admin/config-debug'
        replace
      />
    ),
  },
  {
    path: '/iam/audit',
    element: (
      <Navigate
        to='/admin/audit-log'
        replace
      />
    ),
  },
  // system 路径重定向到对应的模块
  {
    path: '/system/users',
    element: (
      <Navigate
        to='/iam/user'
        replace
      />
    ),
  },
  {
    path: '/system/roles',
    element: (
      <Navigate
        to='/iam/role'
        replace
      />
    ),
  },
  {
    path: '/system/permissions',
    element: (
      <Navigate
        to='/iam/permission'
        replace
      />
    ),
  },
  {
    path: '/system/dictionaries',
    element: (
      <Navigate
        to='/admin/dictionary'
        replace
      />
    ),
  },
  {
    path: '/system/audit-logs',
    element: (
      <Navigate
        to='/admin/audit-log'
        replace
      />
    ),
  },
  {
    path: '/system/settings',
    element: (
      <Navigate
        to='/admin/system-settings'
        replace
      />
    ),
  },

  // ===== 核心平台模块迁移 - 阶段1 =====

  // workflow 模块 (旧前缀 /flow → 新前缀 /workflow)
  {
    path: '/flow',
    element: (
      <Navigate
        to='/workflow/dashboard'
        replace
      />
    ),
  },
  {
    path: '/flow/definitions',
    element: (
      <Navigate
        to='/workflow/definitions'
        replace
      />
    ),
  },
  {
    path: '/flow/designer',
    element: (
      <Navigate
        to='/workflow/designer'
        replace
      />
    ),
  },
  {
    path: '/flow/flow-designer',
    element: (
      <Navigate
        to='/workflow/designer'
        replace
      />
    ),
  },
  {
    path: '/flow/definition',
    element: (
      <Navigate
        to='/workflow/definitions'
        replace
      />
    ),
  },
  {
    path: '/flow/instances',
    element: (
      <Navigate
        to='/workflow/instances'
        replace
      />
    ),
  },
  {
    path: '/flow/instance/:id',
    element: (
      <Navigate
        to='/workflow/instances/:id'
        replace
      />
    ),
  },
  {
    path: '/flow/approvals',
    element: (
      <Navigate
        to='/workflow/approvals'
        replace
      />
    ),
  },
  {
    path: '/flow/approval/:id',
    element: (
      <Navigate
        to='/workflow/approvals/:id'
        replace
      />
    ),
  },
  {
    path: '/flow/notifications',
    element: (
      <Navigate
        to='/workflow/notification-center'
        replace
      />
    ),
  },
  {
    path: '/flow/statistics',
    element: (
      <Navigate
        to='/workflow/statistics'
        replace
      />
    ),
  },
  {
    path: '/flow/history',
    element: (
      <Navigate
        to='/workflow/version-history'
        replace
      />
    ),
  },
  {
    path: '/flow/monitor',
    element: (
      <Navigate
        to='/workflow/monitor'
        replace
      />
    ),
  },
  {
    path: '/flow/settings',
    element: (
      <Navigate
        to='/workflow/settings'
        replace
      />
    ),
  },
  {
    path: '/flow/templates',
    element: (
      <Navigate
        to='/workflow/templates'
        replace
      />
    ),
  },

  // notification 模块 (旧前缀 /notifications → 新前缀 /notification)
  {
    path: '/notifications',
    element: (
      <Navigate
        to='/notification/dashboard'
        replace
      />
    ),
  },
  {
    path: '/notifications/templates',
    element: (
      <Navigate
        to='/notification/templates'
        replace
      />
    ),
  },
  {
    path: '/notifications/archive',
    element: (
      <Navigate
        to='/notification/archive'
        replace
      />
    ),
  },
  {
    path: '/notifications/stats',
    element: (
      <Navigate
        to='/notification/statistics'
        replace
      />
    ),
  },
  {
    path: '/notifications/:id',
    element: (
      <Navigate
        to='/notification/:id'
        replace
      />
    ),
  },

  // doc 模块 (旧路径 → 新路径)
  {
    path: '/documents',
    element: (
      <Navigate
        to='/doc/documents'
        replace
      />
    ),
  },
  {
    path: '/documents/:id',
    element: <RedirectDocumentDetail />,
  },
  {
    path: '/document-center',
    element: (
      <Navigate
        to='/doc/document-center'
        replace
      />
    ),
  },
  {
    path: '/knowledge-base',
    element: (
      <Navigate
        to='/doc/knowledge-base'
        replace
      />
    ),
  },
  {
    path: '/templates',
    element: (
      <Navigate
        to='/doc/dashboard'
        replace
      />
    ),
  },
  {
    path: '/help',
    element: (
      <Navigate
        to='/doc/dashboard'
        replace
      />
    ),
  },

  // ===== 业务模块迁移 - 阶段2 =====

  // hrm 模块
  {
    path: '/hrm/companies',
    element: (
      <Navigate
        to='/hrm/company'
        replace
      />
    ),
  },
  {
    path: '/hrm/employee/create',
    element: (
      <Navigate
        to='/hrm/employees/create'
        replace
      />
    ),
  },
  {
    path: '/hrm/employee/:id/edit',
    element: (
      <Navigate
        to='/hrm/employees/:id/edit'
        replace
      />
    ),
  },
  {
    path: '/hrm/employee/:id',
    element: (
      <Navigate
        to='/hrm/employees/:id'
        replace
      />
    ),
  },
  {
    path: '/hrm/contract/:id',
    element: (
      <Navigate
        to='/hrm/contracts/:id'
        replace
      />
    ),
  },
  {
    path: '/hrm/salary-adjustments',
    element: (
      <Navigate
        to='/hrm/salary-adjustment'
        replace
      />
    ),
  },

  // crm 模块
  {
    path: '/crm/scoring',
    element: (
      <Navigate
        to='/crm/customer-scoring'
        replace
      />
    ),
  },
  {
    path: '/crm/forecast',
    element: (
      <Navigate
        to='/crm/sales-forecast'
        replace
      />
    ),
  },
  {
    path: '/crm/funnel',
    element: (
      <Navigate
        to='/crm/sales-funnel'
        replace
      />
    ),
  },
  {
    path: '/crm/segments',
    element: (
      <Navigate
        to='/crm/customer-segmentation'
        replace
      />
    ),
  },
  {
    path: '/crm/recommendations',
    element: (
      <Navigate
        to='/crm/recommendation'
        replace
      />
    ),
  },

  // scm 模块
  {
    path: '/scm/purchase-requisitions',
    element: (
      <Navigate
        to='/scm/purchase-requisition'
        replace
      />
    ),
  },
  {
    path: '/scm/evaluations',
    element: (
      <Navigate
        to='/scm/supplier-evaluation'
        replace
      />
    ),
  },
  {
    path: '/scm/supplier-admissions',
    element: (
      <Navigate
        to='/scm/supplier-admission'
        replace
      />
    ),
  },
  {
    path: '/scm/purchase-contracts',
    element: (
      <Navigate
        to='/scm/contracts'
        replace
      />
    ),
  },
  {
    path: '/scm/delivery-appointments',
    element: (
      <Navigate
        to='/scm/delivery-appointment'
        replace
      />
    ),
  },

  // wms 模块
  {
    path: '/wms/warehouses',
    element: (
      <Navigate
        to='/wms/warehouse-management'
        replace
      />
    ),
  },
  {
    path: '/wms/inbound-orders',
    element: (
      <Navigate
        to='/wms/inbound-order'
        replace
      />
    ),
  },
  {
    path: '/wms/outbound-orders',
    element: (
      <Navigate
        to='/wms/outbound-order'
        replace
      />
    ),
  },
  {
    path: '/wms/stock-takes',
    element: (
      <Navigate
        to='/wms/stock-take'
        replace
      />
    ),
  },
  {
    path: '/wms/locations',
    element: (
      <Navigate
        to='/wms/location-management'
        replace
      />
    ),
  },
  {
    path: '/wms/transfers',
    element: (
      <Navigate
        to='/wms/transfer'
        replace
      />
    ),
  },
  {
    path: '/wms/batches',
    element: (
      <Navigate
        to='/wms/batch-management'
        replace
      />
    ),
  },
  {
    path: '/wms/serial-numbers',
    element: (
      <Navigate
        to='/wms/serial-number'
        replace
      />
    ),
  },
  {
    path: '/wms/reports',
    element: (
      <Navigate
        to='/wms/inventory-report'
        replace
      />
    ),
  },
  {
    path: '/wms/suppliers',
    element: (
      <Navigate
        to='/wms/supplier-management'
        replace
      />
    ),
  },

  // mes 模块
  {
    path: '/mes/board',
    element: (
      <Navigate
        to='/mes/production-kanban'
        replace
      />
    ),
  },
  {
    path: '/mes/orders/:id',
    element: (
      <Navigate
        to='/mes/production-orders/:id'
        replace
      />
    ),
  },
  {
    path: '/mes/orders',
    element: (
      <Navigate
        to='/mes/production-orders'
        replace
      />
    ),
  },
  {
    path: '/mes/processes',
    element: (
      <Navigate
        to='/mes/production-process'
        replace
      />
    ),
  },
  {
    path: '/mes/process-flows',
    element: (
      <Navigate
        to='/mes/process-flow'
        replace
      />
    ),
  },
  {
    path: '/mes/workstations',
    element: (
      <Navigate
        to='/mes/work-stations'
        replace
      />
    ),
  },
  {
    path: '/mes/records',
    element: (
      <Navigate
        to='/mes/production-record'
        replace
      />
    ),
  },
  {
    path: '/mes/quality',
    element: (
      <Navigate
        to='/mes/quality-inspection'
        replace
      />
    ),
  },
  {
    path: '/mes/quality-traceability',
    element: (
      <Navigate
        to='/mes/traceability'
        replace
      />
    ),
  },
  {
    path: '/mes/schedules',
    element: (
      <Navigate
        to='/mes/production-schedule'
        replace
      />
    ),
  },
  {
    path: '/mes/work-reports',
    element: (
      <Navigate
        to='/mes/work-report'
        replace
      />
    ),
  },
  {
    path: '/mes/material-requirements',
    element: (
      <Navigate
        to='/mes/material-requirement'
        replace
      />
    ),
  },
  {
    path: '/mes/boms',
    element: (
      <Navigate
        to='/mes/material-bom'
        replace
      />
    ),
  },
  {
    path: '/mes/material-issues',
    element: (
      <Navigate
        to='/mes/material-issue'
        replace
      />
    ),
  },
  {
    path: '/mes/material-returns',
    element: (
      <Navigate
        to='/mes/material-return'
        replace
      />
    ),
  },

  // ===== 剩余模块迁移 - 阶段3 =====

  // finance 模块
  {
    path: '/finance/voucher/create',
    element: (
      <Navigate
        to='/finance/vouchers/create'
        replace
      />
    ),
  },
  {
    path: '/finance/voucher/:id',
    element: (
      <Navigate
        to='/finance/vouchers/:id'
        replace
      />
    ),
  },
  {
    path: '/finance/receivable',
    element: (
      <Navigate
        to='/finance/receivable-payable'
        replace
      />
    ),
  },
  {
    path: '/finance/payable',
    element: (
      <Navigate
        to='/finance/receivable-payable'
        replace
      />
    ),
  },
  {
    path: '/finance/budget-management',
    element: (
      <Navigate
        to='/finance/budget'
        replace
      />
    ),
  },
  {
    path: '/finance/budget/:id',
    element: (
      <Navigate
        to='/finance/budget-detail'
        replace
      />
    ),
  },
  {
    path: '/finance/financial-reports',
    element: (
      <Navigate
        to='/finance/reports'
        replace
      />
    ),
  },
  {
    path: '/finance/voucher-templates',
    element: (
      <Navigate
        to='/finance/vouchers'
        replace
      />
    ),
  },

  // erp 模块
  {
    path: '/assets',
    element: (
      <Navigate
        to='/finance/assets'
        replace
      />
    ),
  },
  {
    path: '/equipment',
    element: (
      <Navigate
        to='/mes/equipment'
        replace
      />
    ),
  },
  {
    path: '/administration',
    element: (
      <Navigate
        to='/admin/tenant'
        replace
      />
    ),
  },
  {
    path: '/expense-claims',
    element: (
      <Navigate
        to='/finance/expense'
        replace
      />
    ),
  },
  {
    path: '/budget',
    element: (
      <Navigate
        to='/finance/budget'
        replace
      />
    ),
  },
  {
    path: '/office-supplies',
    element: (
      <Navigate
        to='/erp/dashboard'
        replace
      />
    ),
  },
  {
    path: '/meeting-rooms',
    element: (
      <Navigate
        to='/oa/meeting-rooms'
        replace
      />
    ),
  },
  {
    path: '/vehicles',
    element: (
      <Navigate
        to='/erp/dashboard'
        replace
      />
    ),
  },
  {
    path: '/announcements',
    element: (
      <Navigate
        to='/oa/announcements'
        replace
      />
    ),
  },
  {
    path: '/erp/financial-reports',
    element: (
      <Navigate
        to='/erp/financial-report'
        replace
      />
    ),
  },
  {
    path: '/erp/vouchers',
    element: (
      <Navigate
        to='/erp/voucher-management'
        replace
      />
    ),
  },
  {
    path: '/erp/audit-logs',
    element: (
      <Navigate
        to='/erp/audit-log'
        replace
      />
    ),
  },
  {
    path: '/erp/dict',
    element: (
      <Navigate
        to='/erp/dict-management'
        replace
      />
    ),
  },
  {
    path: '/erp/database',
    element: (
      <Navigate
        to='/erp/database-management'
        replace
      />
    ),
  },
  {
    path: '/erp/purchase-orders',
    element: (
      <Navigate
        to='/erp/purchase-order'
        replace
      />
    ),
  },
  {
    path: '/erp/sales-orders',
    element: (
      <Navigate
        to='/erp/sales-order'
        replace
      />
    ),
  },
  {
    path: '/erp/inventory',
    element: (
      <Navigate
        to='/erp/inventory-management'
        replace
      />
    ),
  },
  {
    path: '/erp/materials',
    element: (
      <Navigate
        to='/erp/material-management'
        replace
      />
    ),
  },
  {
    path: '/erp/suppliers',
    element: (
      <Navigate
        to='/erp/supplier-management'
        replace
      />
    ),
  },
  {
    path: '/erp/customers',
    element: (
      <Navigate
        to='/erp/customer-management'
        replace
      />
    ),
  },

  // bi 模块
  {
    path: '/bi/analysis',
    element: (
      <Navigate
        to='/bi/data-analysis'
        replace
      />
    ),
  },
  {
    path: '/bi/reports',
    element: (
      <Navigate
        to='/bi/report'
        replace
      />
    ),
  },
  {
    path: '/bi/datasets',
    element: (
      <Navigate
        to='/bi/dataset'
        replace
      />
    ),
  },
  {
    path: '/bi/datasources',
    element: (
      <Navigate
        to='/bi/data-source'
        replace
      />
    ),
  },
  {
    path: '/bi/visualizations',
    element: (
      <Navigate
        to='/bi/visualization'
        replace
      />
    ),
  },
  {
    path: '/bi/permissions',
    element: (
      <Navigate
        to='/bi/permission'
        replace
      />
    ),
  },
  {
    path: '/bi/module/:moduleId',
    element: (
      <Navigate
        to='/bi/module-detail'
        replace
      />
    ),
  },

  // pm 模块
  {
    path: '/pm/projects/:id/edit',
    element: (
      <Navigate
        to='/pm/projects/:id'
        replace
      />
    ),
  },
  {
    path: '/pm/reports/:projectId',
    element: (
      <Navigate
        to='/pm/reports'
        replace
      />
    ),
  },

  // rs 模块 (大部分是单复数变化)
  {
    path: '/rs/projects/create',
    element: (
      <Navigate
        to='/rs/project/create'
        replace
      />
    ),
  },
  {
    path: '/rs/projects/:id/edit',
    element: (
      <Navigate
        to='/rs/project/:id'
        replace
      />
    ),
  },
  {
    path: '/rs/projects/:id',
    element: (
      <Navigate
        to='/rs/project/:id'
        replace
      />
    ),
  },
  {
    path: '/rs/projects',
    element: (
      <Navigate
        to='/rs/project'
        replace
      />
    ),
  },
  {
    path: '/rs/experiments/create',
    element: (
      <Navigate
        to='/rs/experiment/create'
        replace
      />
    ),
  },
  {
    path: '/rs/experiments/:id/edit',
    element: (
      <Navigate
        to='/rs/experiment/:id'
        replace
      />
    ),
  },
  {
    path: '/rs/experiments/:id',
    element: (
      <Navigate
        to='/rs/experiment/:id'
        replace
      />
    ),
  },
  {
    path: '/rs/experiments',
    element: (
      <Navigate
        to='/rs/experiment'
        replace
      />
    ),
  },
  {
    path: '/rs/formulas/create',
    element: (
      <Navigate
        to='/rs/formula/create'
        replace
      />
    ),
  },
  {
    path: '/rs/formulas/:id/edit',
    element: (
      <Navigate
        to='/rs/formula/:id'
        replace
      />
    ),
  },
  {
    path: '/rs/formulas/:id',
    element: (
      <Navigate
        to='/rs/formula/:id'
        replace
      />
    ),
  },
  {
    path: '/rs/formulas',
    element: (
      <Navigate
        to='/rs/formula'
        replace
      />
    ),
  },
  {
    path: '/rs/materials',
    element: (
      <Navigate
        to='/rs/material'
        replace
      />
    ),
  },
  {
    path: '/rs/reports',
    element: (
      <Navigate
        to='/rs/report'
        replace
      />
    ),
  },
  {
    path: '/rs/bugs',
    element: (
      <Navigate
        to='/rs/bug'
        replace
      />
    ),
  },
  {
    path: '/rs/builds',
    element: (
      <Navigate
        to='/rs/build'
        replace
      />
    ),
  },
  {
    path: '/rs/tests',
    element: (
      <Navigate
        to='/rs/test'
        replace
      />
    ),
  },
  {
    path: '/rs/reviews',
    element: (
      <Navigate
        to='/rs/review'
        replace
      />
    ),
  },
  {
    path: '/rs/releases',
    element: (
      <Navigate
        to='/rs/release'
        replace
      />
    ),
  },
  {
    path: '/rs/milestones',
    element: (
      <Navigate
        to='/rs/milestone'
        replace
      />
    ),
  },
  {
    path: '/rs/docs',
    element: (
      <Navigate
        to='/rs/doc'
        replace
      />
    ),
  },

  // im 模块
  {
    path: '/mail',
    element: (
      <Navigate
        to='/im/mail'
        replace
      />
    ),
  },

  // gis 模块
  {
    path: '/gis/fence',
    element: (
      <Navigate
        to='/gis/geofence'
        replace
      />
    ),
  },
  {
    path: '/gis/tracking',
    element: (
      <Navigate
        to='/gis/location-tracking'
        replace
      />
    ),
  },

  // plugin 模块
  {
    path: '/admin/plugins',
    element: (
      <Navigate
        to='/plugin/marketplace'
        replace
      />
    ),
  },
  {
    path: '/plugin/:pluginCode',
    element: (
      <Navigate
        to='/plugin/:id'
        replace
      />
    ),
  },

  // report 模块
  {
    path: '/report/schedules',
    element: (
      <Navigate
        to='/report/schedule'
        replace
      />
    ),
  },
  {
    path: '/report/subscriptions',
    element: (
      <Navigate
        to='/report/subscription'
        replace
      />
    ),
  },
  {
    path: '/report/templates',
    element: (
      <Navigate
        to='/report/template'
        replace
      />
    ),
  },

  // mobile 模块
  {
    path: '/mobile/scan-page',
    element: (
      <Navigate
        to='/mobile/scan'
        replace
      />
    ),
  },
  {
    path: '/mobile/settings-app',
    element: (
      <Navigate
        to='/mobile/settings'
        replace
      />
    ),
  },
  {
    path: '/mobile/offline-sync',
    element: (
      <Navigate
        to='/mobile/settings'
        replace
      />
    ),
  },

  // pdm 模块 (大部分是单复数变化)
  {
    path: '/pdm/projects',
    element: (
      <Navigate
        to='/pdm/project'
        replace
      />
    ),
  },
  {
    path: '/pdm/documents',
    element: (
      <Navigate
        to='/pdm/document'
        replace
      />
    ),
  },
  {
    path: '/pdm/products',
    element: (
      <Navigate
        to='/pdm/product'
        replace
      />
    ),
  },
  {
    path: '/pdm/materials',
    element: (
      <Navigate
        to='/pdm/material'
        replace
      />
    ),
  },
  {
    path: '/pdm/changes',
    element: (
      <Navigate
        to='/pdm/change'
        replace
      />
    ),
  },
  {
    path: '/pdm/bom-management',
    element: (
      <Navigate
        to='/pdm/pdm-bom'
        replace
      />
    ),
  },

  // srm 模块
  {
    path: '/srm/suppliers/:id',
    element: (
      <Navigate
        to='/srm/supplier'
        replace
      />
    ),
  },
  {
    path: '/srm/suppliers',
    element: (
      <Navigate
        to='/srm/supplier'
        replace
      />
    ),
  },
  {
    path: '/srm/evaluations',
    element: (
      <Navigate
        to='/srm/evaluation'
        replace
      />
    ),
  },
  {
    path: '/srm/orders',
    element: (
      <Navigate
        to='/srm/order'
        replace
      />
    ),
  },
  {
    path: '/srm/contracts',
    element: (
      <Navigate
        to='/srm/contract'
        replace
      />
    ),
  },
  {
    path: '/srm/supplier-portal',
    element: (
      <Navigate
        to='/srm/portal'
        replace
      />
    ),
  },
  {
    path: '/srm/inquiry-quotation',
    element: (
      <Navigate
        to='/srm/inquiry'
        replace
      />
    ),
  },

  // lowcode 模块
  {
    path: '/lowcode/overview',
    element: (
      <Navigate
        to='/lowcode/home'
        replace
      />
    ),
  },
  {
    path: '/lowcode/apps/:appId',
    element: (
      <Navigate
        to='/lowcode/app-detail'
        replace
      />
    ),
  },
  {
    path: '/lowcode/apps',
    element: (
      <Navigate
        to='/lowcode/app'
        replace
      />
    ),
  },
  {
    path: '/lowcode/models/:modelId',
    element: (
      <Navigate
        to='/lowcode/data-model-designer'
        replace
      />
    ),
  },
  {
    path: '/lowcode/models',
    element: (
      <Navigate
        to='/lowcode/data-model'
        replace
      />
    ),
  },
  {
    path: '/lowcode/datasources',
    element: (
      <Navigate
        to='/lowcode/data-source'
        replace
      />
    ),
  },
  {
    path: '/lowcode/forms/new',
    element: (
      <Navigate
        to='/lowcode/form-designer'
        replace
      />
    ),
  },
  {
    path: '/lowcode/forms/:formId',
    element: (
      <Navigate
        to='/lowcode/form-designer'
        replace
      />
    ),
  },
  {
    path: '/lowcode/forms',
    element: (
      <Navigate
        to='/lowcode/form'
        replace
      />
    ),
  },
  {
    path: '/lowcode/pages/new',
    element: (
      <Navigate
        to='/lowcode/page-designer'
        replace
      />
    ),
  },
  {
    path: '/lowcode/pages/:pageId',
    element: (
      <Navigate
        to='/lowcode/page-designer'
        replace
      />
    ),
  },
  {
    path: '/lowcode/pages',
    element: (
      <Navigate
        to='/lowcode/page'
        replace
      />
    ),
  },

  // professional 模块 (已分散到各模块)
  {
    path: '/mobile-workstation',
    element: (
      <Navigate
        to='/mes/dashboard'
        replace
      />
    ),
  },
  {
    path: '/performance',
    element: (
      <Navigate
        to='/monitor/dashboard'
        replace
      />
    ),
  },
  {
    path: '/integration/external-erp',
    element: (
      <Navigate
        to='/integration/dashboard'
        replace
      />
    ),
  },
  {
    path: '/integration/external-erp/:connectionId/mappings',
    element: (
      <Navigate
        to='/integration/dashboard'
        replace
      />
    ),
  },
  {
    path: '/integration/rules',
    element: (
      <Navigate
        to='/integration/dashboard'
        replace
      />
    ),
  },
  {
    path: '/integration/external-erp-overview',
    element: (
      <Navigate
        to='/integration/dashboard'
        replace
      />
    ),
  },
  {
    path: '/lims/sample/:id',
    element: (
      <Navigate
        to='/lims/dashboard'
        replace
      />
    ),
  },
  {
    path: '/lims/task/:id',
    element: (
      <Navigate
        to='/lims/dashboard'
        replace
      />
    ),
  },
  {
    path: '/lims/instrument/:id',
    element: (
      <Navigate
        to='/lims/dashboard'
        replace
      />
    ),
  },
  {
    path: '/lims/instruments-manage',
    element: (
      <Navigate
        to='/lims/dashboard'
        replace
      />
    ),
  },
  {
    path: '/lims/sample-receive',
    element: (
      <Navigate
        to='/lims/dashboard'
        replace
      />
    ),
  },
  {
    path: '/lims/inspection-tasks',
    element: (
      <Navigate
        to='/lims/dashboard'
        replace
      />
    ),
  },
  {
    path: '/lims/inspection-results',
    element: (
      <Navigate
        to='/lims/dashboard'
        replace
      />
    ),
  },
  {
    path: '/lims/instrument-data',
    element: (
      <Navigate
        to='/lims/dashboard'
        replace
      />
    ),
  },
  {
    path: '/qms/standard/:id',
    element: (
      <Navigate
        to='/qms/dashboard'
        replace
      />
    ),
  },
  {
    path: '/qms/improvements',
    element: (
      <Navigate
        to='/qms/dashboard'
        replace
      />
    ),
  },
  {
    path: '/qms/quality-cost',
    element: (
      <Navigate
        to='/qms/dashboard'
        replace
      />
    ),
  },
  {
    path: '/qms/spc',
    element: (
      <Navigate
        to='/qms/dashboard'
        replace
      />
    ),
  },
  {
    path: '/qms/eight-d',
    element: (
      <Navigate
        to='/qms/dashboard'
        replace
      />
    ),
  },
  {
    path: '/qms/fmea',
    element: (
      <Navigate
        to='/qms/dashboard'
        replace
      />
    ),
  },
  {
    path: '/ehs/hazard/:id',
    element: (
      <Navigate
        to='/ehs/dashboard'
        replace
      />
    ),
  },
  {
    path: '/ehs/hazard-management',
    element: (
      <Navigate
        to='/ehs/dashboard'
        replace
      />
    ),
  },
  {
    path: '/ehs/incident',
    element: (
      <Navigate
        to='/ehs/dashboard'
        replace
      />
    ),
  },
  {
    path: '/ehs/environment',
    element: (
      <Navigate
        to='/ehs/dashboard'
        replace
      />
    ),
  },
  {
    path: '/ehs/health',
    element: (
      <Navigate
        to='/ehs/dashboard'
        replace
      />
    ),
  },
  {
    path: '/ehs/emergency',
    element: (
      <Navigate
        to='/ehs/dashboard'
        replace
      />
    ),
  },
  {
    path: '/ehs/training',
    element: (
      <Navigate
        to='/ehs/dashboard'
        replace
      />
    ),
  },
  {
    path: '/ehs/compliance',
    element: (
      <Navigate
        to='/ehs/dashboard'
        replace
      />
    ),
  },

  // tenant 模块 (已合并到 admin 模块)
  {
    path: '/admin/tenants/:tenantId',
    element: (
      <Navigate
        to='/admin/tenant'
        replace
      />
    ),
  },
  {
    path: '/admin/tenants',
    element: (
      <Navigate
        to='/admin/tenant'
        replace
      />
    ),
  },
  {
    path: '/tenant/settings',
    element: (
      <Navigate
        to='/admin/tenant'
        replace
      />
    ),
  },
  {
    path: '/tenant/billing',
    element: (
      <Navigate
        to='/admin/tenant'
        replace
      />
    ),
  },
];

export default legacyRedirects;
