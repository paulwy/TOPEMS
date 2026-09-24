import apiClient from '../client';
import type { ApiResponse } from '../client';
import { apiLogger } from '@/utils/logger';

import { templateApi } from './template';
import { configApi } from './config';
import { batchApi } from './batch';
import { pushConfigApi } from './pushConfig';
import { preferenceApi } from './preference';
import { deliveryApi } from './delivery';
import { webhookApi } from './webhook';
import { subscriptionApi } from './subscription';
import { channelApi } from './channel';
import { groupApi } from './group';
import { digestApi } from './digest';

const unregisterServiceWorker = async (): Promise<void> => {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        apiLogger.info(`[Service Worker] Unregistered: ${registration.scope}`);
      }
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
      }
      apiLogger.info('[Service Worker] All service workers unregistered');
    } catch (error) {
      apiLogger.error('[Service Worker] Failed to unregister:', error);
    }
  }
};

unregisterServiceWorker();

export type NotificationTypeEnum =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'system'
  | 'workflow'
  | 'reminder'
  | 'alert'
  | 'message';

export interface Notification {
  id: string;
  user_id: string;
  notification_type: NotificationTypeEnum;
  title: string;
  content: string;
  data?: Record<string, unknown>;
  is_read: boolean;
  priority: number;
  link_url?: string;
  created_at: string;
  read_at?: string;
  // 详情页使用的额外字段
  level?: string;
  type?: string;
  source_module?: string;
  source_id?: string;
  actions?: Array<{ type?: string; label?: string; url?: string }>;
  sender_name?: string;
  recipient_name?: string;
  is_top?: boolean;
  is_deleted?: boolean;
  updated_at?: string;
}

export interface ArchivedNotification extends Notification {
  archived_at: string;
}

export interface ArchiveConfig {
  enabled: boolean;
  retention_days: number;
  auto_archive_enabled: boolean;
  auto_archive_interval_days: number;
  auto_archive_days: number;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationTypeEnum, number>;
  by_priority: Record<number, number>;
  total_notifications: number;
  notifications_by_type: Record<NotificationTypeEnum, number>;
  notifications_by_day: Record<string, number>;
  unread_notifications: number;
  read_notifications: number;
  archived_notifications: number;
  generated_at: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  description?: string;
  title_template: string;
  content_template: string;
  notification_type: NotificationTypeEnum;
  status: TemplateStatusEnum;
  variables?: string[];
  data_schema?: Record<string, unknown>;
  default_priority?: number;
  created_at: string;
  updated_at: string;
}

export type TemplateStatusEnum = 'active' | 'inactive' | 'draft' | 'deprecated';

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  title_template: string;
  content_template: string;
  notification_type: NotificationTypeEnum;
  status?: TemplateStatusEnum;
  variables?: string[];
  data_schema?: Record<string, unknown>;
  default_priority?: number;
}

export interface UpdateTemplateRequest extends Partial<CreateTemplateRequest> {
  id: string;
}

interface NotificationListResponse<T = Notification> {
  notifications: T[];
  total: number;
  page: number;
  page_size: number;
  unread_count: number;
}

export interface CreateNotificationRequest {
  title: string;
  content: string;
  notification_type?: NotificationTypeEnum;
  data?: Record<string, unknown>;
  priority?: number;
  link_url?: string;
}

export const getNotifications = async (
  page = 1,
  pageSize = 20,
  notificationType?: NotificationTypeEnum
): Promise<ApiResponse<NotificationListResponse>> => {
  try {
    const params: Record<string, unknown> = {
      page,
      page_size: pageSize,
    };

    if (notificationType) {
      params.notification_type = notificationType;
    }

    const response = await apiClient.notification.get<NotificationListResponse>('/notifications', {
      params,
    });

    return response;
  } catch (error: unknown) {
    // 处理 401 错误
    const err = error as { response?: { status?: number } };
    if (err.response?.status === 401) {
      apiLogger.debug('Notification list request returned 401, returning empty');
      return {
        code: 0,
        success: true,
        data: {
          notifications: [],
          total: 0,
          page,
          page_size: pageSize,
          unread_count: 0,
        },
        message: 'Unauthorized',
        timestamp: Date.now(),
      };
    }
    throw error;
  }
};

