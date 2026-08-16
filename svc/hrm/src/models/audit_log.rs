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

#[cfg(test)]
mod tests {
    use super::*;

    fn now() -> DateTime<Utc> {
        Utc::now()
    }

    fn roundtrip<T: Serialize + serde::de::DeserializeOwned + std::fmt::Debug>(item: &T) {
        let json = serde_json::to_string(item).expect("serialize");
        let v1: serde_json::Value = serde_json::from_str(&json).expect("to_value");
        let back: T = serde_json::from_str(&json).expect("deserialize");
        let json2 = serde_json::to_string(&back).expect("re-serialize");
        let v2: serde_json::Value = serde_json::from_str(&json2).expect("to_value2");
        assert_eq!(v1, v2, "roundtrip mismatch");
    }

    #[test]
    fn test_audit_log_roundtrip_full() {
        roundtrip(&AuditLog {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            action: "create".to_string(),
            entity_type: "employee".to_string(),
            entity_id: Some(Uuid::new_v4()),
            entity_ids: Some(serde_json::json!([1, 2, 3])),
            user_id: Some("user-123".to_string()),
            user_name: Some("Alice".to_string()),
            request_details: Some(serde_json::json!({"method": "POST", "path": "/employees"})),
            response_details: Some(serde_json::json!({"status": 200})),
            status: "success".to_string(),
            error_message: None,
            ip_address: Some("192.168.1.1".to_string()),
            user_agent: Some("Mozilla/5.0".to_string()),
            created_at: now(),
        });
    }

    #[test]
    fn test_audit_log_roundtrip_minimal() {
        roundtrip(&AuditLog {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            action: "delete".to_string(),
            entity_type: "department".to_string(),
            entity_id: None,
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: None,
            response_details: None,
            status: "error".to_string(),
            error_message: Some("Database error".to_string()),
            ip_address: None,
            user_agent: None,
            created_at: now(),
        });
    }

    #[test]
    fn test_audit_log_roundtrip_with_error() {
        roundtrip(&AuditLog {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            action: "update".to_string(),
            entity_type: "payroll".to_string(),
            entity_id: Some(Uuid::new_v4()),
            entity_ids: None,
            user_id: Some("admin".to_string()),
            user_name: Some("Admin User".to_string()),
            request_details: Some(serde_json::json!({"id": "abc"})),
            response_details: None,
            status: "error".to_string(),
            error_message: Some("Permission denied".to_string()),
            ip_address: Some("10.0.0.1".to_string()),
            user_agent: Some("curl/7.68.0".to_string()),
            created_at: now(),
        });
    }
}
