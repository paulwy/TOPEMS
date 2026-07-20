use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// 操作审计日志实体
///
/// 区别于 `core_login_logs`（登录日志），该表用于记录业务 CRUD 写操作
/// （POST / PUT / DELETE），由 `operation_audit_middleware` 自动写入。
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct OperationLog {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub user_id: Option<Uuid>,
    pub user_name: String,
    pub module: String,
    pub operation: String,
    pub resource_type: String,
    pub resource_id: Option<String>,
    pub description: Option<String>,
    pub request_data: Option<serde_json::Value>,
    pub response_status: Option<i32>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub trace_id: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OperationLogQuery {
    pub user_id: Option<String>,
    pub user_name: Option<String>,
    pub module: Option<String>,
    pub operation: Option<String>,
    pub resource_type: Option<String>,
    pub resource_id: Option<String>,
    pub trace_id: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub success: Option<bool>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OperationLogListResponse {
    pub items: Vec<OperationLog>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OperationLogStatsResponse {
    pub total: i64,
    pub by_module: serde_json::Value,
    pub by_operation: serde_json::Value,
}

/// 内部结构：用于 middleware 写入日志
#[derive(Debug, Clone)]
pub struct OperationLogRecord {
    pub tenant_id: Uuid,
    pub user_id: Option<Uuid>,
    pub user_name: String,
    pub module: String,
    pub operation: String,
    pub resource_type: String,
    pub resource_id: Option<String>,
    pub description: Option<String>,
    pub request_data: Option<serde_json::Value>,
    pub response_status: Option<i32>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub trace_id: Option<String>,
}
