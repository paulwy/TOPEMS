use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
#[schema(as = Workflow)]
pub struct Workflow {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    #[serde(default)]
    #[sqlx(default)]
    pub name_en: Option<String>,
    pub code: Option<String>,
    pub description: Option<String>,
    pub definition: serde_json::Value,
    pub status: String,
    pub version: i32,
    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub published_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[schema(as = CreateWorkflowRequest)]
pub struct CreateWorkflowRequest {
    pub name: String,
    pub description: Option<String>,
    pub definition: Option<serde_json::Value>,
    pub status: Option<String>,
    pub created_by: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[schema(as = UpdateWorkflowRequest)]
pub struct UpdateWorkflowRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub definition: Option<serde_json::Value>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
#[schema(as = WorkflowInstance)]
pub struct WorkflowInstance {
    pub id: Uuid,
    pub tenant_id: Uuid,
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

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[schema(as = CreateInstanceRequest)]
pub struct CreateInstanceRequest {
    pub workflow_id: Uuid,
    pub title: String,
    pub initiator_id: Option<Uuid>,
    pub variables: Option<serde_json::Value>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
#[schema(as = WorkflowTask)]
pub struct WorkflowTask {
    pub id: Uuid,
    pub tenant_id: Uuid,
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
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[schema(as = TaskActionRequest)]
pub struct TaskActionRequest {
    pub comment: Option<String>,
    pub variables: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[schema(as = TaskBatchRequest)]
pub struct TaskBatchRequest {
    pub task_ids: Vec<String>,
    pub comment: Option<String>,
    pub action: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[schema(as = TaskBatchResult)]
pub struct TaskBatchResult {
    pub success_count: i32,
    pub failed_count: i32,
    pub failed_tasks: Vec<TaskFailure>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[schema(as = TaskFailure)]
pub struct TaskFailure {
    pub task_id: String,
    pub error: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[schema(as = TaskStats)]
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

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
#[schema(as = WorkflowCategory)]
pub struct WorkflowCategory {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub code: Option<String>,
    pub description: Option<String>,
    pub sort_order: Option<i32>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[schema(as = CreateCategoryRequest)]
pub struct CreateCategoryRequest {
    pub name: String,
    pub code: Option<String>,
    pub description: Option<String>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
#[schema(as = WorkflowDelegate)]
pub struct WorkflowDelegate {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub delegator_id: Uuid,
    pub delegator_name: Option<String>,
    pub attorney_id: Uuid,
    pub attorney_name: Option<String>,
    pub start_time: DateTime<Utc>,
    pub end_time: Option<DateTime<Utc>>,
    pub workflow_ids: Option<serde_json::Value>,
    pub reason: Option<String>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[schema(as = CreateDelegateRequest)]
pub struct CreateDelegateRequest {
    pub attorney_id: Uuid,
    pub attorney_name: Option<String>,
    pub start_time: DateTime<Utc>,
    pub end_time: Option<DateTime<Utc>>,
    pub workflow_ids: Option<Vec<String>>,
    pub reason: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
#[schema(as = FormDefinition)]
pub struct FormDefinition {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub fields: serde_json::Value,
    pub layout: Option<serde_json::Value>,
    pub is_active: bool,
    pub version: Option<String>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[schema(as = CreateFormDefinitionRequest)]
pub struct CreateFormDefinitionRequest {
    pub name: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub fields: serde_json::Value,
    pub layout: Option<serde_json::Value>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
#[schema(as = FormInstance)]
pub struct FormInstance {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub form_definition_id: Uuid,
    pub form_definition_name: Option<String>,
    pub workflow_instance_id: Option<Uuid>,
    pub data: serde_json::Value,
    pub status: String,
    pub created_by: Option<Uuid>,
    pub created_by_name: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[schema(as = CreateFormInstanceRequest)]
pub struct CreateFormInstanceRequest {
    pub form_definition_id: Uuid,
    pub workflow_instance_id: Option<Uuid>,
    pub data: serde_json::Value,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
#[schema(as = WorkflowHistory)]
pub struct WorkflowHistory {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub workflow_instance_id: Uuid,
    pub workflow_id: Option<Uuid>,
    pub workflow_name: Option<String>,
    pub action: String,
    pub actor_id: Option<Uuid>,
    pub actor_name: Option<String>,
    pub node_id: Option<String>,
    pub node_name: Option<String>,
    pub status_before: Option<String>,
    pub status_after: Option<String>,
    pub comment: Option<String>,
    pub data: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
#[schema(as = WorkflowSetting)]
pub struct WorkflowSetting {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub key: String,
    pub value: String,
    pub description: String,
    pub category: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[schema(as = CreateSettingRequest)]
pub struct CreateSettingRequest {
    pub key: String,
    pub value: String,
    pub description: String,
    pub category: String,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
#[schema(as = WorkflowTemplate)]
pub struct WorkflowTemplate {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub template_type: Option<String>,
    pub scope: Option<String>,
    pub definition: Option<serde_json::Value>,
    pub usage_count: Option<i32>,
    pub is_active: Option<bool>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[schema(as = StatisticsResponse)]
pub struct StatisticsResponse {
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
    #[serde(default)]
    pub workflow_stats: Vec<WorkflowStat>,
    #[serde(default)]
    pub monthly_data: Vec<MonthlyData>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
#[schema(as = WorkflowStat)]
pub struct WorkflowStat {
    pub workflow_id: String,
    pub workflow_name: String,
    pub instance_count: i64,
    pub completion_rate: f64,
    pub avg_duration: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[schema(as = MonthlyData)]
pub struct MonthlyData {
    pub month: String,
    pub instances_started: i64,
    pub instances_completed: i64,
    pub approvals_processed: i64,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
#[schema(as = ProcessLog)]
pub struct ProcessLog {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub workflow_instance_id: Uuid,
    pub workflow_id: Option<Uuid>,
    pub workflow_name: Option<String>,
    pub node_id: Option<String>,
    pub node_name: Option<String>,
    pub action: String,
    pub action_type: String,
    pub actor_id: Option<Uuid>,
    pub actor_name: Option<String>,
    pub comment: Option<String>,
    pub data: Option<serde_json::Value>,
    pub duration: Option<i64>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
#[schema(as = WorkflowRule)]
pub struct WorkflowRule {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub rule_type: String,
    pub workflow_id: Option<Uuid>,
    pub node_id: Option<String>,
    pub condition: Option<String>,
    pub action: Option<serde_json::Value>,
    pub is_active: bool,
    pub sort_order: Option<i32>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[schema(as = CreateRuleRequest)]
pub struct CreateRuleRequest {
    pub name: String,
    pub rule_type: String,
    pub workflow_id: Option<Uuid>,
    pub node_id: Option<String>,
    pub condition: Option<String>,
    pub action: Option<serde_json::Value>,
    pub is_active: Option<bool>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json;

