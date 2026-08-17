use super::base_client::BaseServiceClient;
use super::error::{ServiceClientError, ServiceClientResult};
use chrono::{DateTime, Utc};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use topems_shared_core::response::{ApiResponse, PaginatedResponse};
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
        self.post_and_unwrap(
            &format!("/api/flow/instances/{}/approve", instance_id),
            &body,
        )
        .await
    }

    pub async fn reject_instance(
        &self,
        instance_id: Uuid,
        comment: Option<String>,
    ) -> ServiceClientResult<WorkflowInstance> {
        let body = TaskActionRequest { comment };
        self.post_and_unwrap(
            &format!("/api/flow/instances/{}/reject", instance_id),
            &body,
        )
        .await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_dt() -> DateTime<Utc> {
        "2024-01-01T00:00:00Z".parse().unwrap()
    }

    // ========== WorkflowTask serde tests ==========

    #[test]
    fn workflow_task_serde_roundtrip_full() {
        let original = WorkflowTask {
            id: Uuid::nil(),
            instance_id: Uuid::nil(),
            node_id: "node-1".to_string(),
            assignee_id: Uuid::nil(),
            status: "pending".to_string(),
            comment: Some("Please review".to_string()),
            priority: Some("high".to_string()),
            due_time: Some(sample_dt()),
            created_at: sample_dt(),
            completed_at: Some(sample_dt()),
            claimed_at: Some(sample_dt()),
            instance_title: Some("Leave Request".to_string()),
            workflow_name: Some("Leave Approval".to_string()),
        };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: WorkflowTask = serde_json::from_str(&json).unwrap();
        let val1 = serde_json::to_value(&original).unwrap();
        let val2 = serde_json::to_value(&deserialized).unwrap();
        assert_eq!(val1, val2);
    }

    #[test]
    fn workflow_task_serde_roundtrip_with_none_fields() {
        let original = WorkflowTask {
            id: Uuid::nil(),
            instance_id: Uuid::nil(),
            node_id: "node-2".to_string(),
            assignee_id: Uuid::nil(),
            status: "completed".to_string(),
            comment: None,
            priority: None,
            due_time: None,
            created_at: sample_dt(),
            completed_at: None,
            claimed_at: None,
            instance_title: None,
            workflow_name: None,
        };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: WorkflowTask = serde_json::from_str(&json).unwrap();
        let val1 = serde_json::to_value(&original).unwrap();
        let val2 = serde_json::to_value(&deserialized).unwrap();
        assert_eq!(val1, val2);
    }

    #[test]
    fn workflow_task_deserialize_from_json() {
        let json = r#"{
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "instance_id": "660e8400-e29b-41d4-a716-446655440000",
            "node_id": "approval",
            "assignee_id": "770e8400-e29b-41d4-a716-446655440000",
            "status": "todo",
            "comment": null,
            "priority": "medium",
            "due_time": null,
            "created_at": "2024-01-01T00:00:00Z",
            "completed_at": null,
            "claimed_at": null,
            "instance_title": "Title",
            "workflow_name": "WF"
        }"#;
        let task: WorkflowTask = serde_json::from_str(json).unwrap();
        assert_eq!(task.node_id, "approval");
        assert_eq!(task.status, "todo");
        assert!(task.comment.is_none());
        assert_eq!(task.priority, Some("medium".to_string()));
    }

    // ========== TaskStats serde tests ==========

    #[test]
    fn task_stats_serde_roundtrip() {
        let original = TaskStats {
            todo: 5,
            done: 10,
            sent: 3,
            cc: 2,
            my_pending: 4,
            my_completed: 20,
            my_involved: 30,
            my_created: 8,
            candidate: 6,
        };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: TaskStats = serde_json::from_str(&json).unwrap();
        let val1 = serde_json::to_value(&original).unwrap();
        let val2 = serde_json::to_value(&deserialized).unwrap();
        assert_eq!(val1, val2);
    }

    #[test]
    fn task_stats_deserialize_from_json() {
        let json = r#"{"todo":1,"done":2,"sent":3,"cc":4,"my_pending":5,"my_completed":6,"my_involved":7,"my_created":8,"candidate":9}"#;
        let stats: TaskStats = serde_json::from_str(json).unwrap();
        assert_eq!(stats.todo, 1);
        assert_eq!(stats.done, 2);
        assert_eq!(stats.candidate, 9);
    }

    // ========== WorkflowInstance serde tests ==========

    #[test]
    fn workflow_instance_serde_roundtrip_full() {
        let original = WorkflowInstance {
            id: Uuid::nil(),
            workflow_id: Uuid::nil(),
            title: "Leave Request".to_string(),
            initiator_id: Uuid::nil(),
            current_node_id: Some("approval".to_string()),
            status: "running".to_string(),
            variables: Some(serde_json::json!({"days": 3})),
            started_at: sample_dt(),
            completed_at: Some(sample_dt()),
            created_at: sample_dt(),
            updated_at: sample_dt(),
        };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: WorkflowInstance = serde_json::from_str(&json).unwrap();
        let val1 = serde_json::to_value(&original).unwrap();
        let val2 = serde_json::to_value(&deserialized).unwrap();
        assert_eq!(val1, val2);
    }

    #[test]
    fn workflow_instance_serde_roundtrip_with_none_fields() {
        let original = WorkflowInstance {
            id: Uuid::nil(),
            workflow_id: Uuid::nil(),
            title: "Test".to_string(),
            initiator_id: Uuid::nil(),
            current_node_id: None,
            status: "completed".to_string(),
            variables: None,
            started_at: sample_dt(),
            completed_at: None,
            created_at: sample_dt(),
            updated_at: sample_dt(),
        };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: WorkflowInstance = serde_json::from_str(&json).unwrap();
        let val1 = serde_json::to_value(&original).unwrap();
        let val2 = serde_json::to_value(&deserialized).unwrap();
        assert_eq!(val1, val2);
    }

    // ========== WorkflowStatistics serde tests ==========

    #[test]
    fn workflow_statistics_serde_roundtrip() {
        let original = WorkflowStatistics {
            total_workflows: 100,
            active_workflows: 50,
            total_instances: 500,
            running_instances: 30,
            completed_instances: 400,
            rejected_instances: 70,
            total_approvals: 1000,
            pending_approvals: 100,
            approved_approvals: 800,
            rejected_approvals: 100,
            avg_approval_time: 3.5,
            approval_rate: 0.8,
            rejection_rate: 0.1,
        };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: WorkflowStatistics = serde_json::from_str(&json).unwrap();
        let val1 = serde_json::to_value(&original).unwrap();
        let val2 = serde_json::to_value(&deserialized).unwrap();
        assert_eq!(val1, val2);
    }

    #[test]
    fn workflow_statistics_deserialize_from_json() {
        let json = r#"{
            "total_workflows": 10,
            "active_workflows": 5,
            "total_instances": 50,
            "running_instances": 3,
            "completed_instances": 40,
            "rejected_instances": 7,
            "total_approvals": 100,
            "pending_approvals": 10,
            "approved_approvals": 80,
            "rejected_approvals": 10,
            "avg_approval_time": 2.0,
            "approval_rate": 0.8,
            "rejection_rate": 0.1
        }"#;
        let stats: WorkflowStatistics = serde_json::from_str(json).unwrap();
        assert_eq!(stats.total_workflows, 10);
        assert_eq!(stats.running_instances, 3);
        assert_eq!(stats.approval_rate, 0.8);
    }

    // ========== CreateInstanceRequest serialization tests (Serialize only) ==========

    #[test]
    fn create_instance_request_serialization() {
        let req = CreateInstanceRequest {
            workflow_id: Uuid::nil(),
            title: "Test Workflow".to_string(),
            variables: Some(serde_json::json!({"key": "value"})),
        };
        let val = serde_json::to_value(&req).unwrap();
        assert_eq!(val["title"], "Test Workflow");
        assert_eq!(val["workflow_id"], Uuid::nil().to_string());
        assert!(val["variables"].is_object());
    }

    #[test]
    fn create_instance_request_serialization_without_variables() {
        let req = CreateInstanceRequest {
            workflow_id: Uuid::nil(),
            title: "No Vars".to_string(),
            variables: None,
        };
        let val = serde_json::to_value(&req).unwrap();
        assert_eq!(val["title"], "No Vars");
        assert!(val["variables"].is_null());
    }

    // ========== TaskActionRequest serialization tests (Serialize only) ==========

    #[test]
    fn task_action_request_serialization_with_comment() {
        let req = TaskActionRequest {
            comment: Some("test comment".to_string()),
        };
        let val = serde_json::to_value(&req).unwrap();
        assert_eq!(val["comment"], "test comment");
    }

    #[test]
    fn task_action_request_serialization_without_comment() {
        let req = TaskActionRequest { comment: None };
        let val = serde_json::to_value(&req).unwrap();
        assert!(val["comment"].is_null());
    }

    // ========== WorkflowServiceClient construction tests ==========

    #[test]
    fn workflow_client_new_succeeds() {
        let client = WorkflowServiceClient::new("http://localhost:8000");
        assert!(client.is_ok());
    }

    #[test]
    fn workflow_client_new_with_empty_url_fails() {
        let result = WorkflowServiceClient::new("");
        assert!(result.is_err());
    }

    #[test]
    fn workflow_client_from_env_succeeds() {
        let client = WorkflowServiceClient::from_env();
        assert!(client.is_ok());
    }

    #[test]
    fn workflow_client_set_auth_token_does_not_panic() {
        let mut client = WorkflowServiceClient::new("http://localhost:8000").unwrap();
        client.set_auth_token("token-abc");
    }

    #[test]
    fn workflow_client_with_auth_token_returns_self() {
        let client = WorkflowServiceClient::new("http://localhost:8000").unwrap();
        let _client = client.with_auth_token("token-xyz");
    }

    #[test]
    fn workflow_client_add_header_does_not_panic() {
        let mut client = WorkflowServiceClient::new("http://localhost:8000").unwrap();
        client.add_header("X-Tenant-Id", "tenant-001");
    }

    #[tokio::test]
    async fn workflow_client_get_health_unreachable_returns_false() {
        let client = WorkflowServiceClient::new("http://127.0.0.1:1").unwrap();
        let result = client.get_health().await;
        assert!(result.is_ok());
        assert!(!result.unwrap());
    }
}
