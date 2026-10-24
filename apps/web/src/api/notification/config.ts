/**
 * Notification · 归档配置 API 绑定
 *
 * 后端: svc/communication/src/notification.rs
 * 路由:
 *   GET    /notification/notifications/archive/config
 *   PUT    /notification/notifications/archive/config
 *   POST   /notification/notifications/archive/run
 *   GET    /notification/notifications/archived
 *   POST   /notification/notifications/{id}/archive
 *   POST   /notification/notifications/{id}/unarchive
 */

export interface ArchiveConfig {
  enabled: boolean;
  retention_days: number;
  auto_archive_enabled: boolean;
  auto_archive_interval_days: number;
  auto_archive_days: number;
}

export interface ArchivedNotification {
  id: string;
  user_id: string;
  notification_type: string;
  title: string;
  content: string;
  is_read: boolean;
  priority: number;
  created_at: string;
  archived_at: string;
}
