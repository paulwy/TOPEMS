import { create } from 'zustand';
import type {
  ProductionOrder,
  CreateProductionOrderRequest,
  UpdateProductionOrderRequest,
  ProductionOrderQueryParams,
  ProductionProcess,
  CreateProductionProcessRequest,
  UpdateProductionProcessRequest,
  ProductionProcessQueryParams,
  WorkStation,
  CreateWorkStationRequest,
  UpdateWorkStationRequest,
  WorkStationQueryParams,
  ProductionRecord,
  CreateProductionRecordRequest,
  UpdateProductionRecordRequest,
  ProductionRecordQueryParams,
  Equipment,
  CreateEquipmentRequest,
  UpdateEquipmentRequest,
  EquipmentQueryParams,
  MesInspectionRecord,
  CreateInspectionRecord,
  MaintenanceRecord,
  CreateMaintenanceRecord,
  UpdateMaintenanceStatus,
  EquipmentStatistics,
  MesDashboardSummary,
  LimsSample,
  CreateSampleRequest,
  UpdateSampleRequest,
  SampleQueryParams,
  InspectionTask,
  CreateInspectionTaskRequest,
  InspectionTaskQueryParams,
  Instrument,
  CreateInstrumentRequest,
  UpdateInstrumentRequest,
  InstrumentQueryParams,
  LimsStatistics,
  QualityStandard,
  CreateQualityStandardRequest,
  QualityCheck,
  CreateQualityCheckRequest,
  QualityCheckQueryParams,
  QualityIssue,
  CreateQualityIssueRequest,
  QualityImprovement,
  CreateQualityImprovementRequest,
  QmsStatistics,
  SafetyCheck,
  CreateSafetyCheckRequest,
  SafetyCheckQueryParams,
  InspectionPlan,
  CreateInspectionPlanRequest,
  EhsStatistics,
} from '../api';
import {
  productionOrderApi,
  productionProcessApi,
  workStationApi,
  productionRecordApi,
  equipmentApi,
  inspectionApi,
  maintenanceApi,
  dashboardApi as mesDashboardApi,
  sampleApi,
  taskApi,
  instrumentApi,
  limsDashboardApi,
  qualityStandardApi,
  qualityCheckApi,
  qualityIssueApi,
  qualityImprovementApi,
  qmsDashboardApi,
  safetyCheckApi,
  inspectionPlanApi,
} from '../api';

export interface MesStore {
  // ==================== MES State ====================
  productionOrders: ProductionOrder[];
  productionOrdersTotal: number;
  productionOrdersPage: number;
  productionOrdersPageSize: number;

  productionProcesses: ProductionProcess[];
  productionProcessesTotal: number;
  productionProcessesPage: number;
  productionProcessesPageSize: number;

  workStations: WorkStation[];
  workStationsTotal: number;
  workStationsPage: number;
  workStationsPageSize: number;

  productionRecords: ProductionRecord[];
  productionRecordsTotal: number;
  productionRecordsPage: number;
  productionRecordsPageSize: number;

  equipment: Equipment[];
  equipmentTotal: number;
  equipmentPage: number;
  equipmentPageSize: number;
  equipmentStatistics: EquipmentStatistics | null;

  inspections: MesInspectionRecord[];
  inspectionsTotal: number;
  inspectionsPage: number;
  inspectionsPageSize: number;

  maintenances: MaintenanceRecord[];
  maintenancesTotal: number;
  maintenancesPage: number;
  maintenancesPageSize: number;

  mesDashboard: MesDashboardSummary | null;

  // ==================== LIMS State ====================
  limsSamples: LimsSample[];
  limsSamplesTotal: number;
  limsSamplesPage: number;
  limsSamplesPageSize: number;

  limsTasks: InspectionTask[];
  limsTasksTotal: number;
  limsTasksPage: number;
  limsTasksPageSize: number;

  instruments: Instrument[];
  instrumentsTotal: number;
  instrumentsPage: number;
  instrumentsPageSize: number;

  limsStatistics: LimsStatistics | null;

  // ==================== QMS State ====================
  qualityStandards: QualityStandard[];
  qualityStandardsTotal: number;
  qualityStandardsPage: number;
  qualityStandardsPageSize: number;

  qualityChecks: QualityCheck[];
  qualityChecksTotal: number;
  qualityChecksPage: number;
  qualityChecksPageSize: number;

  qualityIssues: QualityIssue[];
  qualityIssuesTotal: number;
  qualityIssuesPage: number;
  qualityIssuesPageSize: number;

