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

pub async fn log_approval_event(
    pool: &sqlx::PgPool,
    tenant_id: &str,
    entity_type: &str,
    entity_id: &str,
    action: &str,
    operator: &str,
    status_from: &str,
    status_to: &str,
    comment: Option<&str>,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS plugin_wms.wms_approval_events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            entity_type VARCHAR(32) NOT NULL,
            entity_id UUID NOT NULL,
            action VARCHAR(32) NOT NULL,
            operator VARCHAR(64),
            status_from VARCHAR(32),
            status_to VARCHAR(32),
            comment TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )"#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"INSERT INTO plugin_wms.wms_approval_events (tenant_id, entity_type, entity_id, action, operator, status_from, status_to, comment)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"#,
    )
    .bind(tenant_id)
    .bind(entity_type)
    .bind(entity_id)
    .bind(action)
    .bind(operator)
    .bind(status_from)
    .bind(status_to)
    .bind(comment)
    .execute(pool)
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    fn sample_audit_log() -> AuditLog {
        AuditLog {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            action: "create".into(),
            entity_type: "warehouse".into(),
            entity_id: Some(Uuid::new_v4()),
            entity_ids: Some(serde_json::json!([1, 2, 3])),
            user_id: Some("user-1".into()),
            user_name: Some("Alice".into()),
            request_details: Some(serde_json::json!({"method": "POST"})),
            response_details: Some(serde_json::json!({"status": 200})),
            status: "success".into(),
            error_message: None,
            ip_address: Some("127.0.0.1".into()),
            user_agent: Some("test-agent".into()),
            created_at: Utc::now(),
        }
    }

    #[test]
    fn audit_log_serde_roundtrip() {
        let log = sample_audit_log();
        let v = serde_json::to_value(&log).unwrap();
        let back: AuditLog = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn audit_log_serde_all_none_optionals() {
        let log = AuditLog {
            entity_id: None,
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: None,
            response_details: None,
            error_message: Some("failed".into()),
            ip_address: None,
            user_agent: None,
            ..sample_audit_log()
        };
        let v = serde_json::to_value(&log).unwrap();
        let back: AuditLog = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
        assert!(back.entity_id.is_none());
        assert!(back.request_details.is_none());
    }

    #[test]
    fn audit_log_clone_preserves_action() {
        let log = sample_audit_log();
        let c = log.clone();
        assert_eq!(log.action, c.action);
        assert_eq!(log.entity_type, c.entity_type);
    }

    #[test]
    fn create_audit_log_request_serde_roundtrip() {
        let req = CreateAuditLogRequest {
            action: "update".into(),
            entity_type: "inventory".into(),
            entity_id: Some(Uuid::new_v4()),
            entity_ids: None,
            user_id: Some("user-2".into()),
            user_name: Some("Bob".into()),
            request_details: Some(serde_json::json!({"path": "/api/inventory"})),
            response_details: None,
            status: "success".into(),
            error_message: None,
            ip_address: Some("10.0.0.1".into()),
            user_agent: None,
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: CreateAuditLogRequest = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn audit_log_query_serde_roundtrip() {
        let q = AuditLogQuery {
            action: Some("delete".into()),
            entity_type: Some("batch".into()),
            user_id: Some("user-3".into()),
            status: Some("error".into()),
            start_date: Some(Utc::now()),
            end_date: Some(Utc::now()),
            page: Some(1),
            page_size: Some(20),
        };
        let v = serde_json::to_value(&q).unwrap();
        let back: AuditLogQuery = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn audit_log_query_all_none() {
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
        let v = serde_json::to_value(&q).unwrap();
        let back: AuditLogQuery = serde_json::from_value(v).unwrap();
        assert!(back.action.is_none());
        assert!(back.page.is_none());
    }

    #[test]
    fn audit_log_json_value_field_preserved() {
        let log = AuditLog {
            request_details: Some(serde_json::json!({"nested": {"key": "value"}})),
            ..sample_audit_log()
        };
        let v = serde_json::to_value(&log).unwrap();
        let back: AuditLog = serde_json::from_value(v).unwrap();
        assert_eq!(
            back.request_details,
            Some(serde_json::json!({"nested": {"key": "value"}}))
        );
    }

    // ===================== 扩展覆盖：结构 / 边界 / JSON 字段 =====================

    #[test]
    fn audit_log_status_field_roundtrip() {
        let log = AuditLog {
            status: "error".into(),
            ..sample_audit_log()
        };
        let v = serde_json::to_value(&log).unwrap();
        let back: AuditLog = serde_json::from_value(v).unwrap();
        assert_eq!(back.status, "error");
    }

    #[test]
    fn audit_log_entity_ids_array_roundtrip() {
        let log = AuditLog {
            entity_ids: Some(serde_json::json!([1, 2, 3, 4, 5])),
            ..sample_audit_log()
        };
        let v = serde_json::to_value(&log).unwrap();
        let back: AuditLog = serde_json::from_value(v).unwrap();
        assert_eq!(back.entity_ids, Some(serde_json::json!([1, 2, 3, 4, 5])));
    }

    #[test]
    fn audit_log_with_error_message_field() {
        let log = AuditLog {
            error_message: Some("database timeout".into()),
            status: "error".into(),
            ..sample_audit_log()
        };
        let v = serde_json::to_value(&log).unwrap();
        let back: AuditLog = serde_json::from_value(v).unwrap();
        assert_eq!(back.error_message.as_deref(), Some("database timeout"));
    }

    #[test]
    fn audit_log_json_has_expected_keys() {
        let log = sample_audit_log();
        let v = serde_json::to_value(&log).unwrap();
        let obj = v.as_object().unwrap();
        for key in &[
            "id",
            "tenant_id",
            "action",
            "entity_type",
            "status",
            "created_at",
        ] {
            assert!(obj.contains_key(*key), "missing key {}", key);
        }
    }

    #[test]
    fn create_audit_log_request_minimal_with_action_only() {
        // 只填必填字段，可选字段全部 None
        let req = CreateAuditLogRequest {
            action: "login".into(),
            entity_type: "auth".into(),
            entity_id: None,
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: None,
            response_details: None,
            status: "success".into(),
            error_message: None,
            ip_address: None,
            user_agent: None,
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: CreateAuditLogRequest = serde_json::from_value(v).unwrap();
        assert_eq!(back.action, "login");
        assert!(back.entity_id.is_none());
        assert!(back.user_id.is_none());
    }

    #[test]
    fn audit_log_query_with_dates_range() {
        let q = AuditLogQuery {
            action: Some("create".into()),
            entity_type: None,
            user_id: Some("u-1".into()),
            status: None,
            start_date: Some(Utc::now()),
            end_date: Some(Utc::now()),
            page: Some(2),
            page_size: Some(50),
        };
        let v = serde_json::to_value(&q).unwrap();
        let back: AuditLogQuery = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }
}
