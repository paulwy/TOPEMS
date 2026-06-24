import { create } from 'zustand';
import type {
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
  Risk,
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
} from '../api/pm';
import {
  projectApi,
  taskApi,
  milestoneApi,
  riskApi,
  contractApi,
  reportApi,
  dashboardApi,
} from '../api/pm';

export interface PmStore {
  // ==================== State ====================
  projects: Project[];
  projectsTotal: number;
  projectsPage: number;
  projectsPageSize: number;

  tasks: Task[];
  tasksTotal: number;
  tasksPage: number;
  tasksPageSize: number;

  milestones: Milestone[];
  milestonesTotal: number;
  milestonesPage: number;
  milestonesPageSize: number;

  risks: Risk[];
  risksTotal: number;
  risksPage: number;
  risksPageSize: number;

  contracts: Contract[];
  contractsTotal: number;
  contractsPage: number;
  contractsPageSize: number;

  reports: ProjectReport[];
  reportsTotal: number;
  reportsPage: number;
  reportsPageSize: number;

  dashboardSummary: PmDashboardSummary | null;

  loading: boolean;
  error: string | null;

  // ==================== Project Actions ====================
  loadProjects: (params?: ProjectQueryParams) => Promise<void>;
  loadProject: (id: string) => Promise<Project | null>;
  addProject: (data: CreateProjectRequest) => Promise<Project | null>;
  updateProject: (id: string, data: UpdateProjectRequest) => Promise<Project | null>;
  removeProject: (id: string) => Promise<void>;
  removeProjects: (ids: string[]) => Promise<void>;

  // ==================== Task Actions ====================
  loadTasks: (params?: TaskQueryParams) => Promise<void>;
  loadTask: (id: string) => Promise<Task | null>;
  addTask: (data: CreateTaskRequest) => Promise<Task | null>;
  updateTask: (id: string, data: UpdateTaskRequest) => Promise<Task | null>;
  removeTask: (id: string) => Promise<void>;
  removeTasks: (ids: string[]) => Promise<void>;

  // ==================== Milestone Actions ====================
  loadMilestones: (params?: MilestoneQueryParams) => Promise<void>;
  addMilestone: (data: CreateMilestoneRequest) => Promise<Milestone | null>;
  updateMilestone: (id: string, data: UpdateMilestoneRequest) => Promise<Milestone | null>;
  removeMilestone: (id: string) => Promise<void>;

  // ==================== Risk Actions ====================
  loadRisks: (params?: RiskQueryParams) => Promise<void>;
  addRisk: (data: CreateRiskRequest) => Promise<Risk | null>;
  updateRisk: (id: string, data: UpdateRiskRequest) => Promise<Risk | null>;
  removeRisk: (id: string) => Promise<void>;

  // ==================== Contract Actions ====================
  loadContracts: (params?: ContractQueryParams) => Promise<void>;
  addContract: (data: CreateContractRequest) => Promise<Contract | null>;
  updateContract: (id: string, data: UpdateContractRequest) => Promise<Contract | null>;
  removeContract: (id: string) => Promise<void>;

  // ==================== Report Actions ====================
  loadReports: (params?: ReportQueryParams) => Promise<void>;
  addReport: (data: CreateReportRequest) => Promise<ProjectReport | null>;
  updateReport: (id: string, data: UpdateReportRequest) => Promise<ProjectReport | null>;
  removeReport: (id: string) => Promise<void>;
  generateReport: (data: CreateReportRequest) => Promise<ProjectReport | null>;

  // ==================== Dashboard Actions ====================
  loadDashboardSummary: () => Promise<void>;

  // ==================== UI Actions ====================
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  projects: [] as Project[],
  projectsTotal: 0,
  projectsPage: 1,
  projectsPageSize: 10,

  tasks: [] as Task[],
  tasksTotal: 0,
  tasksPage: 1,
  tasksPageSize: 10,

  milestones: [] as Milestone[],
  milestonesTotal: 0,
  milestonesPage: 1,
  milestonesPageSize: 10,

  risks: [] as Risk[],
  risksTotal: 0,
  risksPage: 1,
  risksPageSize: 10,

  contracts: [] as Contract[],
  contractsTotal: 0,
  contractsPage: 1,
  contractsPageSize: 10,

  reports: [] as ProjectReport[],
  reportsTotal: 0,
  reportsPage: 1,
  reportsPageSize: 10,

  dashboardSummary: null as PmDashboardSummary | null,

  loading: false,
  error: null as string | null,
};

const handleError = (err: unknown, fallback: string): string => {
  if (err instanceof Error) {
    return err.message;
  }
  return fallback;
};

