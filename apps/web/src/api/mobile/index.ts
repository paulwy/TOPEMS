import apiClient from '../client';
import type { ApiResponse } from '../client';

import { deviceApi } from './device';
import { shortcutApi } from './shortcut';
import { approvalApi } from './approval';
import { pushApi } from './push';
import { offlineApi } from './offline';
import { mediaApi } from './media';
import { userApi } from './user';
import { inspectionApi } from './inspection';
import { attendanceApi } from './attendance';
import { analyticsApi } from './analytics';
import { inventoryApi } from './inventory';
import { productionApi } from './production';
import { qualityApi } from './quality';
import { customerApi } from './customer';
import { projectApi } from './project';
import { employeeApi } from './employee';
import { supplierApi } from './supplier';
import { documentApi } from './document';
import { gisApi } from './gis';
import { oaApi } from './oa';
import { approvalEnhancedApi } from './approvalEnhanced';

interface PatrolRecord {
  id: string;
  title: string;
  description?: string;
  location_lat: number;
  location_lng: number;
  address?: string;
  patrol_type: string;
  status: string;
  checked_by: string;
  checked_at: string;
  created_at: string;
}

interface CreatePatrolRecordRequest {
  title: string;
  description?: string;
  location_lat: number;
  location_lng: number;
  address?: string;
  patrol_type: string;
  status?: string;
  checked_by: string;
}

interface ScanRecord {
  id: string;
  barcode: string;
  location_lat: number;
  location_lng: number;
  item_type: string;
  quantity?: number;
  operator: string;
  scanned_at: string;
  created_at: string;
}

interface CreateScanRecordRequest {
  barcode: string;
  location_lat: number;
  location_lng: number;
  item_type: string;
  quantity?: number;
  operator: string;
}

interface PhotoEvidence {
  id: string;
  title: string;
  description?: string;
  location_lat: number;
  location_lng: number;
  address?: string;
  file_url?: string;
  recorded_by: string;
  recorded_at: string;
  created_at: string;
}

interface CreatePhotoEvidenceRequest {
  title: string;
  description?: string;
  location_lat: number;
  location_lng: number;
  address?: string;
  file_url?: string;
  recorded_by: string;
}

interface AudioRecording {
  id: string;
  title: string;
  description?: string;
  location_lat: number;
  location_lng: number;
  address?: string;
  duration_seconds?: number;
  file_url?: string;
  recorded_by: string;
  recorded_at: string;
  created_at: string;
}

interface CreateAudioRecordingRequest {
  title: string;
  description?: string;
  location_lat: number;
  location_lng: number;
  address?: string;
  duration_seconds?: number;
  file_url?: string;
  recorded_by: string;
}

interface VideoRecording {
  id: string;
  title: string;
  description?: string;
  start_location_lat: number;
  start_location_lng: number;
  location_track: Array<{
    lat: number;
    lng: number;
    timestamp?: string;
  }>;
  duration_seconds?: number;
  file_url?: string;
  thumbnail_url?: string;
  recorded_by: string;
  recorded_at: string;
  created_at: string;
}

interface CreateVideoRecordingRequest {
  title: string;
  description?: string;
  start_location_lat: number;
  start_location_lng: number;
  duration_seconds?: number;
  file_url?: string;
  thumbnail_url?: string;
  recorded_by: string;
}

