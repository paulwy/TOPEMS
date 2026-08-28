use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, FromRow)]
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

#[derive(Debug, Serialize, FromRow)]
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_permission_change_query_params_default() {
        let json = r#"{}"#;
        let params: PermissionChangeQueryParams = serde_json::from_str(json).unwrap();
        assert!(params.page.is_none());
        assert!(params.pagesize.is_none());
        assert!(params.user_id.is_none());
        assert!(params.action.is_none());
        assert!(params.success.is_none());
        assert!(params.search.is_none());
    }

    #[test]
    fn test_permission_change_query_params_full() {
        let json = r#"{
            "page": 1,
            "pagesize": 20,
            "user_id": "user-123",
            "role_id": "role-456",
            "action": "create",
            "change_type": "grant",
            "success": true,
            "search": "test"
        }"#;
        let params: PermissionChangeQueryParams = serde_json::from_str(json).unwrap();
        assert_eq!(params.page, Some(1));
        assert_eq!(params.pagesize, Some(20));
        assert_eq!(params.user_id.as_deref(), Some("user-123"));
        assert_eq!(params.action.as_deref(), Some("create"));
        assert_eq!(params.change_type.as_deref(), Some("grant"));
        assert_eq!(params.success, Some(true));
        assert_eq!(params.search.as_deref(), Some("test"));
    }

    #[test]
    fn test_paginated_permission_changes_serialization() {
        let resp = PaginatedPermissionChanges {
            items: vec![],
            total: 100,
            page: 1,
            pagesize: 20,
        };
        let json = serde_json::to_value(&resp).unwrap();
        assert_eq!(json["total"], 100);
        assert_eq!(json["page"], 1);
        assert_eq!(json["pagesize"], 20);
        assert!(json["items"].is_array());
    }

    #[test]
    fn test_permission_change_stats_serialization() {
        let stats = PermissionChangeStats {
            total_changes: 1000,
            today_changes: 50,
            role_changes: 200,
            permission_changes: 300,
            grants: 400,
            revokes: 100,
            updates: 500,
            success_rate: 0.95,
            by_role: vec![],
            by_user: vec![],
            by_operator: vec![],
            trend: vec![],
        };
        let json = serde_json::to_value(&stats).unwrap();
        assert_eq!(json["total_changes"], 1000);
        assert_eq!(json["today_changes"], 50);
        assert_eq!(json["success_rate"], 0.95);
        assert!(json["by_role"].is_array());
    }

    #[test]
    fn test_role_change_stat_serialization() {
        let stat = RoleChangeStat {
            role_id: "role-123".to_string(),
            role_name: "管理员".to_string(),
            count: 25,
        };
        let json = serde_json::to_value(&stat).unwrap();
        assert_eq!(json["role_id"], "role-123");
        assert_eq!(json["role_name"], "管理员");
        assert_eq!(json["count"], 25);
    }

    #[test]
    fn test_operation_log_record_creation() {
        let record = OperationLogRecord {
            tenant_id: Uuid::nil(),
            user_id: Some(Uuid::nil()),
            user_name: "testuser".to_string(),
            module: "iam".to_string(),
            operation: "login".to_string(),
            resource_type: "user".to_string(),
            resource_id: Some("user-123".to_string()),
            description: Some("用户登录".to_string()),
            request_data: None,
            response_status: Some(200),
            ip_address: Some("127.0.0.1".to_string()),
            user_agent: Some("TestBrowser".to_string()),
            trace_id: Some("trace-abc".to_string()),
        };
        assert_eq!(record.module, "iam");
        assert_eq!(record.operation, "login");
        assert_eq!(record.response_status, Some(200));
        assert!(record.trace_id.is_some());
    }

    #[test]
    fn test_operation_log_record_clone() {
        let record = OperationLogRecord {
            tenant_id: Uuid::nil(),
            user_id: None,
            user_name: "user1".to_string(),
            module: "crm".to_string(),
            operation: "create".to_string(),
            resource_type: "customer".to_string(),
            resource_id: None,
            description: None,
            request_data: None,
            response_status: None,
            ip_address: None,
            user_agent: None,
            trace_id: None,
        };
        let cloned = record.clone();
        assert_eq!(record.module, cloned.module);
        assert_eq!(record.user_name, cloned.user_name);
    }
}
