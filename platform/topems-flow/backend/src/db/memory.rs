use crate::models::*;
use chrono::{DateTime, Duration, Utc};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use uuid::Uuid;

#[derive(Clone)]
pub struct MemoryWorkflowRepository {
    workflows: Arc<Mutex<HashMap<Uuid, Workflow>>>,
    instances: Arc<Mutex<HashMap<Uuid, WorkflowInstance>>>,
    approvals: Arc<Mutex<HashMap<Uuid, Approval>>>,
    records: Arc<Mutex<HashMap<Uuid, ApprovalRecord>>>,
    notifications: Arc<Mutex<HashMap<Uuid, Notification>>>,
}

impl MemoryWorkflowRepository {
    pub fn new() -> Self {
        let workflows = Self::create_sample_workflows();
        
        Self {
            workflows: Arc::new(Mutex::new(workflows)),
            instances: Arc::new(Mutex::new(HashMap::new())),
            approvals: Arc::new(Mutex::new(HashMap::new())),
            records: Arc::new(Mutex::new(HashMap::new())),
            notifications: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    fn create_sample_workflows() -> HashMap<Uuid, Workflow> {
        let mut workflows = HashMap::new();
        let now = Utc::now();

        let simple_approval = Workflow {
            id: Uuid::new_v4(),
            name: "简单审批流程".to_string(),
            description: Some("适用于日常事务的简单审批流程".to_string()),
            definition: serde_json::json!({
                "nodes": [
                    {"id": "start", "type": "start", "name": "开始"},
                    {"id": "approve", "type": "approval", "name": "主管审批", "assignee": "manager"},
                    {"id": "end", "type": "end", "name": "结束"}
                ],
                "edges": [["start", "approve"], ["approve", "end"]]
            }),
            is_active: true,
            created_by: None,
            created_at: now,
            updated_at: now,
        };
        workflows.insert(simple_approval.id, simple_approval);

        let multi_level_approval = Workflow {
            id: Uuid::new_v4(),
            name: "多级审批流程".to_string(),
            description: Some("需要多级审批的复杂流程".to_string()),
            definition: serde_json::json!({
                "nodes": [
                    {"id": "start", "type": "start", "name": "开始"},
                    {"id": "dept", "type": "approval", "name": "部门审批", "assignee": "department_head"},
                    {"id": "finance", "type": "approval", "name": "财务审批", "assignee": "finance"},
                    {"id": "end", "type": "end", "name": "结束"}
                ],
                "edges": [["start", "dept"], ["dept", "finance"], ["finance", "end"]]
            }),
            is_active: true,
            created_by: None,
            created_at: now,
            updated_at: now,
        };
        workflows.insert(multi_level_approval.id, multi_level_approval);

        let document_review = Workflow {
            id: Uuid::new_v4(),
            name: "文档审核流程".to_string(),
            description: Some("文档审核和发布流程".to_string()),
            definition: serde_json::json!({
                "nodes": [
                    {"id": "start", "type": "start", "name": "开始"},
                    {"id": "review", "type": "approval", "name": "内容审核", "assignee": "reviewer"},
                    {"id": "approve", "type": "approval", "name": "负责人审批", "assignee": "owner"},
                    {"id": "publish", "type": "action", "name": "发布文档"},
                    {"id": "end", "type": "end", "name": "结束"}
                ],
                "edges": [["start", "review"], ["review", "approve"], ["approve", "publish"], ["publish", "end"]]
            }),
            is_active: true,
            created_by: None,
            created_at: now,
            updated_at: now,
        };
        workflows.insert(document_review.id, document_review);

        workflows
    }

    pub async fn create_workflow(&self, req: CreateWorkflowRequest) -> Result<Workflow, sqlx::Error> {
        let now = Utc::now();
        let workflow = Workflow {
            id: Uuid::new_v4(),
            name: req.name,
            description: req.description,
            definition: req.definition,
            is_active: true,
            created_by: req.created_by,
            created_at: now,
            updated_at: now,
        };
        self.workflows.lock().unwrap().insert(workflow.id, workflow.clone());
        Ok(workflow)
    }

    pub async fn get_workflow(&self, id: Uuid) -> Result<Option<Workflow>, sqlx::Error> {
        Ok(self.workflows.lock().unwrap().get(&id).cloned())
    }

    pub async fn list_workflows(&self, is_active: Option<bool>, limit: i64, offset: i64) -> Result<Vec<Workflow>, sqlx::Error> {
        let workflows = self.workflows.lock().unwrap();
        let mut filtered: Vec<_> = workflows.values().cloned().collect();
        if let Some(active) = is_active {
            filtered.retain(|w| w.is_active == active);
        }
        filtered.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        let start = offset as usize;
        let end = std::cmp::min(start + limit as usize, filtered.len());
        Ok(filtered[start..end].to_vec())
    }

    pub async fn update_workflow(&self, id: Uuid, req: UpdateWorkflowRequest) -> Result<Option<Workflow>, sqlx::Error> {
        let mut workflows = self.workflows.lock().unwrap();
        if let Some(workflow) = workflows.get_mut(&id) {
            let new_name = req.name.unwrap_or_else(|| workflow.name.clone());
            let new_description = req.description.or_else(|| workflow.description.clone());
            let new_definition = req.definition.unwrap_or_else(|| workflow.definition.clone());
            let new_is_active = req.is_active.unwrap_or(workflow.is_active);
            let now = Utc::now();
            let updated = Workflow {
                id: workflow.id,
                name: new_name,
                description: new_description,
                definition: new_definition,
                is_active: new_is_active,
                created_by: workflow.created_by.clone(),
                created_at: workflow.created_at,
                updated_at: now,
            };
            workflows.insert(id, updated.clone());
            return Ok(Some(updated));
        }
        Ok(None)
    }

    pub async fn delete_workflow(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        Ok(self.workflows.lock().unwrap().remove(&id).is_some())
    }

    pub async fn create_instance(&self, req: CreateWorkflowInstanceRequest) -> Result<WorkflowInstance, sqlx::Error> {
        let now = Utc::now();
        let instance = WorkflowInstance {
            id: Uuid::new_v4(),
            workflow_id: Some(req.workflow_id),
            status: "pending".to_string(),
            current_node: None,
            initiator_id: req.initiator_id,
            data: req.data,
            started_at: None,
            completed_at: None,
            created_at: now,
        };
        self.instances.lock().unwrap().insert(instance.id, instance.clone());
        Ok(instance)
    }

    pub async fn get_instance(&self, id: Uuid) -> Result<Option<WorkflowInstance>, sqlx::Error> {
        Ok(self.instances.lock().unwrap().get(&id).cloned())
    }

    pub async fn list_instances(&self, workflow_id: Option<Uuid>, status: Option<String>, initiator_id: Option<Uuid>, limit: i64, offset: i64) -> Result<Vec<WorkflowInstance>, sqlx::Error> {
        let instances = self.instances.lock().unwrap();
        let mut filtered: Vec<_> = instances.values().cloned().collect();
        
        if let Some(wf_id) = workflow_id {
            filtered.retain(|i| i.workflow_id == Some(wf_id));
        }
        if let Some(s) = status {
            filtered.retain(|i| i.status == s);
        }
        if let Some(init_id) = initiator_id {
            filtered.retain(|i| i.initiator_id == Some(init_id));
        }
        filtered.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        let start = offset as usize;
        let end = std::cmp::min(start + limit as usize, filtered.len());
        Ok(filtered[start..end].to_vec())
    }

    pub async fn update_instance(&self, id: Uuid, new_status: Option<String>, current_node: Option<String>, data: Option<Value>) -> Result<Option<WorkflowInstance>, sqlx::Error> {
        let mut instances = self.instances.lock().unwrap();
        if let Some(instance) = instances.get_mut(&id) {
            let new_s = new_status.unwrap_or_else(|| instance.status.clone());
            let new_cn = current_node.or_else(|| instance.current_node.clone());
            let new_d = data.or_else(|| instance.data.clone());
            let now = Utc::now();
            let started_at = if new_s == "running" && instance.started_at.is_none() {
                Some(now)
            } else {
                instance.started_at
            };
            let completed_at = if new_s == "completed" || new_s == "failed" || new_s == "cancelled" {
                Some(now)
            } else {
                instance.completed_at
            };
            let updated = WorkflowInstance {
                id,
                workflow_id: instance.workflow_id,
                status: new_s,
                current_node: new_cn,
                initiator_id: instance.initiator_id,
                data: new_d,
                started_at,
                completed_at,
                created_at: instance.created_at,
            };
            instances.insert(id, updated.clone());
            return Ok(Some(updated));
        }
        Ok(None)
    }

    pub async fn create_approval(&self, req: CreateApprovalRequest) -> Result<Approval, sqlx::Error> {
        let now = Utc::now();
        let timeout_at = req.timeout_hours.map(|h| now + Duration::hours(h as i64));
        let approval = Approval {
            id: Uuid::new_v4(),
            workflow_instance_id: Some(req.workflow_instance_id),
            node_id: req.node_id,
            task_name: req.task_name,
            assignee_id: req.assignee_id,
            status: "pending".to_string(),
            approval_type: req.approval_type,
            comment: None,
            approved_by: None,
            approved_at: None,
            timeout_at,
            created_at: now,
        };
        self.approvals.lock().unwrap().insert(approval.id, approval.clone());
        Ok(approval)
    }

    pub async fn get_approval(&self, id: Uuid) -> Result<Option<Approval>, sqlx::Error> {
        Ok(self.approvals.lock().unwrap().get(&id).cloned())
    }

    pub async fn list_approvals(&self, instance_id: Option<Uuid>, assignee_id: Option<Uuid>, status: Option<String>, limit: i64, offset: i64) -> Result<Vec<Approval>, sqlx::Error> {
        let approvals = self.approvals.lock().unwrap();
        let mut filtered: Vec<_> = approvals.values().cloned().collect();
        
        if let Some(inst_id) = instance_id {
            filtered.retain(|a| a.workflow_instance_id == Some(inst_id));
        }
        if let Some(ass_id) = assignee_id {
            filtered.retain(|a| a.assignee_id == Some(ass_id));
        }
        if let Some(s) = status {
            filtered.retain(|a| a.status == s);
        }
        filtered.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        let start = offset as usize;
        let end = std::cmp::min(start + limit as usize, filtered.len());
        Ok(filtered[start..end].to_vec())
    }

    pub async fn get_expired_approvals(&self) -> Result<Vec<Approval>, sqlx::Error> {
        let now = Utc::now();
        let approvals = self.approvals.lock().unwrap();
        Ok(approvals.values()
            .filter(|a| a.status == "pending" && a.timeout_at.is_some() && a.timeout_at.unwrap() < now)
            .cloned()
            .collect())
    }

    pub async fn update_approval(&self, id: Uuid, status: Option<String>, comment: Option<String>, assignee_id: Option<Uuid>, approved_by: Option<Uuid>, approved_at: Option<DateTime<Utc>>) -> Result<Option<Approval>, sqlx::Error> {
        let mut approvals = self.approvals.lock().unwrap();
        if let Some(approval) = approvals.get_mut(&id) {
            let new_status = status.unwrap_or_else(|| approval.status.clone());
            let new_comment = comment.or_else(|| approval.comment.clone());
            let new_assignee_id = assignee_id.or(approval.assignee_id);
            let new_approved_by = approved_by.or(approval.approved_by);
            let new_approved_at = approved_at.or(approval.approved_at);
            let updated = Approval {
                id,
                workflow_instance_id: approval.workflow_instance_id,
                node_id: approval.node_id.clone(),
                task_name: approval.task_name.clone(),
                assignee_id: new_assignee_id,
                status: new_status,
                approval_type: approval.approval_type.clone(),
                comment: new_comment,
                approved_by: new_approved_by,
                approved_at: new_approved_at,
                timeout_at: approval.timeout_at,
                created_at: approval.created_at,
            };
            approvals.insert(id, updated.clone());
            return Ok(Some(updated));
        }
        Ok(None)
    }

    pub async fn create_approval_record(&self, req: CreateApprovalRecordRequest) -> Result<ApprovalRecord, sqlx::Error> {
        let now = Utc::now();
        let record = ApprovalRecord {
            id: Uuid::new_v4(),
            approval_id: req.approval_id,
            action: req.action,
            actor_id: req.actor_id,
            actor_name: req.actor_name,
            comment: req.comment,
            previous_status: req.previous_status,
            new_status: req.new_status,
            created_at: now,
        };
        self.records.lock().unwrap().insert(record.id, record.clone());
        Ok(record)
    }

    pub async fn get_approval_records(&self, approval_id: Uuid) -> Result<Vec<ApprovalRecord>, sqlx::Error> {
        let records = self.records.lock().unwrap();
        let mut filtered: Vec<_> = records.values()
            .filter(|r| r.approval_id == approval_id)
            .cloned()
            .collect();
        filtered.sort_by(|a, b| a.created_at.cmp(&b.created_at));
        Ok(filtered)
    }

    pub async fn list_approval_records(&self, approval_id: Option<Uuid>, actor_id: Option<Uuid>, limit: i64, offset: i64) -> Result<Vec<ApprovalRecord>, sqlx::Error> {
        let records = self.records.lock().unwrap();
        let mut filtered: Vec<_> = records.values().cloned().collect();
        
        if let Some(appr_id) = approval_id {
            filtered.retain(|r| r.approval_id == appr_id);
        }
        if let Some(act_id) = actor_id {
            filtered.retain(|r| r.actor_id == act_id);
        }
        filtered.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        let start = offset as usize;
        let end = std::cmp::min(start + limit as usize, filtered.len());
        Ok(filtered[start..end].to_vec())
    }

    pub async fn get_approvals_by_instance(&self, instance_id: Uuid) -> Result<Vec<Approval>, sqlx::Error> {
        self.list_approvals(Some(instance_id), None, None, 100, 0).await
    }

    pub async fn create_notification(&self, req: CreateNotificationRequest) -> Result<Notification, sqlx::Error> {
        let now = Utc::now();
        let notification = Notification {
            id: Uuid::new_v4(),
            user_id: req.user_id,
            title: req.title,
            content: req.content,
            notification_type: req.notification_type,
            workflow_instance_id: req.workflow_instance_id,
            approval_id: req.approval_id,
            is_read: false,
            created_at: now,
        };
        self.notifications.lock().unwrap().insert(notification.id, notification.clone());
        Ok(notification)
    }

    pub async fn get_notifications_by_user(&self, user_id: Uuid, limit: i64, offset: i64) -> Result<Vec<Notification>, sqlx::Error> {
        let notifications = self.notifications.lock().unwrap();
        let mut filtered: Vec<_> = notifications.values()
            .filter(|n| n.user_id == Some(user_id))
            .cloned()
            .collect();
        filtered.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        let start = offset as usize;
        let end = std::cmp::min(start + limit as usize, filtered.len());
        Ok(filtered[start..end].to_vec())
    }

    pub async fn mark_notifications_as_read(&self, user_id: Uuid) -> Result<usize, sqlx::Error> {
        let mut notifications = self.notifications.lock().unwrap();
        let mut count = 0;
        let now = Utc::now();
        for notification in notifications.values_mut() {
            if notification.user_id == Some(user_id) && !notification.is_read {
                notification.is_read = true;
                count += 1;
            }
        }
        Ok(count)
    }

    pub async fn get_unread_count(&self, user_id: Uuid) -> Result<i64, sqlx::Error> {
        let notifications = self.notifications.lock().unwrap();
        Ok(notifications.values()
            .filter(|n| n.user_id == Some(user_id) && !n.is_read)
            .count() as i64)
    }

    pub async fn update_instance_status(
        &self,
        id: Uuid,
        req: crate::models::UpdateInstanceStatusRequest,
    ) -> Result<Option<WorkflowInstance>, sqlx::Error> {
        self.update_instance(id, Some(req.status), None, None).await
    }
}

impl Default for MemoryWorkflowRepository {
    fn default() -> Self {
        Self::new()
    }
}
