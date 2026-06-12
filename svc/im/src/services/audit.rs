// IM 服务审计日志
use sqlx::PgPool;
use uuid::Uuid;

/// IM 服务审计日志操作
pub struct ImAuditService {
    pool: PgPool,
}

impl ImAuditService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// 记录消息操作审计日志
    pub async fn log_message_operation(
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
        .bind("message")
        .bind(entity_id)
        .bind(user_uuid)
        .bind(details_str)
        .bind(status)
        .bind(error_message)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// 记录聊天室操作审计日志
    pub async fn log_chat_room_operation(
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
        .bind("chat_room")
        .bind(entity_id)
        .bind(user_uuid)
        .bind(details_str)
        .bind(status)
        .bind(error_message)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// 记录联系人操作审计日志
    pub async fn log_contact_operation(
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
        .bind("contact")
        .bind(entity_id)
        .bind(user_uuid)
        .bind(details_str)
        .bind(status)
        .bind(error_message)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// 记录文件操作审计日志
    pub async fn log_file_operation(
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
        .bind("file")
        .bind(entity_id)
        .bind(user_uuid)
        .bind(details_str)
        .bind(status)
        .bind(error_message)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// 查询审计日志
    pub async fn query_audit_logs(
        &self,
        action: Option<&str>,
        resource: Option<&str>,
        user_id: Option<&str>,
        status: Option<&str>,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<ImAuditLogEntry>, sqlx::Error> {
        let logs = sqlx::query_as::<_, ImAuditLogEntry>(
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
              AND resource IN ('message', 'chat_room', 'contact', 'file')
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

/// 审计日志条目
#[derive(Debug, Clone, sqlx::FromRow)]
pub struct ImAuditLogEntry {
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
