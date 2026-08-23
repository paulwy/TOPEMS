// SRM 服务审计日志（P0-R2 治理：复用 shared-db AuditLogService）
use sqlx::PgPool;
use topems_shared_db::audit::{AuditLog, AuditLogQuery, AuditLogService};
use uuid::Uuid;

/// SRM 审计资源类型常量
pub mod resources {
    pub const SUPPLIER: &str = "supplier";
    pub const SUPPLIER_CATEGORY: &str = "supplier_category";
    pub const SUPPLIER_EVALUATION: &str = "supplier_evaluation";
    pub const SUPPLIER_CONTRACT: &str = "supplier_contract";
    pub const SUPPLIER_PRODUCT: &str = "supplier_product";

    /// SRM 服务可查询的全部资源类型
    pub const ALL: &[&str] = &[
        SUPPLIER,
        SUPPLIER_CATEGORY,
        SUPPLIER_EVALUATION,
        SUPPLIER_CONTRACT,
        SUPPLIER_PRODUCT,
    ];
}

pub struct SrmAuditService {
    audit_service: AuditLogService,
}

impl SrmAuditService {
    pub fn new(pool: PgPool) -> Self {
        Self {
            audit_service: AuditLogService::new(pool),
        }
    }

    /// 底层共享审计服务（供需要直接访问的场景）
    pub fn shared(&self) -> &AuditLogService {
        &self.audit_service
    }

    pub async fn log_supplier_operation(
        &self,
        action: &str,
        entity_id: Option<Uuid>,
        user_id: Option<&str>,
        request_details: Option<serde_json::Value>,
        status: &str,
        error_message: Option<&str>,
    ) -> Result<(), sqlx::Error> {
        self.audit_service
            .log_operation(
                action,
                resources::SUPPLIER,
                entity_id,
                user_id,
                request_details,
                status,
                error_message,
            )
            .await
            .map(|_| ())
    }

    pub async fn log_category_operation(
        &self,
        action: &str,
        entity_id: Option<Uuid>,
        user_id: Option<&str>,
        request_details: Option<serde_json::Value>,
        status: &str,
        error_message: Option<&str>,
    ) -> Result<(), sqlx::Error> {
        self.audit_service
            .log_operation(
                action,
                resources::SUPPLIER_CATEGORY,
                entity_id,
                user_id,
                request_details,
                status,
                error_message,
            )
            .await
            .map(|_| ())
    }

    pub async fn log_evaluation_operation(
        &self,
        action: &str,
        entity_id: Option<Uuid>,
        user_id: Option<&str>,
        request_details: Option<serde_json::Value>,
        status: &str,
        error_message: Option<&str>,
    ) -> Result<(), sqlx::Error> {
        self.audit_service
            .log_operation(
                action,
                resources::SUPPLIER_EVALUATION,
                entity_id,
                user_id,
                request_details,
                status,
                error_message,
            )
            .await
            .map(|_| ())
    }

    pub async fn log_contract_operation(
        &self,
        action: &str,
        entity_id: Option<Uuid>,
        user_id: Option<&str>,
        request_details: Option<serde_json::Value>,
        status: &str,
        error_message: Option<&str>,
    ) -> Result<(), sqlx::Error> {
        self.audit_service
            .log_operation(
                action,
                resources::SUPPLIER_CONTRACT,
                entity_id,
                user_id,
                request_details,
                status,
                error_message,
            )
            .await
            .map(|_| ())
    }

    pub async fn log_product_operation(
        &self,
        action: &str,
        entity_id: Option<Uuid>,
        user_id: Option<&str>,
        request_details: Option<serde_json::Value>,
        status: &str,
        error_message: Option<&str>,
    ) -> Result<(), sqlx::Error> {
        self.audit_service
            .log_operation(
                action,
                resources::SUPPLIER_PRODUCT,
                entity_id,
                user_id,
                request_details,
                status,
                error_message,
            )
            .await
            .map(|_| ())
    }

