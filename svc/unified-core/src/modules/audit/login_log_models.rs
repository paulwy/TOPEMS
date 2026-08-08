use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct LoginLog {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub user_id: Option<Uuid>,
    pub username: String,
    pub ip_address: String,
    pub user_agent: Option<String>,
    pub status: String,
    pub error_message: Option<String>,
    pub login_time: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordLoginRequest {
    pub tenant_id: Option<String>,
    pub user_id: Option<String>,
    pub username: String,
    pub ip_address: String,
    pub user_agent: Option<String>,
    pub status: String,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginLogQuery {
    pub username: Option<String>,
    pub status: Option<String>,
    pub user_id: Option<String>,
    pub ip_address: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginLogListResponse {
    pub items: Vec<LoginLog>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeleteLoginLogRequest {
    pub ids: Vec<String>,
}