    fn sample_time() -> DateTime<Utc> {
        chrono::DateTime::parse_from_rfc3339("2024-01-15T10:30:00Z")
            .unwrap()
            .with_timezone(&chrono::Utc)
    }

    #[test]
    fn test_workflow_construct_and_clone() {
        let wf = Workflow {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            name: "Leave Approval".to_string(),
            description: Some("Leave request workflow".to_string()),
            definition: serde_json::json!({"nodes": []}),
            status: "draft".to_string(),
            version: 1,
            created_by: Uuid::new_v4(),
            created_at: sample_time(),
            updated_at: sample_time(),
            published_at: None,
            code: Some("LEAVE-APPROVAL".to_string()),
        };
        let cloned = wf.clone();
        assert_eq!(wf.id, cloned.id);
        assert_eq!(wf.name, cloned.name);
        assert_eq!(wf.status, cloned.status);
    }

    #[test]
    fn test_workflow_serde_roundtrip() {
        let wf = Workflow {
            id: Uuid::parse_str("a1a2a3a4-a1a2-a3a4-a1a2-a3a4a5a6a7a8").unwrap(),
            tenant_id: Uuid::parse_str("b1b2b3b4-b1b2-b3b4-b1b2-b3b4b5b6b7b8").unwrap(),
            name: "报销流程".to_string(),
            description: Some("财务报销审批流程".to_string()),
            definition: serde_json::json!({"nodes": [{"id": "start"}], "edges": []}),
            status: "active".to_string(),
            version: 2,
            created_by: Uuid::parse_str("c1c2c3c4-c1c2-c3c4-c1c2-c3c4c5c6c7c8").unwrap(),
            created_at: sample_time(),
            updated_at: sample_time(),
            published_at: Some(sample_time()),
            code: Some("EXPENSE-REIMBURSEMENT".to_string()),
        };
        let json = serde_json::to_string(&wf).unwrap();
        let de: Workflow = serde_json::from_str(&json).unwrap();
        assert_eq!(de.id, wf.id);
        assert_eq!(de.name, wf.name);
        assert_eq!(de.version, 2);
        assert!(de.published_at.is_some());
    }