const getUnreadNotifications = async (): Promise<ApiResponse<Notification[]>> => {
  const response = await apiClient.notification.get<Notification[]>('/notifications/unread');

  return response;
};

export const getUnreadCount = async (): Promise<ApiResponse<number>> => {
  try {
    const response = await apiClient.notification.get<number>('/notifications/unread-count');
    return response;
  } catch (error: unknown) {
    const err = error as { code?: string; name?: string; response?: { status?: number } };
    if (err.code === 'ERR_CANCELED' || err.code === 'ECONNABORTED' || err.name === 'AbortError') {
      apiLogger.debug('Notification count request was canceled or aborted');
      return {
        code: 0,
        success: true,
        data: 0,
        message: 'Request canceled',
        timestamp: Date.now(),
      };
    }
    // 401 errors are handled by the API client interceptor, suppress them here
    if (err.response?.status === 401) {
      apiLogger.debug('Notification count request returned 401, skipping');
      return {
        code: 0,
        success: true,
        data: 0,
        message: 'Unauthorized',
        timestamp: Date.now(),
      };
    }
    apiLogger.error('Failed to fetch unread count:', error);
    throw error;
  }
};

export const markAsRead = async (id: string): Promise<ApiResponse<Notification>> => {
  return await apiClient.notification.put<Notification>(`/notifications/${id}`);
};

export const markAllAsRead = async (): Promise<ApiResponse<number>> => {
  return await apiClient.notification.put<number>('/notifications/read-all');
};

export const deleteNotification = async (id: string): Promise<ApiResponse<boolean>> => {
  return await apiClient.notification.delete<boolean>(`/notifications/${id}`);
};

export const createNotification = async (
  notification: CreateNotificationRequest
): Promise<ApiResponse<Notification>> => {
  return await apiClient.notification.post<Notification>('/notifications', notification);
};

export const getArchivedNotifications = async (
  page = 1,
  pageSize = 20
): Promise<ApiResponse<NotificationListResponse<ArchivedNotification>>> => {
  const params = {
    page,
    page_size: pageSize,
  };
  const response = await apiClient.notification.get<NotificationListResponse<ArchivedNotification>>(
    '/notifications/archived',
    { params }
  );
  return response;
};

export const getArchiveConfig = async (): Promise<ApiResponse<ArchiveConfig>> => {
  const response = await apiClient.notification.get<ArchiveConfig>('/notifications/archive/config');
  return response;
};

export const updateArchiveConfig = async (
  config: ArchiveConfig
): Promise<ApiResponse<ArchiveConfig>> => {
  const response = await apiClient.notification.put<ArchiveConfig>(
    '/notifications/archive/config',
    config
  );
  return response;
};

export interface AutoArchiveResponse {
  archived_count: number;
}

export const runAutoArchive = async (): Promise<ApiResponse<AutoArchiveResponse>> => {
  const response = await apiClient.notification.post<AutoArchiveResponse>(
    '/notifications/archive/run'
  );
  return response;
};

export const getMyNotificationStats = async (): Promise<ApiResponse<NotificationStats>> => {
  const response = await apiClient.notification.get<NotificationStats>('/notifications/stats/me');
  return response;
};

interface NotificationTemplateListResponse {
  templates: NotificationTemplate[];
  total: number;
  page: number;
  page_size: number;
}

export const getTemplates = async (
  page = 1,
  pageSize = 20,
  status?: TemplateStatusEnum,
  search?: string
): Promise<ApiResponse<NotificationTemplateListResponse>> => {
  const params: Record<string, unknown> = {
    page,
    page_size: pageSize,
  };
  if (status) {
    params.status = status;
  }
  if (search) {
    params.search = search;
  }
  const response = await apiClient.notification.get<NotificationTemplateListResponse>(
    '/notification-templates',
    { params }
  );
  return response;
};

