import apiClient from '../client';
import type { ApiResponse } from '../client';

import { deviceApi } from './device';
import { shortcutApi } from './shortcut';
import { approvalApi } from './approval';
import { pushApi } from './push';
import { offlineApi } from './offline';
import { mediaApi } from './media';
import { userApi } from './user';
import { workflowApi } from './workflow';
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
import { bpmApi } from './bpm';
import { oaApi } from './oa';
import { aiAssistantApi } from './aiAssistant';
import { reportApi } from './report';
import { approvalEnhancedApi } from './approvalEnhanced';

export interface PatrolRecord {
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

export interface ScanRecord {
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

export interface CreateScanRecordRequest {
  barcode: string;
  location_lat: number;
  location_lng: number;
  item_type: string;
  quantity?: number;
  operator: string;
}

export interface PhotoEvidence {
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

export interface VideoRecording {
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

export interface CreateVideoRecordingRequest {
  title: string;
  description?: string;
  start_location_lat: number;
  start_location_lng: number;
  duration_seconds?: number;
  file_url?: string;
  thumbnail_url?: string;
  recorded_by: string;
}

export interface MobileTask {
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

export interface PushNotification {
  id: string;
  title: string;
  content: string;
  type: 'system' | 'approval' | 'task' | 'alert' | 'message';
  read: boolean;
  created_at: string;
  data?: Record<string, unknown>;
}

export interface PushConfig {
  enabled: boolean;
  sound_enabled: boolean;
  vibration_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

export interface PushTemplate {
  id: string;
  name: string;
  type: 'system' | 'approval' | 'task' | 'reminder';
  title: string;
  body: string;
  enabled: boolean;
  status: 'active' | 'draft' | 'disabled';
}

export interface OfflineSyncStatus {
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

export const mobileApi = {
  getDashboardStats: async (): Promise<ApiResponse<DashboardStats>> => {
    return apiClient.mobile.get<DashboardStats>('/mobile/dashboard/stats');
  },

  getWorkbenchData: async (): Promise<ApiResponse<MobileWorkbenchData>> => {
    return apiClient.mobile.get<MobileWorkbenchData>('/mobile/workbench');
  },

  listPatrolRecords: async (): Promise<ApiResponse<ListResponse<PatrolRecord>>> => {
    return apiClient.mobile.get<ListResponse<PatrolRecord>>('/mobile/patrol-records');
  },
  createPatrolRecord: async (
    data: CreatePatrolRecordRequest
  ): Promise<ApiResponse<PatrolRecord>> => {
    return apiClient.mobile.post<PatrolRecord>('/mobile/patrol-records', data);
  },

  listScanRecords: async (): Promise<ApiResponse<ListResponse<ScanRecord>>> => {
    return apiClient.mobile.get<ListResponse<ScanRecord>>('/mobile/scan-records');
  },
  createScanRecord: async (data: CreateScanRecordRequest): Promise<ApiResponse<ScanRecord>> => {
    return apiClient.mobile.post<ScanRecord>('/mobile/scan-records', data);
  },
  scanCode: async (code: string): Promise<ApiResponse<ScanResult>> => {
    return apiClient.mobile.post<ScanResult>('/mobile/scan', { code });
  },

  listPhotoEvidences: async (): Promise<ApiResponse<ListResponse<PhotoEvidence>>> => {
    return apiClient.mobile.get<ListResponse<PhotoEvidence>>('/mobile/photo-evidences');
  },
  createPhotoEvidence: async (
    data: CreatePhotoEvidenceRequest
  ): Promise<ApiResponse<PhotoEvidence>> => {
    return apiClient.mobile.post<PhotoEvidence>('/mobile/photo-evidences', data);
  },

  listAudioRecordings: async (): Promise<ApiResponse<ListResponse<AudioRecording>>> => {
    return apiClient.mobile.get<ListResponse<AudioRecording>>('/mobile/audio-recordings');
  },
  createAudioRecording: async (
    data: CreateAudioRecordingRequest
  ): Promise<ApiResponse<AudioRecording>> => {
    return apiClient.mobile.post<AudioRecording>('/mobile/audio-recordings', data);
  },

  listVideoRecordings: async (): Promise<ApiResponse<ListResponse<VideoRecording>>> => {
    return apiClient.mobile.get<ListResponse<VideoRecording>>('/mobile/video-recordings');
  },
  createVideoRecording: async (
    data: CreateVideoRecordingRequest
  ): Promise<ApiResponse<VideoRecording>> => {
    return apiClient.mobile.post<VideoRecording>('/mobile/video-recordings', data);
  },

  listMobileTasks: async (params?: {
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<ListResponse<MobileTask>>> => {
    return apiClient.mobile.get<ListResponse<MobileTask>>('/mobile/mobile-tasks', { params });
  },
  createMobileTask: async (data: CreateMobileTaskRequest): Promise<ApiResponse<MobileTask>> => {
    return apiClient.mobile.post<MobileTask>('/mobile/mobile-tasks', data);
  },
  updateTaskStatus: async (id: string, status: string): Promise<ApiResponse<MobileTask>> => {
    return apiClient.mobile.put<MobileTask>(`/mobile/mobile-tasks/${id}/status`, { status });
  },

  getAttendanceStats: async (): Promise<ApiResponse<AttendanceStats>> => {
    return apiClient.mobile.get<AttendanceStats>('/attendance/stats');
  },
  listAttendanceRecords: async (params?: {
    month?: string;
    page?: number;
    pagesize?: number;
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
    pagesize?: number;
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
    return apiClient.mobile.get<PushConfig>('/mobile/push/config');
  },

  updatePushConfig: async (data: Partial<PushConfig>): Promise<ApiResponse<PushConfig>> => {
    return apiClient.mobile.put<PushConfig>('/mobile/push/config', data);
  },

  listPushTemplates: async (): Promise<ApiResponse<ListResponse<PushTemplate>>> => {
    return apiClient.mobile.get<ListResponse<PushTemplate>>('/mobile/push/templates');
  },

  updatePushTemplate: async (
    id: string,
    data: Partial<PushTemplate>
  ): Promise<ApiResponse<PushTemplate>> => {
    return apiClient.mobile.put<PushTemplate>(`/mobile/push/templates/${id}`, data);
  },

  getOfflineSyncStatus: async (): Promise<ApiResponse<OfflineSyncStatus>> => {
    return apiClient.mobile.get<OfflineSyncStatus>('/mobile/offline/sync-status');
  },
  startOfflineSync: async (): Promise<ApiResponse<OfflineSyncStatus>> => {
    return apiClient.mobile.post<OfflineSyncStatus>('/mobile/offline/sync');
  },

  // Device
  registerDevice: deviceApi.registerDevice,
  updatePushToken: deviceApi.updatePushToken,
  listDevices: deviceApi.listDevices,
  getDevice: deviceApi.getDevice,
  deactivateDevice: deviceApi.deactivateDevice,

  // Shortcut
  listShortcuts: shortcutApi.listShortcuts,
  createShortcut: shortcutApi.createShortcut,
  updateShortcut: shortcutApi.updateShortcut,
  deleteShortcut: shortcutApi.deleteShortcut,
  reorderShortcuts: shortcutApi.reorderShortcuts,

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
  adjustInventoryItem: inventoryApi.adjustItem,
  listStocktakeTasks: inventoryApi.listStocktakeTasks,
  createStocktakeTask: inventoryApi.createStocktakeTask,
  getStocktakeTask: inventoryApi.getStocktakeTask,
  submitStocktakeRecord: inventoryApi.submitStocktakeRecord,
  completeStocktakeTask: inventoryApi.completeStocktakeTask,
  listInboundOrders: inventoryApi.listInboundOrders,
  confirmInboundOrder: inventoryApi.confirmInboundOrder,
  listOutboundOrders: inventoryApi.listOutboundOrders,
  confirmOutboundOrder: inventoryApi.confirmOutboundOrder,
  listTransferOrders: inventoryApi.listTransferOrders,
  confirmTransferOrder: inventoryApi.confirmTransferOrder,

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
  getEquipment: productionApi.getEquipment,
  updateEquipmentStatus: productionApi.updateEquipmentStatus,
  listWorkstations: productionApi.listWorkstations,
  getProductionStats: productionApi.getProductionStats,

  // ==================== 质量管理子域 ====================

  quality: qualityApi,
  listQualityTasks: qualityApi.listTasks,
  getQualityTask: qualityApi.getTask,
  startQualityTask: qualityApi.startTask,
  updateQualityTaskStatus: qualityApi.updateTaskStatus,
  listDefectRecords: qualityApi.listDefects,
  getDefectRecord: qualityApi.getDefect,
  reportDefect: qualityApi.reportDefect,
  updateDefectStatus: qualityApi.updateDefectStatus,
  getQualityStats: qualityApi.getQualityStats,

  // ==================== 客户管理子域 ====================

  customer: customerApi,
  listCustomers: customerApi.listCustomers,
  getCustomer: customerApi.getCustomer,
  createCustomer: customerApi.createCustomer,
  updateCustomer: customerApi.updateCustomer,
  deleteCustomer: customerApi.deleteCustomer,
  assignCustomer: customerApi.assignCustomer,
  listCustomerContacts: customerApi.listContacts,
  createCustomerContact: customerApi.createContact,
  listCustomerFollowUps: customerApi.listFollowUps,
  createCustomerFollowUp: customerApi.createFollowUp,
  listLeads: customerApi.listLeads,
  createLead: customerApi.createLead,
  convertLead: customerApi.convertLead,

  // ==================== 项目管理子域 ====================

  project: projectApi,
  listProjects: projectApi.listProjects,
  getProject: projectApi.getProject,
  listProjectTasks: projectApi.listProjectTasks,
  createProjectTask: projectApi.createTask,
  getProjectTask: projectApi.getTask,
  updateProjectTaskStatus: projectApi.updateTaskStatus,
  listProjectMilestones: projectApi.listMilestones,
  createProjectMilestone: projectApi.createMilestone,
  listMyTasks: projectApi.listMyTasks,
  getProjectStats: projectApi.getProjectStats,

  // ==================== 员工组织子域 ====================

  employee: employeeApi,
  listEmployees: employeeApi.listEmployees,
  getEmployee: employeeApi.getEmployee,
  searchEmployees: employeeApi.searchEmployees,
  listDepartments: employeeApi.listDepartments,
  getDepartment: employeeApi.getDepartment,
  listDepartmentMembers: employeeApi.listDepartmentMembers,
  listAnnouncements: employeeApi.listAnnouncements,
  getAnnouncement: employeeApi.getAnnouncement,
  getMyInfo: employeeApi.getMyInfo,
  getCompanyInfo: employeeApi.getCompanyInfo,

  // ==================== 供应商管理子域 ====================

  supplier: supplierApi,
  listSuppliers: supplierApi.listSuppliers,
  getSupplier: supplierApi.getSupplier,
  createSupplier: supplierApi.createSupplier,
  updateSupplier: supplierApi.updateSupplier,
  deleteSupplier: supplierApi.deleteSupplier,
  listSupplierEvaluations: supplierApi.listEvaluations,
  createSupplierEvaluation: supplierApi.createEvaluation,
  listSupplierContracts: supplierApi.listContracts,
  listSupplierProducts: supplierApi.listProducts,
  listSupplierCategories: supplierApi.listCategories,
  getSupplierStats: supplierApi.getSupplierStats,

  // ==================== 文档管理子域 ====================

  document: documentApi,
  listDocuments: documentApi.listDocuments,
  getDocument: documentApi.getDocument,
  createDocument: documentApi.createDocument,
  updateDocument: documentApi.updateDocument,
  deleteDocument: documentApi.deleteDocument,
  listDocumentVersions: documentApi.listVersions,
  createDocumentVersion: documentApi.createVersion,
  listDocumentApprovals: documentApi.listApprovals,
  createDocumentApproval: documentApi.createApproval,
  updateDocumentApproval: documentApi.updateApproval,
  listDocumentCategories: documentApi.listCategories,
  getDocumentStats: documentApi.getDocumentStats,
  listRecentDocuments: documentApi.listRecentDocuments,

  // ==================== GIS 地理信息子域 ====================

  gis: gisApi,
  listRoutes: gisApi.listRoutes,
  getRoute: gisApi.getRoute,
  createRoute: gisApi.createRoute,
  updateRoute: gisApi.updateRoute,
  deleteRoute: gisApi.deleteRoute,
  listRouteStops: gisApi.listRouteStops,
  createRouteStop: gisApi.createRouteStop,
  listZones: gisApi.listZones,
  createZone: gisApi.createZone,
  listGeofences: gisApi.listGeofences,
  createGeofence: gisApi.createGeofence,
  updateGeofence: gisApi.updateGeofence,
  deleteGeofence: gisApi.deleteGeofence,
  checkGeofence: gisApi.checkGeofence,
  getCurrentLocation: gisApi.getCurrentLocation,
  trackLocation: gisApi.trackLocation,
  getLocationHistory: gisApi.getLocationHistory,
  listMapLayers: gisApi.listMapLayers,
  listMapMarkers: gisApi.listMapMarkers,

  // ==================== BPM 流程引擎子域 ====================

  bpm: bpmApi,
  listWorkflowDefinitions: bpmApi.listDefinitions,
  getWorkflowDefinition: bpmApi.getDefinition,
  startWorkflowInstance: bpmApi.startInstance,
  listWorkflowInstances: bpmApi.listInstances,
  getWorkflowInstance: bpmApi.getInstance,
  cancelWorkflowInstance: bpmApi.cancelInstance,
  suspendWorkflowInstance: bpmApi.suspendInstance,
  resumeWorkflowInstance: bpmApi.resumeInstance,
  listPendingTasks: bpmApi.listPendingTasks,
  getWorkflowTask: bpmApi.getTask,
  claimWorkflowTask: bpmApi.claimTask,
  completeWorkflowTask: bpmApi.completeTask,
  delegateWorkflowTask: bpmApi.delegateTask,
  getWorkflowHistory: bpmApi.getInstanceHistory,
  getWorkflowStats: bpmApi.getWorkflowStats,

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

  // ==================== AI 智能助手子域 ====================

  ai: aiAssistantApi,
  sendAiMessage: aiAssistantApi.sendMessage,
  listAiConversations: aiAssistantApi.listConversations,
  getAiConversation: aiAssistantApi.getConversation,
  deleteAiConversation: aiAssistantApi.deleteConversation,
  streamAiConversation: aiAssistantApi.streamConversation,
  transcribeAudio: aiAssistantApi.transcribeAudio,
  synthesizeSpeech: aiAssistantApi.synthesizeSpeech,
  getAiRecommendations: aiAssistantApi.getRecommendations,
  submitAiFeedback: aiAssistantApi.submitRecommendationFeedback,
  listAiCommands: aiAssistantApi.listCommands,
  executeAiCommand: aiAssistantApi.executeCommand,
  listAiQuickActions: aiAssistantApi.listQuickActions,
  generateAiImage: aiAssistantApi.generateImage,
  listAiModels: aiAssistantApi.listModels,
  getAiStats: aiAssistantApi.getAiStats,

  // ==================== 数据报表子域 ====================

  report: reportApi,
  listReports: reportApi.listReports,
  getReport: reportApi.getReport,
  createReport: reportApi.createReport,
  generateReport: reportApi.generateReport,
  exportReport: reportApi.exportReport,
  listReportCategories: reportApi.listReportCategories,
  listDashboards: reportApi.listDashboards,
  getDashboard: reportApi.getDashboard,
  createDashboard: reportApi.createDashboard,
  listDashboardWidgets: reportApi.listDashboardWidgets,
  addDashboardWidget: reportApi.addDashboardWidget,
  removeDashboardWidget: reportApi.removeDashboardWidget,
  queryData: reportApi.queryData,
  exportData: reportApi.exportData,
  createSchedule: reportApi.createSchedule,
  listSchedules: reportApi.listSchedules,
  deleteSchedule: reportApi.deleteSchedule,

  // ==================== 审批增强子域 ====================

  approvalEnhanced: approvalEnhancedApi,
  listApprovalTemplates: approvalEnhancedApi.listTemplates,
  getApprovalTemplate: approvalEnhancedApi.getTemplate,
  createApprovalTemplate: approvalEnhancedApi.createTemplate,
  updateApprovalTemplate: approvalEnhancedApi.updateTemplate,
  deleteApprovalTemplate: approvalEnhancedApi.deleteTemplate,
  applyApprovalTemplate: approvalEnhancedApi.applyTemplate,
  getApprovalHistory: approvalEnhancedApi.getApprovalHistory,
  listApprovers: approvalEnhancedApi.listApprovers,
  addCcUser: approvalEnhancedApi.addCcUser,
  removeCcUser: approvalEnhancedApi.removeCcUser,
  batchApprove: approvalEnhancedApi.batchApprove,
  batchReject: approvalEnhancedApi.batchReject,
  escalateApproval: approvalEnhancedApi.escalateApproval,
  listDelegations: approvalEnhancedApi.listDelegations,
  createDelegation: approvalEnhancedApi.createDelegation,
  updateDelegation: approvalEnhancedApi.updateDelegation,
  deleteDelegation: approvalEnhancedApi.deleteDelegation,
  listMyApprovals: approvalEnhancedApi.listMyApprovals,
  listMyRequests: approvalEnhancedApi.listMyRequests,
  getApprovalStats: approvalEnhancedApi.getApprovalStats,

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
  workflowApi,
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
  bpmApi,
  oaApi,
  aiAssistantApi,
  reportApi,
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

export type { UserProfile, UpdateProfileRequest } from './user';

export type {
  WorkflowInstance,
  WorkflowTask,
  WorkflowDefinition,
  PendingTaskCount,
  WorkflowStatus,
  WorkflowAction,
} from './workflow';

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
  InventoryMovementType,
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

export type {
  BpmDefinition,
  BpmInstance,
  BpmTask,
  BpmHistory,
  BpmStats,
  StartBpmInstanceRequest,
  CompleteBpmTaskRequest,
  DelegateBpmTaskRequest,
  BpmDefinitionStatus,
  BpmInstanceStatus,
  BpmTaskStatus,
  BpmTaskAction,
} from './bpm';

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

export type {
  AiMessage,
  AiAttachment,
  AiConversation,
  AiRecommendation,
  AiCommand,
  AiModel,
  AiStats,
  SendMessageRequest,
  TranscribeRequest,
  SynthesizeRequest,
  ExecuteCommandRequest,
  GenerateImageRequest,
  AiMessageRole,
  AiConversationStatus,
  AiCommandStatus,
  AiFeedbackType,
} from './aiAssistant';

export type {
  Report,
  ReportCategory,
  Dashboard,
  DashboardWidget,
  QueryResult,
  ExportResult,
  Schedule,
  CreateReportRequest,
  GenerateReportRequest,
  ExportReportRequest,
  CreateDashboardRequest,
  CreateWidgetRequest,
  QueryRequest,
  CreateScheduleRequest,
  ReportStatus,
  ReportType,
  ExportFormat,
  ScheduleFrequency,
} from './report';

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
