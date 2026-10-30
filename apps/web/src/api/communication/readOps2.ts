import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 待确认-疑似接入 communication 8 条（2026-10-29）──
// 路径对齐统一模块真实挂载：notification → /api/communication/notification，
// im → /api/communication/im，mail → /api/communication/mail（见 communication_real_module.rs）。
export const communicationReadOps2 = {
  listNotifications: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.notification.get('/notify/list'),
  listTemplates: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.notification.get('/notification-templates'),
  listEmails: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.mail.get('/emails'),
  listTemplates2: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.mail.get('/templates'),
  listRooms: async (): Promise<ApiResponse<Record<string, unknown>>> => apiClient.im.get('/rooms'),
  listContacts: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.im.get('/contacts'),
  listContactGroups: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.im.get('/contact-groups'),
  listGeofences: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.im.get('/locations/geofences'),
};
