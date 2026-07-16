#!/usr/bin/env python3
"""
拆分 notification.rs 为多个子模块
"""

# 读取原始文件
with open('/Users/air/TOPEMS/svc/unified-core/src/modules/communication/notification.rs', 'r') as f:
    content = f.read()
    lines = content.split('\n')

print(f"Total lines: {len(lines)}")

# ===== models.rs =====
model_ranges = [
    (15, 23),      # SendNotificationRequest
    (26, 34),      # BroadcastNotificationRequest
    (37, 42),      # NotificationQuery
    (45, 56),      # Notification
    (578, 580),    # BulkIdsRequest
    (583, 590),    # CreateTemplateRequest
    (593, 600),    # UpdateTemplateRequest
    (1673, 1679),  # ArchiveConfig
]

models_content = "use serde::{Deserialize, Serialize};\nuse uuid::Uuid;\n\n"
for start, end in model_ranges:
    for i in range(start-1, end):
        models_content += lines[i] + '\n'
    models_content += '\n'

models_content = models_content.rstrip() + '\n'

with open('/Users/air/TOPEMS/svc/unified-core/src/modules/communication/notification/models.rs', 'w') as f:
    f.write(models_content)

print("models.rs written")

# ===== handlers.rs =====
handler_ranges = [
    (58, 142),      # send_notification
    (144, 201),     # broadcast_notification
    (203, 310),     # list_notifications
    (312, 388),     # mark_as_read
    (390, 441),     # mark_all_as_read
    (443, 450),     # get_notifications
    (452, 497),     # get_unread_count
    (499, 575),     # get_unread_notifications
    (602, 671),     # delete_notification
    (673, 715),     # delete_all_notifications
    (717, 785),     # get_notification
    (787, 862),     # mark_as_unread
    (864, 928),     # bulk_mark_read
    (930, 988),     # bulk_delete
    (1251, 1333),   # get_notification_stats
    (1644, 1670),   # send_notification_email (private)
]

handlers_imports = """use crate::AppState;
use axum::Extension;
use axum::{
    extract::{Path, Query, State},
    Json,
};
use sqlx::Row;
use topems_shared::auth::Claims;
use uuid::Uuid;

use super::models::{
    SendNotificationRequest,
    BroadcastNotificationRequest,
    NotificationQuery,
    BulkIdsRequest,
};
"""

handlers_content = handlers_imports + "\n"
for start, end in handler_ranges:
    for i in range(start-1, end):
        handlers_content += lines[i] + '\n'
    handlers_content += '\n'

handlers_content = handlers_content.rstrip() + '\n'

with open('/Users/air/TOPEMS/svc/unified-core/src/modules/communication/notification/handlers.rs', 'w') as f:
    f.write(handlers_content)

print("handlers.rs written")

# ===== templates.rs =====
template_ranges = [
    (1335, 1389),   # list_templates
    (1391, 1444),   # get_template
    (1446, 1520),   # create_template
    (1522, 1598),   # update_template
    (1600, 1642),   # delete_template
]

templates_imports = """use crate::AppState;
use axum::Extension;
use axum::{
    extract::{Path, State},
    Json,
};
use sqlx::Row;
use topems_shared::auth::Claims;
use uuid::Uuid;

use super::models::{
    CreateTemplateRequest,
    UpdateTemplateRequest,
};
"""

templates_content = templates_imports + "\n"
for start, end in template_ranges:
    for i in range(start-1, end):
        templates_content += lines[i] + '\n'
    templates_content += '\n'

templates_content = templates_content.rstrip() + '\n'

with open('/Users/air/TOPEMS/svc/unified-core/src/modules/communication/notification/templates.rs', 'w') as f:
    f.write(templates_content)

print("templates.rs written")

# ===== archive.rs =====
archive_ranges = [
    (990, 1065),    # archive_notification
    (1067, 1142),   # unarchive_notification
    (1144, 1249),   # list_archived_notifications
    (1681, 1697),   # get_archive_config
    (1699, 1710),   # update_archive_config
    (1712, 1743),   # run_auto_archive
    (1745, 1784),   # get_notification_health_detailed
]

archive_imports = """use crate::AppState;
use axum::Extension;
use axum::{
    extract::{Path, Query, State},
    Json,
};
use sqlx::Row;
use topems_shared::auth::Claims;
use uuid::Uuid;

use super::models::{
    NotificationQuery,
    ArchiveConfig,
};
"""

archive_content = archive_imports + "\n"
for start, end in archive_ranges:
    for i in range(start-1, end):
        archive_content += lines[i] + '\n'
    archive_content += '\n'

archive_content = archive_content.rstrip() + '\n'

with open('/Users/air/TOPEMS/svc/unified-core/src/modules/communication/notification/archive.rs', 'w') as f:
    f.write(archive_content)

print("archive.rs written")

# ===== mod.rs =====
mod_content = '''//! Notification submodule - Notification handlers with database support

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
'''

with open('/Users/air/TOPEMS/svc/unified-core/src/modules/communication/notification/mod.rs', 'w') as f:
    f.write(mod_content)

print("mod.rs written")
print("\nDone! All files created.")
