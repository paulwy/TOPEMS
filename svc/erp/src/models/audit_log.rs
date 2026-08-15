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

#[allow(dead_code)]
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

#[allow(dead_code)]
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
    use chrono::Utc;
    use serde::Serialize;
    use serde_json::Value;
    use uuid::Uuid;

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn struct_audit_log() {
        roundtrip(&AuditLog {
            id: Uuid::new_v4(),
            action: "create".into(),
            entity_type: "order".into(),
            entity_id: Some(Uuid::new_v4()),
            entity_ids: Some(serde_json::json!(["id1", "id2"])),
            user_id: Some("user123".into()),
            user_name: Some("张三".into()),
            request_details: Some(serde_json::json!({"amount": 1000})),
            response_details: Some(serde_json::json!({"success": true})),
            status: "success".into(),
            error_message: None,
            ip_address: Some("192.168.1.1".into()),
            user_agent: Some("Mozilla/5.0".into()),
            created_at: Utc::now(),
        });
    }

    #[test]
    fn struct_create_audit_log_request() {
        roundtrip(&CreateAuditLogRequest {
            action: "update".into(),
            entity_type: "user".into(),
            entity_id: None,
            entity_ids: None,
            user_id: Some("admin".into()),
            user_name: None,
            request_details: None,
            response_details: None,
            status: "failed".into(),
            error_message: Some("权限不足".into()),
            ip_address: None,
            user_agent: None,
        });
    }

    #[test]
    fn struct_audit_log_query() {
        roundtrip(&AuditLogQuery {
            action: Some("delete".into()),
            entity_type: None,
            user_id: Some("u1".into()),
            status: Some("success".into()),
            start_date: Some(Utc::now()),
            end_date: None,
            page: Some(1),
            page_size: Some(50),
        });
    }
}
