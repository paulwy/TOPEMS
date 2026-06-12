#![allow(dead_code)]

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// 审计操作类型
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "audit_action", rename_all = "lowercase")]
pub enum AuditAction {
    Create,
    Update,
    Delete,
    Read,
    Execute,
    Export,
    Import,
    Login,
    Logout,
    Access,
    Modify,
}

/// 审计日志模型
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AuditLog {
    pub id: Uuid,
    pub user_id: Option<Uuid>,
    pub user_name: Option<String>,
    pub action: AuditAction,
    pub resource_type: String,
    pub resource_id: Option<Uuid>,
    pub resource_name: Option<String>,
    pub details: Option<serde_json::Value>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub request_method: Option<String>,
    pub request_path: Option<String>,
    pub response_status: Option<i32>,
    pub execution_time_ms: Option<i64>,
    pub created_at: DateTime<Utc>,
    pub success: bool,
    pub error_message: Option<String>,
}

/// 创建审计日志请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateAuditLog {
    pub user_id: Option<Uuid>,
    pub user_name: Option<String>,
    pub action: AuditAction,
    pub resource_type: String,
    pub resource_id: Option<Uuid>,
    pub resource_name: Option<String>,
    pub details: Option<serde_json::Value>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub request_method: Option<String>,
    pub request_path: Option<String>,
    pub response_status: Option<i32>,
    pub execution_time_ms: Option<i64>,
    pub success: bool,
    pub error_message: Option<String>,
}

/// 查询审计日志请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryAuditLog {
    pub user_id: Option<Uuid>,
    pub action: Option<AuditAction>,
    pub resource_type: Option<String>,
    pub resource_id: Option<Uuid>,
    pub start_time: Option<DateTime<Utc>>,
    pub end_time: Option<DateTime<Utc>>,
    pub success: Option<bool>,
    pub page: Option<i32>,
    pub page_size: Option<i32>,
}

/// 审计日志统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditLogStats {
    pub total_count: i64,
    pub success_count: i64,
    pub failure_count: i64,
    pub action_distribution: serde_json::Value,
    pub resource_type_distribution: serde_json::Value,
    pub daily_count: Vec<DailyAuditCount>,
}

/// 每日审计计数
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyAuditCount {
    pub date: String,
    pub count: i64,
    pub success_count: i64,
    pub failure_count: i64,
}