    #[test]
    fn test_create_workflow_request() {
        let req = CreateWorkflowRequest {
            name: "采购申请".to_string(),
            description: Some("采购流程".to_string()),
            definition: Some(serde_json::json!({"nodes": []})),
            status: Some("draft".to_string()),
            created_by: Some(Uuid::new_v4()),
        };
        let json = serde_json::to_string(&req).unwrap();
        let de: CreateWorkflowRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(de.name, "采购申请");
        assert!(de.description.is_some());
    }

    #[test]
    fn test_update_workflow_request() {
        let req = UpdateWorkflowRequest {
            name: Some("新名称".to_string()),
            description: None,
            definition: Some(serde_json::json!({"updated": true})),
            status: Some("published".to_string()),
        };
        let json = serde_json::to_string(&req).unwrap();
        let de: UpdateWorkflowRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(de.name, Some("新名称".to_string()));
        assert!(de.description.is_none());
    }

    #[test]
    fn test_workflow_instance_serde() {
        let inst = WorkflowInstance {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            workflow_id: Uuid::new_v4(),
            title: "2024年1月报销-张三".to_string(),
            initiator_id: Uuid::new_v4(),
            current_node_id: Some("node_approval".to_string()),
            status: "running".to_string(),
            variables: Some(serde_json::json!({"amount": 1000})),
            started_at: sample_time(),
            completed_at: None,
            created_at: sample_time(),
            updated_at: sample_time(),
        };
        let json = serde_json::to_string(&inst).unwrap();
        let de: WorkflowInstance = serde_json::from_str(&json).unwrap();
        assert_eq!(de.title, inst.title);
        assert_eq!(de.status, "running");
        assert!(de.current_node_id.is_some());
        assert!(de.completed_at.is_none());
    }

    #[test]
    fn test_create_instance_request() {
        let req = CreateInstanceRequest {
            workflow_id: Uuid::new_v4(),
            title: "测试实例".to_string(),
            initiator_id: Some(Uuid::new_v4()),
            variables: Some(serde_json::json!({"key": "value"})),
        };
        let json = serde_json::to_string(&req).unwrap();
        let de: CreateInstanceRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(de.title, "测试实例");
    }

    #[test]
    fn test_workflow_task_serde() {
        let task = WorkflowTask {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            instance_id: Uuid::new_v4(),
            node_id: "approve_1".to_string(),
            assignee_id: Uuid::new_v4(),
            status: "pending".to_string(),
            comment: Some("请审批".to_string()),
            priority: Some("high".to_string()),
            due_time: Some(sample_time()),
            created_at: sample_time(),
            completed_at: None,
            claimed_at: None,
        };
        let json = serde_json::to_string(&task).unwrap();
        let de: WorkflowTask = serde_json::from_str(&json).unwrap();
        assert_eq!(de.node_id, "approve_1");
        assert_eq!(de.status, "pending");
        assert_eq!(de.priority, Some("high".to_string()));
    }

    #[test]
    fn test_task_action_request() {
        let req = TaskActionRequest {
            comment: Some("同意，符合规定".to_string()),
            variables: Some(serde_json::json!({"approved": true})),
        };
        let json = serde_json::to_string(&req).unwrap();
        let de: TaskActionRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(de.comment, Some("同意，符合规定".to_string()));
    }

