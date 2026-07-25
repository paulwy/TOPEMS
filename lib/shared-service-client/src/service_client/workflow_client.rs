use super::base_client::BaseServiceClient;
use super::error::{ServiceClientError, ServiceClientResult};
use topems_shared_core::response::{ApiResponse, PaginatedResponse};
use chrono::{DateTime, Utc};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowTask {
    pub id: Uuid,
    pub instance_id: Uuid,
    pub node_id: String,
    pub assignee_id: Uuid,
    pub status: String,
    pub comment: Option<String>,
    pub priority: Option<String>,
    pub due_time: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub claimed_at: Option<DateTime<Utc>>,
    pub instance_title: Option<String>,
    pub workflow_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskStats {
    pub todo: i32,
    pub done: i32,
    pub sent: i32,
    pub cc: i32,
    pub my_pending: i32,
    pub my_completed: i32,
    pub my_involved: i32,
    pub my_created: i32,
    pub candidate: i32,
}

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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowStatistics {
    pub total_workflows: i64,
    pub active_workflows: i64,
    pub total_instances: i64,
    pub running_instances: i64,
    pub completed_instances: i64,
    pub rejected_instances: i64,
    pub total_approvals: i64,
    pub pending_approvals: i64,
    pub approved_approvals: i64,
    pub rejected_approvals: i64,
    pub avg_approval_time: f64,
    pub approval_rate: f64,
    pub rejection_rate: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct CreateInstanceRequest {
    pub workflow_id: Uuid,
    pub title: String,
    pub variables: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize)]
pub struct TaskActionRequest {
    pub comment: Option<String>,
}

#[derive(Clone)]
pub struct WorkflowServiceClient {
    base_client: BaseServiceClient,
}

impl WorkflowServiceClient {
    pub fn new(base_url: impl Into<String>) -> ServiceClientResult<Self> {
        Ok(Self {
            base_client: BaseServiceClient::new(base_url)?,
        })
    }

    pub fn from_env() -> ServiceClientResult<Self> {
        let base_url = std::env::var("WORKFLOW_SERVICE_URL")
            .unwrap_or_else(|_| "http://localhost:8000".into());
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

    /// GET 请求并解包 ApiResponse，提取 data 字段
    async fn get_and_unwrap<T: DeserializeOwned>(&self, path: &str) -> ServiceClientResult<T> {
        let resp: ApiResponse<T> = self.base_client.get(path).await?;
        resp.data.ok_or_else(|| {
            ServiceClientError::ConfigError("API response missing data field".into())
        })
    }

    /// POST 请求并解包 ApiResponse，返回 success 状态
    async fn post_and_check_success<B: Serialize>(
        &self,
        path: &str,
        body: &B,
    ) -> ServiceClientResult<bool> {
        let resp: ApiResponse<serde_json::Value> = self.base_client.post(path, body).await?;
        Ok(resp.success)
    }

    /// POST 请求并解包 ApiResponse，提取 data 字段
    async fn post_and_unwrap<T: DeserializeOwned, B: Serialize>(
        &self,
        path: &str,
        body: &B,
    ) -> ServiceClientResult<T> {
        let resp: ApiResponse<T> = self.base_client.post(path, body).await?;
        resp.data.ok_or_else(|| {
            ServiceClientError::ConfigError("API response missing data field".into())
        })
    }

    pub async fn get_my_pending_tasks(
        &self,
        page: i64,
        page_size: i64,
    ) -> ServiceClientResult<PaginatedResponse<WorkflowTask>> {
        let path = format!("/tasks/my/pending?page={}&page_size={}", page, page_size);
        self.get_and_unwrap(&path).await
    }

    pub async fn get_my_completed_tasks(
        &self,
        page: i64,
        page_size: i64,
    ) -> ServiceClientResult<PaginatedResponse<WorkflowTask>> {
        let path = format!("/tasks/my/completed?page={}&page_size={}", page, page_size);
        self.get_and_unwrap(&path).await
    }

    pub async fn get_my_task_stats(&self) -> ServiceClientResult<TaskStats> {
        self.get_and_unwrap("/tasks/my/stats").await
    }

    pub async fn get_my_task_count(&self) -> ServiceClientResult<i64> {
        self.get_and_unwrap("/tasks/my/count").await
    }

    pub async fn get_task(&self, id: Uuid) -> ServiceClientResult<WorkflowTask> {
        self.get_and_unwrap(&format!("/tasks/{}", id)).await
    }

    pub async fn list_instances(
        &self,
        page: i64,
        page_size: i64,
    ) -> ServiceClientResult<PaginatedResponse<WorkflowInstance>> {
        let path = format!("/instances?page={}&page_size={}", page, page_size);
        self.get_and_unwrap(&path).await
    }

    pub async fn get_statistics(&self) -> ServiceClientResult<WorkflowStatistics> {
        self.get_and_unwrap("/statistics").await
    }

    pub async fn approve_task(&self, id: Uuid, comment: Option<&str>) -> ServiceClientResult<bool> {
        let body = serde_json::json!({ "comment": comment });
        self.post_and_check_success(&format!("/tasks/{}/approve", id), &body)
            .await
    }

    pub async fn reject_task(&self, id: Uuid, comment: Option<&str>) -> ServiceClientResult<bool> {
        let body = serde_json::json!({ "comment": comment });
        self.post_and_check_success(&format!("/tasks/{}/reject", id), &body)
            .await
    }

    pub async fn claim_task(&self, id: Uuid) -> ServiceClientResult<bool> {
        self.post_and_check_success(&format!("/tasks/{}/claim", id), &())
            .await
    }

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
        self.post_and_check_success(&format!("/tasks/{}/delegate", id), &body)
            .await
    }

    // ============ 实例级工作流操作（/api/flow/instances） ============

    pub async fn create_instance(
        &self,
        request: CreateInstanceRequest,
    ) -> ServiceClientResult<WorkflowInstance> {
        self.post_and_unwrap("/api/flow/instances", &request).await
    }

    pub async fn get_instance(&self, instance_id: Uuid) -> ServiceClientResult<WorkflowInstance> {
        self.get_and_unwrap(&format!("/api/flow/instances/{}", instance_id))
            .await
    }

    pub async fn list_todo_tasks(
        &self,
        user_id: &str,
    ) -> ServiceClientResult<Vec<WorkflowInstance>> {
        self.get_and_unwrap(&format!("/api/flow/tasks/todo?user_id={}", user_id))
            .await
    }

    pub async fn approve_instance(
        &self,
        instance_id: Uuid,
        comment: Option<String>,
    ) -> ServiceClientResult<WorkflowInstance> {
        let body = TaskActionRequest { comment };
        self.post_and_unwrap(&format!("/api/flow/instances/{}/approve", instance_id), &body)
            .await
    }

    pub async fn reject_instance(
        &self,
        instance_id: Uuid,
        comment: Option<String>,
    ) -> ServiceClientResult<WorkflowInstance> {
        let body = TaskActionRequest { comment };
        self.post_and_unwrap(&format!("/api/flow/instances/{}/reject", instance_id), &body)
            .await
    }
}
