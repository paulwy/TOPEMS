// PM 服务审计日志（P0-4 迁移：内联 SQL → shared-db AuditLogService）
//
// 说明：所有 INSERT / SELECT SQL 已下沉到 `topems_shared_db::audit::AuditLogService`，
// 这里只保留 PM 专属语义（资源类型固定值 + 返回结构）。
use sqlx::PgPool;
use topems_shared_db::audit::{AuditLog, AuditLogQuery, AuditLogService};
use uuid::Uuid;

#[derive(Clone)]
pub struct PmAuditService {
    inner: AuditLogService,
}

impl PmAuditService {
    pub fn new(pool: PgPool) -> Self {
        Self {
            inner: AuditLogService::new(pool),
        }
    }

    pub async fn log_project_operation(
        &self,
        action: &str,
        entity_id: Option<Uuid>,
        user_id: Option<&str>,
        request_details: Option<serde_json::Value>,
        status: &str,
        error_message: Option<&str>,
    ) -> Result<(), sqlx::Error> {
        self.inner
            .log_operation(action, "project", entity_id, user_id, request_details, status, error_message)
            .await
            .map(|_| ())
    }

    pub async fn log_budget_operation(
        &self,
        action: &str,
        entity_id: Option<Uuid>,
        user_id: Option<&str>,
        request_details: Option<serde_json::Value>,
        status: &str,
        error_message: Option<&str>,
    ) -> Result<(), sqlx::Error> {
        self.inner
            .log_operation(action, "budget", entity_id, user_id, request_details, status, error_message)
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
        self.inner
            .log_operation(action, "contract", entity_id, user_id, request_details, status, error_message)
            .await
            .map(|_| ())
    }

    pub async fn log_risk_operation(
        &self,
        action: &str,
        entity_id: Option<Uuid>,
        user_id: Option<&str>,
        request_details: Option<serde_json::Value>,
        status: &str,
        error_message: Option<&str>,
    ) -> Result<(), sqlx::Error> {
        self.inner
            .log_operation(action, "risk", entity_id, user_id, request_details, status, error_message)
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
    ) -> Result<Vec<PmAuditLogEntry>, sqlx::Error> {
        // shared-db 使用 page/page_size：page = offset/limit + 1，page_size = limit
        let page = if limit <= 0 { 1 } else { offset / limit + 1 };
        let page_size = if limit <= 0 { 20 } else { limit };

        let query = AuditLogQuery {
            action: action.map(|s| s.to_string()),
            entity_type: resource.map(|s| s.to_string()),
            user_id: user_id.map(|s| s.to_string()),
            status: status.map(|s| s.to_string()),
            start_date: None,
            end_date: None,
            page: Some(page),
            page_size: Some(page_size),
        };

        let resources = [
            "project", "budget", "contract", "risk", "milestone", "phase",
        ];
        let logs: Vec<AuditLog> = self
            .inner
            .query_audit_logs(&query, Some(&resources))
            .await?;

        Ok(logs.into_iter().map(PmAuditLogEntry::from_audit_log).collect())
    }
}

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct PmAuditLogEntry {
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

impl PmAuditLogEntry {
    fn from_audit_log(log: AuditLog) -> Self {
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
