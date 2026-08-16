use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct AuditLog {
    pub id: Uuid,
    pub action: String,
    pub entity_type: String,
    pub entity_id: Option<Uuid>,
    pub entity_ids: Option<serde_json::Value>,
    pub user_id: Option<String>,
    pub user_name: Option<String>,
    pub request_details: Option<serde_json::Value>,
    pub response_details: Option<serde_json::Value>,
    pub status: String,
    pub error_message: Option<String>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateAuditLogRequest {
    pub action: String,
    pub entity_type: String,
    pub entity_id: Option<Uuid>,
    pub entity_ids: Option<serde_json::Value>,
    pub user_id: Option<String>,
    pub user_name: Option<String>,
    pub request_details: Option<serde_json::Value>,
    pub response_details: Option<serde_json::Value>,
    pub status: String,
    pub error_message: Option<String>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AuditLogQuery {
    pub action: Option<String>,
    pub entity_type: Option<String>,
    pub user_id: Option<String>,
    pub status: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fixed_uuid() -> Uuid {
        Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap()
    }

    fn fixed_dt() -> DateTime<Utc> {
        DateTime::parse_from_rfc3339("2026-08-15T08:00:00Z")
            .unwrap()
            .with_timezone(&Utc)
    }

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn audit_log_serde_roundtrip_full() {
        let log = AuditLog {
            id: fixed_uuid(),
            action: "create".to_string(),
            entity_type: "purchase_order".to_string(),
            entity_id: Some(fixed_uuid()),
            entity_ids: Some(serde_json::json!([fixed_uuid(), fixed_uuid()])),
            user_id: Some("u-001".to_string()),
            user_name: Some("张三".to_string()),
            request_details: Some(serde_json::json!({"foo": "bar"})),
            response_details: Some(serde_json::json!({"status": "ok"})),
            status: "success".to_string(),
            error_message: None,
            ip_address: Some("192.168.1.1".to_string()),
            user_agent: Some("Mozilla/5.0".to_string()),
            created_at: fixed_dt(),
        };
        roundtrip(&log);
    }

    #[test]
    fn audit_log_serde_roundtrip_minimal() {
        let log = AuditLog {
            id: fixed_uuid(),
            action: "view".to_string(),
            entity_type: "supplier".to_string(),
            entity_id: None,
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: None,
            response_details: None,
            status: "success".to_string(),
            error_message: None,
            ip_address: None,
            user_agent: None,
            created_at: fixed_dt(),
        };
        roundtrip(&log);
    }

    #[test]
    fn audit_log_serde_roundtrip_with_error() {
        let log = AuditLog {
            id: fixed_uuid(),
            action: "delete".to_string(),
            entity_type: "purchase_item".to_string(),
            entity_id: Some(fixed_uuid()),
            entity_ids: None,
            user_id: Some("u-002".to_string()),
            user_name: None,
            request_details: None,
            response_details: None,
            status: "failed".to_string(),
            error_message: Some("Permission denied".to_string()),
            ip_address: Some("10.0.0.1".to_string()),
            user_agent: None,
            created_at: fixed_dt(),
        };
        roundtrip(&log);
    }

    #[test]
    fn audit_log_deserialize_from_json() {
        let raw = r#"{
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "action": "update",
            "entity_type": "purchase_contract",
            "entity_id": "550e8400-e29b-41d4-a716-446655440001",
            "entity_ids": ["550e8400-e29b-41d4-a716-446655440002"],
            "user_id": "u-003",
            "user_name": "李四",
            "request_details": {"key": "value"},
            "response_details": null,
            "status": "success",
            "error_message": null,
            "ip_address": "192.168.0.1",
            "user_agent": "curl/8.0",
            "created_at": "2026-08-15T08:00:00Z"
        }"#;
        let log: AuditLog = serde_json::from_str(raw).unwrap();
        assert_eq!(log.action, "update");
        assert_eq!(log.entity_type, "purchase_contract");
        assert_eq!(log.user_id, Some("u-003".to_string()));
        assert_eq!(log.status, "success");
        assert!(log.error_message.is_none());
        assert!(log.response_details.is_none());
    }

    #[test]
    fn create_audit_log_request_serde_roundtrip_full() {
        let req = CreateAuditLogRequest {
            action: "create".to_string(),
            entity_type: "supplier".to_string(),
            entity_id: Some(fixed_uuid()),
            entity_ids: None,
            user_id: Some("u-001".to_string()),
            user_name: Some("张三".to_string()),
            request_details: Some(serde_json::json!({"k": "v"})),
            response_details: Some(serde_json::json!({"ok": true})),
            status: "success".to_string(),
            error_message: None,
            ip_address: Some("127.0.0.1".to_string()),
            user_agent: Some("test".to_string()),
        };
        roundtrip(&req);
    }

    #[test]
    fn create_audit_log_request_serde_roundtrip_minimal() {
        let req = CreateAuditLogRequest {
            action: "view".to_string(),
            entity_type: "audit_log".to_string(),
            entity_id: None,
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: None,
            response_details: None,
            status: "success".to_string(),
            error_message: None,
            ip_address: None,
            user_agent: None,
        };
        roundtrip(&req);
    }

    #[test]
    fn create_audit_log_request_deserialize_with_error_message() {
        let raw = r#"{
            "action": "delete",
            "entity_type": "supplier",
            "entity_id": null,
            "entity_ids": null,
            "user_id": "u-004",
            "user_name": null,
            "request_details": null,
            "response_details": null,
            "status": "failed",
            "error_message": "Not found",
            "ip_address": null,
            "user_agent": null
        }"#;
        let req: CreateAuditLogRequest = serde_json::from_str(raw).unwrap();
        assert_eq!(req.status, "failed");
        assert_eq!(req.error_message, Some("Not found".to_string()));
    }

    #[test]
    fn audit_log_query_serde_roundtrip_full() {
        let q = AuditLogQuery {
            action: Some("create".to_string()),
            entity_type: Some("supplier".to_string()),
            user_id: Some("u-001".to_string()),
            status: Some("success".to_string()),
            start_date: Some(fixed_dt()),
            end_date: Some(fixed_dt()),
            page: Some(1),
            page_size: Some(20),
        };
        roundtrip(&q);
    }

    #[test]
    fn audit_log_query_serde_roundtrip_empty() {
        let q = AuditLogQuery {
            action: None,
            entity_type: None,
            user_id: None,
            status: None,
            start_date: None,
            end_date: None,
            page: None,
            page_size: None,
        };
        roundtrip(&q);
    }

    #[test]
    fn audit_log_query_deserialize_partial() {
        let raw = r#"{
            "action": "view",
            "page": 2,
            "page_size": 50
        }"#;
        let q: AuditLogQuery = serde_json::from_str(raw).unwrap();
        assert_eq!(q.action, Some("view".to_string()));
        assert_eq!(q.page, Some(2));
        assert_eq!(q.page_size, Some(50));
        assert!(q.entity_type.is_none());
        assert!(q.user_id.is_none());
    }

    #[test]
    fn audit_log_clone_preserves_data() {
        let log = AuditLog {
            id: fixed_uuid(),
            action: "create".to_string(),
            entity_type: "supplier".to_string(),
            entity_id: Some(fixed_uuid()),
            entity_ids: None,
            user_id: Some("u-001".to_string()),
            user_name: Some("张三".to_string()),
            request_details: None,
            response_details: None,
            status: "success".to_string(),
            error_message: None,
            ip_address: Some("127.0.0.1".to_string()),
            user_agent: None,
            created_at: fixed_dt(),
        };
        let cloned = log.clone();
        assert_eq!(log.id, cloned.id);
        assert_eq!(log.action, cloned.action);
        assert_eq!(log.status, cloned.status);
    }
}