export const getTemplate = async (id: string): Promise<ApiResponse<NotificationTemplate>> => {
  const response = await apiClient.notification.get<NotificationTemplate>(
    `/notification-templates/${id}`
  );
  return response;
};

export const createTemplate = async (
  template: CreateTemplateRequest
): Promise<ApiResponse<NotificationTemplate>> => {
  const response = await apiClient.notification.post<NotificationTemplate>(
    '/notification-templates',
    template
  );
  return response;
};

export const updateTemplate = async (
  id: string,
  template: UpdateTemplateRequest
): Promise<ApiResponse<NotificationTemplate>> => {
  const response = await apiClient.notification.put<NotificationTemplate>(
    `/notification-templates/${id}`,
    template
  );
  return response;
};

export const deleteTemplate = async (id: string): Promise<ApiResponse<boolean>> => {
  const response = await apiClient.notification.delete<boolean>(`/notification-templates/${id}`);
  return response;
};

export const renderTemplate = async (
  id: string,
  data: Record<string, unknown>
): Promise<ApiResponse<{ title: string; content: string }>> => {
  const response = await apiClient.notification.post<{
    title: string;
    content: string;
  }>(`/notification-templates/${id}/render`, data);
  return response;
};

export const bulkMarkAsRead = async (ids: string[]): Promise<ApiResponse<number>> => {
  const response = await apiClient.notification.put<number>('/notifications/bulk-read', {
    ids,
  });
  return response;
};

export const bulkDeleteNotifications = async (ids: string[]): Promise<ApiResponse<number>> => {
  const response = await apiClient.notification.delete<number>('/notifications/bulk', {
    data: { ids },
  });
  return response;
};

interface HealthResponse {
  status: string;
  uptime: string;
  dependencies: {
    database: string;
    redis: string;
  };
}

export const notificationServiceApi = {
  getNotifications,
  getUnreadNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
  health: async (): Promise<ApiResponse<HealthResponse>> => {
    const response = await apiClient.notification.get<HealthResponse>(
      '/notifications/health/detailed'
    );
    return response;
  },
};