export const usePmStore = create<PmStore>((set) => ({
  ...initialState,

  // ==================== Project Actions ====================
  loadProjects: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await projectApi.list(params);
      set({
        projects: response.items,
        projectsTotal: response.total,
        projectsPage: response.page,
        projectsPageSize: response.pageSize,
      });
    } catch (err: unknown) {
      set({ error: handleError(err, '加载项目列表失败') });
    } finally {
      set({ loading: false });
    }
  },

  loadProject: async (id) => {
    try {
      return await projectApi.get(id);
    } catch (err: unknown) {
      set({ error: handleError(err, '加载项目详情失败') });
      return null;
    }
  },

  addProject: async (data) => {
    try {
      const project = await projectApi.create(data);
      set((state) => ({
        projects: [project, ...state.projects],
        projectsTotal: state.projectsTotal + 1,
      }));
      return project;
    } catch (err: unknown) {
      set({ error: handleError(err, '创建项目失败') });
      return null;
    }
  },

  updateProject: async (id, data) => {
    try {
      const project = await projectApi.update(id, data);
      set((state) => ({
        projects: state.projects.map((p) => (p.id === id ? project : p)),
      }));
      return project;
    } catch (err: unknown) {
      set({ error: handleError(err, '更新项目失败') });
      return null;
    }
  },

  removeProject: async (id) => {
    try {
      await projectApi.delete(id);
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        projectsTotal: Math.max(0, state.projectsTotal - 1),
      }));
    } catch (err: unknown) {
      set({ error: handleError(err, '删除项目失败') });
    }
  },

  removeProjects: async (ids) => {
    try {
      await projectApi.batchDelete(ids);
      set((state) => ({
        projects: state.projects.filter((p) => !ids.includes(p.id)),
        projectsTotal: Math.max(0, state.projectsTotal - ids.length),
      }));
    } catch (err: unknown) {
      set({ error: handleError(err, '批量删除项目失败') });
    }
  },

  // ==================== Task Actions ====================
  loadTasks: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await taskApi.list(params);
      set({
        tasks: response.items,
        tasksTotal: response.total,
        tasksPage: response.page,
        tasksPageSize: response.pageSize,
      });
    } catch (err: unknown) {
      set({ error: handleError(err, '加载任务列表失败') });
    } finally {
      set({ loading: false });
    }
  },

  loadTask: async (id) => {
    try {
      return await taskApi.get(id);
    } catch (err: unknown) {
      set({ error: handleError(err, '加载任务详情失败') });
      return null;
    }
  },

  addTask: async (data) => {
    try {
      const task = await taskApi.create(data);
      set((state) => ({
        tasks: [task, ...state.tasks],
        tasksTotal: state.tasksTotal + 1,
      }));
      return task;
    } catch (err: unknown) {
      set({ error: handleError(err, '创建任务失败') });
      return null;
    }
  },

  updateTask: async (id, data) => {
    try {
      const task = await taskApi.update(id, data);
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? task : t)),
      }));
      return task;
    } catch (err: unknown) {
      set({ error: handleError(err, '更新任务失败') });
      return null;
    }
  },

  removeTask: async (id) => {
    try {
      await taskApi.delete(id);
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
        tasksTotal: Math.max(0, state.tasksTotal - 1),
      }));
    } catch (err: unknown) {
      set({ error: handleError(err, '删除任务失败') });
    }
  },

  removeTasks: async (ids) => {
    try {
      await taskApi.batchDelete(ids);
      set((state) => ({
        tasks: state.tasks.filter((t) => !ids.includes(t.id)),
        tasksTotal: Math.max(0, state.tasksTotal - ids.length),
      }));
    } catch (err: unknown) {
      set({ error: handleError(err, '批量删除任务失败') });
    }
  },

  // ==================== Milestone Actions ====================
  loadMilestones: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await milestoneApi.list(params);
      set({
        milestones: response.items,
        milestonesTotal: response.total,
        milestonesPage: response.page,
        milestonesPageSize: response.pageSize,
      });
    } catch (err: unknown) {
      set({ error: handleError(err, '加载里程碑列表失败') });
    } finally {
      set({ loading: false });
    }
  },

  addMilestone: async (data) => {
    try {
      const milestone = await milestoneApi.create(data);
      set((state) => ({
        milestones: [milestone, ...state.milestones],
        milestonesTotal: state.milestonesTotal + 1,
      }));
      return milestone;
    } catch (err: unknown) {
      set({ error: handleError(err, '创建里程碑失败') });
      return null;
    }
  },

  updateMilestone: async (id, data) => {
    try {
      const milestone = await milestoneApi.update(id, data);
      set((state) => ({
        milestones: state.milestones.map((m) => (m.id === id ? milestone : m)),
      }));
      return milestone;
    } catch (err: unknown) {
      set({ error: handleError(err, '更新里程碑失败') });
      return null;
    }
  },

  removeMilestone: async (id) => {
    try {
      await milestoneApi.delete(id);
      set((state) => ({
        milestones: state.milestones.filter((m) => m.id !== id),
        milestonesTotal: Math.max(0, state.milestonesTotal - 1),
      }));
    } catch (err: unknown) {
      set({ error: handleError(err, '删除里程碑失败') });
    }
  },

  // ==================== Risk Actions ====================
  loadRisks: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await riskApi.list(params);
      set({
        risks: response.items,
        risksTotal: response.total,
        risksPage: response.page,
        risksPageSize: response.pageSize,
      });
    } catch (err: unknown) {
      set({ error: handleError(err, '加载风险列表失败') });
    } finally {
      set({ loading: false });
    }
  },

  addRisk: async (data) => {
    try {
      const risk = await riskApi.create(data);
      set((state) => ({
        risks: [risk, ...state.risks],
        risksTotal: state.risksTotal + 1,
      }));
      return risk;
    } catch (err: unknown) {
      set({ error: handleError(err, '创建风险失败') });
      return null;
    }
  },

  updateRisk: async (id, data) => {
    try {
      const risk = await riskApi.update(id, data);
      set((state) => ({
        risks: state.risks.map((r) => (r.id === id ? risk : r)),
      }));
      return risk;
    } catch (err: unknown) {
      set({ error: handleError(err, '更新风险失败') });
      return null;
    }
  },

  removeRisk: async (id) => {
    try {
      await riskApi.delete(id);
      set((state) => ({
        risks: state.risks.filter((r) => r.id !== id),
        risksTotal: Math.max(0, state.risksTotal - 1),
      }));
    } catch (err: unknown) {
      set({ error: handleError(err, '删除风险失败') });
    }
  },

  // ==================== Contract Actions ====================
  loadContracts: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await contractApi.list(params);
      set({
        contracts: response.items,
        contractsTotal: response.total,
        contractsPage: response.page,
        contractsPageSize: response.pageSize,
      });
    } catch (err: unknown) {
      set({ error: handleError(err, '加载合同列表失败') });
    } finally {
      set({ loading: false });
    }
  },

  addContract: async (data) => {
    try {
      const contract = await contractApi.create(data);
      set((state) => ({
        contracts: [contract, ...state.contracts],
        contractsTotal: state.contractsTotal + 1,
      }));
      return contract;
    } catch (err: unknown) {
      set({ error: handleError(err, '创建合同失败') });
      return null;
    }
  },

  updateContract: async (id, data) => {
    try {
      const contract = await contractApi.update(id, data);
      set((state) => ({
        contracts: state.contracts.map((c) => (c.id === id ? contract : c)),
      }));
      return contract;
    } catch (err: unknown) {
      set({ error: handleError(err, '更新合同失败') });
      return null;
    }
  },

  removeContract: async (id) => {
    try {
      await contractApi.delete(id);
      set((state) => ({
        contracts: state.contracts.filter((c) => c.id !== id),
        contractsTotal: Math.max(0, state.contractsTotal - 1),
      }));
    } catch (err: unknown) {
      set({ error: handleError(err, '删除合同失败') });
    }
  },

  // ==================== Report Actions ====================
  loadReports: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await reportApi.list(params);
      set({
        reports: response.items,
        reportsTotal: response.total,
        reportsPage: response.page,
        reportsPageSize: response.pageSize,
      });
    } catch (err: unknown) {
      set({ error: handleError(err, '加载报表列表失败') });
    } finally {
      set({ loading: false });
    }
  },

  addReport: async (data) => {
    try {
      const report = await reportApi.create(data);
      set((state) => ({
        reports: [report, ...state.reports],
        reportsTotal: state.reportsTotal + 1,
      }));
      return report;
    } catch (err: unknown) {
      set({ error: handleError(err, '创建报表失败') });
      return null;
    }
  },

  updateReport: async (id, data) => {
    try {
      const report = await reportApi.update(id, data);
      set((state) => ({
        reports: state.reports.map((r) => (r.id === id ? report : r)),
      }));
      return report;
    } catch (err: unknown) {
      set({ error: handleError(err, '更新报表失败') });
      return null;
    }
  },

  removeReport: async (id) => {
    try {
      await reportApi.delete(id);
      set((state) => ({
        reports: state.reports.filter((r) => r.id !== id),
        reportsTotal: Math.max(0, state.reportsTotal - 1),
      }));
    } catch (err: unknown) {
      set({ error: handleError(err, '删除报表失败') });
    }
  },

  generateReport: async (data) => {
    try {
      const report = await reportApi.generate(data);
      set((state) => ({
        reports: [report, ...state.reports],
        reportsTotal: state.reportsTotal + 1,
      }));
      return report;
    } catch (err: unknown) {
      set({ error: handleError(err, '生成报表失败') });
      return null;
    }
  },

  // ==================== Dashboard Actions ====================
  loadDashboardSummary: async () => {
    set({ loading: true, error: null });
    try {
      const summary = await dashboardApi.summary();
      set({ dashboardSummary: summary });
    } catch (err: unknown) {
      set({ error: handleError(err, '加载仪表盘数据失败') });
    } finally {
      set({ loading: false });
    }
  },

  // ==================== UI Actions ====================
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
