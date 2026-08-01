//! Notification（通知）服务 API trait 定义

use super::super::error::ServiceClientResult;
use super::super::trait_api::TypedServiceClient;
use crate::define_service_api;
use serde::{Deserialize, Serialize};

define_service_api!(
    NotificationApi,
    "topems-notification",
    8000,
    Some("NOTIFICATION_SERVICE_URL"),
    "/api/core/notification"
);

// ============ 业务数据类型 ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationItem {
    pub id: String,
    pub user_id: String,
    pub notification_type: String,
    pub title: String,
    pub content: String,
    pub is_read: bool,
    pub priority: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateNotification {
    pub title: String,
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notification_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub priority: Option<i32>,
}

// ============ TypedServiceClient<NotificationApi> 业务方法 ============

impl TypedServiceClient<NotificationApi> {
    /// 列出通知
    pub async fn list_notifications(
        &self,
        page: i32,
        page_size: i32,
        notification_type: Option<&str>,
    ) -> ServiceClientResult<serde_json::Value> {
        let mut path = format!("/notifications?page={}&pagesize={}", page, page_size);
        if let Some(nt) = notification_type {
            path.push_str(&format!("&notification_type={}", nt));
        }
        self.get(&self.build_path(&path)).await
    }

    /// 获取未读通知
    pub async fn get_unread(&self) -> ServiceClientResult<Vec<serde_json::Value>> {
        self.get(&self.build_path("/notifications/unread")).await
    }

    /// 获取未读数
    pub async fn get_unread_count(&self) -> ServiceClientResult<i32> {
        self.get(&self.build_path("/notifications/unread-count"))
            .await
    }

    /// 标记为已读
    pub async fn mark_as_read(&self, id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/notifications/{}", id);
        self.put(&self.build_path(&path), &serde_json::Value::Null)
            .await
    }

    /// 全部标记为已读
    pub async fn mark_all_as_read(&self) -> ServiceClientResult<i32> {
        self.put(
            &self.build_path("/notifications/read-all"),
            &serde_json::Value::Null,
        )
        .await
    }

    /// 创建通知
    pub async fn create_notification(
        &self,
        req: &CreateNotification,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/notifications"), req).await
    }

    /// 删除通知
    pub async fn delete_notification(&self, id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/notifications/{}", id);
        self.delete(&self.build_path(&path)).await
    }

    /// 获取通知统计
    pub async fn get_stats(&self) -> ServiceClientResult<serde_json::Value> {
        self.get(&self.build_path("/notifications/stats/me")).await
    }
}
