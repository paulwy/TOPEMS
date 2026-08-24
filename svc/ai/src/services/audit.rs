// AI 服务审计日志（P0-4 迁移：内联 SQL → shared-db AuditLogService）
//
// 本模块为 AI 服务的公共 API，当前已实现完整审计日志读写逻辑，
// 后续将接入 AI 路由的中间件层，自动记录向量/文档/QA/分析/连接器操作。
//
// 说明：所有 INSERT / SELECT SQL 已下沉到 `topems_shared_db::audit::AuditLogService`，
// 这里只保留 AI 专属语义（资源类型固定值 + 返回结构）。

use sqlx::PgPool;
use topems_shared_db::audit::{AuditLog, AuditLogQuery, AuditLogService};
use uuid::Uuid;

/// AI 服务审计日志操作
#[derive(Clone)]
pub struct AiAuditService {
    inner: AuditLogService,
}

impl AiAuditService {
    pub fn new(pool: PgPool) -> Self {
        Self {
            inner: AuditLogService::new(pool),
        }
    }

    /// 记录向量操作审计日志
    pub async fn log_vector_operation(
        &self,
        action: &str,
        entity_id: Option<Uuid>,
        user_id: Option<&str>,
        request_details: Option<serde_json::Value>,
        status: &str,
        error_message: Option<&str>,
    ) -> Result<(), sqlx::Error> {
        self.inner
            .log_operation(action, "vector", entity_id, user_id, request_details, status, error_message)
            .await
            .map(|_| ())
    }

    /// 记录文档操作审计日志
    pub async fn log_document_operation(
        &self,
        action: &str,
        entity_id: Option<Uuid>,
        user_id: Option<&str>,
        request_details: Option<serde_json::Value>,
        status: &str,
        error_message: Option<&str>,
    ) -> Result<(), sqlx::Error> {
        self.inner
            .log_operation(action, "document", entity_id, user_id, request_details, status, error_message)
            .await
            .map(|_| ())
    }

    /// 记录 QA 操作审计日志
    pub async fn log_qa_operation(
        &self,
        action: &str,
        entity_id: Option<Uuid>,
        user_id: Option<&str>,
        request_details: Option<serde_json::Value>,
        status: &str,
        error_message: Option<&str>,
    ) -> Result<(), sqlx::Error> {
        self.inner
            .log_operation(action, "qa", entity_id, user_id, request_details, status, error_message)
            .await
            .map(|_| ())
    }

    /// 记录分析操作审计日志
    pub async fn log_analysis_operation(
        &self,
        action: &str,
        entity_id: Option<Uuid>,
        user_id: Option<&str>,
        request_details: Option<serde_json::Value>,
        status: &str,
        error_message: Option<&str>,
    ) -> Result<(), sqlx::Error> {
        self.inner
            .log_operation(action, "analysis", entity_id, user_id, request_details, status, error_message)
            .await
            .map(|_| ())
    }

    /// 记录连接器操作审计日志
    pub async fn log_connector_operation(
        &self,
        action: &str,
        entity_id: Option<&str>,
        user_id: Option<&str>,
        request_details: Option<serde_json::Value>,
        status: &str,
        error_message: Option<&str>,
    ) -> Result<(), sqlx::Error> {
        let entity_uuid = entity_id.and_then(|s| Uuid::parse_str(s).ok());
        self.inner
            .log_operation(action, "connector", entity_uuid, user_id, request_details, status, error_message)
            .await
            .map(|_| ())
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
    ) -> Result<Vec<AiAuditLogEntry>, sqlx::Error> {
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

        let resources = ["vector", "document", "qa", "analysis", "connector"];
        let logs: Vec<AuditLog> = self
            .inner
            .query_audit_logs(&query, Some(&resources))
            .await?;

        Ok(logs.into_iter().map(AiAuditLogEntry::from_audit_log).collect())
    }
}

/// 审计日志条目（与 shared-db AuditLog 保持字段对齐，兼容 FromRow 反序列化）
#[derive(Debug, Clone, sqlx::FromRow)]
pub struct AiAuditLogEntry {
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

impl AiAuditLogEntry {
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
