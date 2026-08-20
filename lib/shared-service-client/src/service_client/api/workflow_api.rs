//! Workflow（工作流）服务 API trait 定义
//!
//! P0-2 Phase 2: 从 workflow_client.rs 迁移，补齐全部类型与方法，
//! 作为 TypedServiceClient<WorkflowApi> 的完整实现。

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

// ============ 业务数据类型（与旧 workflow_client.rs 完全一致）============

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

// ============ TypedServiceClient<WorkflowApi> 业务方法 ============

impl TypedServiceClient<WorkflowApi> {
    /// 获取我的待办任务
    pub async fn get_my_pending_tasks(
        &self,
        page: i64,
        page_size: i64,
    ) -> ServiceClientResult<PaginatedResponse<WorkflowTask>> {
        let path = format!("/tasks/my/pending?page={}&page_size={}", page, page_size);
        self.get_and_unwrap(&path).await
    }

    /// 获取我的已完成任务
    pub async fn get_my_completed_tasks(
        &self,
        page: i64,
        page_size: i64,
    ) -> ServiceClientResult<PaginatedResponse<WorkflowTask>> {
        let path = format!("/tasks/my/completed?page={}&page_size={}", page, page_size);
        self.get_and_unwrap(&path).await
    }

    /// 获取我的任务统计
    pub async fn get_my_task_stats(&self) -> ServiceClientResult<TaskStats> {
        self.get_and_unwrap("/tasks/my/stats").await
    }

    /// 获取我的任务数量
    pub async fn get_my_task_count(&self) -> ServiceClientResult<i64> {
        self.get_and_unwrap("/tasks/my/count").await
    }

    /// 获取任务详情
    pub async fn get_task(&self, id: Uuid) -> ServiceClientResult<WorkflowTask> {
        let path = format!("/tasks/{}", id);
        self.get_and_unwrap(&path).await
    }

    /// 审批通过
    pub async fn approve_task(&self, id: Uuid, comment: Option<&str>) -> ServiceClientResult<bool> {
        let body = serde_json::json!({ "comment": comment });
        let path = format!("/tasks/{}/approve", id);
        self.post_and_check_success(&path, &body).await
    }

    /// 审批拒绝
    pub async fn reject_task(&self, id: Uuid, comment: Option<&str>) -> ServiceClientResult<bool> {
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
    pub async fn get_statistics(&self) -> ServiceClientResult<WorkflowStatistics> {
        self.get_and_unwrap("/statistics").await
    }

    // ============ 实例级工作流操作（/api/flow/instances） ============

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
        let path = format!("/instances?page={}&page_size={}", page, page_size);
        self.get_and_unwrap(&path).await
    }

    /// 列出指定用户的待办流程实例
    pub async fn list_todo_tasks(
        &self,
        user_id: &str,
    ) -> ServiceClientResult<Vec<WorkflowInstance>> {
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

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{TimeZone, Utc};

    fn sample_dt() -> DateTime<Utc> {
        Utc.with_ymd_and_hms(2024, 1, 1, 0, 0, 0).unwrap()
    }

    fn rt<T: Serialize + serde::de::DeserializeOwned>(val: &T) -> T {
        let s = serde_json::to_string(val).unwrap();
        serde_json::from_str(&s).unwrap()
    }

    #[test]
    fn workflow_task_roundtrip_full() {
        let t = WorkflowTask {
            id: Uuid::nil(),
            instance_id: Uuid::nil(),
            node_id: "node-approve".into(),
            assignee_id: Uuid::nil(),
            status: "pending".into(),
            comment: Some("Please review".into()),
            priority: Some("high".into()),
            due_time: Some(sample_dt()),
            created_at: sample_dt(),
            completed_at: Some(sample_dt()),
            claimed_at: Some(sample_dt()),
            instance_title: Some("Leave Request".into()),
            workflow_name: Some("Leave Approval".into()),
        };
        let back = rt(&t);
        assert_eq!(back.node_id, "node-approve");
        assert_eq!(back.status, "pending");
        assert_eq!(back.priority.as_deref(), Some("high"));
        assert!(back.due_time.is_some());
        assert!(back.instance_title.is_some());
    }

    #[test]
    fn workflow_task_roundtrip_minimal() {
        let t = WorkflowTask {
            id: Uuid::nil(),
            instance_id: Uuid::nil(),
            node_id: "node-2".into(),
            assignee_id: Uuid::nil(),
            status: "completed".into(),
            comment: None,
            priority: None,
            due_time: None,
            created_at: sample_dt(),
            completed_at: None,
            claimed_at: None,
            instance_title: None,
            workflow_name: None,
        };
        let back = rt(&t);
        assert_eq!(back.status, "completed");
        assert!(back.comment.is_none());
        assert!(back.priority.is_none());
    }

    #[test]
    fn task_stats_roundtrip() {
        let s = TaskStats {
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
        let back = rt(&s);
        assert_eq!(back.todo, 5);
        assert_eq!(back.done, 10);
        assert_eq!(back.candidate, 6);
    }

    #[test]
    fn workflow_instance_roundtrip() {
        let inst = WorkflowInstance {
            id: Uuid::nil(),
            workflow_id: Uuid::nil(),
            title: "Leave request".into(),
            initiator_id: Uuid::nil(),
            current_node_id: Some("manager-review".into()),
            status: "running".into(),
            variables: Some(serde_json::json!({"days": 3})),
            started_at: sample_dt(),
            completed_at: None,
            created_at: sample_dt(),
            updated_at: sample_dt(),
        };
        let back = rt(&inst);
        assert_eq!(back.title, "Leave request");
        assert_eq!(back.status, "running");
        assert!(back.completed_at.is_none());
    }

    #[test]
    fn workflow_statistics_roundtrip() {
        let s = WorkflowStatistics {
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
        let back = rt(&s);
        assert_eq!(back.total_workflows, 100);
        assert_eq!(back.running_instances, 30);
        assert_eq!(back.approval_rate, 0.8);
    }

    #[test]
    fn create_instance_request_serialization() {
        let req = CreateInstanceRequest {
            workflow_id: Uuid::nil(),
            title: "Test Workflow".into(),
            variables: Some(serde_json::json!({"key": "value"})),
        };
        let val = serde_json::to_value(&req).unwrap();
        assert_eq!(val["title"], "Test Workflow");
        assert!(val["variables"].is_object());
    }
}