    #[test]
    fn test_task_batch_request_and_result() {
        let req = TaskBatchRequest {
            task_ids: vec!["t1".to_string(), "t2".to_string(), "t3".to_string()],
            comment: Some("批量审批".to_string()),
            action: "approve".to_string(),
        };
        let json = serde_json::to_string(&req).unwrap();
        let de_req: TaskBatchRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(de_req.task_ids.len(), 3);
        assert_eq!(de_req.action, "approve");

        let result = TaskBatchResult {
            success_count: 2,
            failed_count: 1,
            failed_tasks: vec![TaskFailure {
                task_id: "t2".to_string(),
                error: "任务不存在".to_string(),
            }],
        };
        let json2 = serde_json::to_string(&result).unwrap();
        let de_res: TaskBatchResult = serde_json::from_str(&json2).unwrap();
        assert_eq!(de_res.success_count, 2);
        assert_eq!(de_res.failed_tasks[0].task_id, "t2");
    }

    #[test]
    fn test_task_stats() {
        let stats = TaskStats {
            todo: 5,
            done: 10,
            sent: 3,
            cc: 2,
            my_pending: 4,
            my_completed: 8,
            my_involved: 15,
            my_created: 6,
            candidate: 1,
        };
        let json = serde_json::to_string(&stats).unwrap();
        let de: TaskStats = serde_json::from_str(&json).unwrap();
        assert_eq!(de.todo, 5);
        assert_eq!(de.done, 10);
        assert_eq!(de.candidate, 1);
    }

    #[test]
    fn test_workflow_category_serde() {
        let cat = WorkflowCategory {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            name: "财务类".to_string(),
            code: Some("finance".to_string()),
            description: Some("财务相关流程".to_string()),
            sort_order: Some(1),
            is_active: true,
            created_at: sample_time(),
        };
        let json = serde_json::to_string(&cat).unwrap();
        let de: WorkflowCategory = serde_json::from_str(&json).unwrap();
        assert_eq!(de.name, "财务类");
        assert!(de.is_active);
    }

    #[test]
    fn test_create_category_request() {
        let req = CreateCategoryRequest {
            name: "HR类".to_string(),
            code: Some("hr".to_string()),
            description: Some("人力资源流程".to_string()),
            sort_order: Some(2),
        };
        let json = serde_json::to_string(&req).unwrap();
        let de: CreateCategoryRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(de.code, Some("hr".to_string()));
    }

    #[test]
    fn test_workflow_delegate_serde() {
        let delegate = WorkflowDelegate {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            delegator_id: Uuid::new_v4(),
            delegator_name: Some("张三".to_string()),
            attorney_id: Uuid::new_v4(),
            attorney_name: Some("李四".to_string()),
            start_time: sample_time(),
            end_time: Some(sample_time()),
            workflow_ids: Some(serde_json::json!(["wf1", "wf2"])),
            reason: Some("出差期间委托".to_string()),
            is_active: true,
            created_at: sample_time(),
        };
        let json = serde_json::to_string(&delegate).unwrap();
        let de: WorkflowDelegate = serde_json::from_str(&json).unwrap();
        assert_eq!(de.delegator_name, Some("张三".to_string()));
        assert!(de.is_active);
    }

    #[test]
    fn test_create_delegate_request() {
        let req = CreateDelegateRequest {
            attorney_id: Uuid::new_v4(),
            attorney_name: Some("王五".to_string()),
            start_time: sample_time(),
            end_time: None,
            workflow_ids: Some(vec!["wf-uuid-1".to_string()]),
            reason: Some("休假".to_string()),
        };
        let json = serde_json::to_string(&req).unwrap();
        let de: CreateDelegateRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(de.reason, Some("休假".to_string()));
    }

