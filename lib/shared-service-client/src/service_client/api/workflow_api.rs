//! Workflow（工作流）服务 API trait 定义

use super::super::error::ServiceClientResult;
use super::super::trait_api::TypedServiceClient;
use crate::define_service_api;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use topems_shared_core::response::PaginatedResponse;
use uuid::Uuid;

define_service_api!(
    WorkflowApi,
    "topems-workflow",
    8000,
    Some("WORKFLOW_SERVICE_URL"),
    ""
);

// ============ 业务数据类型 ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowTask {
    pub id: Uuid,
    pub instance_id: Uuid,
    pub node_id: String,
    pub assignee_id: Uuid,
    pub status: String,
    pub comment: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskStats {
    pub todo: i32,
    pub done: i32,
    pub my_pending: i32,
    pub my_completed: i32,
}

/// 流程实例（字段与 `workflow_client::WorkflowInstance` 一致）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowInstance {
    pub id: Uuid,
    pub workflow_id: Uuid,
    pub title: String,
    pub initiator_id: Uuid,
    pub current_node_id: Option<String>,
    pub status: String,
    pub variables: Option<serde_json::Value>,
    pub started_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 创建流程实例请求（字段与 `workflow_client::CreateInstanceRequest` 一致）
#[derive(Debug, Clone, Serialize)]
pub struct CreateInstanceRequest {
    pub workflow_id: Uuid,
    pub title: String,
    pub variables: Option<serde_json::Value>,
}

/// 实例操作请求（审批意见）
#[derive(Debug, Clone, Serialize)]
pub struct TaskActionRequest {
    pub comment: Option<String>,
}

// ============ TypedServiceClient<WorkflowApi> 业务方法 ============

impl TypedServiceClient<WorkflowApi> {
    /// 获取我的待办任务
    pub async fn get_my_pending_tasks(
        &self,
        page: i64,
        page_size: i64,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/tasks/my/pending?page={}&page_size={}", page, page_size);
        self.get_and_unwrap(&path).await
    }

    /// 获取我的已完成任务
    pub async fn get_my_completed_tasks(
        &self,
        page: i64,
        page_size: i64,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/tasks/my/completed?page={}&page_size={}", page, page_size);
        self.get_and_unwrap(&path).await
    }

    /// 获取我的任务统计
    pub async fn get_my_task_stats(&self) -> ServiceClientResult<serde_json::Value> {
        self.get_and_unwrap("/tasks/my/stats").await
    }

    /// 获取任务
    pub async fn get_task(&self, id: Uuid) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/tasks/{}", id);
        self.get_and_unwrap(&path).await
    }

    /// 审批通过
    pub async fn approve_task(
        &self,
        id: Uuid,
        comment: Option<&str>,
    ) -> ServiceClientResult<bool> {
        let body = serde_json::json!({ "comment": comment });
        let path = format!("/tasks/{}/approve", id);
        self.post_and_check_success(&path, &body).await
    }

    /// 审批拒绝
    pub async fn reject_task(
        &self,
        id: Uuid,
        comment: Option<&str>,
    ) -> ServiceClientResult<bool> {
        let body = serde_json::json!({ "comment": comment });
        let path = format!("/tasks/{}/reject", id);
        self.post_and_check_success(&path, &body).await
    }

    /// 签收任务
    pub async fn claim_task(&self, id: Uuid) -> ServiceClientResult<bool> {
        let path = format!("/tasks/{}/claim", id);
        self.post_and_check_success(&path, &serde_json::Value::Null)
            .await
    }

    /// 委派任务
    pub async fn delegate_task(
        &self,
        id: Uuid,
        attorney_id: Uuid,
        reason: Option<&str>,
    ) -> ServiceClientResult<bool> {
        let body = serde_json::json!({
            "attorney_id": attorney_id,
            "reason": reason,
        });
        let path = format!("/tasks/{}/delegate", id);
        self.post_and_check_success(&path, &body).await
    }

    /// 获取工作流统计
    pub async fn get_statistics(&self) -> ServiceClientResult<serde_json::Value> {
        self.get_and_unwrap("/statistics").await
    }

    // ============ 实例级工作流操作（/api/flow/instances） ============
    //
    // 委托 Flow 引擎执行实例级编排。路径与 `WorkflowServiceClient`
    // 及 `svc/unified-core` 的 `/api/flow/instances` 路由保持一致。

    /// 创建流程实例
    pub async fn create_instance(
        &self,
        request: CreateInstanceRequest,
    ) -> ServiceClientResult<WorkflowInstance> {
        self.post_and_unwrap("/api/flow/instances", &request).await
    }

    /// 获取流程实例详情
    pub async fn get_instance(&self, instance_id: Uuid) -> ServiceClientResult<WorkflowInstance> {
        let path = format!("/api/flow/instances/{}", instance_id);
        self.get_and_unwrap(&path).await
    }

    /// 列出流程实例（分页）
    pub async fn list_instances(
        &self,
        page: i64,
        page_size: i64,
    ) -> ServiceClientResult<PaginatedResponse<WorkflowInstance>> {
        let path = format!("/api/flow/instances?page={}&page_size={}", page, page_size);
        self.get_and_unwrap(&path).await
    }

    /// 列出指定用户的待办流程实例
    pub async fn list_todo_tasks(&self, user_id: &str) -> ServiceClientResult<Vec<WorkflowInstance>> {
        let path = format!("/api/flow/tasks/todo?user_id={}", user_id);
        self.get_and_unwrap(&path).await
    }

    /// 审批通过流程实例
    pub async fn approve_instance(
        &self,
        instance_id: Uuid,
        comment: Option<String>,
    ) -> ServiceClientResult<WorkflowInstance> {
        let body = TaskActionRequest { comment };
        let path = format!("/api/flow/instances/{}/approve", instance_id);
        self.post_and_unwrap(&path, &body).await
    }

    /// 审批拒绝流程实例
    pub async fn reject_instance(
        &self,
        instance_id: Uuid,
        comment: Option<String>,
    ) -> ServiceClientResult<WorkflowInstance> {
        let body = TaskActionRequest { comment };
        let path = format!("/api/flow/instances/{}/reject", instance_id);
        self.post_and_unwrap(&path, &body).await
    }
}
