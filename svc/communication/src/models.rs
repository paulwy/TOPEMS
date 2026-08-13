#![allow(dead_code)] // serde/utoipa 序列化需要，运行期未直接引用

#[allow(unused_imports)]
pub use topems_shared_bootstrap::audit::{AuditEventParams, AuditLog, ListAuditLogsQuery};

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

/// 规范化邮箱地址：去首尾空白并转小写
pub fn normalize_email(addr: &str) -> String {
    addr.trim().to_lowercase()
}

/// 判断是否为受支持的通知类型（大小写不敏感、自动去除首尾空白）
pub fn is_valid_notification_type(ntype: &str) -> bool {
    matches!(
        ntype.trim().to_lowercase().as_str(),
        "info" | "notice" | "warning" | "alert" | "high" | "urgent" | "critical" | "emergency"
    )
}

/// 将通知优先级限制在 [0, 10] 区间
pub fn clamp_priority(priority: i32) -> i32 {
    priority.clamp(0, 10)
}

// ===== 通知模型 =====

#[derive(Debug, Deserialize, ToSchema)]
pub struct SendNotificationRequest {
    pub user_id: Uuid,
    pub title: String,
    pub content: Option<String>,
    pub notification_type: Option<String>,
    pub priority: Option<i32>,
    pub data: Option<serde_json::Value>,
    pub send_email: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct BroadcastNotificationRequest {
    pub user_ids: Vec<Uuid>,
    pub title: String,
    pub content: Option<String>,
    pub notification_type: Option<String>,
    pub priority: Option<i32>,
    pub data: Option<serde_json::Value>,
    pub send_email: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct NotificationQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub is_read: Option<bool>,
    pub notification_type: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct Notification {
    pub id: Uuid,
    pub user_id: Uuid,
    pub title: String,
    pub content: Option<String>,
    pub notification_type: String,
    pub is_read: bool,
    pub priority: i32,
    pub data: Option<serde_json::Value>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub read_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct BulkIdsRequest {
    pub notification_ids: Vec<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct CreateTemplateRequest {
    pub name: String,
    pub title: String,
    pub content: Option<String>,
    pub notification_type: Option<String>,
    pub priority: Option<i32>,
    pub data: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTemplateRequest {
    pub name: Option<String>,
    pub title: Option<String>,
    pub content: Option<String>,
    pub notification_type: Option<String>,
    pub priority: Option<i32>,
    pub data: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ArchiveConfig {
    pub enabled: bool,
    pub retention_days: i32,
    pub auto_archive_enabled: bool,
    pub auto_archive_interval_days: i32,
    pub auto_archive_days: i32,
}

// ===== 邮件模型 =====

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct SendEmailRequest {
    pub to: String,
    pub subject: String,
    pub body: String,
    pub html_body: Option<String>,
    pub cc: Option<Vec<String>>,
    pub bcc: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize)]
pub struct EmailTemplate {
    pub id: String,
    pub name: String,
    pub subject_template: String,
    pub body_template: String,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateEmailTemplateRequest {
    pub name: String,
    pub subject_template: String,
    pub body_template: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SendWithTemplateRequest {
    pub to: String,
    pub variables: serde_json::Value,
    pub cc: Option<Vec<String>>,
    pub bcc: Option<Vec<String>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateEmailTemplateRequest {
    pub name: Option<String>,
    pub subject_template: Option<String>,
    pub body_template: Option<String>,
    pub description: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize_email_lowercase() {
        assert_eq!(normalize_email("USER@Example.COM"), "user@example.com");
    }

    #[test]
    fn test_normalize_email_trimmed() {
        assert_eq!(normalize_email("  user@example.com  "), "user@example.com");
    }

    #[test]
    fn test_normalize_email_empty() {
        assert_eq!(normalize_email(""), "");
        assert_eq!(normalize_email("   "), "");
    }

    #[test]
    fn test_normalize_email_already_normalized() {
        assert_eq!(normalize_email("a@b.io"), "a@b.io");
    }

    #[test]
    fn test_normalize_email_with_internal_spaces() {
        assert_eq!(normalize_email("a b@c.com"), "a b@c.com");
    }

    #[test]
    fn test_is_valid_notification_type_valid() {
        assert!(is_valid_notification_type("info"));
        assert!(is_valid_notification_type("URGENT"));
        assert!(is_valid_notification_type("  warning  "));
    }

    #[test]
    fn test_is_valid_notification_type_invalid() {
        assert!(!is_valid_notification_type("random"));
        assert!(!is_valid_notification_type(""));
    }

    #[test]
    fn test_is_valid_notification_type_case_insensitive() {
        assert!(is_valid_notification_type("Critical"));
        assert!(is_valid_notification_type("EMERGENCY"));
    }

    #[test]
    fn test_is_valid_notification_type_all_known() {
        for t in [
            "info",
            "notice",
            "warning",
            "alert",
            "high",
            "urgent",
            "critical",
            "emergency",
        ] {
            assert!(is_valid_notification_type(t), "{} should be valid", t);
        }
    }

    #[test]
    fn test_clamp_priority_in_range() {
        assert_eq!(clamp_priority(5), 5);
        assert_eq!(clamp_priority(0), 0);
        assert_eq!(clamp_priority(10), 10);
    }

    #[test]
    fn test_clamp_priority_below_min() {
        assert_eq!(clamp_priority(-3), 0);
    }

    #[test]
    fn test_clamp_priority_above_max() {
        assert_eq!(clamp_priority(99), 10);
    }

    #[test]
    fn test_clamp_priority_boundary() {
        assert_eq!(clamp_priority(-1), 0);
        assert_eq!(clamp_priority(11), 10);
    }
}
