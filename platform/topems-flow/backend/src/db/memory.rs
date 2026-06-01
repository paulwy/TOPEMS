use crate::models::*;
use chrono::{DateTime, Utc};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use uuid::Uuid;

#[derive(Clone)]
pub struct MemoryRepository {
    workflows: Arc<Mutex<HashMap<Uuid, Workflow>>>,
    instances: Arc<Mutex<HashMap<Uuid, WorkflowInstance>>>,
    approvals: Arc<Mutex<HashMap<Uuid, ApprovalRecord>>>,
}

impl MemoryRepository {
    pub fn new() -> Self {
        let repo = Self {
            workflows: Arc::new(Mutex::new(HashMap::new())),
            instances: Arc::new(Mutex::new(HashMap::new())),
            approvals: Arc::new(Mutex::new(HashMap::new())),
        };
        repo.init_mock_data();
        repo
    }

    fn init_mock_data(&self) {
        let mut workflows = self.workflows.lock().unwrap();
        
        let mock_workflows = vec![
            Workflow {
                id: Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap(),
                name: "员工入职审批流程".to_string(),
                description: Some("新员工入职时需要完成的审批流程".to_string()),
                definition: serde_json::json!({
                    "version": "1.0",
                    "nodes": [
                        {"id": "start", "type": "start", "name": "开始"},
                        {"id": "manager_approval", "type": "approval", "name": "部门经理审批"},
                        {"id": "hr_approval", "type": "approval", "name": "HR审批"},
                        {"id": "end", "type": "end", "name": "结束"}
                    ],
                    "start_node": "start",
                    "end_nodes": ["end"]
                }),
                is_active: true,
                created_by: None,
                created_at: Utc::now() - chrono::Duration::days(7),
                updated_at: Utc::now() - chrono::Duration::days(1),
            },
            Workflow {
                id: Uuid::parse_str("550e8400-e29b-41d4-a716-446655440001").unwrap(),
                name: "采购申请流程".to_string(),
                description: Some("采购物品时需要完成的审批流程".to_string()),
                definition: serde_json::json!({
                    "version": "1.0",
                    "nodes": [
                        {"id": "start", "type": "start", "name": "开始"},
                        {"id": "dept_head", "type": "approval", "name": "部门负责人审批"},
                        {"id": "finance", "type": "approval", "name": "财务审核"},
                        {"id": "end", "type": "end", "name": "结束"}
                    ],
                    "start_node": "start",
                    "end_nodes": ["end"]
                }),
                is_active: true,
                created_by: None,
                created_at: Utc::now() - chrono::Duration::days(5),
                updated_at: Utc::now() - chrono::Duration::hours(2),
            },
            Workflow {
                id: Uuid::parse_str("550e8400-e29b-41d4-a716-446655440002").unwrap(),
                name: "请假申请流程".to_string(),
                description: Some("员工请假时需要完成的审批流程".to_string()),
                definition: serde_json::json!({
                    "version": "1.0",
                    "nodes": [
                        {"id": "start", "type": "start", "name": "开始"},
                        {"id": "team_lead", "type": "approval", "name": "组长审批"},
                        {"id": "manager", "type": "approval", "name": "经理审批"},
                        {"id": "end", "type": "end", "name": "结束"}
                    ],
                    "start_node": "start",
                    "end_nodes": ["end"]
                }),
                is_active: false,
                created_by: None,
                created_at: Utc::now() - chrono::Duration::days(10),
                updated_at: Utc::now() - chrono::Duration::days(3),
            },
            Workflow {
                id: Uuid::parse_str("550e8400-e29b-41d4-a716-446655440003").unwrap(),
                name: "报销申请流程".to_string(),
                description: Some("员工报销时需要完成的审批流程".to_string()),
                definition: serde_json::json!({
                    "version": "1.0",
                    "nodes": [
                        {"id": "start", "type": "start", "name": "开始"},
                        {"id": "supervisor", "type": "approval", "name": "主管审批"},
                        {"id": "finance", "type": "approval", "name": "财务审核"},
                        {"id": "end", "type": "end", "name": "结束"}
                    ],
                    "start_node": "start",
                    "end_nodes": ["end"]
                }),
                is_active: true,
                created_by: None,
                created_at: Utc::now() - chrono::Duration::days(3),
                updated_at: Utc::now(),
            },
            Workflow {
                id: Uuid::parse_str("550e8400-e29b-41d4-a716-446655440004").unwrap(),
                name: "离职申请流程".to_string(),
                description: Some("员工离职时需要完成的审批流程".to_string()),
                definition: serde_json::json!({
                    "version": "1.0",
                    "nodes": [
                        {"id": "start", "type": "start", "name": "开始"},
                        {"id": "manager", "type": "approval", "name": "直属经理审批"},
                        {"id": "hr", "type": "approval", "name": "HR审批"},
                        {"id": "finance", "type": "approval", "name": "财务结算"},
                        {"id": "end", "type": "end", "name": "结束"}
                    ],
                    "start_node": "start",
                    "end_nodes": ["end"]
                }),
                is_active: true,
                created_by: None,
                created_at: Utc::now() - chrono::Duration::days(2),
                updated_at: Utc::now(),
            },
        ];

        for wf in mock_workflows {
            workflows.insert(wf.id, wf);
        }

        let mut instances = self.instances.lock().unwrap();
        let mock_instances = vec![
            WorkflowInstance {
                id: Uuid::parse_str("660e8400-e29b-41d4-a716-446655440001").unwrap(),
                workflow_id: Some(Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap()),
                status: "running".to_string(),
                current_node: Some("manager_approval".to_string()),
                initiator_id: None,
                data: None,
                started_at: Some(Utc::now() - chrono::Duration::hours(5)),
                completed_at: None,
                created_at: Utc::now() - chrono::Duration::hours(5),
            },
            WorkflowInstance {
                id: Uuid::parse_str("660e8400-e29b-41d4-a716-446655440002").unwrap(),
                workflow_id: Some(Uuid::parse_str("550e8400-e29b-41d4-a716-446655440001").unwrap()),
                status: "completed".to_string(),
                current_node: Some("end".to_string()),
                initiator_id: None,
                data: None,
                started_at: Some(Utc::now() - chrono::Duration::days(2)),
                completed_at: Some(Utc::now() - chrono::Duration::days(1)),
                created_at: Utc::now() - chrono::Duration::days(2),
            },
            WorkflowInstance {
                id: Uuid::parse_str("660e8400-e29b-41d4-a716-446655440003").unwrap(),
                workflow_id: Some(Uuid::parse_str("550e8400-e29b-41d4-a716-446655440003").unwrap()),
                status: "running".to_string(),
                current_node: Some("supervisor".to_string()),
                initiator_id: None,
                data: None,
                started_at: Some(Utc::now() - chrono::Duration::hours(3)),
                completed_at: None,
                created_at: Utc::now() - chrono::Duration::hours(3),
            },
        ];

        for inst in mock_instances {
            instances.insert(inst.id, inst);
        }

        let mut approvals = self.approvals.lock().unwrap();
        let mock_approvals = vec![
            ApprovalRecord {
                id: Uuid::parse_str("770e8400-e29b-41d4-a716-446655440001").unwrap(),
                approval_id: Uuid::parse_str("880e8400-e29b-41d4-a716-446655440001").unwrap(),
                action: "create".to_string(),
                actor_id: Uuid::parse_str("990e8400-e29b-41d4-a716-446655440001").unwrap(),
                actor_name: Some("zhangsan".to_string()),
                comment: None,
                previous_status: "created".to_string(),
                new_status: "pending".to_string(),
                created_at: Utc::now() - chrono::Duration::hours(5),
            },
            ApprovalRecord {
                id: Uuid::parse_str("770e8400-e29b-41d4-a716-446655440002").unwrap(),
                approval_id: Uuid::parse_str("880e8400-e29b-41d4-a716-446655440002").unwrap(),
                action: "approve".to_string(),
                actor_id: Uuid::parse_str("990e8400-e29b-41d4-a716-446655440002").unwrap(),
                actor_name: Some("manager002".to_string()),
                comment: Some("同意采购".to_string()),
                previous_status: "pending".to_string(),
                new_status: "approved".to_string(),
                created_at: Utc::now() - chrono::Duration::days(2),
            },
            ApprovalRecord {
                id: Uuid::parse_str("770e8400-e29b-41d4-a716-446655440003").unwrap(),
                approval_id: Uuid::parse_str("880e8400-e29b-41d4-a716-446655440003").unwrap(),
                action: "create".to_string(),
                actor_id: Uuid::parse_str("990e8400-e29b-41d4-a716-446655440003").unwrap(),
                actor_name: Some("wangwu".to_string()),
                comment: None,
                previous_status: "created".to_string(),
                new_status: "pending".to_string(),
                created_at: Utc::now() - chrono::Duration::hours(3),
            },
        ];

        for approval in mock_approvals {
            approvals.insert(approval.id, approval);
        }
    }