    #[test]
    fn test_form_definition_and_instance() {
        let fd = FormDefinition {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            name: "请假单".to_string(),
            description: Some("员工请假申请单".to_string()),
            category: Some("hr".to_string()),
            fields: serde_json::json!([{"name": "days", "type": "number"}]),
            layout: Some(serde_json::json!({"rows": []})),
            is_active: true,
            version: Some("1.0".to_string()),
            created_by: Some(Uuid::new_v4()),
            created_at: sample_time(),
            updated_at: sample_time(),
        };
        let json = serde_json::to_string(&fd).unwrap();
        let de_fd: FormDefinition = serde_json::from_str(&json).unwrap();
        assert_eq!(de_fd.name, "请假单");
        assert!(de_fd.is_active);

        let fi = FormInstance {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            form_definition_id: fd.id,
            form_definition_name: Some("请假单".to_string()),
            workflow_instance_id: Some(Uuid::new_v4()),
            data: serde_json::json!({"days": 3, "reason": "病假"}),
            status: "submitted".to_string(),
            created_by: Some(Uuid::new_v4()),
            created_by_name: Some("员工A".to_string()),
            created_at: sample_time(),
            updated_at: sample_time(),
        };
        let json2 = serde_json::to_string(&fi).unwrap();
        let de_fi: FormInstance = serde_json::from_str(&json2).unwrap();
        assert_eq!(de_fi.status, "submitted");
    }

    #[test]
    fn test_create_form_requests() {
        let cfd = CreateFormDefinitionRequest {
            name: "报销单".to_string(),
            description: None,
            category: Some("finance".to_string()),
            fields: serde_json::json!([]),
            layout: None,
            is_active: Some(true),
        };
        let json = serde_json::to_string(&cfd).unwrap();
        let de: CreateFormDefinitionRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(de.name, "报销单");

        let cfi = CreateFormInstanceRequest {
            form_definition_id: Uuid::new_v4(),
            workflow_instance_id: None,
            data: serde_json::json!({"amount": 500}),
        };
        let json2 = serde_json::to_string(&cfi).unwrap();
        let de2: CreateFormInstanceRequest = serde_json::from_str(&json2).unwrap();
        assert!(de2.workflow_instance_id.is_none());
    }

    #[test]
    fn test_workflow_history_serde() {
        let h = WorkflowHistory {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            workflow_instance_id: Uuid::new_v4(),
            workflow_id: Some(Uuid::new_v4()),
            workflow_name: Some("报销流程".to_string()),
            action: "approve".to_string(),
            actor_id: Some(Uuid::new_v4()),
            actor_name: Some("主管A".to_string()),
            node_id: Some("node_1".to_string()),
            node_name: Some("部门主管审批".to_string()),
            status_before: Some("pending".to_string()),
            status_after: Some("approved".to_string()),
            comment: Some("同意".to_string()),
            data: Some(serde_json::json!({"action": "pass"})),
            created_at: sample_time(),
        };
        let json = serde_json::to_string(&h).unwrap();
        let de: WorkflowHistory = serde_json::from_str(&json).unwrap();
        assert_eq!(de.action, "approve");
        assert_eq!(de.actor_name, Some("主管A".to_string()));
    }

    #[test]
    fn test_workflow_setting_and_request() {
        let s = WorkflowSetting {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            key: "auto_approve_threshold".to_string(),
            value: "5000".to_string(),
            description: "自动审批金额阈值".to_string(),
            category: "approval".to_string(),
            created_at: sample_time(),
            updated_at: sample_time(),
        };
        let json = serde_json::to_string(&s).unwrap();
        let de: WorkflowSetting = serde_json::from_str(&json).unwrap();
        assert_eq!(de.key, "auto_approve_threshold");

        let csr = CreateSettingRequest {
            key: "max_file_size".to_string(),
            value: "10MB".to_string(),
            description: "附件最大大小".to_string(),
            category: "file".to_string(),
        };
        let json2 = serde_json::to_string(&csr).unwrap();
        let de2: CreateSettingRequest = serde_json::from_str(&json2).unwrap();
        assert_eq!(de2.category, "file");
    }

