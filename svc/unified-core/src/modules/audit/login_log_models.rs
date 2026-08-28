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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_record_login_request_deserialization() {
        let json = r#"{
            "tenant_id": "tenant-123",
            "user_id": "user-456",
            "username": "testuser",
            "ip_address": "192.168.1.1",
            "user_agent": "Mozilla/5.0",
            "status": "success",
            "error_message": null
        }"#;
        let req: RecordLoginRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.tenant_id.as_deref(), Some("tenant-123"));
        assert_eq!(req.user_id.as_deref(), Some("user-456"));
        assert_eq!(req.username, "testuser");
        assert_eq!(req.ip_address, "192.168.1.1");
        assert_eq!(req.user_agent.as_deref(), Some("Mozilla/5.0"));
        assert_eq!(req.status, "success");
        assert!(req.error_message.is_none());
    }

    #[test]
    fn test_record_login_request_minimal() {
        let json = r#"{
            "username": "user1",
            "ip_address": "10.0.0.1",
            "status": "failed"
        }"#;
        let req: RecordLoginRequest = serde_json::from_str(json).unwrap();
        assert!(req.tenant_id.is_none());
        assert!(req.user_id.is_none());
        assert_eq!(req.username, "user1");
        assert_eq!(req.status, "failed");
        assert!(req.user_agent.is_none());
    }

    #[test]
    fn test_login_log_query_default() {
        let json = r#"{}"#;
        let query: LoginLogQuery = serde_json::from_str(json).unwrap();
        assert!(query.username.is_none());
        assert!(query.status.is_none());
        assert!(query.user_id.is_none());
        assert!(query.ip_address.is_none());
        assert!(query.page.is_none());
        assert!(query.page_size.is_none());
    }

    #[test]
    fn test_login_log_query_full() {
        let json = r#"{
            "username": "admin",
            "status": "success",
            "user_id": "user-123",
            "ip_address": "192.168.1.1",
            "start_time": "2024-01-01T00:00:00Z",
            "end_time": "2024-12-31T23:59:59Z",
            "page": 1,
            "page_size": 20
        }"#;
        let query: LoginLogQuery = serde_json::from_str(json).unwrap();
        assert_eq!(query.username.as_deref(), Some("admin"));
        assert_eq!(query.status.as_deref(), Some("success"));
        assert_eq!(query.page, Some(1));
        assert_eq!(query.page_size, Some(20));
    }

    #[test]
    fn test_login_log_list_response_serialization() {
        let resp = LoginLogListResponse {
            items: vec![],
            total: 100,
            page: 1,
            page_size: 20,
        };
        let json = serde_json::to_value(&resp).unwrap();
        assert_eq!(json["total"], 100);
        assert_eq!(json["page"], 1);
        assert_eq!(json["page_size"], 20);
        assert!(json["items"].is_array());
    }

    #[test]
    fn test_delete_login_log_request() {
        let json = r#"{"ids": ["id1", "id2", "id3"]}"#;
        let req: DeleteLoginLogRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.ids.len(), 3);
        assert_eq!(req.ids[0], "id1");
        assert_eq!(req.ids[2], "id3");
    }

    #[test]
    fn test_delete_login_log_request_empty() {
        let json = r#"{"ids": []}"#;
        let req: DeleteLoginLogRequest = serde_json::from_str(json).unwrap();
        assert!(req.ids.is_empty());
    }

    #[test]
    fn test_login_log_struct_clone() {
        let log = LoginLog {
            id: Uuid::nil(),
            tenant_id: Uuid::nil(),
            user_id: None,
            username: "testuser".to_string(),
            ip_address: "127.0.0.1".to_string(),
            user_agent: None,
            status: "success".to_string(),
            error_message: None,
            login_time: Utc::now(),
            created_at: Utc::now(),
        };
        let cloned = log.clone();
        assert_eq!(log.username, cloned.username);
        assert_eq!(log.ip_address, cloned.ip_address);
        assert_eq!(log.status, cloned.status);
    }
}
