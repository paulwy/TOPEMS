use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct PermissionChange {
    pub id: Uuid,
    pub user_id: Option<Uuid>,
    pub username: Option<String>,
    pub target_user_id: Option<Uuid>,
    pub target_user_name: Option<String>,
    pub role_id: Option<Uuid>,
    pub role_name: Option<String>,
    pub permission_id: Option<Uuid>,
    pub permission_name: Option<String>,
    pub permission_code: Option<String>,
    pub action: String,
    pub change_type: String,
    pub before_value: Option<serde_json::Value>,
    pub after_value: Option<serde_json::Value>,
    pub old_value: Option<String>,
    pub new_value: Option<String>,
    pub operator_id: Uuid,
    pub operator_name: String,
    pub ip_address: Option<String>,
    pub reason: Option<String>,
    pub success: bool,
    pub status: Option<String>,
    pub error_message: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct PermissionChangeQueryParams {
    pub page: Option<i64>,
    pub pagesize: Option<i64>,
    pub user_id: Option<String>,
    pub role_id: Option<String>,
    pub permission_id: Option<String>,
    pub action: Option<String>,
    pub change_type: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub operator_id: Option<String>,
    pub success: Option<bool>,
    pub search: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PaginatedPermissionChanges {
    pub items: Vec<PermissionChange>,
    pub total: i64,
    pub page: i64,
    pub pagesize: i64,
}

#[derive(Debug, Serialize)]
pub struct PermissionChangeStats {
    pub total_changes: i64,
    pub today_changes: i64,
    pub role_changes: i64,
    pub permission_changes: i64,
    pub grants: i64,
    pub revokes: i64,
    pub updates: i64,
    pub success_rate: f64,
    pub by_role: Vec<RoleChangeStat>,
    pub by_user: Vec<UserChangeStat>,
    pub by_operator: Vec<OperatorChangeStat>,
    pub trend: Vec<TrendStat>,
}

#[derive(Debug, Serialize)]
pub struct RoleChangeStat {
    pub role_id: String,
    pub role_name: String,
    pub count: i64,
}

#[derive(Debug, Serialize)]
pub struct UserChangeStat {
    pub user_id: String,
    pub username: String,
    pub count: i64,
}

#[derive(Debug, Serialize)]
pub struct OperatorChangeStat {
    pub operator_id: String,
    pub operator_name: String,
    pub count: i64,
}

#[derive(Debug, Serialize)]
pub struct TrendStat {
    pub date: String,
    pub count: i64,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct AccessControlLog {
    pub id: Uuid,
    pub user_id: Uuid,
    pub username: String,
    pub user_name: Option<String>,
    pub resource: String,
    pub resource_path: Option<String>,
    pub resource_id: Option<String>,
    pub action: String,
    pub access_type: Option<String>,
    pub requested_at: DateTime<Utc>,
    pub access_time: Option<f64>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub device_type: Option<String>,
    pub allowed: bool,
    pub status: Option<String>,
    pub response_time: Option<i64>,
    pub denied_reason: Option<String>,
    pub matched_policy: Option<String>,
    pub required_permission: Option<String>,
    pub user_permissions: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct AccessControlQueryParams {
    pub page: Option<i64>,
    pub pagesize: Option<i64>,
    pub user_id: Option<String>,
    pub resource: Option<String>,
    pub action: Option<String>,
    pub allowed: Option<bool>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub ip_address: Option<String>,
    pub search: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PaginatedAccessLogs {
    pub items: Vec<AccessControlLog>,
    pub total: i64,
    pub page: i64,
    pub pagesize: i64,
}

#[derive(Debug, Serialize)]
pub struct AccessControlStats {
    pub total_requests: i64,
    pub total_access: i64,
    pub today_access: i64,
    pub login_count: i64,
    pub denied_count: i64,
    pub allowed_requests: i64,
    pub denied_requests: i64,
    pub deny_rate: f64,
    pub top_resources: Vec<ResourceStat>,
    pub top_users: Vec<UserAccessStat>,
    pub top_denied_users: Vec<UserAccessStat>,
    pub trend: Vec<AccessTrendStat>,
}

#[derive(Debug, Serialize)]
pub struct ResourceStat {
    pub resource: String,
    pub count: i64,
    pub deny_count: i64,
}

#[derive(Debug, Serialize)]
pub struct UserAccessStat {
    pub user_id: String,
    pub username: String,
    pub count: i64,
    pub deny_count: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct AccessTrendStat {
    pub date: String,
    pub allowed: i64,
    pub denied: i64,
}
