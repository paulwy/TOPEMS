import { lazyWithRetry } from '@/routes/utils';
import type { RouteConfigV2, RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';
import i18n from '@/i18n';

// ---- 路径常量：唯一真相源 ----
// 组件中应引用 HRM_PATHS.xxx，而非硬编码字符串
export const HRM_PATHS = {
  root: '/hrm',
  dashboard: '/hrm/dashboard',
  employees: '/hrm/employees',
  employeeCreate: '/hrm/employees/create',
  employeeDetail: '/hrm/employees/:id',
  employeeEdit: '/hrm/employees/:id/edit',
  departments: '/hrm/departments',
  organization: '/hrm/organization',
  positions: '/hrm/positions',
  contracts: '/hrm/contracts',
  contractDetail: '/hrm/contracts/:id',
  company: '/hrm/company',
  attendance: '/hrm/attendance',
  leave: '/hrm/leave',
  payroll: '/hrm/payroll',
  salaryAdjustment: '/hrm/salary-adjustment',
  recruitment: '/hrm/recruitment',
  training: '/hrm/training',
  performance: '/hrm/performance',
  reports: '/hrm/reports',
  overview: '/hrm/overview',
  settingAttendanceRule: '/hrm/setting/attendance-rule',
  settingPayrollTemplate: '/hrm/setting/payroll-template',
  settingRecruitmentFlow: '/hrm/setting/recruitment-flow',
  settingTrainingPlan: '/hrm/setting/training-plan',
} as const;

// ---- V257 P0-1：页面级 Props interface（Frontend 泛型收紧 · 3/15 核心模块首批）----
// 命名规则：<DisplayName> + 'Props'，严格 1:1 对应 lazyWithRetry 第 2 参数 DisplayName
// 字段策略：template 通用字段（list/pageSize/filters · form/mode/initialValues · detail/id · etc.）+ PATH 动态段参数（:id → id?）
// 深层字段（filters/initialValues）先宽松 Record<string, unknown>，V257 P1-1 tsc 后细化

interface HrmDashboardPageProps {
  /** 统计指标列表（可选）*/

  metrics?: string[];

  /** 时间范围 */

  period?: '7d' | '30d' | '90d' | 'custom';

  /** 时间范围自定义起点（period='custom' 时）*/

  periodStart?: string;

  /** 时间范围自定义终点 */

  periodEnd?: string;

  /** 自动刷新间隔（秒）*/

  refreshIntervalSec?: number;
}

interface HrmEmployeePageProps {
  /** 分页：当前页码 */

  page?: number;

  /** 分页：每页大小 */

  pageSize?: number;

  /** 过滤器：前端宽松 Record<string, unknown>（V257 P1-1 深度细化时升级为 schema）*/

  filters?: Record<string, unknown>;

  /** 关键字搜索（顶部搜索框）*/

  searchKeyword?: string;

  /** 排序字段 */

  sortBy?: string;

  /** 排序方向 */

  sortOrder?: 'asc' | 'desc';
}

interface HrmEmployeeCreatePageProps {
  /** 表单模式 */

  mode?: 'create' | 'edit' | 'clone' | 'view';

  /** 初始值（编辑/克隆时注入）*/

  initialValues?: Record<string, unknown>;

  /** 来源 ID（从列表跳转时带的上一条记录 ID）*/

  sourceId?: string;

  /** 预填充字段（从其他页面跳转带过来的）*/

  prefillFrom?: Record<string, unknown>;
}

interface HrmEmployeeDetailPageProps {
  /** 实体主键 ID（匹配 PATHS.:id）*/

  id?: string;

  /** 实体类型（多态详情页：区分 inspection/issue/audit-plan 等）*/

  entityType?: string;

  /** 是否预览模式（部分详情页只读预览）*/

  previewMode?: boolean;

  /** 版本号（带版本控制的实体）*/

  version?: string | number;
}

interface HrmEmployeeEditPageProps {
  /** 表单模式 */

  mode?: 'create' | 'edit' | 'clone' | 'view';

  /** 初始值（编辑/克隆时注入）*/

  initialValues?: Record<string, unknown>;

  /** 来源 ID（从列表跳转时带的上一条记录 ID）*/

  sourceId?: string;

  /** 预填充字段（从其他页面跳转带过来的）*/

  prefillFrom?: Record<string, unknown>;

  /** 路径参数：:id */

  id?: string;
}

interface HrmDepartmentPageProps {
  /** 分页：当前页码 */

  page?: number;

  /** 分页：每页大小 */

  pageSize?: number;

  /** 过滤器：前端宽松 Record<string, unknown>（V257 P1-1 深度细化时升级为 schema）*/

  filters?: Record<string, unknown>;

  /** 关键字搜索（顶部搜索框）*/

  searchKeyword?: string;

  /** 排序字段 */

  sortBy?: string;

  /** 排序方向 */

  sortOrder?: 'asc' | 'desc';
}

interface HrmOrganizationPageProps {
  /** 展开的节点 ID 列表 */

  expandedKeys?: string[];

  /** 选中的节点 ID 列表 */

  selectedKeys?: string[];

  /** 勾选的节点 ID 列表（多选场景）*/

  checkedKeys?: string[];

  /** 根节点父 ID（多租户多根树）*/

  rootParentId?: string;
}

interface HrmPositionPageProps {
  /** 分页：当前页码 */

  page?: number;

  /** 分页：每页大小 */

  pageSize?: number;

  /** 过滤器：前端宽松 Record<string, unknown>（V257 P1-1 深度细化时升级为 schema）*/

  filters?: Record<string, unknown>;

  /** 关键字搜索（顶部搜索框）*/

  searchKeyword?: string;

  /** 排序字段 */

  sortBy?: string;

  /** 排序方向 */

  sortOrder?: 'asc' | 'desc';
}

interface HrmContractPageProps {
  /** 分页：当前页码 */

  page?: number;

  /** 分页：每页大小 */

  pageSize?: number;

  /** 过滤器：前端宽松 Record<string, unknown>（V257 P1-1 深度细化时升级为 schema）*/

  filters?: Record<string, unknown>;

  /** 关键字搜索（顶部搜索框）*/

  searchKeyword?: string;

  /** 排序字段 */

  sortBy?: string;

  /** 排序方向 */

  sortOrder?: 'asc' | 'desc';
}

interface HrmContractDetailPageProps {
  /** 实体主键 ID（匹配 PATHS.:id）*/

  id?: string;

  /** 实体类型（多态详情页：区分 inspection/issue/audit-plan 等）*/

  entityType?: string;

  /** 是否预览模式（部分详情页只读预览）*/

  previewMode?: boolean;

  /** 版本号（带版本控制的实体）*/

  version?: string | number;
}

interface HrmCompanyPageProps {
  /** 实体主键 ID（匹配 PATHS.:id）*/

  id?: string;

  /** 实体类型（多态详情页：区分 inspection/issue/audit-plan 等）*/

  entityType?: string;

  /** 是否预览模式（部分详情页只读预览）*/

  previewMode?: boolean;

  /** 版本号（带版本控制的实体）*/

  version?: string | number;
}

interface HrmAttendancePageProps {
  /** 分页：当前页码 */

  page?: number;

  /** 分页：每页大小 */

  pageSize?: number;

  /** 过滤器：前端宽松 Record<string, unknown>（V257 P1-1 深度细化时升级为 schema）*/

  filters?: Record<string, unknown>;

  /** 关键字搜索（顶部搜索框）*/

  searchKeyword?: string;

  /** 排序字段 */

  sortBy?: string;

  /** 排序方向 */

  sortOrder?: 'asc' | 'desc';
}

interface HrmLeavePageProps {
  /** 分页：当前页码 */

  page?: number;

  /** 分页：每页大小 */

  pageSize?: number;

  /** 过滤器：前端宽松 Record<string, unknown>（V257 P1-1 深度细化时升级为 schema）*/

  filters?: Record<string, unknown>;

  /** 关键字搜索（顶部搜索框）*/

  searchKeyword?: string;

  /** 排序字段 */

  sortBy?: string;

  /** 排序方向 */

  sortOrder?: 'asc' | 'desc';
}

interface HrmPayrollPageProps {
  /** 分页：当前页码 */

  page?: number;

  /** 分页：每页大小 */

  pageSize?: number;

  /** 过滤器：前端宽松 Record<string, unknown>（V257 P1-1 深度细化时升级为 schema）*/

  filters?: Record<string, unknown>;

  /** 关键字搜索（顶部搜索框）*/

  searchKeyword?: string;

  /** 排序字段 */

  sortBy?: string;

  /** 排序方向 */

  sortOrder?: 'asc' | 'desc';
}

interface HrmSalaryAdjustmentPageProps {
  /** 分页：当前页码 */

  page?: number;

  /** 分页：每页大小 */

  pageSize?: number;

  /** 过滤器：前端宽松 Record<string, unknown>（V257 P1-1 深度细化时升级为 schema）*/

  filters?: Record<string, unknown>;

  /** 关键字搜索（顶部搜索框）*/

  searchKeyword?: string;

  /** 排序字段 */

  sortBy?: string;

  /** 排序方向 */

  sortOrder?: 'asc' | 'desc';
}

interface HrmRecruitmentPageProps {
  /** 分页：当前页码 */

  page?: number;

  /** 分页：每页大小 */

  pageSize?: number;

  /** 过滤器：前端宽松 Record<string, unknown>（V257 P1-1 深度细化时升级为 schema）*/

  filters?: Record<string, unknown>;

  /** 关键字搜索（顶部搜索框）*/

  searchKeyword?: string;

  /** 排序字段 */

  sortBy?: string;

  /** 排序方向 */

  sortOrder?: 'asc' | 'desc';
}

interface HrmTrainingPageProps {
  /** 分页：当前页码 */

  page?: number;

  /** 分页：每页大小 */

  pageSize?: number;

  /** 过滤器：前端宽松 Record<string, unknown>（V257 P1-1 深度细化时升级为 schema）*/

  filters?: Record<string, unknown>;

  /** 关键字搜索（顶部搜索框）*/

  searchKeyword?: string;

  /** 排序字段 */

  sortBy?: string;

  /** 排序方向 */

  sortOrder?: 'asc' | 'desc';
}

interface HrmPerformancePageProps {
  /** 分页：当前页码 */

  page?: number;

  /** 分页：每页大小 */

  pageSize?: number;

  /** 过滤器：前端宽松 Record<string, unknown>（V257 P1-1 深度细化时升级为 schema）*/

  filters?: Record<string, unknown>;

  /** 关键字搜索（顶部搜索框）*/

  searchKeyword?: string;

  /** 排序字段 */

  sortBy?: string;

  /** 排序方向 */

  sortOrder?: 'asc' | 'desc';
}

interface HrmReportsPageProps {
  /** 统计维度 */

  dimensions?: string[];

  /** 统计指标 */

  metrics?: string[];

  /** 时间范围 */

  period?: '7d' | '30d' | '90d' | 'custom';

  /** 过滤器 */

  filters?: Record<string, unknown>;
}

interface HrmOverviewPageProps {
  /** 统计指标列表（可选）*/

  metrics?: string[];

  /** 时间范围 */

  period?: '7d' | '30d' | '90d' | 'custom';

  /** 时间范围自定义起点（period='custom' 时）*/

  periodStart?: string;

  /** 时间范围自定义终点 */

  periodEnd?: string;

  /** 自动刷新间隔（秒）*/

  refreshIntervalSec?: number;
}

interface AttendanceRulePageProps {
  /** 当前激活的设置 Tab key */

  activeTab?: string;

  /** 模块级租户 ID（多租户隔离）*/

  tenantId?: string;

  /** 保存后是否自动跳转 */

  redirectOnSave?: string;
}

interface PayrollTemplatePageProps {
  /** 当前激活的设置 Tab key */

  activeTab?: string;

  /** 模块级租户 ID（多租户隔离）*/

  tenantId?: string;

  /** 保存后是否自动跳转 */

  redirectOnSave?: string;
}

interface RecruitmentFlowPageProps {
  /** 当前激活的设置 Tab key */

  activeTab?: string;

  /** 模块级租户 ID（多租户隔离）*/

  tenantId?: string;

  /** 保存后是否自动跳转 */

  redirectOnSave?: string;
}

interface TrainingPlanPageProps {
  /** 当前激活的设置 Tab key */

  activeTab?: string;

  /** 模块级租户 ID（多租户隔离）*/

  tenantId?: string;

  /** 保存后是否自动跳转 */

  redirectOnSave?: string;
}
// ---- 路由配置（供路由系统使用） ----
export const hrmModuleConfig: RouteModuleConfig = {
  code: 'hrm',
  name: i18n.t('shared.config.hrm_name'),
  nameKey: 'shared.config.hrm_name',
  icon: 'Users',
  path: HRM_PATHS.root,
  source: 'core',
  suite: 'hr',
  status: 'online',
  order: 5,
  description: i18n.t('shared.config.k1'),
  permission: 'hrm:module:read',
  routes: [
    {
      path: HRM_PATHS.dashboard,
      element: lazyWithRetry(() => import('@/pages/hrm/DashboardPage'), 'HrmDashboardPage'),
      module: 'hrm',
      code: 'hrm-dashboard',
      title: i18n.t('shared.config.k2'),
      titleKey: 'shared.config.k2',
      template: 'dashboard',
      group: 'overview',
      requiredPermissions: ['hrm:dashboard:read'],
      action: 'read',
    } as RouteConfigV2<HrmDashboardPageProps>,
    {
      path: HRM_PATHS.employees,
      element: lazyWithRetry(() => import('@/pages/hrm/HrmEmployeePage'), 'HrmEmployeePage'),
      module: 'hrm',
      code: 'hrm-employees',
      title: i18n.t('shared.config.k3'),
      titleKey: 'shared.config.k3',
      template: 'list',
      group: 'master',
      requiredPermissions: ['hrm:employee:read'],
      action: 'read',
    } as RouteConfigV2<HrmEmployeePageProps>,
    {
      path: HRM_PATHS.employeeCreate,
      element: lazyWithRetry(
        () => import('@/pages/hrm/HrmEmployeeCreatePage'),
        'HrmEmployeeCreatePage'
      ),
      module: 'hrm',
      code: 'hrm-employee-create',
      title: i18n.t('shared.config.k4'),
      titleKey: 'shared.config.k4',
      template: 'form',
      group: 'master',
      requiredPermissions: ['hrm:employee:create'],
      action: 'write',
    } as RouteConfigV2<HrmEmployeeCreatePageProps>,
    {
      path: HRM_PATHS.employeeDetail,
      element: lazyWithRetry(
        () => import('@/pages/hrm/HrmEmployeeDetailPage'),
        'HrmEmployeeDetailPage'
      ),
      module: 'hrm',
      code: 'hrm-employee-detail',
      title: i18n.t('shared.config.k5'),
      titleKey: 'shared.config.k5',
      template: 'detail',
      group: 'master',
      requiredPermissions: ['hrm:employee:read'],
      action: 'read',
    } as RouteConfigV2<HrmEmployeeDetailPageProps>,
    {
      path: HRM_PATHS.employeeEdit,
      element: lazyWithRetry(
        () => import('@/pages/hrm/HrmEmployeeEditPage'),
        'HrmEmployeeEditPage'
      ),
      module: 'hrm',
      code: 'hrm-employee-edit',
      title: i18n.t('shared.config.k6'),
      titleKey: 'shared.config.k6',
      template: 'form',
      group: 'master',
      requiredPermissions: ['hrm:employee:update'],
      action: 'update',
    } as RouteConfigV2<HrmEmployeeEditPageProps>,
    {
      path: HRM_PATHS.departments,
      element: lazyWithRetry(() => import('@/pages/hrm/HrmDepartmentPage'), 'HrmDepartmentPage'),
      module: 'hrm',
      code: 'hrm-departments',
      title: i18n.t('shared.config.k7'),
      titleKey: 'shared.config.k7',
      template: 'list',
      group: 'master',
      requiredPermissions: ['hrm:department:read'],
      action: 'read',
    } as RouteConfigV2<HrmDepartmentPageProps>,
    {
      path: HRM_PATHS.organization,
      element: lazyWithRetry(
        () => import('@/pages/hrm/HrmOrganizationPage'),
        'HrmOrganizationPage'
      ),
      module: 'hrm',
      code: 'hrm-organization',
      title: i18n.t('shared.config.k8'),
      titleKey: 'shared.config.k8',
      template: 'tree',
      group: 'master',
      requiredPermissions: ['hrm:organization:read'],
      action: 'read',
    } as RouteConfigV2<HrmOrganizationPageProps>,
    {
      path: HRM_PATHS.positions,
      element: lazyWithRetry(() => import('@/pages/hrm/HrmPositionPage'), 'HrmPositionPage'),
      module: 'hrm',
      code: 'hrm-positions',
      title: i18n.t('shared.config.k9'),
      titleKey: 'shared.config.k9',
      template: 'list',
      group: 'master',
      requiredPermissions: ['hrm:position:read'],
      action: 'read',
    } as RouteConfigV2<HrmPositionPageProps>,
    {
      path: HRM_PATHS.contracts,
      element: lazyWithRetry(() => import('@/pages/hrm/HrmContractPage'), 'HrmContractPage'),
      module: 'hrm',
      code: 'hrm-contracts',
      title: i18n.t('shared.config.k10'),
      titleKey: 'shared.config.k10',
      template: 'list',
      group: 'master',
      requiredPermissions: ['hrm:contract:read'],
      action: 'read',
    } as RouteConfigV2<HrmContractPageProps>,
    {
      path: HRM_PATHS.contractDetail,
      element: lazyWithRetry(
        () => import('@/pages/hrm/HrmContractDetailPage'),
        'HrmContractDetailPage'
      ),
      module: 'hrm',
      code: 'hrm-contract-detail',
      title: i18n.t('shared.config.k11'),
      titleKey: 'shared.config.k11',
      template: 'detail',
      group: 'master',
      requiredPermissions: ['hrm:contract:read'],
      action: 'read',
    } as RouteConfigV2<HrmContractDetailPageProps>,
    {
      path: HRM_PATHS.company,
      element: lazyWithRetry(() => import('@/pages/hrm/HrmCompanyPage'), 'HrmCompanyPage'),
      module: 'hrm',
      code: 'hrm-company',
      title: i18n.t('shared.config.k12'),
      titleKey: 'shared.config.k12',
      template: 'detail',
      group: 'master',
      requiredPermissions: ['hrm:company:read'],
      action: 'read',
    } as RouteConfigV2<HrmCompanyPageProps>,
    {
      path: HRM_PATHS.attendance,
      element: lazyWithRetry(() => import('@/pages/hrm/HrmAttendancePage'), 'HrmAttendancePage'),
      module: 'hrm',
      code: 'hrm-attendance',
      title: i18n.t('shared.config.k13'),
      titleKey: 'shared.config.k13',
      template: 'list',
      group: 'process',
      requiredPermissions: ['hrm:attendance:read'],
      action: 'read',
    } as RouteConfigV2<HrmAttendancePageProps>,
    {
      path: HRM_PATHS.leave,
      element: lazyWithRetry(() => import('@/pages/hrm/HrmLeavePage'), 'HrmLeavePage'),
      module: 'hrm',
      code: 'hrm-leave',
      title: i18n.t('shared.config.k14'),
      titleKey: 'shared.config.k14',
      template: 'list',
      group: 'process',
      requiredPermissions: ['hrm:leave:read'],
      action: 'read',
    } as RouteConfigV2<HrmLeavePageProps>,
    {
      path: HRM_PATHS.payroll,
      element: lazyWithRetry(() => import('@/pages/hrm/HrmPayrollPage'), 'HrmPayrollPage'),
      module: 'hrm',
      code: 'hrm-payroll',
      title: i18n.t('shared.config.k15'),
      titleKey: 'shared.config.k15',
      template: 'list',
      group: 'process',
      requiredPermissions: ['hrm:payroll:read'],
      action: 'read',
    } as RouteConfigV2<HrmPayrollPageProps>,
    {
      path: HRM_PATHS.salaryAdjustment,
      element: lazyWithRetry(
        () => import('@/pages/hrm/HrmSalaryAdjustmentPage'),
        'HrmSalaryAdjustmentPage'
      ),
      module: 'hrm',
      code: 'hrm-salary-adjustment',
      title: i18n.t('shared.config.k16'),
      titleKey: 'shared.config.k16',
      template: 'list',
      group: 'process',
      requiredPermissions: ['hrm:salary_adjustment:read'],
      action: 'read',
    } as RouteConfigV2<HrmSalaryAdjustmentPageProps>,
    {
      path: HRM_PATHS.recruitment,
      element: lazyWithRetry(() => import('@/pages/hrm/HrmRecruitmentPage'), 'HrmRecruitmentPage'),
      module: 'hrm',
      code: 'hrm-recruitment',
      title: i18n.t('shared.config.k17'),
      titleKey: 'shared.config.k17',
      template: 'list',
      group: 'process',
      requiredPermissions: ['hrm:recruitment:read'],
      action: 'read',
    } as RouteConfigV2<HrmRecruitmentPageProps>,
    {
      path: HRM_PATHS.training,
      element: lazyWithRetry(() => import('@/pages/hrm/HrmTrainingPage'), 'HrmTrainingPage'),
      module: 'hrm',
      code: 'hrm-training',
      title: i18n.t('shared.config.k18'),
      titleKey: 'shared.config.k18',
      template: 'list',
      group: 'process',
      requiredPermissions: ['hrm:training:read'],
      action: 'read',
    } as RouteConfigV2<HrmTrainingPageProps>,
    {
      path: HRM_PATHS.performance,
      element: lazyWithRetry(() => import('@/pages/hrm/HrmPerformancePage'), 'HrmPerformancePage'),
      module: 'hrm',
      code: 'hrm-performance',
      title: i18n.t('shared.config.k19'),
      titleKey: 'shared.config.k19',
      template: 'list',
      group: 'process',
      requiredPermissions: ['hrm:performance:read'],
      action: 'read',
    } as RouteConfigV2<HrmPerformancePageProps>,
    {
      path: HRM_PATHS.reports,
      element: lazyWithRetry(() => import('@/pages/hrm/HrmReportsPage'), 'HrmReportsPage'),
      module: 'hrm',
      code: 'hrm-reports',
      title: i18n.t('shared.config.k20'),
      titleKey: 'shared.config.k20',
      template: 'stats',
      group: 'analytics',
      requiredPermissions: ['hrm:report:read'],
      action: 'read',
    } as RouteConfigV2<HrmReportsPageProps>,
    {
      path: HRM_PATHS.overview,
      element: lazyWithRetry(() => import('@/pages/hrm/HrmOverviewPage'), 'HrmOverviewPage'),
      module: 'hrm',
      code: 'hrm-overview',
      title: i18n.t('shared.config.k21'),
      titleKey: 'shared.config.k21',
      template: 'dashboard',
      group: 'analytics',
      requiredPermissions: ['hrm:overview:read'],
      action: 'read',
    } as RouteConfigV2<HrmOverviewPageProps>,
    {
      path: HRM_PATHS.settingAttendanceRule,
      element: lazyWithRetry(
        () => import('@/pages/hrm/setting/AttendanceRulePage'),
        'AttendanceRulePage'
      ),
      module: 'hrm',
      code: 'hrm-attendance-rule',
      title: i18n.t('shared.config.k22'),
      titleKey: 'shared.config.k22',
      template: 'settings',
      group: 'setting',
      requiredPermissions: ['hrm:attendance_rule:read'],
      action: 'read',
    } as RouteConfigV2<AttendanceRulePageProps>,
    {
      path: HRM_PATHS.settingPayrollTemplate,
      element: lazyWithRetry(
        () => import('@/pages/hrm/setting/PayrollTemplatePage'),
        'PayrollTemplatePage'
      ),
      module: 'hrm',
      code: 'hrm-payroll-template',
      title: i18n.t('shared.config.k23'),
      titleKey: 'shared.config.k23',
      template: 'settings',
      group: 'setting',
      requiredPermissions: ['hrm:payroll_template:read'],
      action: 'read',
    } as RouteConfigV2<PayrollTemplatePageProps>,
    {
      path: HRM_PATHS.settingRecruitmentFlow,
      element: lazyWithRetry(
        () => import('@/pages/hrm/setting/RecruitmentFlowPage'),
        'RecruitmentFlowPage'
      ),
      module: 'hrm',
      code: 'hrm-recruitment-flow',
      title: i18n.t('shared.config.k24'),
      titleKey: 'shared.config.k24',
      template: 'settings',
      group: 'setting',
      requiredPermissions: ['hrm:recruitment_flow:read'],
      action: 'read',
    } as RouteConfigV2<RecruitmentFlowPageProps>,
    {
      path: HRM_PATHS.settingTrainingPlan,
      element: lazyWithRetry(
        () => import('@/pages/hrm/setting/TrainingPlanPage'),
        'TrainingPlanPage'
      ),
      module: 'hrm',
      code: 'hrm-training-plan',
      title: i18n.t('shared.config.k25'),
      titleKey: 'shared.config.k25',
      template: 'settings',
      group: 'setting',
      requiredPermissions: ['hrm:training_plan:read'],
      action: 'read',
    } as RouteConfigV2<TrainingPlanPageProps>,
  ] as RouteConfigV2<Record<string, unknown>>[],
};

// ---- 导航配置（供导航注册表使用） ----
export const hrmNavConfig: ModuleNavConfig = {
  code: 'hrm',
  name: i18n.t('shared.config.k26'),
  nameKey: 'shared.config.k26',
  icon: 'Users',
  path: HRM_PATHS.root,
  permission: 'hrm:module:read',
  source: 'core',
  suite: 'hr',
  status: 'online',
  order: 5,
  description: i18n.t('shared.config.k27'),
  navItems: [
    {
      code: 'hrm-dashboard',
      label: i18n.t('shared.config.k28'),
      labelKey: 'shared.config.k28',
      icon: 'LayoutDashboard',
      path: HRM_PATHS.dashboard,
      permission: 'hrm:dashboard:read',
      order: 0,
      group: 'overview',
      showInTabs: true,
      description: i18n.t('shared.config.k29'),
    },
    {
      code: 'hrm-employees',
      label: i18n.t('shared.config.k30'),
      labelKey: 'shared.config.k30',
      icon: 'User',
      path: HRM_PATHS.employees,
      permission: 'hrm:employee:read',
      order: 1,
      group: 'master',
      showInTabs: true,
      description: i18n.t('shared.config.k31'),
    },
    {
      code: 'hrm-departments',
      label: i18n.t('shared.config.k32'),
      labelKey: 'shared.config.k32',
      icon: 'Network',
      path: HRM_PATHS.departments,
      permission: 'hrm:department:read',
      order: 2,
      group: 'master',
      showInTabs: true,
      description: i18n.t('shared.config.k33'),
    },
    {
      code: 'hrm-organization',
      label: i18n.t('shared.config.k34'),
      labelKey: 'shared.config.k34',
      icon: 'Building2',
      path: HRM_PATHS.organization,
      permission: 'hrm:organization:read',
      order: 3,
      group: 'master',
      description: i18n.t('shared.config.k35'),
    },
    {
      code: 'hrm-positions',
      label: i18n.t('shared.config.k36'),
      labelKey: 'shared.config.k36',
      icon: 'Briefcase',
      path: HRM_PATHS.positions,
      permission: 'hrm:position:read',
      order: 4,
      group: 'master',
      description: i18n.t('shared.config.k37'),
    },
    {
      code: 'hrm-contracts',
      label: i18n.t('shared.config.k38'),
      labelKey: 'shared.config.k38',
      icon: 'FileText',
      path: HRM_PATHS.contracts,
      permission: 'hrm:contract:read',
      order: 5,
      group: 'master',
      description: i18n.t('shared.config.k39'),
    },
    {
      code: 'hrm-company',
      label: i18n.t('shared.config.k40'),
      labelKey: 'shared.config.k40',
      icon: 'Building',
      path: HRM_PATHS.company,
      permission: 'hrm:company:read',
      order: 6,
      group: 'master',
      description: i18n.t('shared.config.k41'),
    },
    {
      code: 'hrm-attendance',
      label: i18n.t('shared.config.k42'),
      labelKey: 'shared.config.k42',
      icon: 'Clock',
      path: HRM_PATHS.attendance,
      permission: 'hrm:attendance:read',
      order: 1,
      group: 'process',
      showInTabs: true,
      description: i18n.t('shared.config.k43'),
    },
    {
      code: 'hrm-leave',
      label: i18n.t('shared.config.k44'),
      labelKey: 'shared.config.k44',
      icon: 'Calendar',
      path: HRM_PATHS.leave,
      permission: 'hrm:leave:read',
      order: 2,
      group: 'process',
      description: i18n.t('shared.config.k45'),
    },
    {
      code: 'hrm-payroll',
      label: i18n.t('shared.config.k46'),
      labelKey: 'shared.config.k46',
      icon: 'Wallet',
      path: HRM_PATHS.payroll,
      permission: 'hrm:payroll:read',
      order: 3,
      group: 'process',
      description: i18n.t('shared.config.k47'),
    },
    {
      code: 'hrm-salary-adjustment',
      label: i18n.t('shared.config.k48'),
      labelKey: 'shared.config.k48',
      icon: 'TrendingUp',
      path: HRM_PATHS.salaryAdjustment,
      permission: 'hrm:salary_adjustment:read',
      order: 4,
      group: 'process',
      description: i18n.t('shared.config.k49'),
    },
    {
      code: 'hrm-recruitment',
      label: i18n.t('shared.config.k50'),
      labelKey: 'shared.config.k50',
      icon: 'UserPlus',
      path: HRM_PATHS.recruitment,
      permission: 'hrm:recruitment:read',
      order: 5,
      group: 'process',
      description: i18n.t('shared.config.k51'),
    },
    {
      code: 'hrm-training',
      label: i18n.t('shared.config.k52'),
      labelKey: 'shared.config.k52',
      icon: 'GraduationCap',
      path: HRM_PATHS.training,
      permission: 'hrm:training:read',
      order: 6,
      group: 'process',
      description: i18n.t('shared.config.k53'),
    },
    {
      code: 'hrm-performance',
      label: i18n.t('shared.config.k54'),
      labelKey: 'shared.config.k54',
      icon: 'Trophy',
      path: HRM_PATHS.performance,
      permission: 'hrm:performance:read',
      order: 7,
      group: 'process',
      description: i18n.t('shared.config.k55'),
    },
    {
      code: 'hrm-reports',
      label: i18n.t('shared.config.k56'),
      labelKey: 'shared.config.k56',
      icon: 'BarChart3',
      path: HRM_PATHS.reports,
      permission: 'hrm:report:read',
      order: 1,
      group: 'analytics',
      showInTabs: true,
      description: i18n.t('shared.config.hr_0'),
    },
    {
      code: 'hrm-overview',
      label: i18n.t('shared.config.k57'),
      labelKey: 'shared.config.k57',
      icon: 'PieChart',
      path: HRM_PATHS.overview,
      permission: 'hrm:overview:read',
      order: 2,
      group: 'analytics',
      description: i18n.t('shared.config.hr_1'),
    },
    {
      code: 'hrm-attendance-rule',
      label: i18n.t('shared.config.k58'),
      labelKey: 'shared.config.k58',
      icon: 'Clock',
      path: HRM_PATHS.settingAttendanceRule,
      permission: 'hrm:attendance_rule:read',
      order: 1,
      group: 'setting',
      description: i18n.t('shared.config.k59'),
    },
    {
      code: 'hrm-payroll-template',
      label: i18n.t('shared.config.k60'),
      labelKey: 'shared.config.k60',
      icon: 'Wallet',
      path: HRM_PATHS.settingPayrollTemplate,
      permission: 'hrm:payroll_template:read',
      order: 2,
      group: 'setting',
      description: i18n.t('shared.config.k61'),
    },
    {
      code: 'hrm-recruitment-flow',
      label: i18n.t('shared.config.k62'),
      labelKey: 'shared.config.k62',
      icon: 'UserPlus',
      path: HRM_PATHS.settingRecruitmentFlow,
      permission: 'hrm:recruitment_flow:read',
      order: 3,
      group: 'setting',
      description: i18n.t('shared.config.k63'),
    },
    {
      code: 'hrm-training-plan',
      label: i18n.t('shared.config.k64'),
      labelKey: 'shared.config.k64',
      icon: 'GraduationCap',
      path: HRM_PATHS.settingTrainingPlan,
      permission: 'hrm:training_plan:read',
      order: 4,
      group: 'setting',
      description: i18n.t('shared.config.k65'),
    },
  ],
};