  qualityImprovements: QualityImprovement[];
  qualityImprovementsTotal: number;
  qualityImprovementsPage: number;
  qualityImprovementsPageSize: number;

  qmsStatistics: QmsStatistics | null;

  // ==================== EHS State ====================
  safetyChecks: SafetyCheck[];
  safetyChecksTotal: number;
  safetyChecksPage: number;
  safetyChecksPageSize: number;

  inspectionPlans: InspectionPlan[];
  inspectionPlansTotal: number;
  inspectionPlansPage: number;
  inspectionPlansPageSize: number;

  ehsStatistics: EhsStatistics | null;

  // ==================== Common State ====================
  loading: boolean;
  error: string | null;

  // ==================== MES Actions ====================
  loadProductionOrders: (params?: ProductionOrderQueryParams) => Promise<void>;
  addProductionOrder: (data: CreateProductionOrderRequest) => Promise<ProductionOrder | null>;
  updateProductionOrder: (
    id: string,
    data: UpdateProductionOrderRequest
  ) => Promise<ProductionOrder | null>;
  removeProductionOrder: (id: string) => Promise<void>;

  loadProductionProcesses: (params?: ProductionProcessQueryParams) => Promise<void>;
  addProductionProcess: (data: CreateProductionProcessRequest) => Promise<ProductionProcess | null>;
  updateProductionProcess: (
    id: string,
    data: UpdateProductionProcessRequest
  ) => Promise<ProductionProcess | null>;
  removeProductionProcess: (id: string) => Promise<void>;

  loadWorkStations: (params?: WorkStationQueryParams) => Promise<void>;
  addWorkStation: (data: CreateWorkStationRequest) => Promise<WorkStation | null>;
  updateWorkStation: (
    id: string,
    data: UpdateWorkStationRequest
  ) => Promise<WorkStation | null>;
  removeWorkStation: (id: string) => Promise<void>;

  loadProductionRecords: (params?: ProductionRecordQueryParams) => Promise<void>;
  addProductionRecord: (data: CreateProductionRecordRequest) => Promise<ProductionRecord | null>;
  updateProductionRecord: (
    id: string,
    data: UpdateProductionRecordRequest
  ) => Promise<ProductionRecord | null>;
  removeProductionRecord: (id: string) => Promise<void>;

  loadEquipment: (params?: EquipmentQueryParams) => Promise<void>;
  loadEquipmentStatistics: () => Promise<void>;
  addEquipment: (data: CreateEquipmentRequest) => Promise<Equipment | null>;
  updateEquipment: (id: string, data: UpdateEquipmentRequest) => Promise<Equipment | null>;
  removeEquipment: (id: string) => Promise<void>;

  loadInspections: (params?: { page?: number; pageSize?: number }) => Promise<void>;
  addInspection: (data: CreateInspectionRecord) => Promise<MesInspectionRecord | null>;

  loadMaintenances: (params?: { page?: number; pageSize?: number }) => Promise<void>;
  addMaintenance: (data: CreateMaintenanceRecord) => Promise<MaintenanceRecord | null>;
  updateMaintenanceStatus: (
    id: string,
    data: UpdateMaintenanceStatus
  ) => Promise<MaintenanceRecord | null>;

  loadMesDashboard: () => Promise<void>;

  // ==================== LIMS Actions ====================
  loadLimsSamples: (params?: SampleQueryParams) => Promise<void>;
  addLimsSample: (data: CreateSampleRequest) => Promise<LimsSample | null>;
  updateLimsSample: (id: string, data: UpdateSampleRequest) => Promise<LimsSample | null>;
  removeLimsSample: (id: string) => Promise<void>;

  loadLimsTasks: (params?: InspectionTaskQueryParams) => Promise<void>;
  addLimsTask: (data: CreateInspectionTaskRequest) => Promise<InspectionTask | null>;

  loadInstruments: (params?: InstrumentQueryParams) => Promise<void>;
  addInstrument: (data: CreateInstrumentRequest) => Promise<Instrument | null>;
  updateInstrument: (
    id: string,
    data: UpdateInstrumentRequest
  ) => Promise<Instrument | null>;
  removeInstrument: (id: string) => Promise<void>;

  loadLimsStatistics: () => Promise<void>;

  // ==================== QMS Actions ====================
  loadQualityStandards: (params?: { page?: number; pageSize?: number }) => Promise<void>;
  addQualityStandard: (data: CreateQualityStandardRequest) => Promise<QualityStandard | null>;
  removeQualityStandard: (id: string) => Promise<void>;

