//! Notification submodule - Notification handlers with database support

pub mod archive;
pub mod handlers;
pub mod models;
pub mod templates;

// Re-export all public types and functions for backward compatibility
pub use models::{
    ArchiveConfig, BroadcastNotificationRequest, BulkIdsRequest, CreateTemplateRequest,
    Notification, NotificationQuery, SendNotificationRequest, UpdateTemplateRequest,
};

pub use handlers::{
    broadcast_notification, bulk_delete, bulk_mark_read, delete_all_notifications,
    delete_notification, get_notification, get_notification_stats, get_notifications,
    get_unread_count, get_unread_notifications, list_notifications, mark_all_as_read, mark_as_read,
    mark_as_unread, send_notification,
};

pub use templates::{
    create_template, delete_template, get_template, list_templates, update_template,
};

pub use archive::{
    archive_notification, get_archive_config, get_notification_health_detailed,
    list_archived_notifications, run_auto_archive, unarchive_notification, update_archive_config,
};