    #[test]
    fn test_workflow_template_serde() {
        let t = WorkflowTemplate {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            name: "标准报销模板".to_string(),
            description: Some("适用于日常费用报销".to_string()),
            template_type: Some("expense".to_string()),
            scope: Some("public".to_string()),
            definition: Some(serde_json::json!({"nodes": []})),
            usage_count: Some(120),
            is_active: Some(true),
            created_by: Some(Uuid::new_v4()),
            created_at: sample_time(),
            updated_at: sample_time(),
        };
        let json = serde_json::to_string(&t).unwrap();
        let de: WorkflowTemplate = serde_json::from_str(&json).unwrap();
        assert_eq!(de.usage_count, Some(120));
        assert_eq!(de.is_active, Some(true));
    }

    #[test]
    fn test_statistics_response() {
        let sr = StatisticsResponse {
            total_workflows: 25,
            active_workflows: 18,
            total_instances: 1200,
            running_instances: 85,
            completed_instances: 1050,
            rejected_instances: 65,
            total_approvals: 3500,
            pending_approvals: 120,
            approved_approvals: 3100,
            rejected_approvals: 280,
            avg_approval_time: 2.5,
            approval_rate: 0.8857,
            rejection_rate: 0.08,
            workflow_stats: vec![WorkflowStat {
                workflow_id: "wf1".to_string(),
                workflow_name: "报销".to_string(),
                instance_count: 500,
                completion_rate: 0.9,
                avg_duration: 1.5,
            }],
            monthly_data: vec![MonthlyData {
                month: "2024-01".to_string(),
                instances_started: 120,
                instances_completed: 100,
                approvals_processed: 350,
            }],
        };
        let json = serde_json::to_string(&sr).unwrap();
        let de: StatisticsResponse = serde_json::from_str(&json).unwrap();
        assert_eq!(de.total_workflows, 25);
        assert_eq!(de.approval_rate, 0.8857);
        assert_eq!(de.workflow_stats.len(), 1);
        assert_eq!(de.monthly_data[0].month, "2024-01");
    }

    #[test]
    fn test_process_log_serde() {
        let pl = ProcessLog {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            workflow_instance_id: Uuid::new_v4(),
            workflow_id: Some(Uuid::new_v4()),
            workflow_name: Some("采购".to_string()),
            node_id: Some("n1".to_string()),
            node_name: Some("开始".to_string()),
            action: "enter".to_string(),
            action_type: "system".to_string(),
            actor_id: None,
            actor_name: None,
            comment: None,
            data: Some(serde_json::json!({"step": 1})),
            duration: Some(500),
            created_at: sample_time(),
        };
        let json = serde_json::to_string(&pl).unwrap();
        let de: ProcessLog = serde_json::from_str(&json).unwrap();
        assert_eq!(de.action, "enter");
        assert_eq!(de.duration, Some(500));
    }

    #[test]
    fn test_workflow_rule_and_create_request() {
        let rule = WorkflowRule {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            name: "大额自动转上级".to_string(),
            rule_type: "escalation".to_string(),
            workflow_id: Some(Uuid::new_v4()),
            node_id: Some("n1".to_string()),
            condition: Some("amount > 10000".to_string()),
            action: Some(serde_json::json!({"target": "manager2"})),
            is_active: true,
            sort_order: Some(1),
            created_at: sample_time(),
            updated_at: sample_time(),
        };
        let json = serde_json::to_string(&rule).unwrap();
        let de: WorkflowRule = serde_json::from_str(&json).unwrap();
        assert_eq!(de.rule_type, "escalation");
        assert!(de.is_active);

        let crr = CreateRuleRequest {
            name: "超时提醒".to_string(),
            rule_type: "reminder".to_string(),
            workflow_id: None,
            node_id: None,
            condition: None,
            action: Some(serde_json::json!({"notify": true})),
            is_active: Some(false),
        };
        let json2 = serde_json::to_string(&crr).unwrap();
        let de2: CreateRuleRequest = serde_json::from_str(&json2).unwrap();
        assert_eq!(de2.rule_type, "reminder");
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, ToSchema)]
pub struct WorkflowVersion {
    pub id: Uuid,
    pub workflow_id: Uuid,
    pub version: String,
    pub definition: serde_json::Value,
    pub change_description: Option<String>,
    pub created_by: String,
    pub isactive: bool,
    pub created_at: DateTime<Utc>,
}
