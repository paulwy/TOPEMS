import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 待确认-疑似接入 communication 8 条（2026-10-29）──
export const communicationReadOps2 = {
  listNotifications: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.notification.get('/notify/list'),
  listTemplates: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.notification.get('/notification/notification-templates'),
  listEmails: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.notification.get('/mail/emails'),
  listTemplates2: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.notification.get('/mail/templates'),
  listRooms: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.notification.get('/im/rooms'),
  listContacts: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.notification.get('/im/contacts'),
  listContactGroups: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.notification.get('/im/contact-groups'),
  listGeofences: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.notification.get('/locations/geofences'),
};