export const notificationApi = {
  // 基础通知操作
  get: async (id: string): Promise<ApiResponse<Notification>> => {
    return await apiClient.notification.get<Notification>(`/notifications/${id}`);
  },
  markRead: async (id: string): Promise<ApiResponse<Notification>> => {
    return await apiClient.notification.put<Notification>(`/notifications/${id}`);
  },
  markUnread: async (id: string): Promise<ApiResponse<Notification>> => {
    return await apiClient.notification.put<Notification>(`/notifications/${id}/unread`);
  },

  // 模板子域
  listTemplates: templateApi.listTemplates,
  getTemplate: templateApi.getTemplate,
  createTemplate: templateApi.createTemplate,
  updateTemplate: templateApi.updateTemplate,
  deleteTemplate: templateApi.deleteTemplate,
  renderTemplate: templateApi.renderTemplate,
  testTemplate: templateApi.testTemplate,
  getTemplateVersions: templateApi.getTemplateVersions,
  cloneTemplate: templateApi.cloneTemplate,
  getTemplateVariables: templateApi.getTemplateVariables,
  updateTemplateStatus: templateApi.updateTemplateStatus,
  batchUpdateTemplateStatus: templateApi.batchUpdateTemplateStatus,

  // 批量操作子域
  sendNotification: batchApi.sendNotification,
  broadcastNotification: batchApi.broadcastNotification,
  broadcastWithTemplate: batchApi.broadcastWithTemplate,
  getBulkProgress: batchApi.getBulkProgress,
  bulkMarkAsRead: batchApi.bulkMarkAsRead,
  bulkMarkAsReadByCondition: batchApi.bulkMarkAsReadByCondition,
  bulkMarkAsUnread: batchApi.bulkMarkAsUnread,
  bulkDeleteNotifications: batchApi.bulkDeleteNotifications,
  bulkDeleteByCondition: batchApi.bulkDeleteByCondition,
  bulkArchive: batchApi.bulkArchive,
  bulkUnarchive: batchApi.bulkUnarchive,
  bulkDeleteAll: batchApi.bulkDeleteAll,

  // 推送配置子域
  getPushConfig: pushConfigApi.getConfig,
  updatePushConfig: pushConfigApi.updateConfig,
  listPushChannels: pushConfigApi.listChannels,
  createPushChannel: pushConfigApi.createChannel,
  updatePushChannel: pushConfigApi.updateChannel,
  deletePushChannel: pushConfigApi.deleteChannel,
  getPushPreferences: pushConfigApi.getPreferences,
  updatePushPreferences: pushConfigApi.updatePreferences,
  testPush: pushConfigApi.testPush,
  enablePushChannel: pushConfigApi.enableChannel,
  disablePushChannel: pushConfigApi.disableChannel,
  setQuietHours: pushConfigApi.setQuietHours,
  clearQuietHours: pushConfigApi.clearQuietHours,

  // 用户偏好子域
  getMyPreferences: preferenceApi.getMyPreferences,
  updateMyPreferences: preferenceApi.updateMyPreferences,
  getCategoryPreferences: preferenceApi.getCategoryPreferences,
  updateCategoryPreference: preferenceApi.updateCategoryPreference,
  enableCategory: preferenceApi.enableCategory,
  disableCategory: preferenceApi.disableCategory,
  setCategoryChannels: preferenceApi.setCategoryChannels,
  setGlobalMute: preferenceApi.setGlobalMute,
  cancelGlobalMute: preferenceApi.cancelGlobalMute,
  getQuietHours: preferenceApi.getQuietHours,
  updateQuietHours: preferenceApi.updateQuietHours,
  resetPreferences: preferenceApi.resetPreferences,
  getDefaultPreferences: preferenceApi.getDefaultPreferences,
  setDefaultChannels: preferenceApi.setDefaultChannels,

  // 送达追踪子域
  listDeliveries: deliveryApi.listDeliveries,
  getDelivery: deliveryApi.getDelivery,
  retryDelivery: deliveryApi.retryDelivery,
  getBatchDeliveries: deliveryApi.getBatchDeliveries,
  getUserDeliveries: deliveryApi.getUserDeliveries,
  getDeliveryStats: deliveryApi.getDeliveryStats,
  getFailedDeliveries: deliveryApi.getFailedDeliveries,
  retryAllFailed: deliveryApi.retryAllFailed,
  getChannelDeliveries: deliveryApi.getChannelDeliveries,
  deleteDelivery: deliveryApi.deleteDelivery,

  // Webhook 集成子域
  listWebhooks: webhookApi.listWebhooks,
  createWebhook: webhookApi.createWebhook,
  getWebhook: webhookApi.getWebhook,
  updateWebhook: webhookApi.updateWebhook,
  deleteWebhook: webhookApi.deleteWebhook,
  testWebhook: webhookApi.testWebhook,
  getWebhookEvents: webhookApi.getWebhookEvents,
  enableWebhook: webhookApi.enableWebhook,
  disableWebhook: webhookApi.disableWebhook,
  rotateWebhookSecret: webhookApi.rotateWebhookSecret,
  getEventDeliveries: webhookApi.getEventDeliveries,

  // 订阅管理子域
  listSubscriptions: subscriptionApi.listSubscriptions,
  getSubscription: subscriptionApi.getSubscription,
  createSubscription: subscriptionApi.createSubscription,
  updateSubscription: subscriptionApi.updateSubscription,
  deleteSubscription: subscriptionApi.deleteSubscription,
  pauseSubscription: subscriptionApi.pauseSubscription,
  resumeSubscription: subscriptionApi.resumeSubscription,
  getMySubscriptions: subscriptionApi.getMySubscriptions,
  subscribeToEvent: subscriptionApi.subscribeToEvent,
  listEventTypes: subscriptionApi.listEventTypes,

  // 渠道与 Provider 子域
  listChannels: channelApi.listChannels,
  createChannel: channelApi.createChannel,
  updateChannel: channelApi.updateChannel,
  deleteChannel: channelApi.deleteChannel,
  testChannel: channelApi.testChannel,
  getChannelMetrics: channelApi.getChannelMetrics,
  listProviders: channelApi.listProviders,
  createProvider: channelApi.createProvider,
  testProvider: channelApi.testProvider,

  // 分组与话题子域
  listGroups: groupApi.listGroups,
  createGroup: groupApi.createGroup,
  updateGroup: groupApi.updateGroup,
  deleteGroup: groupApi.deleteGroup,
  listGroupMembers: groupApi.listGroupMembers,
  addGroupMembers: groupApi.addGroupMembers,
  broadcastToGroup: groupApi.broadcastToGroup,
  listTopics: groupApi.listTopics,
  subscribeToTopic: groupApi.subscribeToTopic,
  getMyTopics: groupApi.getMyTopics,

  // 摘要与定时通知子域
  listDigests: digestApi.listDigests,
  createDigest: digestApi.createDigest,
  sendDigest: digestApi.sendDigest,
  getDigestHistory: digestApi.getDigestHistory,
  listScheduled: digestApi.listScheduled,
  createScheduled: digestApi.createScheduled,
  sendScheduledNow: digestApi.sendScheduledNow,
  getMyScheduled: digestApi.getMyScheduled,
};

