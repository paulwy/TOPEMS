use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Notification {
    pub id: Uuid,
    pub project_id: Uuid,
    pub user_id: Option<String>,
    pub notification_type: String,
    pub title: String,
    pub message: String,
    pub status: String,
    pub priority: String,
    pub metadata: Option<serde_json::Value>,
    pub due_date: Option<DateTime<Utc>>,
    pub delivered_at: Option<DateTime<Utc>>,
    pub read_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateNotificationRequest {
    pub project_id: Uuid,
    pub user_id: Option<String>,
    pub notification_type: String,
    pub title: String,
    pub message: String,
    pub priority: String,
    pub metadata: Option<serde_json::Value>,
    pub due_date: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateNotificationRequest {
    pub status: Option<String>,
    pub read_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct NotificationSetting {
    pub id: Uuid,
    pub project_id: Uuid,
    pub user_id: String,
    pub notification_type: String,
    pub enabled: bool,
    pub notify_before_days: Option<i32>,
    pub preferred_channel: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateNotificationSettingRequest {
    pub notification_type: String,
    pub enabled: bool,
    pub notify_before_days: Option<i32>,
    pub preferred_channel: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReminderConfig {
    pub milestone_reminder_days: i32,
    pub task_reminder_days: i32,
    pub approval_reminder_days: i32,
    pub risk_alert_enabled: bool,
    pub risk_threshold: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NotificationType {
    pub code: String,
    pub name: String,
    pub description: String,
    pub default_enabled: bool,
    pub default_priority: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn now() -> DateTime<Utc> {
        Utc::now()
    }

    fn uid() -> Uuid {
        Uuid::parse_str("123e4567-e89b-12d3-a456-426614174000").unwrap()
    }

    // ---- Notification ----

    fn sample_notification() -> Notification {
        Notification {
            id: uid(),
            project_id: uid(),
            user_id: Some("user-001".to_string()),
            notification_type: "milestone".to_string(),
            title: "里程碑提醒".to_string(),
            message: "即将到达里程碑".to_string(),
            status: "unread".to_string(),
            priority: "high".to_string(),
            metadata: Some(serde_json::json!({"milestone_id": "m1"})),
            due_date: Some(now()),
            delivered_at: Some(now()),
            read_at: None,
            created_at: now(),
            updated_at: now(),
        }
    }

    #[test]
    fn test_notification_serde_roundtrip() {
        let n = sample_notification();
        let s = serde_json::to_string(&n).unwrap();
        let back: Notification = serde_json::from_str(&s).unwrap();
        assert_eq!(back.id, n.id);
        assert_eq!(back.notification_type, n.notification_type);
        assert_eq!(back.title, n.title);
        assert_eq!(back.status, n.status);
        assert_eq!(back.priority, n.priority);
        assert_eq!(back.metadata, n.metadata);
    }

    #[test]
    fn test_notification_with_none_optional() {
        let n = Notification {
            id: uid(),
            project_id: uid(),
            user_id: None,
            notification_type: "info".to_string(),
            title: "t".to_string(),
            message: "m".to_string(),
            status: "unread".to_string(),
            priority: "low".to_string(),
            metadata: None,
            due_date: None,
            delivered_at: None,
            read_at: None,
            created_at: now(),
            updated_at: now(),
        };
        let s = serde_json::to_string(&n).unwrap();
        let back: Notification = serde_json::from_str(&s).unwrap();
        assert!(back.user_id.is_none());
        assert!(back.metadata.is_none());
        assert!(back.due_date.is_none());
    }

    #[test]
    fn test_notification_read_status_roundtrip() {
        let mut n = sample_notification();
        n.status = "read".to_string();
        n.read_at = Some(now());
        let s = serde_json::to_string(&n).unwrap();
        let back: Notification = serde_json::from_str(&s).unwrap();
        assert_eq!(back.status, "read");
        assert!(back.read_at.is_some());
    }

    #[test]
    fn test_notification_complex_metadata() {
        let mut n = sample_notification();
        n.metadata = Some(serde_json::json!({
            "ref_id": "milestone-123",
            "days_before": 3,
            "channels": ["email", "sms"]
        }));
        let s = serde_json::to_string(&n).unwrap();
        let back: Notification = serde_json::from_str(&s).unwrap();
        assert_eq!(back.metadata, n.metadata);
    }

    // ---- CreateNotificationRequest ----

    #[test]
    fn test_create_notification_request_roundtrip() {
        let r = CreateNotificationRequest {
            project_id: uid(),
            user_id: Some("u".to_string()),
            notification_type: "task".to_string(),
            title: "t".to_string(),
            message: "m".to_string(),
            priority: "medium".to_string(),
            metadata: Some(serde_json::json!({"k": "v"})),
            due_date: Some("2026-12-31".to_string()),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateNotificationRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.title, r.title);
        assert_eq!(back.priority, r.priority);
        assert_eq!(back.metadata, r.metadata);
    }

    #[test]
    fn test_create_notification_request_minimal() {
        let r = CreateNotificationRequest {
            project_id: uid(),
            user_id: None,
            notification_type: "info".to_string(),
            title: "t".to_string(),
            message: "m".to_string(),
            priority: "low".to_string(),
            metadata: None,
            due_date: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateNotificationRequest = serde_json::from_str(&s).unwrap();
        assert!(back.user_id.is_none());
        assert!(back.metadata.is_none());
    }

    // ---- UpdateNotificationRequest ----

    #[test]
    fn test_update_notification_request_all_none() {
        let r = UpdateNotificationRequest {
            status: None,
            read_at: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: UpdateNotificationRequest = serde_json::from_str(&s).unwrap();
        assert!(back.status.is_none());
        assert!(back.read_at.is_none());
    }

    #[test]
    fn test_update_notification_request_with_values() {
        let r = UpdateNotificationRequest {
            status: Some("read".to_string()),
            read_at: Some("2026-08-14".to_string()),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: UpdateNotificationRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.status, r.status);
        assert_eq!(back.read_at, r.read_at);
    }

    // ---- NotificationSetting ----

    #[test]
    fn test_notification_setting_serde_roundtrip() {
        let s = NotificationSetting {
            id: uid(),
            project_id: uid(),
            user_id: "u-1".to_string(),
            notification_type: "milestone".to_string(),
            enabled: true,
            notify_before_days: Some(3),
            preferred_channel: Some("email".to_string()),
            created_at: now(),
            updated_at: now(),
        };
        let ser = serde_json::to_string(&s).unwrap();
        let back: NotificationSetting = serde_json::from_str(&ser).unwrap();
        assert_eq!(back.id, s.id);
        assert_eq!(back.enabled, s.enabled);
        assert_eq!(back.notify_before_days, s.notify_before_days);
        assert_eq!(back.preferred_channel, s.preferred_channel);
    }

    #[test]
    fn test_notification_setting_disabled() {
        let s = NotificationSetting {
            id: uid(),
            project_id: uid(),
            user_id: "u".to_string(),
            notification_type: "info".to_string(),
            enabled: false,
            notify_before_days: None,
            preferred_channel: None,
            created_at: now(),
            updated_at: now(),
        };
        let ser = serde_json::to_string(&s).unwrap();
        let back: NotificationSetting = serde_json::from_str(&ser).unwrap();
        assert!(!back.enabled);
        assert!(back.notify_before_days.is_none());
    }

    // ---- CreateNotificationSettingRequest ----

    #[test]
    fn test_create_notification_setting_request_roundtrip() {
        let r = CreateNotificationSettingRequest {
            notification_type: "task".to_string(),
            enabled: true,
            notify_before_days: Some(5),
            preferred_channel: Some("sms".to_string()),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateNotificationSettingRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.notification_type, r.notification_type);
        assert_eq!(back.enabled, r.enabled);
        assert_eq!(back.notify_before_days, r.notify_before_days);
    }

    #[test]
    fn test_create_notification_setting_request_minimal() {
        let r = CreateNotificationSettingRequest {
            notification_type: "info".to_string(),
            enabled: false,
            notify_before_days: None,
            preferred_channel: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateNotificationSettingRequest = serde_json::from_str(&s).unwrap();
        assert!(!back.enabled);
        assert!(back.preferred_channel.is_none());
    }

    // ---- ReminderConfig ----

    #[test]
    fn test_reminder_config_serde_roundtrip() {
        let r = ReminderConfig {
            milestone_reminder_days: 7,
            task_reminder_days: 3,
            approval_reminder_days: 2,
            risk_alert_enabled: true,
            risk_threshold: 15,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: ReminderConfig = serde_json::from_str(&s).unwrap();
        assert_eq!(back.milestone_reminder_days, r.milestone_reminder_days);
        assert_eq!(back.task_reminder_days, r.task_reminder_days);
        assert_eq!(back.risk_alert_enabled, r.risk_alert_enabled);
        assert_eq!(back.risk_threshold, r.risk_threshold);
    }

    #[test]
    fn test_reminder_config_zero_values() {
        let r = ReminderConfig {
            milestone_reminder_days: 0,
            task_reminder_days: 0,
            approval_reminder_days: 0,
            risk_alert_enabled: false,
            risk_threshold: 0,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: ReminderConfig = serde_json::from_str(&s).unwrap();
        assert_eq!(back.milestone_reminder_days, 0);
        assert!(!back.risk_alert_enabled);
    }

    // ---- NotificationType ----

    #[test]
    fn test_notification_type_serde_roundtrip() {
        let t = NotificationType {
            code: "MILESTONE_DUE".to_string(),
            name: "里程碑到期".to_string(),
            description: "里程碑即将到期提醒".to_string(),
            default_enabled: true,
            default_priority: "high".to_string(),
        };
        let s = serde_json::to_string(&t).unwrap();
        let back: NotificationType = serde_json::from_str(&s).unwrap();
        assert_eq!(back.code, t.code);
        assert_eq!(back.name, t.name);
        assert_eq!(back.default_enabled, t.default_enabled);
        assert_eq!(back.default_priority, t.default_priority);
    }

    #[test]
    fn test_notification_type_disabled_by_default() {
        let t = NotificationType {
            code: "INFO".to_string(),
            name: "信息".to_string(),
            description: "一般信息通知".to_string(),
            default_enabled: false,
            default_priority: "low".to_string(),
        };
        let s = serde_json::to_string(&t).unwrap();
        let back: NotificationType = serde_json::from_str(&s).unwrap();
        assert!(!back.default_enabled);
    }
}
