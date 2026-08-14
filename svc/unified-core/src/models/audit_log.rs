//! 审计日志模型 — 统一使用 shared-bootstrap 通用实现
//!
//! 详见 [topems_shared_bootstrap::audit] 模块

#[allow(unused_imports)]
pub use topems_shared_bootstrap::audit::{AuditEventParams, AuditLog, ListAuditLogsQuery};

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json;

    #[test]
    fn test_audit_log_reexport_available() {
        let _ = AuditLog {
            id: uuid::Uuid::new_v4(),
            action: "test_action".to_string(),
            entity_type: Some("test".to_string()),
            entity_id: Some(uuid::Uuid::new_v4()),
            entity_ids: None,
            user_id: Some("user_1".to_string()),
            user_name: Some("tester".to_string()),
            request_details: None,
            response_details: None,
            status: "success".to_string(),
            error_message: None,
            ip_address: None,
            user_agent: None,
            created_at: chrono::Utc::now(),
        };
    }

    #[test]
    fn test_list_audit_logs_query_default() {
        let q = ListAuditLogsQuery {
            page: Some(1),
            page_size: Some(10),
            user_id: None,
            action: None,
            entity_type: None,
            status: None,
            start_date: None,
            end_date: None,
        };
        assert_eq!(q.page, Some(1));
        assert_eq!(q.page_size, Some(10));
    }

    #[test]
    fn test_audit_event_params_construct() {
        let params = AuditEventParams {
            action: "create".to_string(),
            entity_type: "user".to_string(),
            entity_id: Some(uuid::Uuid::new_v4()),
            entity_ids: None,
            user_id: Some("user_1".to_string()),
            user_name: Some("admin".to_string()),
            request_details: Some(serde_json::json!({"name": "test"})),
            response_details: None,
            status: "success".to_string(),
            error_message: None,
        };
        assert_eq!(params.action, "create");
        assert_eq!(params.entity_type, "user");
        assert_eq!(params.status, "success");
    }

    #[test]
    fn test_audit_log_serde_roundtrip() {
        let log = AuditLog {
            id: uuid::Uuid::parse_str("a1a2a3a4-a1a2-a3a4-a1a2-a3a4a5a6a7a8").unwrap(),
            action: "login".to_string(),
            entity_type: Some("auth".to_string()),
            entity_id: Some(uuid::Uuid::parse_str("c1c2c3c4-c1c2-c3c4-c1c2-c3c4c5c6c7c8").unwrap()),
            entity_ids: None,
            user_id: Some("admin".to_string()),
            user_name: Some("Admin User".to_string()),
            request_details: Some(serde_json::json!({"username": "admin"})),
            response_details: Some(serde_json::json!({"success": true})),
            status: "success".to_string(),
            error_message: None,
            ip_address: Some("192.168.1.1".to_string()),
            user_agent: Some("Mozilla/5.0".to_string()),
            created_at: chrono::DateTime::parse_from_rfc3339("2024-01-15T10:30:00Z")
                .unwrap()
                .with_timezone(&chrono::Utc),
        };

        let json = serde_json::to_string(&log).expect("serialize");
        let deserialized: AuditLog = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(deserialized.id, log.id);
        assert_eq!(deserialized.action, log.action);
        assert_eq!(deserialized.status, log.status);
    }
}
