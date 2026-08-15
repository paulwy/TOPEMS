use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct AuditLog {
    pub id: Uuid,
    pub tenant_id: Uuid,
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
#[allow(dead_code)]
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

    fn now() -> DateTime<Utc> {
        DateTime::parse_from_rfc3339("2024-06-01T08:00:00Z")
            .unwrap()
            .with_timezone(&Utc)
    }

    fn sample_audit_log() -> AuditLog {
        AuditLog {
            id: Uuid::nil(),
            tenant_id: Uuid::nil(),
            action: "create".to_string(),
            entity_type: "project".to_string(),
            entity_id: Some(Uuid::nil()),
            entity_ids: None,
            user_id: Some("u001".to_string()),
            user_name: Some("管理员".to_string()),
            request_details: Some(serde_json::json!({"code": "PRJ-001"})),
            response_details: None,
            status: "success".to_string(),
            error_message: None,
            ip_address: Some("127.0.0.1".to_string()),
            user_agent: Some("curl/8.0".to_string()),
            created_at: now(),
        }
    }

    #[test]
    fn test_audit_log_serde_roundtrip() {
        let log = sample_audit_log();
        let json = serde_json::to_string(&log).unwrap();
        let back: AuditLog = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        assert_eq!(json, json2);
        assert_eq!(back.action, "create");
        assert_eq!(back.status, "success");
    }

    #[test]
    fn test_audit_log_clone_preserves_serialization() {
        let log = sample_audit_log();
        let cloned = log.clone();
        assert_eq!(
            serde_json::to_string(&log).unwrap(),
            serde_json::to_string(&cloned).unwrap()
        );
    }

    #[test]
    fn test_audit_log_debug_contains_action() {
        let log = sample_audit_log();
        let debug = format!("{:?}", log);
        assert!(debug.contains("AuditLog"));
        assert!(debug.contains("create"));
    }

    #[test]
    fn test_create_audit_log_request_roundtrip() {
        let req = CreateAuditLogRequest {
            action: "update".to_string(),
            entity_type: "formula".to_string(),
            entity_id: Some(Uuid::nil()),
            entity_ids: Some(serde_json::json!([1, 2, 3])),
            user_id: Some("u002".to_string()),
            user_name: None,
            request_details: None,
            response_details: None,
            status: "success".to_string(),
            error_message: None,
            ip_address: None,
            user_agent: None,
        };
        let json = serde_json::to_string(&req).unwrap();
        let back: CreateAuditLogRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(back.action, "update");
        assert!(back.entity_ids.is_some());
    }

    #[test]
    fn test_audit_log_query_all_none_roundtrip() {
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
        let json = serde_json::to_string(&q).unwrap();
        let back: AuditLogQuery = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        assert_eq!(json, json2);
    }

    #[test]
    fn test_audit_log_optional_fields_none() {
        let log = AuditLog {
            entity_id: None,
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: None,
            response_details: None,
            error_message: None,
            ip_address: None,
            user_agent: None,
            ..sample_audit_log()
        };
        let json = serde_json::to_string(&log).unwrap();
        let back: AuditLog = serde_json::from_str(&json).unwrap();
        assert!(back.entity_id.is_none());
        assert!(back.user_id.is_none());
    }
}
