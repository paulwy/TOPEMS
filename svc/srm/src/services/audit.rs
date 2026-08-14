// SRM 服务审计日志
use sqlx::PgPool;
use uuid::Uuid;

pub struct SrmAuditService {
    pool: PgPool,
}

impl SrmAuditService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
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
        let details_str = request_details
            .map(|d| serde_json::to_string(&d).ok())
            .flatten();
        let user_uuid = user_id.and_then(|s| Uuid::parse_str(s).ok());

        sqlx::query(
            r#"
            INSERT INTO public.audit_logs (action, resource, resource_id, user_id, details, status, error_message)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
        )
        .bind(action)
        .bind("supplier")
        .bind(entity_id)
        .bind(user_uuid)
        .bind(details_str)
        .bind(status)
        .bind(error_message)
        .execute(&self.pool)
        .await?;

        Ok(())
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
        let details_str = request_details
            .map(|d| serde_json::to_string(&d).ok())
            .flatten();
        let user_uuid = user_id.and_then(|s| Uuid::parse_str(s).ok());

        sqlx::query(
            r#"
            INSERT INTO public.audit_logs (action, resource, resource_id, user_id, details, status, error_message)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
        )
        .bind(action)
        .bind("supplier_category")
        .bind(entity_id)
        .bind(user_uuid)
        .bind(details_str)
        .bind(status)
        .bind(error_message)
        .execute(&self.pool)
        .await?;

        Ok(())
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
        let details_str = request_details
            .map(|d| serde_json::to_string(&d).ok())
            .flatten();
        let user_uuid = user_id.and_then(|s| Uuid::parse_str(s).ok());

        sqlx::query(
            r#"
            INSERT INTO public.audit_logs (action, resource, resource_id, user_id, details, status, error_message)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
        )
        .bind(action)
        .bind("supplier_evaluation")
        .bind(entity_id)
        .bind(user_uuid)
        .bind(details_str)
        .bind(status)
        .bind(error_message)
        .execute(&self.pool)
        .await?;

        Ok(())
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
        let details_str = request_details
            .map(|d| serde_json::to_string(&d).ok())
            .flatten();
        let user_uuid = user_id.and_then(|s| Uuid::parse_str(s).ok());

        sqlx::query(
            r#"
            INSERT INTO public.audit_logs (action, resource, resource_id, user_id, details, status, error_message)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
        )
        .bind(action)
        .bind("supplier_contract")
        .bind(entity_id)
        .bind(user_uuid)
        .bind(details_str)
        .bind(status)
        .bind(error_message)
        .execute(&self.pool)
        .await?;

        Ok(())
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
        let details_str = request_details
            .map(|d| serde_json::to_string(&d).ok())
            .flatten();
        let user_uuid = user_id.and_then(|s| Uuid::parse_str(s).ok());

        sqlx::query(
            r#"
            INSERT INTO public.audit_logs (action, resource, resource_id, user_id, details, status, error_message)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
        )
        .bind(action)
        .bind("supplier_product")
        .bind(entity_id)
        .bind(user_uuid)
        .bind(details_str)
        .bind(status)
        .bind(error_message)
        .execute(&self.pool)
        .await?;

        Ok(())
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
        let logs = sqlx::query_as::<_, SrmAuditLogEntry>(
            r#"
            SELECT
                id, action, resource as entity_type, resource_id as entity_id,
                user_id::text, details as request_details, status, error_message,
                ip_address, user_agent, created_at
            FROM public.audit_logs
            WHERE ($1::text IS NULL OR action = $1)
              AND ($2::text IS NULL OR resource = $2)
              AND ($3::text IS NULL OR user_id::text = $3)
              AND ($4::text IS NULL OR status = $4)
              AND resource IN ('supplier', 'supplier_category', 'supplier_evaluation', 'supplier_contract', 'supplier_product')
            ORDER BY created_at DESC
            LIMIT $5 OFFSET $6
            "#,
        )
        .bind(action)
        .bind(resource)
        .bind(user_id)
        .bind(status)
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;

        Ok(logs)
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