    pub async fn create_workflow(&self, req: CreateWorkflowRequest) -> Result<Workflow, String> {
        let now = Utc::now();
        let definition = req.definition.unwrap_or(serde_json::json!({
            "version": "1.0",
            "nodes": [],
            "start_node": "",
            "end_nodes": []
        }));
        let workflow = Workflow {
            id: Uuid::new_v4(),
            name: req.name,
            description: req.description,
            definition,
            is_active: true,
            created_by: req.created_by,
            created_at: now,
            updated_at: now,
        };
        self.workflows.lock().unwrap().insert(workflow.id, workflow.clone());
        Ok(workflow)
    }

    pub async fn get_workflow(&self, id: Uuid) -> Result<Option<Workflow>, String> {
        Ok(self.workflows.lock().unwrap().get(&id).cloned())
    }

    pub async fn list_workflows(&self, is_active: Option<bool>, limit: i64, offset: i64) -> Result<PaginatedResult<Workflow>, String> {
        let workflows: Vec<Workflow> = self.workflows.lock().unwrap()
            .values()
            .filter(|w| is_active.map(|a| w.is_active == a).unwrap_or(true))
            .cloned()
            .collect();
        
        let total = workflows.len() as i64;
        let items: Vec<Workflow> = workflows
            .into_iter()
            .skip(offset as usize)
            .take(limit as usize)
            .collect();
        
        Ok(PaginatedResult {
            items,
            total,
            page: (offset / limit) + 1,
            page_size: limit,
        })
    }

