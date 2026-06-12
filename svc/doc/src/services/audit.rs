// DOC 服务审计日志
use sqlx::PgPool;
use uuid::Uuid;

pub struct DocAuditService {
    pool: PgPool,
}

impl DocAuditService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn log_document_operation(
        &self,
        action: &str,
        entity_id: Option<Uuid>,
        user_id: Option<&str>,
        request_details: Option<serde_json::Value>,
        status: &str,
        error_message: Option<&str>,
    ) -> Result<(), sqlx::Error> {
        let details_str = request_details.map(|d| serde_json::to_string(&d).ok()).flatten();
        let user_uuid = user_id.and_then(|s| Uuid::parse_str(s).ok());

        sqlx::query(
            r#"
            INSERT INTO shared.audit_logs (action, resource, resource_id, user_id, details, status, error_message)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
        )
        .bind(action)
        .bind("document")
        .bind(entity_id)
        .bind(user_uuid)
        .bind(details_str)
        .bind(status)
        .bind(error_message)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn log_archive_operation(
        &self,
        action: &str,
        entity_id: Option<Uuid>,
        user_id: Option<&str>,
        request_details: Option<serde_json::Value>,
        status: &str,
        error_message: Option<&str>,
    ) -> Result<(), sqlx::Error> {
        let details_str = request_details.map(|d| serde_json::to_string(&d).ok()).flatten();
        let user_uuid = user_id.and_then(|s| Uuid::parse_str(s).ok());

        sqlx::query(
            r#"
            INSERT INTO shared.audit_logs (action, resource, resource_id, user_id, details, status, error_message)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
        )
        .bind(action)
        .bind("archive")
        .bind(entity_id)
        .bind(user_uuid)
        .bind(details_str)
        .bind(status)
        .bind(error_message)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn log_template_operation(
        &self,
        action: &str,
        entity_id: Option<Uuid>,
        user_id: Option<&str>,
        request_details: Option<serde_json::Value>,
        status: &str,
        error_message: Option<&str>,
    ) -> Result<(), sqlx::Error> {
        let details_str = request_details.map(|d| serde_json::to_string(&d).ok()).flatten();
        let user_uuid = user_id.and_then(|s| Uuid::parse_str(s).ok());

        sqlx::query(
            r#"
            INSERT INTO shared.audit_logs (action, resource, resource_id, user_id, details, status, error_message)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
        )
        .bind(action)
        .bind("template")
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
    ) -> Result<Vec<DocAuditLogEntry>, sqlx::Error> {
        let logs = sqlx::query_as::<_, DocAuditLogEntry>(
            r#"
            SELECT 
                id, action, resource as entity_type, resource_id as entity_id, 
                user_id::text, details as request_details, status, error_message, 
                ip_address, user_agent, created_at
            FROM shared.audit_logs
            WHERE ($1::text IS NULL OR action = $1)
              AND ($2::text IS NULL OR resource = $2)
              AND ($3::text IS NULL OR user_id::text = $3)
              AND ($4::text IS NULL OR status = $4)
              AND resource IN ('document', 'archive', 'template', 'folder')
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
pub struct DocAuditLogEntry {
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
