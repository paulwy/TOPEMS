import type { ApiResponse } from "./client";
export type NotificationTypeEnum = "info" | "success" | "warning" | "error" | "system" | "workflow" | "reminder" | "alert" | "message";
export interface Notification {
    id: string;
    user_id: string;
    notification_type: NotificationTypeEnum;
    title: string;
    content: string;
    data?: any;
    is_read: boolean;
    priority: number;
    link_url?: string;
    created_at: string;
    read_at?: string;
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
    by_type: Record<NotificationTypeEnum, number>;
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
    data_schema?: any;
    default_priority?: number;
    created_at: string;
    updated_at: string;
}
export type TemplateStatusEnum = "active" | "inactive" | "draft" | "deprecated";
export interface CreateTemplateRequest {
    name: string;
    description?: string;
    title_template: string;
    content_template: string;
    notification_type: NotificationTypeEnum;
    status?: TemplateStatusEnum;
    variables?: string[];
    data_schema?: any;
    default_priority?: number;
}
export interface UpdateTemplateRequest extends Partial<CreateTemplateRequest> {
    id: string;
}
export interface NotificationListQuery {
    page?: number;
    page_size?: number;
    notification_type?: NotificationTypeEnum;
}
export interface NotificationListResponse<T = Notification> {
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
    data?: any;
    priority?: number;
    link_url?: string;
}
export declare const getNotifications: (page?: number, pageSize?: number, notificationType?: NotificationTypeEnum) => Promise<ApiResponse<NotificationListResponse>>;
export declare const getUnreadNotifications: () => Promise<ApiResponse<Notification[]>>;
export declare const getUnreadCount: () => Promise<ApiResponse<number>>;
export declare const markAsRead: (id: string) => Promise<ApiResponse<Notification>>;
export declare const markAllAsRead: () => Promise<ApiResponse<number>>;
export declare const deleteNotification: (id: string) => Promise<ApiResponse<boolean>>;
export declare const createNotification: (notification: CreateNotificationRequest) => Promise<ApiResponse<Notification>>;
export declare const getArchivedNotifications: (page?: number, pageSize?: number) => Promise<ApiResponse<NotificationListResponse<ArchivedNotification>>>;
export declare const getArchiveConfig: () => Promise<ApiResponse<ArchiveConfig>>;
export declare const updateArchiveConfig: (config: ArchiveConfig) => Promise<ApiResponse<ArchiveConfig>>;
export interface AutoArchiveResponse {
    archived_count: number;
}
export declare const runAutoArchive: () => Promise<ApiResponse<AutoArchiveResponse>>;
export declare const getMyNotificationStats: () => Promise<ApiResponse<NotificationStats>>;
export interface NotificationTemplateListResponse {
    templates: NotificationTemplate[];
    total: number;
    page: number;
    page_size: number;
}
export declare const getTemplates: (page?: number, pageSize?: number, status?: TemplateStatusEnum) => Promise<ApiResponse<NotificationTemplateListResponse>>;
export declare const getTemplate: (id: string) => Promise<ApiResponse<NotificationTemplate>>;
export declare const createTemplate: (template: CreateTemplateRequest) => Promise<ApiResponse<NotificationTemplate>>;
export declare const updateTemplate: (id: string, template: UpdateTemplateRequest) => Promise<ApiResponse<NotificationTemplate>>;
export declare const deleteTemplate: (id: string) => Promise<ApiResponse<boolean>>;
export declare const renderTemplate: (id: string, data: Record<string, any>) => Promise<ApiResponse<{
    title: string;
    content: string;
}>>;
export declare const bulkMarkAsRead: (ids: string[]) => Promise<ApiResponse<number>>;
export declare const bulkDeleteNotifications: (ids: string[]) => Promise<ApiResponse<number>>;
export interface HealthResponse {
    status: string;
    uptime: string;
    dependencies: {
        database: string;
        redis: string;
    };
}
export declare const notificationServiceApi: {
    getNotifications: (page?: number, pageSize?: number, notificationType?: NotificationTypeEnum) => Promise<ApiResponse<NotificationListResponse>>;
    getUnreadNotifications: () => Promise<ApiResponse<Notification[]>>;
    getUnreadCount: () => Promise<ApiResponse<number>>;
    markAsRead: (id: string) => Promise<ApiResponse<Notification>>;
    markAllAsRead: () => Promise<ApiResponse<number>>;
    deleteNotification: (id: string) => Promise<ApiResponse<boolean>>;
    createNotification: (notification: CreateNotificationRequest) => Promise<ApiResponse<Notification>>;
    health: () => Promise<ApiResponse<HealthResponse>>;
};