interface MobileTask {
  id: string;
  title: string;
  description?: string;
  task_type: string;
  priority: string;
  status: string;
  assignee: string;
  location_lat?: number;
  location_lng?: number;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

interface CreateMobileTaskRequest {
  title: string;
  description?: string;
  task_type: string;
  priority?: string;
  assignee: string;
  location_lat?: number;
  location_lng?: number;
  due_date?: string;
}

export interface DashboardStats {
  today_patrols: number;
  today_scans: number;
  pending_tasks: number;
  in_progress_tasks: number;
  completed_tasks: number;
}

export interface ListResponse<T> {
  items: T[];
  total: number;
}

export interface AttendanceRecord {
  id: string;
  user_id: string;
  user_name: string;
  date: string;
  check_in_time?: string;
  check_out_time?: string;
  work_hours?: number;
  status: 'normal' | 'late' | 'early_leave' | 'absent' | 'leave' | 'business_trip';
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
  type: 'check_in' | 'check_out';
  created_at: string;
}

export interface AttendanceStats {
  today_status: 'not_checked_in' | 'checked_in' | 'checked_out';
  today_check_in?: string;
  today_check_out?: string;
  work_days_this_month: number;
  late_days_this_month: number;
  early_leave_days: number;
  absent_days: number;
  total_work_hours: number;
}

export interface LeaveApplication {
  id: string;
  user_id: string;
  user_name: string;
  leave_type: 'annual' | 'sick' | 'personal' | 'maternity' | 'paternity' | 'funeral' | 'other';
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  created_at: string;
}

export interface CreateLeaveRequest {
  leave_type: LeaveApplication['leave_type'];
  start_date: string;
  end_date: string;
  reason: string;
}

export interface PushConfig {
  enabled: boolean;
  sound_enabled: boolean;
  vibration_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

interface PushTemplate {
  id: string;
  name: string;
  type: 'system' | 'approval' | 'task' | 'reminder';
  title: string;
  body: string;
  enabled: boolean;
  status: 'active' | 'draft' | 'disabled';
}

interface OfflineSyncStatus {
  last_sync_time?: string;
  pending_records: number;
  total_records: number;
  sync_status: 'idle' | 'syncing' | 'success' | 'failed';
  last_error?: string;
}

export interface ScanResult {
  code: string;
  type: 'barcode' | 'qrcode';
  format: string;
  entity_type?: 'product' | 'material' | 'equipment' | 'location' | 'order' | 'employee';
  entity_id?: string;
  entity_data?: Record<string, unknown>;
}

export interface MobileWorkbenchData {
  pending_tasks: number;
  pending_approvals: number;
  unread_notifications: number;
  today_attendance_status: 'not_checked_in' | 'checked_in' | 'checked_out';
  today_production_output: number;
  today_quality_pass_rate: number;
  shortcuts: {
    id: string;
    name: string;
    icon: string;
    path: string;
    color: string;
  }[];
}

export interface AppSettings {
  force_update: boolean;
  auto_update: boolean;
  min_version: string;
  app_key: string;
  configured: boolean;
}

export const mobileApi = {
  getDashboardStats: async (): Promise<ApiResponse<DashboardStats>> => {
    return apiClient.mobile.get<DashboardStats>('dashboard/stats');
  },

  getWorkbenchData: async (): Promise<ApiResponse<MobileWorkbenchData>> => {
    return apiClient.mobile.get<MobileWorkbenchData>('workbench');
  },

  getAppSettings: async (): Promise<ApiResponse<AppSettings>> => {
    return apiClient.mobile.get<AppSettings>('app-settings');
  },

  updateAppSettings: async (data: Partial<AppSettings>): Promise<ApiResponse<AppSettings>> => {
    return apiClient.mobile.put<AppSettings>('app-settings', data);
  },

  listPatrolRecords: async (): Promise<ApiResponse<ListResponse<PatrolRecord>>> => {
    return apiClient.mobile.get<ListResponse<PatrolRecord>>('/patrol-records');
  },
  createPatrolRecord: async (
    data: CreatePatrolRecordRequest
  ): Promise<ApiResponse<PatrolRecord>> => {
    return apiClient.mobile.post<PatrolRecord>('patrol-records', data);
  },

  listScanRecords: async (): Promise<ApiResponse<ListResponse<ScanRecord>>> => {
    return apiClient.mobile.get<ListResponse<ScanRecord>>('/scan-records');
  },
  createScanRecord: async (data: CreateScanRecordRequest): Promise<ApiResponse<ScanRecord>> => {
    return apiClient.mobile.post<ScanRecord>('scan-records', data);
  },
  // 批 37 (g3)：scanCode（POST /scan）为 contract_fallback 假成功占位，前端零引用，死封装已删除。

  listPhotoEvidences: async (): Promise<ApiResponse<ListResponse<PhotoEvidence>>> => {
    return apiClient.mobile.get<ListResponse<PhotoEvidence>>('/photo-evidences');
  },
  createPhotoEvidence: async (
    data: CreatePhotoEvidenceRequest
  ): Promise<ApiResponse<PhotoEvidence>> => {
    return apiClient.mobile.post<PhotoEvidence>('photo-evidences', data);
  },

  listAudioRecordings: async (): Promise<ApiResponse<ListResponse<AudioRecording>>> => {
    return apiClient.mobile.get<ListResponse<AudioRecording>>('/audio-recordings');
  },
  createAudioRecording: async (
    data: CreateAudioRecordingRequest
  ): Promise<ApiResponse<AudioRecording>> => {
    return apiClient.mobile.post<AudioRecording>('audio-recordings', data);
  },

  listVideoRecordings: async (): Promise<ApiResponse<ListResponse<VideoRecording>>> => {
    return apiClient.mobile.get<ListResponse<VideoRecording>>('/video-recordings');
  },
  createVideoRecording: async (
    data: CreateVideoRecordingRequest
  ): Promise<ApiResponse<VideoRecording>> => {
    return apiClient.mobile.post<VideoRecording>('video-recordings', data);
  },

  listMobileTasks: async (params?: {
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<ListResponse<MobileTask>>> => {
    return apiClient.mobile.get<ListResponse<MobileTask>>('/mobile-tasks', { params });
  },
  createMobileTask: async (data: CreateMobileTaskRequest): Promise<ApiResponse<MobileTask>> => {
    return apiClient.mobile.post<MobileTask>('mobile-tasks', data);
  },
  updateTaskStatus: async (id: string, status: string): Promise<ApiResponse<MobileTask>> => {
    return apiClient.mobile.put<MobileTask>(`mobile-tasks/${id}/status`, { status });
  },

  getAttendanceStats: async (): Promise<ApiResponse<AttendanceStats>> => {
    return apiClient.mobile.get<AttendanceStats>('/attendance/stats');
  },
  listAttendanceRecords: async (params?: {
    month?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<ListResponse<AttendanceRecord>>> => {
    return apiClient.mobile.get<ListResponse<AttendanceRecord>>('/attendance/records', {
      params,
    });
  },
  checkIn: async (data: {
    lat: number;
    lng: number;
    address?: string;
  }): Promise<ApiResponse<AttendanceRecord>> => {
    return apiClient.mobile.post<AttendanceRecord>('/attendance/check-in', data);
  },
  checkOut: async (data: {
    lat: number;
    lng: number;
    address?: string;
  }): Promise<ApiResponse<AttendanceRecord>> => {
    return apiClient.mobile.post<AttendanceRecord>('/attendance/check-out', data);
  },
  listLeaveApplications: async (params?: {
    status?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<ListResponse<LeaveApplication>>> => {
    return apiClient.mobile.get<ListResponse<LeaveApplication>>('/attendance/leaves', {
      params,
    });
  },
  applyLeave: async (data: CreateLeaveRequest): Promise<ApiResponse<LeaveApplication>> => {
    return apiClient.mobile.post<LeaveApplication>('/attendance/leaves', data);
  },

  // ==================== 库存管理子域 ====================

  getPushConfig: async (): Promise<ApiResponse<PushConfig>> => {
    return apiClient.mobile.get<PushConfig>('push/config');
  },

  updatePushConfig: async (data: Partial<PushConfig>): Promise<ApiResponse<PushConfig>> => {
    return apiClient.mobile.put<PushConfig>('push/config', data);
  },

  listPushTemplates: async (): Promise<ApiResponse<ListResponse<PushTemplate>>> => {
    return apiClient.mobile.get<ListResponse<PushTemplate>>('/push/templates');
  },

  updatePushTemplate: async (
    id: string,
    data: Partial<PushTemplate>
  ): Promise<ApiResponse<PushTemplate>> => {
    return apiClient.mobile.put<PushTemplate>(`push/templates/${id}`, data);
  },

  getOfflineSyncStatus: async (): Promise<ApiResponse<OfflineSyncStatus>> => {
    return apiClient.mobile.get<OfflineSyncStatus>('offline/sync-status');
  },
  startOfflineSync: async (): Promise<ApiResponse<OfflineSyncStatus>> => {
    return apiClient.mobile.post<OfflineSyncStatus>('offline/sync');
  },

  // Device
  registerDevice: deviceApi.registerDevice,
  updatePushToken: deviceApi.updatePushToken,
  // 批 37 (g3)：listDevices / getDevice / deactivateDevice 死封装已删除。

  // Shortcut
  listShortcuts: shortcutApi.listShortcuts,
  createShortcut: shortcutApi.createShortcut,
  // 批 37 (g1)：updateShortcut / deleteShortcut / reorderShortcuts 死封装已删除。

  // Approval
  listApprovalTasks: approvalApi.listTasks,
  listPendingApprovals: approvalApi.listPending,
  getApprovalTask: approvalApi.getTask,
  approveTask: approvalApi.approveTask,
  rejectTask: approvalApi.rejectTask,
  delegateTask: approvalApi.delegateTask,

  // Push
  push: pushApi,
  // 分析子域
  analytics: analyticsApi,
  // 用户子域
  user: userApi,
  // 巡检子域
  inspection: inspectionApi,
  listPushDevices: pushApi.listDevices,
  registerPushDevice: pushApi.registerDevice,
  listPushNotifications_v2: pushApi.listPushNotifications,
  sendPushNotification: pushApi.sendPushNotification,
  broadcastPush: pushApi.broadcastPush,
  getPushStats: pushApi.getPushStats,
  getPushNotification_v2: pushApi.getPushNotification,
  listPushTemplates_v2: pushApi.listPushTemplates_v2,
  createPushTemplate_v2: pushApi.createPushTemplate_v2,

  // Offline (enhanced routes)
  syncOfflineData: offlineApi.syncData,
  getOfflineSyncHistory: offlineApi.getSyncHistory,
  getOfflineSyncPolicy: offlineApi.getSyncPolicy,
  updateOfflineSyncPolicy: offlineApi.updateSyncPolicy,
  retryFailedOfflineSync: offlineApi.retryFailedSync,
  syncOfflineRecords: offlineApi.syncRecords,
  getPendingOfflineRecords: offlineApi.getPendingRecords,
  markOfflineRecordSynced: offlineApi.markRecordSynced,
  clearOfflineSynced: offlineApi.clearSynced,

  // Media
  listPhotos: mediaApi.listPhotos,
  listAudio: mediaApi.listAudio,
  listVideo: mediaApi.listVideo,
  uploadMedia: mediaApi.uploadMedia,
  deleteMedia: mediaApi.deleteMedia,
  uploadPhoto: mediaApi.uploadPhoto,
  batchUploadPhotos: mediaApi.batchUploadPhotos,
  getPhoto: mediaApi.getPhoto,
  deletePhoto: mediaApi.deletePhoto,
  getUploadProgress: mediaApi.getUploadProgress,

  // User
  getUserProfile: userApi.getProfile,
  updateUserProfile: userApi.updateProfile,
  uploadUserAvatar: userApi.uploadAvatar,

  // ==================== 库存管理子域 ====================

  inventory: inventoryApi,
  listInventoryItems: inventoryApi.listItems,
  getInventoryItem: inventoryApi.getItem,
  listStocktakeTasks: inventoryApi.listStocktakeTasks,
  createStocktakeTask: inventoryApi.createStocktakeTask,
  submitStocktakeRecord: inventoryApi.submitStocktakeRecord,
  listInboundOrders: inventoryApi.listInboundOrders,
  listOutboundOrders: inventoryApi.listOutboundOrders,
  // 批 37 (g2)：adjustInventoryItem / getStocktakeTask / completeStocktakeTask /
  // confirmInboundOrder / confirmOutboundOrder / listTransferOrders / confirmTransferOrder 死封装已删除。

  // ==================== 生产管理子域 ====================

  production: productionApi,
  listProductionOrders: productionApi.listOrders,
  getProductionOrder: productionApi.getOrder,
  startProductionOrder: productionApi.startOrder,
  pauseProductionOrder: productionApi.pauseOrder,
  completeProductionOrder: productionApi.completeOrder,
  listWorkReports: productionApi.listWorkReports,
  submitWorkReport: productionApi.submitWorkReport,
  listEquipment: productionApi.listEquipment,
  // 批 37 (g2)：getEquipment / updateEquipmentStatus / listWorkstations / getProductionStats 死封装已删除。

  // ==================== 质量管理子域 ====================

  quality: qualityApi,
  listQualityTasks: qualityApi.listTasks,
  getQualityTask: qualityApi.getTask,
  updateQualityTaskStatus: qualityApi.updateTaskStatus,
  listDefectRecords: qualityApi.listDefects,
  reportDefect: qualityApi.reportDefect,
  // 批 37 (g2)：startQualityTask / getDefectRecord / updateDefectStatus / getQualityStats 死封装已删除。

  // ==================== 客户管理子域 ====================

  customer: customerApi,
  listCustomers: customerApi.listCustomers,
  getCustomer: customerApi.getCustomer,
  createCustomer: customerApi.createCustomer,
  updateCustomer: customerApi.updateCustomer,
  deleteCustomer: customerApi.deleteCustomer,
  // 批 37：assignCustomer / listContacts / createContact / listFollowUps / createFollowUp
  // 五条（复用了 contract_fallback 占位的 customers 子端点）经四路取证确认前端零调用，
  // 已随后端占位路由一并删除（B 类双向删）。
  // 批 37 (g3)：listLeads / createLead / convertLead（/leads）死封装已删除。

  // ==================== 项目管理子域 ====================

  project: projectApi,
  // 批 37 (g3)：listProjects / getProject / listProjectTasks / createProjectTask /
  // listProjectMilestones / createProjectMilestone / listMyTasks / getProjectStats 死封装已删除。
  // 批 37 (g1)：updateProjectTaskStatus 死封装已删除。
  getProjectTask: projectApi.getTask,

  // ==================== 员工组织子域 ====================

  employee: employeeApi,
  // 批 37 (g3)：listEmployees / getEmployee / searchEmployees / listDepartments /
  // getDepartment / listDepartmentMembers / getMyInfo / getCompanyInfo 死封装已删除。
  listAnnouncements: employeeApi.listAnnouncements,
  getAnnouncement: employeeApi.getAnnouncement,

  // ==================== 供应商管理子域 ====================

  supplier: supplierApi,
  // 批 37 (g2)：listSuppliers / getSupplier / createSupplier / updateSupplier / deleteSupplier /
  // listSupplierEvaluations / createSupplierEvaluation / listSupplierContracts / listSupplierProducts /
  // listSupplierCategories / getSupplierStats 死封装已删除。

  // ==================== 文档管理子域 ====================

  document: documentApi,
  listDocuments: documentApi.listDocuments,
  getDocument: documentApi.getDocument,
  createDocument: documentApi.createDocument,
  updateDocument: documentApi.updateDocument,
  deleteDocument: documentApi.deleteDocument,
  // 批 37 (g3)：listDocumentVersions / createDocumentVersion / listDocumentApprovals /
  // createDocumentApproval / updateDocumentApproval / listDocumentCategories /
  // listRecentDocuments 死封装已删除。
  getDocumentStats: documentApi.getDocumentStats,

  // ==================== GIS 地理信息子域 ====================

  // 批 37 (g3)：listRoutes/getRoute/createRoute/updateRoute/deleteRoute/listRouteStops/
  // createRouteStop/listZones/createZone/listGeofences/createGeofence/updateGeofence/
  // deleteGeofence/checkGeofence/getCurrentLocation/trackLocation/getLocationHistory/
  // listMapLayers/listMapMarkers 共 19 个死封装已删除。
  gis: gisApi,

  // 批 37 (g1)：BPM 流程引擎子域（bpm.ts 全部 15 个方法，对应 /workflow/** 占位端点）
  // 前端零引用，死封装已删除。

  // ==================== OA 办公协同子域 ====================

  oa: oaApi,
  listMeetings: oaApi.listMeetings,
  getMeeting: oaApi.getMeeting,
  createMeeting: oaApi.createMeeting,
  updateMeeting: oaApi.updateMeeting,
  deleteMeeting: oaApi.deleteMeeting,
  joinMeeting: oaApi.joinMeeting,
  leaveMeeting: oaApi.leaveMeeting,
  listCalendarEvents: oaApi.listCalendarEvents,
  createCalendarEvent: oaApi.createCalendarEvent,
  updateCalendarEvent: oaApi.updateCalendarEvent,
  deleteCalendarEvent: oaApi.deleteCalendarEvent,
  listOaTasks: oaApi.listTasks,
  getOaTask: oaApi.getTask,
  createOaTask: oaApi.createTask,
  updateOaTask: oaApi.updateTask,
  deleteOaTask: oaApi.deleteTask,
  completeOaTask: oaApi.completeTask,
  listOaAnnouncements: oaApi.listAnnouncements,
  getOaAnnouncement: oaApi.getAnnouncement,
  markAnnouncementRead: oaApi.markAnnouncementRead,
  getOaStats: oaApi.getOaStats,

  // 批 37 (g1)：AI 智能助手子域（aiAssistant.ts 全部 15 个方法，对应 /ai/** 占位端点）
  // 前端页面走 @/api/ai/chat 等独立通道，不经过 mobile，死封装已删除。
  // 批 37 (g1)：数据报表子域（report.ts 全部 17 个方法，对应 /reports/**、/dashboards/**、/data/** 占位端点）
  // 前端报表页面走 @/api/report 独立通道，死封装已删除。

  // ==================== 审批增强子域 ====================

  approvalEnhanced: approvalEnhancedApi,
  listApprovalTemplates: approvalEnhancedApi.listTemplates,
  createApprovalTemplate: approvalEnhancedApi.createTemplate,
  batchApprove: approvalEnhancedApi.batchApprove,
  batchReject: approvalEnhancedApi.batchReject,
  listDelegations: approvalEnhancedApi.listDelegations,
  createDelegation: approvalEnhancedApi.createDelegation,
  listMyApprovals: approvalEnhancedApi.listMyApprovals,
  listMyRequests: approvalEnhancedApi.listMyRequests,
  getApprovalStats: approvalEnhancedApi.getApprovalStats,
  // 批 37 (g1)：getTemplate/updateTemplate/deleteTemplate/applyTemplate、
  // getApprovalHistory/listApprovers/addCcUser/removeCcUser/escalateApproval、
  // updateDelegation/deleteDelegation 共 11 个死封装已删除。

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.mobile.get<string>('/health');
  },
};

export {
  deviceApi,
  shortcutApi,
  approvalApi,
  pushApi,
  offlineApi,
  mediaApi,
  userApi,
  inspectionApi,
  attendanceApi,
  analyticsApi,
  inventoryApi,
  productionApi,
  qualityApi,
  customerApi,
  projectApi,
  employeeApi,
  supplierApi,
  documentApi,
  gisApi,
  oaApi,
  approvalEnhancedApi,
};

export type { DeviceInfo, RegisterDeviceRequest } from './device';

export type {
  Shortcut,
  CreateShortcutRequest,
  UpdateShortcutRequest,
  ReorderShortcutItem,
  ActionType,
} from './shortcut';

export type {
  ApprovalTask,
  ApprovalListQuery,
  ApprovalActionRequest,
  DelegateApprovalRequest,
} from './approval';

export type {
  MobilePushDevice,
  MobilePushNotification,
  MobilePushTemplate,
  MobilePushStats,
  RegisterPushDeviceRequest,
  SendPushNotificationRequest,
  BroadcastPushRequest,
  CreatePushTemplateRequest,
  SendPushResponse,
} from './push';

export type {
  OfflineOperation,
  SyncPolicy,
  SyncRequest,
  FailedOperation,
  SyncResponse,
  OfflineStatus,
} from './offline';

export type {
  MediaFile,
  UploadResponse,
  BatchUploadResponse,
  UploadProgress,
  FileType,
} from './media';

export type { UserProfile } from './user';

// 批 37 (g1)：workflow.ts 已删除，其类型 re-export 一并移除。

export type {
  InspectionPlan,
  InspectionTask,
  InspectionTemplate,
  InspectionStats,
  InspectionStatus,
  InspectionType,
} from './inspection';

export type {
  AttendanceOverview,
  AttendanceStatistics,
  Shift,
  LeaveApplication as MobileLeaveApplication,
  AttendanceStatus,
  LeaveType,
  ShiftType,
} from './attendance';

export type {
  MobileUsageStats,
  ScreenTimeData,
  FeatureUsage,
  MobilePerformance,
  DailySummary,
  EngagementMetrics,
  Platform,
} from './analytics';

export type {
  InventoryItem,
  StocktakeTask,
  StocktakeRecord,
  InboundOrder,
  OutboundOrder,
  TransferOrder,
  InventoryAdjustRequest,
  CreateStocktakeRequest,
  StocktakeRecordInput,
  InventoryStatus,
  StocktakeStatus,
  InventoryMovementStatus,
} from './inventory';

export type {
  ProductionOrder,
  WorkReport,
  Equipment,
  Workstation,
  ProductionStats,
  SubmitWorkReportRequest,
  ProductionOrderStatus,
  EquipmentStatus,
} from './production';

export type {
  QualityTask,
  DefectRecord,
  QualityStats,
  CreateDefectRequest,
  UpdateTaskStatusRequest,
  QualityTaskType,
  QualityTaskStatus,
  DefectSeverity,
  DefectStatus,
} from './quality';

export type {
  Customer,
  CustomerContact,
  FollowUpRecord,
  Lead,
  CreateCustomerRequest,
  CreateContactRequest,
  CreateFollowUpRequest,
  CreateLeadRequest,
  CustomerStatus,
  LeadStatus,
  FollowUpType,
} from './customer';

export type {
  Project,
  ProjectTask,
  Milestone,
  ProjectStats,
  CreateTaskRequest,
  CreateMilestoneRequest,
  ProjectStatus,
  TaskStatus,
  TaskPriority,
  MilestoneStatus,
} from './project';

export type {
  Employee,
  Department,
  Announcement,
  EmployeeInfo,
  CompanyInfo,
  EmployeeStatus,
  AnnouncementType,
} from './employee';

export type {
  Supplier,
  SupplierEvaluation,
  SupplierContract,
  SupplierProduct,
  SupplierCategory,
  SupplierStats,
  CreateSupplierRequest,
  CreateEvaluationRequest,
  SupplierStatus,
  EvaluationScore,
  ContractStatus,
} from './supplier';

export type {
  Document,
  DocumentVersion,
  DocumentApproval,
  DocumentCategory,
  DocumentStats,
  CreateDocumentRequest,
  CreateVersionRequest,
  CreateApprovalRequest,
  DocumentStatus,
  ApprovalStatus,
  DocumentType,
} from './document';

export type {
  GeoPoint,
  Route,
  RouteStop,
  Zone,
  Geofence,
  GeofenceCheckResult,
  LocationRecord,
  MapLayer,
  MapMarker,
  CreateRouteRequest,
  CreateStopRequest,
  CreateZoneRequest,
  CreateGeofenceRequest,
  RouteStatus,
  ZoneType,
  GeofenceShape,
  GeofenceAction,
} from './gis';

// 批 37 (g1)：bpm.ts 已删除，其类型 re-export 一并移除。

export type {
  Meeting,
  MeetingAttendee,
  CalendarEvent,
  OaTask,
  OaAnnouncement,
  OaStats,
  CreateMeetingRequest,
  CreateCalendarEventRequest,
  CreateOaTaskRequest,
  OaMeetingStatus,
  OaMeetingType,
  OaCalendarEventType,
  OaTaskPriority,
  OaTaskStatus,
  OaAnnouncementPriority,
} from './oa';

// 批 37 (g1)：aiAssistant.ts / report.ts 已删除，其类型 re-export 一并移除。

export type {
  ApprovalTemplate,
  TemplateFormField,
  ApprovalChainNode,
  ApprovalHistory,
  ApproverInfo,
  Delegation,
  ApprovalStats,
  CreateTemplateRequest,
  ApplyTemplateRequest,
  BatchActionRequest,
  CreateDelegationRequest,
  EnhancedApprovalStatus,
  ApprovalPriority,
  DelegationStatus,
  TemplateTriggerType,
} from './approvalEnhanced';

export default mobileApi;