export { templateApi, configApi, batchApi, deliveryApi, channelApi, groupApi, digestApi };

export type {
  SendNotificationRequest,
  BroadcastNotificationRequest,
  SendResult,
  BatchResult,
  BulkActionResponse,
  BulkArchiveRequest,
  BroadcastWithTemplateRequest,
  BulkProgress,
} from './batch';

export type {
  PushConfig,
  PushChannel,
  PushPreference,
  PushChannelType,
  PushStatus,
  TestPushRequest,
  TestPushResponse,
} from './pushConfig';

export type {
  TestTemplateRequest,
  TestTemplateResponse,
  TemplateVersion,
  TemplateCloneRequest,
} from './template';

export type {
  Email,
  EmailTemplate,
  SendEmailRequest,
  CreateEmailTemplateRequest,
  UpdateEmailTemplateRequest,
  SendWithTemplateRequest,
} from './mail';

export type {
  NotificationCategory,
  DeliveryChannel,
  CategoryPreference,
  QuietHours,
  GlobalMute,
  UserPreferences,
  UpdatePreferenceRequest,
  CategoryPreferenceResponse,
} from './preference';

export type {
  DeliveryStatus,
  DeliveryRecord,
  DeliveryListQuery,
  DeliveryListResponse,
  DeliveryStats,
  RetryDeliveryResponse,
} from './delivery';

export type {
  WebhookEventType,
  WebhookStatus,
  WebhookConfig,
  CreateWebhookRequest,
  UpdateWebhookRequest,
  WebhookDelivery,
  WebhookEvent,
  TestWebhookResponse,
  WebhookListResponse,
  WebhookEventListResponse,
} from './webhook';

export type {
  SubscriptionStatus,
  NotificationSubscription,
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
  SubscriptionListQuery,
} from './subscription';

export type {
  ChannelType,
  ChannelStatus,
  ProviderStatus,
  NotificationChannel,
  NotificationProvider,
  CreateChannelRequest,
  UpdateChannelRequest,
  ChannelMetrics,
} from './channel';

export type {
  GroupType,
  TopicStatus,
  NotificationGroup,
  NotificationTopic,
  GroupMember,
  CreateGroupRequest,
  CreateTopicRequest,
} from './group';

export type {
  DigestFrequency,
  DigestStatus,
  ScheduleStatus,
  NotificationDigest,
  ScheduledNotification,
  DigestHistory,
  CreateDigestRequest,
  CreateScheduledRequest,
} from './digest';

export default notificationServiceApi;