  loadQualityChecks: (params?: QualityCheckQueryParams) => Promise<void>;
  addQualityCheck: (data: CreateQualityCheckRequest) => Promise<QualityCheck | null>;
  removeQualityCheck: (id: string) => Promise<void>;

  loadQualityIssues: (params?: { page?: number; pageSize?: number }) => Promise<void>;
  addQualityIssue: (data: CreateQualityIssueRequest) => Promise<QualityIssue | null>;
  removeQualityIssue: (id: string) => Promise<void>;

  loadQualityImprovements: (params?: { page?: number; pageSize?: number }) => Promise<void>;
  addQualityImprovement: (
    data: CreateQualityImprovementRequest
  ) => Promise<QualityImprovement | null>;
  removeQualityImprovement: (id: string) => Promise<void>;

  loadQmsStatistics: () => Promise<void>;

  // ==================== EHS Actions ====================
  loadSafetyChecks: (params?: SafetyCheckQueryParams) => Promise<void>;
  addSafetyCheck: (data: CreateSafetyCheckRequest) => Promise<SafetyCheck | null>;
  removeSafetyCheck: (id: string) => Promise<void>;

  loadInspectionPlans: (params?: { page?: number; pageSize?: number }) => Promise<void>;
  addInspectionPlan: (data: CreateInspectionPlanRequest) => Promise<InspectionPlan | null>;
  removeInspectionPlan: (id: string) => Promise<void>;

  loadEhsStatistics: () => Promise<void>;

  // ==================== UI Actions ====================
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  // MES
  productionOrders: [] as ProductionOrder[],
  productionOrdersTotal: 0,
  productionOrdersPage: 1,
  productionOrdersPageSize: 10,

  productionProcesses: [] as ProductionProcess[],
  productionProcessesTotal: 0,
  productionProcessesPage: 1,
  productionProcessesPageSize: 10,

  workStations: [] as WorkStation[],
  workStationsTotal: 0,
  workStationsPage: 1,
  workStationsPageSize: 10,

  productionRecords: [] as ProductionRecord[],
  productionRecordsTotal: 0,
  productionRecordsPage: 1,
  productionRecordsPageSize: 10,

  equipment: [] as Equipment[],
  equipmentTotal: 0,
  equipmentPage: 1,
  equipmentPageSize: 10,
  equipmentStatistics: null as EquipmentStatistics | null,

  inspections: [] as MesInspectionRecord[],
  inspectionsTotal: 0,
  inspectionsPage: 1,
  inspectionsPageSize: 10,

  maintenances: [] as MaintenanceRecord[],
  maintenancesTotal: 0,
  maintenancesPage: 1,
  maintenancesPageSize: 10,

  mesDashboard: null as MesDashboardSummary | null,

  // LIMS
  limsSamples: [] as LimsSample[],
  limsSamplesTotal: 0,
  limsSamplesPage: 1,
  limsSamplesPageSize: 10,

  limsTasks: [] as InspectionTask[],
  limsTasksTotal: 0,
  limsTasksPage: 1,
  limsTasksPageSize: 10,

  instruments: [] as Instrument[],
  instrumentsTotal: 0,
  instrumentsPage: 1,
  instrumentsPageSize: 10,

  limsStatistics: null as LimsStatistics | null,

  // QMS
  qualityStandards: [] as QualityStandard[],
  qualityStandardsTotal: 0,
  qualityStandardsPage: 1,
  qualityStandardsPageSize: 10,

  qualityChecks: [] as QualityCheck[],
  qualityChecksTotal: 0,
  qualityChecksPage: 1,
  qualityChecksPageSize: 10,

  qualityIssues: [] as QualityIssue[],
  qualityIssuesTotal: 0,
  qualityIssuesPage: 1,
  qualityIssuesPageSize: 10,

  qualityImprovements: [] as QualityImprovement[],
  qualityImprovementsTotal: 0,
  qualityImprovementsPage: 1,
  qualityImprovementsPageSize: 10,

  qmsStatistics: null as QmsStatistics | null,

  // EHS
  safetyChecks: [] as SafetyCheck[],
  safetyChecksTotal: 0,
  safetyChecksPage: 1,
  safetyChecksPageSize: 10,

  inspectionPlans: [] as InspectionPlan[],
  inspectionPlansTotal: 0,
  inspectionPlansPage: 1,
  inspectionPlansPageSize: 10,

  ehsStatistics: null as EhsStatistics | null,

  // Common
  loading: false,
  error: null as string | null,
};

