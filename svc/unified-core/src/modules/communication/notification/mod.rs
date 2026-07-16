//! Notification submodule - Notification handlers with database support

pub mod models;
pub mod handlers;
pub mod templates;
pub mod archive;

// Re-export all public types and functions for backward compatibility
pub use models::{
    SendNotificationRequest,
    BroadcastNotificationRequest,
    NotificationQuery,
    Notification,
    BulkIdsRequest,
    CreateTemplateRequest,
    UpdateTemplateRequest,
    ArchiveConfig,
};

pub use handlers::{
    send_notification,
    broadcast_notification,
    list_notifications,
    mark_as_read,
    mark_all_as_read,
    get_notifications,
    get_unread_count,
    get_unread_notifications,
    delete_notification,
    delete_all_notifications,
    get_notification,
    mark_as_unread,
    bulk_mark_read,
    bulk_delete,
    get_notification_stats,
};

pub use templates::{
    list_templates,
    get_template,
    create_template,
    update_template,
    delete_template,
};

pub use archive::{
    archive_notification,
    unarchive_notification,
    list_archived_notifications,
    get_archive_config,
    update_archive_config,
    run_auto_archive,
    get_notification_health_detailed,
};
