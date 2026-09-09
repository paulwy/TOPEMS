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

// ===== 通知渠道模型 =====

#[derive(Debug, Deserialize)]
pub struct ChannelQuery {
    pub r#type: Option<String>,
    pub status: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct CreateChannelRequest {
    pub name: String,
    pub r#type: String,
    pub provider_id: Option<Uuid>,
    pub config: Option<serde_json::Value>,
    pub is_default: Option<bool>,
    pub rate_limit_per_minute: Option<i32>,
    pub retry_count: Option<i32>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateChannelRequest {
    pub name: Option<String>,
    pub config: Option<serde_json::Value>,
    pub is_default: Option<bool>,
    pub rate_limit_per_minute: Option<i32>,
    pub retry_count: Option<i32>,
    pub description: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct NotificationChannel {
    pub id: Uuid,
    pub tenant_id: String,
    pub name: String,
    pub r#type: String,
    pub status: String,
    pub provider_id: Option<Uuid>,
    pub is_default: bool,
    pub config: serde_json::Value,
    pub rate_limit_per_minute: Option<i32>,
    pub retry_count: Option<i32>,
    pub description: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize)]
pub struct ChannelMetrics {
    pub total_sent: i64,
    pub total_failed: i64,
    pub success_rate: f64,
    pub avg_latency_ms: f64,
    pub by_hour: Vec<serde_json::Value>,
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

    // ===== serde 往返 / 构造 / 边界值测试 =====

    fn sample_uuid() -> Uuid {
        Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap()
    }

    #[test]
    fn test_send_notification_request_deserialize_full() {
        let json = serde_json::json!({
            "user_id": sample_uuid(),
            "title": "标题",
            "content": "正文",
            "notification_type": "urgent",
            "priority": 9,
            "data": {"k": "v"},
            "send_email": true
        });
        let req: SendNotificationRequest = serde_json::from_value(json).unwrap();
        assert_eq!(req.user_id, sample_uuid());
        assert_eq!(req.title, "标题");
        assert_eq!(req.content.as_deref(), Some("正文"));
        assert_eq!(req.notification_type.as_deref(), Some("urgent"));
        assert_eq!(req.priority, Some(9));
        assert_eq!(req.send_email, Some(true));
    }

    #[test]
    fn test_send_notification_request_deserialize_minimal() {
        let json = serde_json::json!({
            "user_id": sample_uuid(),
            "title": "t"
        });
        let req: SendNotificationRequest = serde_json::from_value(json).unwrap();
        assert!(req.content.is_none());
        assert!(req.notification_type.is_none());
        assert!(req.priority.is_none());
        assert!(req.data.is_none());
        assert!(req.send_email.is_none());
    }

    #[test]
    fn test_send_notification_request_deserialize_missing_user_id_fails() {
        let json = serde_json::json!({"title": "t"});
        assert!(serde_json::from_value::<SendNotificationRequest>(json).is_err());
    }

    #[test]
    fn test_broadcast_notification_request_deserialize() {
        let json = serde_json::json!({
            "user_ids": [sample_uuid()],
            "title": "广播",
            "content": null,
            "send_email": false
        });
        let req: BroadcastNotificationRequest = serde_json::from_value(json).unwrap();
        assert_eq!(req.user_ids.len(), 1);
        assert_eq!(req.title, "广播");
        assert!(req.content.is_none());
    }

    #[test]
    fn test_broadcast_notification_request_empty_user_ids() {
        let json = serde_json::json!({"user_ids": [], "title": "x"});
        let req: BroadcastNotificationRequest = serde_json::from_value(json).unwrap();
        assert!(req.user_ids.is_empty());
    }

    #[test]
    fn test_notification_query_deserialize_all_none() {
        let req: NotificationQuery = serde_json::from_value(serde_json::json!({})).unwrap();
        assert!(req.page.is_none());
        assert!(req.page_size.is_none());
        assert!(req.is_read.is_none());
        assert!(req.notification_type.is_none());
    }

    #[test]
    fn test_notification_query_deserialize_full() {
        let json = serde_json::json!({
            "page": 2,
            "page_size": 50,
            "is_read": true,
            "notification_type": "alert"
        });
        let req: NotificationQuery = serde_json::from_value(json).unwrap();
        assert_eq!(req.page, Some(2));
        assert_eq!(req.page_size, Some(50));
        assert_eq!(req.is_read, Some(true));
        assert_eq!(req.notification_type.as_deref(), Some("alert"));
    }

    #[test]
    fn test_notification_serialize_roundtrip_fields() {
        let n = Notification {
            id: sample_uuid(),
            user_id: sample_uuid(),
            title: "t".to_string(),
            content: None,
            notification_type: "info".to_string(),
            is_read: false,
            priority: 0,
            data: None,
            created_at: chrono::Utc::now(),
            read_at: None,
        };
        let v = serde_json::to_value(&n).unwrap();
        assert_eq!(v["title"], "t");
        assert_eq!(v["is_read"], false);
        assert_eq!(v["priority"], 0);
        assert!(v["content"].is_null());
        assert!(v["read_at"].is_null());
    }

    #[test]
    fn test_notification_serialize_with_data() {
        let n = Notification {
            id: sample_uuid(),
            user_id: sample_uuid(),
            title: "t".to_string(),
            content: Some("c".to_string()),
            notification_type: "warning".to_string(),
            is_read: true,
            priority: 5,
            data: Some(serde_json::json!({"a": 1})),
            created_at: chrono::Utc::now(),
            read_at: Some(chrono::Utc::now()),
        };
        let v = serde_json::to_value(&n).unwrap();
        assert_eq!(v["content"], "c");
        assert_eq!(v["data"]["a"], 1);
        assert_eq!(v["is_read"], true);
    }

    #[test]
    fn test_bulk_ids_request_deserialize() {
        let json = serde_json::json!({"notification_ids": [sample_uuid(), sample_uuid()]});
        let req: BulkIdsRequest = serde_json::from_value(json).unwrap();
        assert_eq!(req.notification_ids.len(), 2);
    }

    #[test]
    fn test_bulk_ids_request_empty() {
        let req: BulkIdsRequest =
            serde_json::from_value(serde_json::json!({"notification_ids": []})).unwrap();
        assert!(req.notification_ids.is_empty());
    }

    #[test]
    fn test_create_template_request_deserialize() {
        let json = serde_json::json!({
            "name": "n",
            "title": "t",
            "content": "c",
            "notification_type": "high",
            "priority": 7
        });
        let req: CreateTemplateRequest = serde_json::from_value(json).unwrap();
        assert_eq!(req.name, "n");
        assert_eq!(req.title, "t");
        assert_eq!(req.priority, Some(7));
    }

    #[test]
    fn test_create_template_request_minimal() {
        let json = serde_json::json!({"name": "n", "title": "t"});
        let req: CreateTemplateRequest = serde_json::from_value(json).unwrap();
        assert!(req.content.is_none());
        assert!(req.notification_type.is_none());
        assert!(req.priority.is_none());
        assert!(req.data.is_none());
    }

    #[test]
    fn test_update_template_request_all_none() {
        let req: UpdateTemplateRequest = serde_json::from_value(serde_json::json!({})).unwrap();
        assert!(req.name.is_none());
        assert!(req.title.is_none());
        assert!(req.content.is_none());
        assert!(req.priority.is_none());
    }

    #[test]
    fn test_update_template_request_partial() {
        let json = serde_json::json!({"title": "new", "priority": 3});
        let req: UpdateTemplateRequest = serde_json::from_value(json).unwrap();
        assert_eq!(req.title.as_deref(), Some("new"));
        assert_eq!(req.priority, Some(3));
        assert!(req.name.is_none());
    }

    #[test]
    fn test_archive_config_roundtrip() {
        let cfg = ArchiveConfig {
            enabled: true,
            retention_days: 30,
            auto_archive_enabled: false,
            auto_archive_interval_days: 7,
            auto_archive_days: 15,
        };
        let v = serde_json::to_value(&cfg).unwrap();
        let back: ArchiveConfig = serde_json::from_value(v).unwrap();
        assert!(back.enabled);
        assert_eq!(back.retention_days, 30);
        assert_eq!(back.auto_archive_days, 15);
    }

    #[test]
    fn test_archive_config_deserialize_defaults_via_json() {
        let json = serde_json::json!({
            "enabled": false,
            "retention_days": 0,
            "auto_archive_enabled": false,
            "auto_archive_interval_days": 0,
            "auto_archive_days": 0
        });
        let cfg: ArchiveConfig = serde_json::from_value(json).unwrap();
        assert_eq!(cfg.retention_days, 0);
    }

    #[test]
    fn test_send_email_request_deserialize_full() {
        let json = serde_json::json!({
            "to": "a@b.com",
            "subject": "s",
            "body": "b",
            "html_body": "<p>hi</p>",
            "cc": ["x@y.com"],
            "bcc": ["z@w.com"]
        });
        let req: SendEmailRequest = serde_json::from_value(json).unwrap();
        assert_eq!(req.to, "a@b.com");
        assert_eq!(req.cc.as_ref().unwrap(), &vec!["x@y.com".to_string()]);
        assert_eq!(req.bcc.as_ref().unwrap(), &vec!["z@w.com".to_string()]);
        assert!(req.clone().html_body.is_some());
    }

    #[test]
    fn test_send_email_request_clone_independent() {
        let req = SendEmailRequest {
            to: "a@b.com".to_string(),
            subject: "s".to_string(),
            body: "b".to_string(),
            html_body: None,
            cc: None,
            bcc: None,
        };
        let mut cloned = req.clone();
        cloned.subject = "changed".to_string();
        assert_eq!(req.subject, "s");
        assert_eq!(cloned.subject, "changed");
    }

    #[test]
    fn test_email_template_serialize() {
        let t = EmailTemplate {
            id: "abc".to_string(),
            name: "n".to_string(),
            subject_template: "{{x}}".to_string(),
            body_template: "body".to_string(),
            description: Some("d".to_string()),
            created_at: "2024-01-01".to_string(),
            updated_at: "2024-01-02".to_string(),
        };
        let v = serde_json::to_value(&t).unwrap();
        assert_eq!(v["id"], "abc");
        assert_eq!(v["name"], "n");
        assert_eq!(v["description"], "d");
    }

    #[test]
    fn test_email_template_clone() {
        let t = EmailTemplate {
            id: "1".to_string(),
            name: "n".to_string(),
            subject_template: "s".to_string(),
            body_template: "b".to_string(),
            description: None,
            created_at: "c".to_string(),
            updated_at: "u".to_string(),
        };
        let c = t.clone();
        assert_eq!(c.id, t.id);
        assert_eq!(c.body_template, t.body_template);
    }

    #[test]
    fn test_create_email_template_request_deserialize() {
        let json = serde_json::json!({
            "name": "n",
            "subject_template": "s",
            "body_template": "b",
            "description": "d"
        });
        let req: CreateEmailTemplateRequest = serde_json::from_value(json).unwrap();
        assert_eq!(req.name, "n");
        assert_eq!(req.description.as_deref(), Some("d"));
    }

    #[test]
    fn test_send_with_template_request_deserialize() {
        let json = serde_json::json!({
            "to": "a@b.com",
            "variables": {"k": "v"},
            "cc": null,
            "bcc": null
        });
        let req: SendWithTemplateRequest = serde_json::from_value(json).unwrap();
        assert_eq!(req.to, "a@b.com");
        assert_eq!(req.variables["k"], "v");
        assert!(req.cc.is_none());
    }

    #[test]
    fn test_update_email_template_request_all_none() {
        let req: UpdateEmailTemplateRequest =
            serde_json::from_value(serde_json::json!({})).unwrap();
        assert!(req.name.is_none());
        assert!(req.subject_template.is_none());
        assert!(req.body_template.is_none());
        assert!(req.description.is_none());
    }

    #[test]
    fn test_update_email_template_request_partial() {
        let json = serde_json::json!({"body_template": "new body"});
        let req: UpdateEmailTemplateRequest = serde_json::from_value(json).unwrap();
        assert_eq!(req.body_template.as_deref(), Some("new body"));
    }
}
