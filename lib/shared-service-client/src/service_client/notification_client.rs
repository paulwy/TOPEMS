//! ## V66.1 说明（向后兼容薄包装）
//!
//! notification 模块已于 V66 从 unified-core 外迁进入 **communication** 独立服务
//! （端口 8084，路径前缀 `/api/communication/*`）。
//!
//! - **新项目 / 新调用方**：请直接使用 [`super::communication_client::CommunicationServiceClient`]，
//!   其内置 `list_notifications / get_unread_notifications / mark_notification_read` 等 8 个
//!   原生 notification 方法（路径：`/api/communication/notifications/*`）。
//! - **遗留调用方**：本文件保留完整的 `NotificationSvcClient` 类型签名与方法集，
//!   内部 `from_env()` 优先读 `COMMUNICATION_SERVICE_URL`（默认 http://localhost:8084），
//!   路径前缀从 `/api/core/notification/*` 改为 `/api/communication/notification/*`
//!   （保持与旧结构一致的单数形式，降低迁移成本）。

use super::base_client::BaseServiceClient;
use super::error::ServiceClientResult;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Notification {
    pub id: String,
    pub user_id: String,
    pub notification_type: String,
    pub title: String,
    pub content: String,
    #[serde(default)]
    pub data: Option<serde_json::Value>,
    pub is_read: bool,
    pub priority: i32,
    #[serde(default)]
    pub link_url: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    #[serde(default)]
    pub read_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationListResponse {
    pub notifications: Vec<Notification>,
    pub total: i64,
    pub page: i32,
    pub pagesize: i32,
    pub unread_count: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationStats {
    pub total: i64,
    pub unread: i64,
    pub by_type: std::collections::HashMap<String, i64>,
    pub by_priority: std::collections::HashMap<i32, i64>,
    pub total_notifications: i64,
    pub notifications_by_type: std::collections::HashMap<String, i64>,
    pub notifications_by_day: std::collections::HashMap<String, i64>,
    pub unread_notifications: i64,
    pub read_notifications: i64,
    pub archived_notifications: i64,
    pub generated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateNotificationRequest {
    pub title: String,
    pub content: String,
    #[serde(default)]
    pub notification_type: Option<String>,
    #[serde(default)]
    pub data: Option<serde_json::Value>,
    #[serde(default)]
    pub priority: Option<i32>,
    #[serde(default)]
    pub link_url: Option<String>,
}

#[derive(Clone)]
pub struct NotificationSvcClient {
    base_client: BaseServiceClient,
}

impl NotificationSvcClient {
    pub fn new(base_url: impl Into<String>) -> ServiceClientResult<Self> {
        Ok(Self {
            base_client: BaseServiceClient::new(base_url)?,
        })
    }

    pub fn from_env() -> ServiceClientResult<Self> {
        let base_url = std::env::var("COMMUNICATION_SERVICE_URL")
            .or_else(|_| std::env::var("NOTIFICATION_SERVICE_URL"))
            .unwrap_or_else(|_| "http://localhost:8084".into());
        Self::new(base_url)
    }

    pub fn set_auth_token(&mut self, token: impl Into<String>) {
        self.base_client.set_auth_token(token);
    }

    pub fn with_auth_token(mut self, token: impl Into<String>) -> Self {
        self.base_client.set_auth_token(token);
        self
    }

    pub fn add_header(&mut self, key: impl Into<String>, value: impl Into<String>) {
        self.base_client.add_header(key, value);
    }

    pub async fn get_health(&self) -> ServiceClientResult<bool> {
        match self.base_client.get_without_response("/health").await {
            Ok(_) => Ok(true),
            Err(_) => Ok(false),
        }
    }

    pub async fn list_notifications(
        &self,
        page: i32,
        page_size: i32,
        notification_type: Option<&str>,
    ) -> ServiceClientResult<NotificationListResponse> {
        let mut path = format!(
            "/api/communication/notification/notifications?page={}&pagesize={}",
            page, page_size
        );
        if let Some(nt) = notification_type {
            path.push_str(&format!("&notification_type={}", nt));
        }
        self.base_client.get(&path).await
    }

    pub async fn get_unread(&self) -> ServiceClientResult<Vec<Notification>> {
        self.base_client
            .get("/api/communication/notification/notifications/unread")
            .await
    }

    pub async fn get_unread_count(&self) -> ServiceClientResult<i32> {
        self.base_client
            .get("/api/communication/notification/notifications/unread-count")
            .await
    }

    pub async fn mark_as_read(&self, id: &str) -> ServiceClientResult<Notification> {
        self.base_client
            .put(
                &format!("/api/communication/notification/notifications/{}", id),
                &(),
            )
            .await
    }

    pub async fn mark_all_as_read(&self) -> ServiceClientResult<i32> {
        self.base_client
            .put(
                "/api/communication/notification/notifications/read-all",
                &(),
            )
            .await
    }

    pub async fn create_notification(
        &self,
        req: &CreateNotificationRequest,
    ) -> ServiceClientResult<Notification> {
        self.base_client
            .post("/api/communication/notification/notifications", req)
            .await
    }

    pub async fn delete_notification(&self, id: &str) -> ServiceClientResult<bool> {
        self.base_client
            .delete(&format!(
                "/api/communication/notification/notifications/{}",
                id
            ))
            .await
    }

    pub async fn get_stats(&self) -> ServiceClientResult<NotificationStats> {
        self.base_client
            .get("/api/communication/notification/notifications/stats/me")
            .await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    fn sample_dt() -> chrono::DateTime<chrono::Utc> {
        "2024-01-01T00:00:00Z".parse().unwrap()
    }

    // ========== Notification serde tests ==========

    #[test]
    fn notification_serde_roundtrip_full() {
        let original = Notification {
            id: "notif-001".to_string(),
            user_id: "user-001".to_string(),
            notification_type: "alert".to_string(),
            title: "Test Notification".to_string(),
            content: "This is a test".to_string(),
            data: Some(serde_json::json!({"key": "value"})),
            is_read: false,
            priority: 1,
            link_url: Some("/dashboard".to_string()),
            created_at: sample_dt(),
            read_at: Some(sample_dt()),
        };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: Notification = serde_json::from_str(&json).unwrap();
        let val1 = serde_json::to_value(&original).unwrap();
        let val2 = serde_json::to_value(&deserialized).unwrap();
        assert_eq!(val1, val2);
    }

    #[test]
    fn notification_serde_roundtrip_with_none_fields() {
        let original = Notification {
            id: "notif-002".to_string(),
            user_id: "user-002".to_string(),
            notification_type: "info".to_string(),
            title: "Info".to_string(),
            content: "Content".to_string(),
            data: None,
            is_read: true,
            priority: 0,
            link_url: None,
            created_at: sample_dt(),
            read_at: None,
        };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: Notification = serde_json::from_str(&json).unwrap();
        let val1 = serde_json::to_value(&original).unwrap();
        let val2 = serde_json::to_value(&deserialized).unwrap();
        assert_eq!(val1, val2);
    }

    #[test]
    fn notification_serde_default_fields_when_missing() {
        let json = r#"{
            "id": "n3",
            "user_id": "u3",
            "notification_type": "alert",
            "title": "T",
            "content": "C",
            "is_read": false,
            "priority": 5,
            "created_at": "2024-01-01T00:00:00Z"
        }"#;
        let notif: Notification = serde_json::from_str(json).unwrap();
        assert!(notif.data.is_none());
        assert!(notif.link_url.is_none());
        assert!(notif.read_at.is_none());
    }

    #[test]
    fn notification_deserialize_from_json() {
        let json = r#"{
            "id": "notif-100",
            "user_id": "user-100",
            "notification_type": "warning",
            "title": "Warning",
            "content": "Warning content",
            "data": {"level": "high"},
            "is_read": false,
            "priority": 2,
            "link_url": "/warnings/1",
            "created_at": "2024-06-01T12:00:00Z",
            "read_at": null
        }"#;
        let notif: Notification = serde_json::from_str(json).unwrap();
        assert_eq!(notif.id, "notif-100");
        assert_eq!(notif.notification_type, "warning");
        assert!(!notif.is_read);
        assert_eq!(notif.priority, 2);
        assert!(notif.data.is_some());
        assert!(notif.read_at.is_none());
    }

    // ========== NotificationListResponse serde tests ==========

    #[test]
    fn notification_list_response_serde_roundtrip() {
        let original = NotificationListResponse {
            notifications: vec![],
            total: 0,
            page: 1,
            pagesize: 20,
            unread_count: 0,
        };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: NotificationListResponse = serde_json::from_str(&json).unwrap();
        let val1 = serde_json::to_value(&original).unwrap();
        let val2 = serde_json::to_value(&deserialized).unwrap();
        assert_eq!(val1, val2);
    }

    #[test]
    fn notification_list_response_serde_roundtrip_with_items() {
        let notif = Notification {
            id: "n1".to_string(),
            user_id: "u1".to_string(),
            notification_type: "info".to_string(),
            title: "Title".to_string(),
            content: "Body".to_string(),
            data: None,
            is_read: false,
            priority: 0,
            link_url: None,
            created_at: sample_dt(),
            read_at: None,
        };
        let original = NotificationListResponse {
            notifications: vec![notif],
            total: 1,
            page: 1,
            pagesize: 10,
            unread_count: 1,
        };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: NotificationListResponse = serde_json::from_str(&json).unwrap();
        let val1 = serde_json::to_value(&original).unwrap();
        let val2 = serde_json::to_value(&deserialized).unwrap();
        assert_eq!(val1, val2);
    }

    // ========== NotificationStats serde tests ==========

    #[test]
    fn notification_stats_serde_roundtrip_empty() {
        let original = NotificationStats {
            total: 0,
            unread: 0,
            by_type: HashMap::new(),
            by_priority: HashMap::new(),
            total_notifications: 0,
            notifications_by_type: HashMap::new(),
            notifications_by_day: HashMap::new(),
            unread_notifications: 0,
            read_notifications: 0,
            archived_notifications: 0,
            generated_at: sample_dt(),
        };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: NotificationStats = serde_json::from_str(&json).unwrap();
        let val1 = serde_json::to_value(&original).unwrap();
        let val2 = serde_json::to_value(&deserialized).unwrap();
        assert_eq!(val1, val2);
    }

    #[test]
    fn notification_stats_serde_roundtrip_populated() {
        let mut by_type = HashMap::new();
        by_type.insert("alert".to_string(), 10);
        by_type.insert("info".to_string(), 20);
        let mut by_priority = HashMap::new();
        by_priority.insert(1, 5);
        by_priority.insert(2, 25);
        let mut by_day = HashMap::new();
        by_day.insert("2024-01-01".to_string(), 3);
        by_day.insert("2024-01-02".to_string(), 7);

        let original = NotificationStats {
            total: 30,
            unread: 10,
            by_type,
            by_priority,
            total_notifications: 30,
            notifications_by_type: HashMap::new(),
            notifications_by_day: by_day,
            unread_notifications: 10,
            read_notifications: 15,
            archived_notifications: 5,
            generated_at: sample_dt(),
        };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: NotificationStats = serde_json::from_str(&json).unwrap();
        let val1 = serde_json::to_value(&original).unwrap();
        let val2 = serde_json::to_value(&deserialized).unwrap();
        assert_eq!(val1, val2);
    }

    // ========== CreateNotificationRequest serde tests ==========

    #[test]
    fn create_notification_request_serde_roundtrip_full() {
        let original = CreateNotificationRequest {
            title: "New Alert".to_string(),
            content: "Alert content".to_string(),
            notification_type: Some("alert".to_string()),
            data: Some(serde_json::json!({"level": "high"})),
            priority: Some(3),
            link_url: Some("/alerts/1".to_string()),
        };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: CreateNotificationRequest = serde_json::from_str(&json).unwrap();
        let val1 = serde_json::to_value(&original).unwrap();
        let val2 = serde_json::to_value(&deserialized).unwrap();
        assert_eq!(val1, val2);
    }

    #[test]
    fn create_notification_request_serde_roundtrip_minimal() {
        let original = CreateNotificationRequest {
            title: "Title".to_string(),
            content: "Content".to_string(),
            notification_type: None,
            data: None,
            priority: None,
            link_url: None,
        };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: CreateNotificationRequest = serde_json::from_str(&json).unwrap();
        let val1 = serde_json::to_value(&original).unwrap();
        let val2 = serde_json::to_value(&deserialized).unwrap();
        assert_eq!(val1, val2);
    }

    #[test]
    fn create_notification_request_serde_default_fields_when_missing() {
        let json = r#"{
            "title": "T",
            "content": "C"
        }"#;
        let req: CreateNotificationRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.title, "T");
        assert_eq!(req.content, "C");
        assert!(req.notification_type.is_none());
        assert!(req.data.is_none());
        assert!(req.priority.is_none());
        assert!(req.link_url.is_none());
    }

    // ========== NotificationSvcClient construction tests ==========

    #[test]
    fn notification_client_new_succeeds() {
        let client = NotificationSvcClient::new("http://localhost:8084");
        assert!(client.is_ok());
    }

    #[test]
    fn notification_client_new_with_empty_url_fails() {
        let result = NotificationSvcClient::new("");
        assert!(result.is_err());
    }

    #[test]
    fn notification_client_from_env_succeeds() {
        let client = NotificationSvcClient::from_env();
        assert!(client.is_ok());
    }

    #[test]
    fn notification_client_set_auth_token_does_not_panic() {
        let mut client = NotificationSvcClient::new("http://localhost:8084").unwrap();
        client.set_auth_token("token-abc");
    }

    #[test]
    fn notification_client_with_auth_token_returns_self() {
        let client = NotificationSvcClient::new("http://localhost:8084").unwrap();
        let _client = client.with_auth_token("token-xyz");
    }

    #[test]
    fn notification_client_add_header_does_not_panic() {
        let mut client = NotificationSvcClient::new("http://localhost:8084").unwrap();
        client.add_header("X-Tenant-Id", "tenant-001");
    }

    #[tokio::test]
    async fn notification_client_get_health_unreachable_returns_false() {
        let client = NotificationSvcClient::new("http://127.0.0.1:1").unwrap();
        let result = client.get_health().await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), false);
    }
}