    pub async fn update_workflow(&self, id: Uuid, req: UpdateWorkflowRequest) -> Result<Option<Workflow>, String> {
        let mut workflows = self.workflows.lock().unwrap();
        if let Some(mut workflow) = workflows.get_mut(&id) {
            if let Some(name) = req.name {
                workflow.name = name;
            }
            if let Some(description) = req.description {
                workflow.description = Some(description);
            }
            if let Some(is_active) = req.is_active {
                workflow.is_active = is_active;
            }
            if let Some(definition) = req.definition {
                workflow.definition = definition;
            }
            workflow.updated_at = Utc::now();
            Ok(Some(workflow.clone()))
        } else {
            Ok(None)
        }
    }

    pub async fn delete_workflow(&self, id: Uuid) -> Result<bool, String> {
        Ok(self.workflows.lock().unwrap().remove(&id).is_some())
    }

    pub async fn create_instance(&self, req: CreateWorkflowInstanceRequest) -> Result<WorkflowInstance, String> {
        let now = Utc::now();
        let instance = WorkflowInstance {
            id: Uuid::new_v4(),
            workflow_id: Some(req.workflow_id),
            status: "running".to_string(),
            current_node: Some("start".to_string()),
            initiator_id: req.initiator_id,
            data: req.data,
            started_at: Some(now),
            completed_at: None,
            created_at: now,
        };
        self.instances.lock().unwrap().insert(instance.id, instance.clone());
        Ok(instance)
    }

    pub async fn get_instance(&self, id: Uuid) -> Result<Option<WorkflowInstance>, String> {
        Ok(self.instances.lock().unwrap().get(&id).cloned())
    }

    pub async fn list_instances(&self, workflow_id: Option<Uuid>, status: Option<String>, limit: i64, offset: i64) -> Result<PaginatedResult<WorkflowInstance>, String> {
        let instances: Vec<WorkflowInstance> = self.instances.lock().unwrap()
            .values()
            .filter(|i| workflow_id.map(|w| i.workflow_id == Some(w)).unwrap_or(true))
            .filter(|i| status.as_ref().map(|s| i.status == *s).unwrap_or(true))
            .cloned()
            .collect();
        
        let total = instances.len() as i64;
        let items: Vec<WorkflowInstance> = instances
            .into_iter()
            .skip(offset as usize)
            .take(limit as usize)
            .collect();
        
        Ok(PaginatedResult {
            items,
            total,
            page: (offset / limit) + 1,
            page_size: limit,
        })
    }

    pub async fn create_approval_record(&self, req: CreateApprovalRecordRequest) -> Result<ApprovalRecord, String> {
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
        self.approvals.lock().unwrap().insert(record.id, record.clone());
        Ok(record)
    }

    pub async fn get_approval_record(&self, id: Uuid) -> Result<Option<ApprovalRecord>, String> {
        Ok(self.approvals.lock().unwrap().get(&id).cloned())
    }

    pub async fn list_approval_records(&self, approval_id: Option<Uuid>, limit: i64, offset: i64) -> Result<PaginatedResult<ApprovalRecord>, String> {
        let records: Vec<ApprovalRecord> = self.approvals.lock().unwrap()
            .values()
            .filter(|a| approval_id.map(|i| a.approval_id == i).unwrap_or(true))
            .cloned()
            .collect();
        
        let total = records.len() as i64;
        let items: Vec<ApprovalRecord> = records
            .into_iter()
            .skip(offset as usize)
            .take(limit as usize)
            .collect();
        
        Ok(PaginatedResult {
            items,
            total,
            page: (offset / limit) + 1,
            page_size: limit,
        })
    }
}