    pub async fn query_audit_logs(
        &self,
        action: Option<&str>,
        resource: Option<&str>,
        user_id: Option<&str>,
        status: Option<&str>,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<SrmAuditLogEntry>, sqlx::Error> {
        let page = if limit > 0 { offset / limit + 1 } else { 1 };
        let query = AuditLogQuery {
            action: action.map(|s| s.to_string()),
            entity_type: resource.map(|s| s.to_string()),
            user_id: user_id.map(|s| s.to_string()),
            status: status.map(|s| s.to_string()),
            start_date: None,
            end_date: None,
            page: Some(page),
            page_size: Some(limit),
        };

        let logs = self
            .audit_service
            .query_audit_logs(&query, Some(resources::ALL))
            .await?;

        Ok(logs.into_iter().map(SrmAuditLogEntry::from).collect())
    }
}

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct SrmAuditLogEntry {
    pub id: Uuid,
    pub action: String,
    pub entity_type: String,
    pub entity_id: Option<Uuid>,
    pub user_id: Option<String>,
    pub request_details: Option<serde_json::Value>,
    pub status: String,
    pub error_message: Option<String>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

impl From<AuditLog> for SrmAuditLogEntry {
    fn from(log: AuditLog) -> Self {
        Self {
            id: log.id,
            action: log.action,
            entity_type: log.entity_type,
            entity_id: log.entity_id,
            user_id: log.user_id,
            request_details: log.request_details,
            status: log.status,
            error_message: log.error_message,
            ip_address: log.ip_address,
            user_agent: log.user_agent,
            created_at: log.created_at,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_audit_log_entry() -> SrmAuditLogEntry {
        SrmAuditLogEntry {
            id: Uuid::new_v4(),
            action: "create".to_string(),
            entity_type: "supplier".to_string(),
            entity_id: Some(Uuid::new_v4()),
            user_id: Some("00000000-0000-0000-0000-000000000001".to_string()),
            request_details: Some(serde_json::json!({"key": "value"})),
            status: "success".to_string(),
            error_message: None,
            ip_address: Some("192.168.1.1".to_string()),
            user_agent: Some("Mozilla/5.0".to_string()),
            created_at: chrono::Utc::now(),
        }
    }

    #[test]
    fn test_audit_log_entry_construction() {
        let entry = sample_audit_log_entry();
        assert_eq!(entry.action, "create");
        assert_eq!(entry.entity_type, "supplier");
        assert_eq!(entry.status, "success");
    }

    #[test]
    fn test_audit_log_entry_clone() {
        let entry = sample_audit_log_entry();
        let cloned = entry.clone();
        assert_eq!(cloned.action, entry.action);
        assert_eq!(cloned.entity_type, entry.entity_type);
        assert_eq!(cloned.status, entry.status);
    }

    #[test]
    fn test_audit_log_entry_with_none_fields() {
        let entry = SrmAuditLogEntry {
            id: Uuid::new_v4(),
            action: "delete".to_string(),
            entity_type: "supplier_product".to_string(),
            entity_id: None,
            user_id: None,
            request_details: None,
            status: "failed".to_string(),
            error_message: Some("Permission denied".to_string()),
            ip_address: None,
            user_agent: None,
            created_at: chrono::Utc::now(),
        };
        assert_eq!(entry.entity_id, None);
        assert_eq!(entry.user_id, None);
        assert_eq!(entry.request_details, None);
        assert_eq!(entry.error_message, Some("Permission denied".to_string()));
    }

    #[test]
    fn test_audit_log_entry_request_details_json() {
        let entry = sample_audit_log_entry();
        assert!(entry.request_details.is_some());
        let details = entry.request_details.unwrap();
        assert_eq!(details["key"], "value");
    }

    #[test]
    fn test_audit_log_entry_entity_types() {
        let types = [
            "supplier",
            "supplier_category",
            "supplier_evaluation",
            "supplier_contract",
            "supplier_product",
        ];
        for t in &types {
            let entry = SrmAuditLogEntry {
                id: Uuid::new_v4(),
                action: "read".to_string(),
                entity_type: t.to_string(),
                entity_id: None,
                user_id: None,
                request_details: None,
                status: "success".to_string(),
                error_message: None,
                ip_address: None,
                user_agent: None,
                created_at: chrono::Utc::now(),
            };
            assert_eq!(entry.entity_type, *t);
        }
    }

    #[test]
    fn test_audit_log_entry_actions() {
        let actions = ["create", "update", "delete", "read"];
        for a in &actions {
            let entry = SrmAuditLogEntry {
                id: Uuid::new_v4(),
                action: a.to_string(),
                entity_type: "supplier".to_string(),
                entity_id: None,
                user_id: None,
                request_details: None,
                status: "success".to_string(),
                error_message: None,
                ip_address: None,
                user_agent: None,
                created_at: chrono::Utc::now(),
            };
            assert_eq!(entry.action, *a);
        }
    }

    #[test]
    fn test_audit_log_entry_statuses() {
        let statuses = ["success", "failed", "pending"];
        for s in &statuses {
            let entry = SrmAuditLogEntry {
                id: Uuid::new_v4(),
                action: "create".to_string(),
                entity_type: "supplier".to_string(),
                entity_id: None,
                user_id: None,
                request_details: None,
                status: s.to_string(),
                error_message: None,
                ip_address: None,
                user_agent: None,
                created_at: chrono::Utc::now(),
            };
            assert_eq!(entry.status, *s);
        }
    }

    #[test]
    fn test_audit_log_entry_debug_format() {
        let entry = sample_audit_log_entry();
        let debug_str = format!("{:?}", entry);
        assert!(debug_str.contains("SrmAuditLogEntry"));
        assert!(debug_str.contains("create"));
    }

    #[test]
    fn test_audit_log_entry_ip_address() {
        let entry = sample_audit_log_entry();
        assert_eq!(entry.ip_address, Some("192.168.1.1".to_string()));
    }

    #[test]
    fn test_audit_log_entry_user_agent() {
        let entry = sample_audit_log_entry();
        assert_eq!(entry.user_agent, Some("Mozilla/5.0".to_string()));
    }

    #[test]
    fn test_audit_log_entry_complex_request_details() {
        let entry = SrmAuditLogEntry {
            id: Uuid::new_v4(),
            action: "update".to_string(),
            entity_type: "supplier_contract".to_string(),
            entity_id: Some(Uuid::new_v4()),
            user_id: Some("user-123".to_string()),
            request_details: Some(serde_json::json!({
                "old": {"status": "draft"},
                "new": {"status": "active"},
                "fields_changed": ["status", "updated_at"]
            })),
            status: "success".to_string(),
            error_message: None,
            ip_address: None,
            user_agent: None,
            created_at: chrono::Utc::now(),
        };
        let details = entry.request_details.unwrap();
        assert_eq!(details["old"]["status"], "draft");
        assert_eq!(details["new"]["status"], "active");
        assert_eq!(details["fields_changed"].as_array().unwrap().len(), 2);
    }
}