const handleError = (err: unknown, fallback: string): string => {
  if (err instanceof Error) {
    return err.message;
  }
  return fallback;
};

export const useMesStore = create<MesStore>((set) => ({
  ...initialState,

  // ==================== MES Production Order ====================
  loadProductionOrders: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await productionOrderApi.list(params);
      set({
        productionOrders: response.items,
        productionOrdersTotal: response.total,
        productionOrdersPage: response.page,
        productionOrdersPageSize: response.pageSize,
      });
    } catch (err: unknown) {
      set({ error: handleError(err, '加载生产订单失败') });
    } finally {
      set({ loading: false });
    }
  },

  addProductionOrder: async (data) => {
    try {
      const order = await productionOrderApi.create(data);
      set((state) => ({
        productionOrders: [order, ...state.productionOrders],
        productionOrdersTotal: state.productionOrdersTotal + 1,
      }));
      return order;
    } catch (err: unknown) {
      set({ error: handleError(err, '创建生产订单失败') });
      return null;
    }
  },

  updateProductionOrder: async (id, data) => {
    try {
      const order = await productionOrderApi.update(id, data);
      set((state) => ({
        productionOrders: state.productionOrders.map((o) => (o.id === id ? order : o)),
      }));
      return order;
    } catch (err: unknown) {
      set({ error: handleError(err, '更新生产订单失败') });
      return null;
    }
  },

  removeProductionOrder: async (id) => {
    try {
      await productionOrderApi.delete(id);
      set((state) => ({
        productionOrders: state.productionOrders.filter((o) => o.id !== id),
        productionOrdersTotal: Math.max(0, state.productionOrdersTotal - 1),
      }));
    } catch (err: unknown) {
      set({ error: handleError(err, '删除生产订单失败') });
    }
  },

  // ==================== MES Production Process ====================
  loadProductionProcesses: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await productionProcessApi.list(params);
      set({
        productionProcesses: response.items,
        productionProcessesTotal: response.total,
        productionProcessesPage: response.page,
        productionProcessesPageSize: response.pageSize,
      });
    } catch (err: unknown) {
      set({ error: handleError(err, '加载生产工序失败') });
    } finally {
      set({ loading: false });
    }
  },

  addProductionProcess: async (data) => {
    try {
      const process = await productionProcessApi.create(data);
      set((state) => ({
        productionProcesses: [process, ...state.productionProcesses],
        productionProcessesTotal: state.productionProcessesTotal + 1,
      }));
      return process;
    } catch (err: unknown) {
      set({ error: handleError(err, '创建生产工序失败') });
      return null;
    }
  },

  updateProductionProcess: async (id, data) => {
    try {
      const process = await productionProcessApi.update(id, data);
      set((state) => ({
        productionProcesses: state.productionProcesses.map((p) => (p.id === id ? process : p)),
      }));
      return process;
    } catch (err: unknown) {
      set({ error: handleError(err, '更新生产工序失败') });
      return null;
    }
  },

  removeProductionProcess: async (id) => {
    try {
      await productionProcessApi.delete(id);
      set((state) => ({
        productionProcesses: state.productionProcesses.filter((p) => p.id !== id),
        productionProcessesTotal: Math.max(0, state.productionProcessesTotal - 1),
      }));
    } catch (err: unknown) {
      set({ error: handleError(err, '删除生产工序失败') });
    }
  },

  // ==================== MES WorkStation ====================
  loadWorkStations: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await workStationApi.list(params);
      set({
        workStations: response.items,
        workStationsTotal: response.total,
        workStationsPage: response.page,
        workStationsPageSize: response.pageSize,
      });
    } catch (err: unknown) {
      set({ error: handleError(err, '加载工作站失败') });
    } finally {
      set({ loading: false });
    }
  },

  addWorkStation: async (data) => {
    try {
      const station = await workStationApi.create(data);
      set((state) => ({
        workStations: [station, ...state.workStations],
        workStationsTotal: state.workStationsTotal + 1,
      }));
      return station;
    } catch (err: unknown) {
      set({ error: handleError(err, '创建工作站失败') });
      return null;
    }
  },

  updateWorkStation: async (id, data) => {
    try {
      const station = await workStationApi.update(id, data);
      set((state) => ({
        workStations: state.workStations.map((s) => (s.id === id ? station : s)),
      }));
      return station;
    } catch (err: unknown) {
      set({ error: handleError(err, '更新工作站失败') });
      return null;
    }
  },

  removeWorkStation: async (id) => {
    try {
      await workStationApi.delete(id);
      set((state) => ({
        workStations: state.workStations.filter((s) => s.id !== id),
        workStationsTotal: Math.max(0, state.workStationsTotal - 1),
      }));
    } catch (err: unknown) {
      set({ error: handleError(err, '删除工作站失败') });
    }
  },

  // ==================== MES Production Record ====================
  loadProductionRecords: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await productionRecordApi.list(params);
      set({
        productionRecords: response.items,
        productionRecordsTotal: response.total,
        productionRecordsPage: response.page,
        productionRecordsPageSize: response.pageSize,
      });
    } catch (err: unknown) {
      set({ error: handleError(err, '加载生产记录失败') });
    } finally {
      set({ loading: false });
    }
  },

  addProductionRecord: async (data) => {
    try {
      const record = await productionRecordApi.create(data);
      set((state) => ({
        productionRecords: [record, ...state.productionRecords],
        productionRecordsTotal: state.productionRecordsTotal + 1,
      }));
      return record;
    } catch (err: unknown) {
      set({ error: handleError(err, '创建生产记录失败') });
      return null;
    }
  },

  updateProductionRecord: async (id, data) => {
    try {
      const record = await productionRecordApi.update(id, data);
      set((state) => ({
        productionRecords: state.productionRecords.map((r) => (r.id === id ? record : r)),
      }));
      return record;
    } catch (err: unknown) {
      set({ error: handleError(err, '更新生产记录失败') });
      return null;
    }
  },

  removeProductionRecord: async (id) => {
    try {
      await productionRecordApi.delete(id);
      set((state) => ({
        productionRecords: state.productionRecords.filter((r) => r.id !== id),
        productionRecordsTotal: Math.max(0, state.productionRecordsTotal - 1),
      }));
    } catch (err: unknown) {
      set({ error: handleError(err, '删除生产记录失败') });
    }
  },

  // ==================== MES Equipment ====================
  loadEquipment: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await equipmentApi.list(params);
      set({
        equipment: response.items,
        equipmentTotal: response.total,
        equipmentPage: response.page,
        equipmentPageSize: response.pageSize,
      });
    } catch (err: unknown) {
      set({ error: handleError(err, '加载设备列表失败') });
    } finally {
      set({ loading: false });
    }
  },

  loadEquipmentStatistics: async () => {
    try {
      const statistics = await equipmentApi.getStatistics();
      set({ equipmentStatistics: statistics });
    } catch (err: unknown) {
      set({ error: handleError(err, '加载设备统计失败') });
    }
  },

  addEquipment: async (data) => {
    try {
      const item = await equipmentApi.create(data);
      set((state) => ({
        equipment: [item, ...state.equipment],
        equipmentTotal: state.equipmentTotal + 1,
      }));
      return item;
    } catch (err: unknown) {
      set({ error: handleError(err, '创建设备失败') });
      return null;
    }
  },

  updateEquipment: async (id, data) => {
    try {
      const item = await equipmentApi.update(id, data);
      set((state) => ({
        equipment: state.equipment.map((e) => (e.id === id ? item : e)),
      }));
      return item;
    } catch (err: unknown) {
      set({ error: handleError(err, '更新设备失败') });
      return null;
    }
  },

  removeEquipment: async (id) => {
    try {
      await equipmentApi.delete(id);
      set((state) => ({
        equipment: state.equipment.filter((e) => e.id !== id),
        equipmentTotal: Math.max(0, state.equipmentTotal - 1),
      }));
    } catch (err: unknown) {
      set({ error: handleError(err, '删除设备失败') });
    }
  },

  // ==================== MES Inspection ====================
  loadInspections: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await inspectionApi.list(params);
      set({
        inspections: response.items,
        inspectionsTotal: response.total,
        inspectionsPage: response.page,
        inspectionsPageSize: response.pageSize,
      });
    } catch (err: unknown) {
      set({ error: handleError(err, '加载点检记录失败') });
    } finally {
      set({ loading: false });
    }
  },

  addInspection: async (data) => {
    try {
      const item = await inspectionApi.create(data);
      set((state) => ({
        inspections: [item, ...state.inspections],
        inspectionsTotal: state.inspectionsTotal + 1,
      }));
      return item;
    } catch (err: unknown) {
      set({ error: handleError(err, '创建点检记录失败') });
      return null;
    }
  },

  // ==================== MES Maintenance ====================
  loadMaintenances: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await maintenanceApi.list(params);
      set({
        maintenances: response.items,
        maintenancesTotal: response.total,
        maintenancesPage: response.page,
        maintenancesPageSize: response.pageSize,
      });
    } catch (err: unknown) {
      set({ error: handleError(err, '加载维护记录失败') });
    } finally {
      set({ loading: false });
    }
  },

  addMaintenance: async (data) => {
    try {
      const item = await maintenanceApi.create(data);
      set((state) => ({
        maintenances: [item, ...state.maintenances],
        maintenancesTotal: state.maintenancesTotal + 1,
      }));
      return item;
    } catch (err: unknown) {
      set({ error: handleError(err, '创建维护记录失败') });
      return null;
    }
  },

  updateMaintenanceStatus: async (id, data) => {
    try {
      const item = await maintenanceApi.updateStatus(id, data);
      set((state) => ({
        maintenances: state.maintenances.map((m) => (m.id === id ? item : m)),
      }));
      return item;
    } catch (err: unknown) {
      set({ error: handleError(err, '更新维护状态失败') });
      return null;
    }
  },

  // ==================== MES Dashboard ====================
  loadMesDashboard: async () => {
    set({ loading: true, error: null });
    try {
      const summary = await mesDashboardApi.summary();
      set({ mesDashboard: summary });
    } catch (err: unknown) {
      set({ error: handleError(err, '加载 MES 仪表盘失败') });
    } finally {
      set({ loading: false });
    }
  },

  // ==================== LIMS Samples ====================
  loadLimsSamples: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await sampleApi.list(params);
      set({
        limsSamples: response.items,
        limsSamplesTotal: response.total,
        limsSamplesPage: response.page,
        limsSamplesPageSize: response.pageSize,
      });
    } catch (err: unknown) {
      set({ error: handleError(err, '加载样品失败') });
    } finally {
      set({ loading: false });
    }
  },

  addLimsSample: async (data) => {
    try {
      const item = await sampleApi.create(data);
      set((state) => ({
        limsSamples: [item, ...state.limsSamples],
        limsSamplesTotal: state.limsSamplesTotal + 1,
      }));
      return item;
    } catch (err: unknown) {
      set({ error: handleError(err, '创建样品失败') });
      return null;
    }
  },

  updateLimsSample: async (id, data) => {
    try {
      const item = await sampleApi.update(id, data);
      set((state) => ({
        limsSamples: state.limsSamples.map((s) => (s.id === id ? item : s)),
      }));
      return item;
    } catch (err: unknown) {
      set({ error: handleError(err, '更新样品失败') });
      return null;
    }
  },

  removeLimsSample: async (id) => {
    try {
      await sampleApi.delete(id);
      set((state) => ({
        limsSamples: state.limsSamples.filter((s) => s.id !== id),
        limsSamplesTotal: Math.max(0, state.limsSamplesTotal - 1),
      }));
    } catch (err: unknown) {
      set({ error: handleError(err, '删除样品失败') });
    }
  },

  // ==================== LIMS Tasks ====================
  loadLimsTasks: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await taskApi.list(params);
      set({
        limsTasks: response.items,
        limsTasksTotal: response.total,
        limsTasksPage: response.page,
        limsTasksPageSize: response.pageSize,
      });
    } catch (err: unknown) {
      set({ error: handleError(err, '加载检验任务失败') });
    } finally {
      set({ loading: false });
    }
  },

  addLimsTask: async (data) => {
    try {
      const item = await taskApi.create(data);
      set((state) => ({
        limsTasks: [item, ...state.limsTasks],
        limsTasksTotal: state.limsTasksTotal + 1,
      }));
      return item;
    } catch (err: unknown) {
      set({ error: handleError(err, '创建检验任务失败') });
      return null;
    }
  },

  // ==================== LIMS Instruments ====================
  loadInstruments: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await instrumentApi.list(params);
      set({
        instruments: response.items,
        instrumentsTotal: response.total,
        instrumentsPage: response.page,
        instrumentsPageSize: response.pageSize,
      });
    } catch (err: unknown) {
      set({ error: handleError(err, '加载仪器失败') });
    } finally {
      set({ loading: false });
    }
  },

  addInstrument: async (data) => {
    try {
      const item = await instrumentApi.create(data);
      set((state) => ({
        instruments: [item, ...state.instruments],
        instrumentsTotal: state.instrumentsTotal + 1,
      }));
      return item;
    } catch (err: unknown) {
      set({ error: handleError(err, '创建仪器失败') });
      return null;
    }
  },

  updateInstrument: async (id, data) => {
    try {
      const item = await instrumentApi.update(id, data);
      set((state) => ({
        instruments: state.instruments.map((i) => (i.id === id ? item : i)),
      }));
      return item;
    } catch (err: unknown) {
      set({ error: handleError(err, '更新仪器失败') });
      return null;
    }
  },

  removeInstrument: async (id) => {
    try {
      await instrumentApi.delete(id);
      set((state) => ({
        instruments: state.instruments.filter((i) => i.id !== id),
        instrumentsTotal: Math.max(0, state.instrumentsTotal - 1),
      }));
    } catch (err: unknown) {
      set({ error: handleError(err, '删除仪器失败') });
    }
  },

  loadLimsStatistics: async () => {
    try {
      const statistics = await limsDashboardApi.getStatistics();
      set({ limsStatistics: statistics });
    } catch (err: unknown) {
      set({ error: handleError(err, '加载 LIMS 统计失败') });
    }
  },

  // ==================== QMS Standards ====================
  loadQualityStandards: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await qualityStandardApi.list(params);
      set({
        qualityStandards: response.items,
        qualityStandardsTotal: response.total,
        qualityStandardsPage: response.page,
        qualityStandardsPageSize: response.pageSize,
      });
    } catch (err: unknown) {
      set({ error: handleError(err, '加载质量标准失败') });
    } finally {
      set({ loading: false });
    }
  },

  addQualityStandard: async (data) => {
    try {
      const item = await qualityStandardApi.create(data);
      set((state) => ({
        qualityStandards: [item, ...state.qualityStandards],
        qualityStandardsTotal: state.qualityStandardsTotal + 1,
      }));
      return item;
    } catch (err: unknown) {
      set({ error: handleError(err, '创建质量标准失败') });
      return null;
    }
  },

  removeQualityStandard: async (id) => {
    try {
      await qualityStandardApi.delete(id);
      set((state) => ({
        qualityStandards: state.qualityStandards.filter((s) => s.id !== id),
        qualityStandardsTotal: Math.max(0, state.qualityStandardsTotal - 1),
      }));
    } catch (err: unknown) {
      set({ error: handleError(err, '删除质量标准失败') });
    }
  },

  // ==================== QMS Checks ====================
  loadQualityChecks: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await qualityCheckApi.list(params);
      set({
        qualityChecks: response.items,
        qualityChecksTotal: response.total,
        qualityChecksPage: response.page,
        qualityChecksPageSize: response.pageSize,
      });
    } catch (err: unknown) {
      set({ error: handleError(err, '加载质量检查失败') });
    } finally {
      set({ loading: false });
    }
  },

  addQualityCheck: async (data) => {
    try {
      const item = await qualityCheckApi.create(data);
      set((state) => ({
        qualityChecks: [item, ...state.qualityChecks],
        qualityChecksTotal: state.qualityChecksTotal + 1,
      }));
      return item;
    } catch (err: unknown) {
      set({ error: handleError(err, '创建质量检查失败') });
      return null;
    }
  },

  removeQualityCheck: async (id) => {
    try {
      await qualityCheckApi.delete(id);
      set((state) => ({
        qualityChecks: state.qualityChecks.filter((c) => c.id !== id),
        qualityChecksTotal: Math.max(0, state.qualityChecksTotal - 1),
      }));
    } catch (err: unknown) {
      set({ error: handleError(err, '删除质量检查失败') });
    }
  },

  // ==================== QMS Issues ====================
  loadQualityIssues: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await qualityIssueApi.list(params);
      set({
        qualityIssues: response.items,
        qualityIssuesTotal: response.total,
        qualityIssuesPage: response.page,
        qualityIssuesPageSize: response.pageSize,
      });
    } catch (err: unknown) {
      set({ error: handleError(err, '加载质量问题失败') });
    } finally {
      set({ loading: false });
    }
  },

  addQualityIssue: async (data) => {
    try {
      const item = await qualityIssueApi.create(data);
      set((state) => ({
        qualityIssues: [item, ...state.qualityIssues],
        qualityIssuesTotal: state.qualityIssuesTotal + 1,
      }));
      return item;
    } catch (err: unknown) {
      set({ error: handleError(err, '创建质量问题失败') });
      return null;
    }
  },

  removeQualityIssue: async (id) => {
    try {
      await qualityIssueApi.delete(id);
      set((state) => ({
        qualityIssues: state.qualityIssues.filter((i) => i.id !== id),
        qualityIssuesTotal: Math.max(0, state.qualityIssuesTotal - 1),
      }));
    } catch (err: unknown) {
      set({ error: handleError(err, '删除质量问题失败') });
    }
  },

  // ==================== QMS Improvements ====================
  loadQualityImprovements: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await qualityImprovementApi.list(params);
      set({
        qualityImprovements: response.items,
        qualityImprovementsTotal: response.total,
        qualityImprovementsPage: response.page,
        qualityImprovementsPageSize: response.pageSize,
      });
    } catch (err: unknown) {
      set({ error: handleError(err, '加载质量改进失败') });
    } finally {
      set({ loading: false });
    }
  },

  addQualityImprovement: async (data) => {
    try {
      const item = await qualityImprovementApi.create(data);
      set((state) => ({
        qualityImprovements: [item, ...state.qualityImprovements],
        qualityImprovementsTotal: state.qualityImprovementsTotal + 1,
      }));
      return item;
    } catch (err: unknown) {
      set({ error: handleError(err, '创建质量改进失败') });
      return null;
    }
  },

  removeQualityImprovement: async (id) => {
    try {
      await qualityImprovementApi.delete(id);
      set((state) => ({
        qualityImprovements: state.qualityImprovements.filter((i) => i.id !== id),
        qualityImprovementsTotal: Math.max(0, state.qualityImprovementsTotal - 1),
      }));
    } catch (err: unknown) {
      set({ error: handleError(err, '删除质量改进失败') });
    }
  },

  loadQmsStatistics: async () => {
    try {
      const statistics = await qmsDashboardApi.getQmsStatistics();
      set({ qmsStatistics: statistics });
    } catch (err: unknown) {
      set({ error: handleError(err, '加载 QMS 统计失败') });
    }
  },

  // ==================== EHS Safety Checks ====================
  loadSafetyChecks: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await safetyCheckApi.list(params);
      set({
        safetyChecks: response.items,
        safetyChecksTotal: response.total,
        safetyChecksPage: response.page,
        safetyChecksPageSize: response.pageSize,
      });
    } catch (err: unknown) {
      set({ error: handleError(err, '加载安全检查失败') });
    } finally {
      set({ loading: false });
    }
  },

  addSafetyCheck: async (data) => {
    try {
      const item = await safetyCheckApi.create(data);
      set((state) => ({
        safetyChecks: [item, ...state.safetyChecks],
        safetyChecksTotal: state.safetyChecksTotal + 1,
      }));
      return item;
    } catch (err: unknown) {
      set({ error: handleError(err, '创建安全检查失败') });
      return null;
    }
  },

  removeSafetyCheck: async (id) => {
    try {
      await safetyCheckApi.delete(id);
      set((state) => ({
        safetyChecks: state.safetyChecks.filter((c) => c.id !== id),
        safetyChecksTotal: Math.max(0, state.safetyChecksTotal - 1),
      }));
    } catch (err: unknown) {
      set({ error: handleError(err, '删除安全检查失败') });
    }
  },

  // ==================== EHS Inspection Plans ====================
  loadInspectionPlans: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await inspectionPlanApi.list(params);
      set({
        inspectionPlans: response.items,
        inspectionPlansTotal: response.total,
        inspectionPlansPage: response.page,
        inspectionPlansPageSize: response.pageSize,
      });
    } catch (err: unknown) {
      set({ error: handleError(err, '加载检查计划失败') });
    } finally {
      set({ loading: false });
    }
  },

  addInspectionPlan: async (data) => {
    try {
      const item = await inspectionPlanApi.create(data);
      set((state) => ({
        inspectionPlans: [item, ...state.inspectionPlans],
        inspectionPlansTotal: state.inspectionPlansTotal + 1,
      }));
      return item;
    } catch (err: unknown) {
      set({ error: handleError(err, '创建检查计划失败') });
      return null;
    }
  },

  removeInspectionPlan: async (id) => {
    try {
      await inspectionPlanApi.delete(id);
      set((state) => ({
        inspectionPlans: state.inspectionPlans.filter((p) => p.id !== id),
        inspectionPlansTotal: Math.max(0, state.inspectionPlansTotal - 1),
      }));
    } catch (err: unknown) {
      set({ error: handleError(err, '删除检查计划失败') });
    }
  },

  loadEhsStatistics: async () => {
    try {
      const statistics = await qmsDashboardApi.getEhsStatistics();
      set({ ehsStatistics: statistics });
    } catch (err: unknown) {
      set({ error: handleError(err, '加载 EHS 统计失败') });
    }
  },

  // ==================== UI Actions ====================
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
