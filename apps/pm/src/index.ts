// TOPEMS PM module unified exports
// Project Management Module

// ==================== API ====================
export {
  pmApi,
  projectApi,
  taskApi,
  milestoneApi,
  ganttApi,
  riskApi,
  contractApi,
  reportApi,
  dashboardApi,
} from './api';

export type {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectQueryParams,
  Task,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskQueryParams,
  Milestone,
  CreateMilestoneRequest,
  UpdateMilestoneRequest,
  MilestoneQueryParams,
  GanttPhase,
  GanttMilestone,
  GanttResource,
  ProjectGanttResponse,
  Risk,
  Issue,
  CreateRiskRequest,
  UpdateRiskRequest,
  RiskQueryParams,
  Contract,
  CreateContractRequest,
  UpdateContractRequest,
  ContractQueryParams,
  ProjectReport,
  CreateReportRequest,
  UpdateReportRequest,
  ReportQueryParams,
  PmDashboardSummary,
} from './api';

// ==================== Store ====================
export { usePmStore } from './store';
export type { PmStore } from './store';

// ==================== Pages ====================
export {
  DashboardPage,
  ProjectListPage,
  ProjectDetailPage,
  ProjectTaskPage,
  GanttChartPage,
  MilestonePage,
  RiskManagementPage,
  ContractListPage,
  ProjectReportPage,
} from './pages';
