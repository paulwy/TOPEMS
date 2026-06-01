use crate::db::WorkflowRepository;
use crate::models::*;
use serde_json::Value;
use std::fmt;
use uuid::Uuid;

#[derive(Debug)]
pub enum WorkflowEngineError {
    WorkflowNotFound,
    WorkflowNotActive,
    InstanceNotFound,
    NodeNotFound(String),
    InvalidWorkflowDefinition(String),
    DatabaseError(sqlx::Error),
    ConditionFailed,
}

impl fmt::Display for WorkflowEngineError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            WorkflowEngineError::WorkflowNotFound => write!(f, "Workflow not found"),
            WorkflowEngineError::WorkflowNotActive => write!(f, "Workflow is not active"),
            WorkflowEngineError::InstanceNotFound => write!(f, "Workflow instance not found"),
            WorkflowEngineError::NodeNotFound(node_id) => write!(f, "Node not found: {}", node_id),
            WorkflowEngineError::InvalidWorkflowDefinition(msg) => write!(f, "Invalid workflow definition: {}", msg),
            WorkflowEngineError::DatabaseError(e) => write!(f, "Database error: {}", e),
            WorkflowEngineError::ConditionFailed => write!(f, "Condition check failed"),
        }
    }
}

impl From<sqlx::Error> for WorkflowEngineError {
    fn from(err: sqlx::Error) -> Self {
        WorkflowEngineError::DatabaseError(err)
    }
}

#[derive(Clone)]
pub struct WorkflowEngine {
    repo: WorkflowRepository,
}

impl WorkflowEngine {
    pub fn new(repo: WorkflowRepository) -> Self {
        Self { repo }
    }
    
    async fn get_workflow(&self, id: Uuid) -> Result<Option<Workflow>, sqlx::Error> {
        self.repo.get_workflow(id).await
    }
    
    async fn create_workflow(&self, req: CreateWorkflowRequest) -> Result<Workflow, sqlx::Error> {
        self.repo.create_workflow(req).await
    }
    
    async fn list_workflows(&self, is_active: Option<bool>, limit: i64, offset: i64) -> Result<PaginatedResult<Workflow>, sqlx::Error> {
        self.repo.list_workflows(is_active, limit, offset).await
    }
    
    async fn update_workflow(&self, id: Uuid, req: UpdateWorkflowRequest) -> Result<Option<Workflow>, sqlx::Error> {
        self.repo.update_workflow(id, req).await
    }
    
    async fn delete_workflow(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        self.repo.delete_workflow(id).await
    }
    
    async fn create_instance(&self, req: CreateWorkflowInstanceRequest) -> Result<WorkflowInstance, sqlx::Error> {
        self.repo.create_instance(req).await
    }
    
    async fn get_instance(&self, id: Uuid) -> Result<Option<WorkflowInstance>, sqlx::Error> {
        self.repo.get_instance(id).await
    }
    
    async fn list_instances(&self, workflow_id: Option<Uuid>, status: Option<String>, initiator_id: Option<Uuid>, limit: i64, offset: i64) -> Result<Vec<WorkflowInstance>, sqlx::Error> {
        self.repo.list_instances(workflow_id, status, initiator_id, limit, offset).await
    }
    
    async fn update_instance(&self, id: Uuid, status: Option<String>, current_node: Option<String>, data: Option<Value>) -> Result<Option<WorkflowInstance>, sqlx::Error> {
        self.repo.update_instance(id, status, current_node, data).await
    }
    
    async fn create_approval(&self, req: CreateApprovalRequest) -> Result<Approval, sqlx::Error> {
        self.repo.create_approval(req).await
    }
    
    async fn get_approval(&self, id: Uuid) -> Result<Option<Approval>, sqlx::Error> {
        self.repo.get_approval(id).await
    }
    
    async fn list_approvals(&self, instance_id: Option<Uuid>, assignee_id: Option<Uuid>, status: Option<String>, limit: i64, offset: i64) -> Result<Vec<Approval>, sqlx::Error> {
        self.repo.list_approvals(instance_id, assignee_id, status, limit, offset).await
    }
    
    async fn get_approvals_by_instance(&self, id: Uuid) -> Result<Vec<Approval>, sqlx::Error> {
        self.repo.get_approvals_by_instance(id).await
    }
    
    async fn get_approval_records(&self, id: Uuid) -> Result<Vec<ApprovalRecord>, sqlx::Error> {
        self.repo.get_approval_records(id).await
    }
    
    async fn list_approval_records(&self, approval_id: Option<Uuid>, actor_id: Option<Uuid>, limit: i64, offset: i64) -> Result<Vec<ApprovalRecord>, sqlx::Error> {
        self.repo.list_approval_records(approval_id, actor_id, limit, offset).await
    }
    
    async fn create_notification(&self, req: CreateNotificationRequest) -> Result<Notification, sqlx::Error> {
        self.repo.create_notification(req).await
    }
    
    async fn get_notifications_by_user(&self, id: Uuid, limit: i64, offset: i64) -> Result<Vec<Notification>, sqlx::Error> {
        self.repo.get_notifications_by_user(id, limit, offset).await
    }
    
    async fn mark_notifications_as_read(&self, id: Uuid) -> Result<usize, sqlx::Error> {
        self.repo.mark_notifications_as_read(id).await
    }
    
    async fn get_unread_count(&self, id: Uuid) -> Result<i64, sqlx::Error> {
        self.repo.get_unread_count(id).await
    }
    
    async fn get_expired_approvals(&self) -> Result<Vec<Approval>, sqlx::Error> {
        self.repo.get_expired_approvals().await
    }

    pub async fn start_workflow_instance(
        &self,
        workflow_id: Uuid,
        initiator_id: Option<Uuid>,
        data: Option<Value>,
    ) -> Result<WorkflowInstance, WorkflowEngineError> {
        let workflow = self.get_workflow(workflow_id).await?;
        let workflow = workflow.ok_or(WorkflowEngineError::WorkflowNotFound)?;

        if !workflow.is_active {
            return Err(WorkflowEngineError::WorkflowNotActive);
        }

        let definition: WorkflowDefinition = serde_json::from_value(workflow.definition.clone())
            .map_err(|e| WorkflowEngineError::InvalidWorkflowDefinition(e.to_string()))?;

        let mut instance = self
            .create_instance(CreateWorkflowInstanceRequest {
                workflow_id,
                initiator_id,
                data,
            })
            .await?;

        instance = self
            .move_to_next_node(&mut instance, &definition, &definition.start_node)
            .await?;

        Ok(instance)
    }

    pub async fn process_approval(
        &self,
        approval_id: Uuid,
        req: ProcessApprovalRequest,
    ) -> Result<(Approval, Option<WorkflowInstance>), WorkflowEngineError> {
        let approval = self
            .repo.process_approval(approval_id, req.clone())
            .await?;
        let approval = approval.ok_or(WorkflowEngineError::InstanceNotFound)?;

        let instance_id = approval.workflow_instance_id.ok_or(WorkflowEngineError::InstanceNotFound)?;
        let mut instance = self
            .get_instance(instance_id)
            .await?
            .ok_or(WorkflowEngineError::InstanceNotFound)?;

        let workflow_id = instance.workflow_id.ok_or(WorkflowEngineError::WorkflowNotFound)?;
        let workflow = self
            .get_workflow(workflow_id)
            .await?
            .ok_or(WorkflowEngineError::WorkflowNotFound)?;

        let definition: WorkflowDefinition = serde_json::from_value(workflow.definition.clone())
            .map_err(|e| WorkflowEngineError::InvalidWorkflowDefinition(e.to_string()))?;

        if req.action == "approve" {
            let approvals = self.get_approvals_by_instance(instance_id).await?;
            if let Some(current_node_id) = &instance.current_node {
                let current_node = definition
                    .nodes
                    .iter()
                    .find(|n| &n.node_id == current_node_id)
                    .ok_or(WorkflowEngineError::NodeNotFound(current_node_id.clone()))?;

                if self.can_proceed_past_node(&approvals, current_node) {
                    let next_node = self.get_next_node(&instance, &definition, current_node_id);
                    if let Some(next_node_id) = next_node {
                        instance = self
                            .move_to_next_node(&mut instance, &definition, &next_node_id)
                            .await?;
                    } else {
                        instance = self
                            .update_instance(
                                instance.id,
                                Some("completed".to_string()),
                                None,
                                None,
                            )
                            .await?
                            .ok_or(WorkflowEngineError::InstanceNotFound)?;
                    }
                }
            }
        } else if req.action == "reject" {
            instance = self
                .update_instance(instance.id, Some("rejected".to_string()), None, None)
                .await?
                .ok_or(WorkflowEngineError::InstanceNotFound)?;
        }

        Ok((approval, Some(instance)))
    }

    async fn move_to_next_node(
        &self,
        instance: &mut WorkflowInstance,
        definition: &WorkflowDefinition,
        node_id: &str,
    ) -> Result<WorkflowInstance, WorkflowEngineError> {
        let mut current_node_id = node_id.to_string();

        loop {
            let node = definition
                .nodes
                .iter()
                .find(|n| n.node_id == current_node_id)
                .ok_or(WorkflowEngineError::NodeNotFound(current_node_id.clone()))?;

            if !self.check_conditions(&instance.data, &node.conditions) {
                return Err(WorkflowEngineError::ConditionFailed);
            }

            let is_end_node = definition.end_nodes.contains(&current_node_id);
            if is_end_node {
                return self
                    .update_instance(
                        instance.id,
                        Some("completed".to_string()),
                        Some(current_node_id),
                        None,
                    )
                    .await?
                    .ok_or(WorkflowEngineError::InstanceNotFound);
            }

            let updated_instance = self
                .update_instance(
                    instance.id,
                    Some("running".to_string()),
                    Some(current_node_id.clone()),
                    None,
                )
                .await?
                .ok_or(WorkflowEngineError::InstanceNotFound)?;

            *instance = updated_instance;

            let approvals = self.create_approvals_for_node(instance, node).await?;

            if approvals.is_empty() && !node.approvers.is_empty() {
                return Err(WorkflowEngineError::InvalidWorkflowDefinition(
                    "No valid approvers found for node".to_string()),
                );
            }

            if !approvals.is_empty() || node.approvers.is_empty() && self.get_next_node(instance, definition, &current_node_id).is_none() {
                if approvals.is_empty() && node.approvers.is_empty() {
                    return self
                        .update_instance(
                            instance.id,
                            Some("completed".to_string()),
                            Some(current_node_id),
                            None,
                        )
                        .await?
                        .ok_or(WorkflowEngineError::InstanceNotFound);
                }
                return Ok(instance.clone());
            }

            if let Some(next_node_id) = self.get_next_node(instance, definition, &current_node_id) {
                current_node_id = next_node_id;
            } else {
                return self
                    .update_instance(
                        instance.id,
                        Some("completed".to_string()),
                        Some(current_node_id),
                        None,
                    )
                    .await?
                    .ok_or(WorkflowEngineError::InstanceNotFound);
            }
        }
    }

    async fn create_approvals_for_node(
        &self,
        instance: &WorkflowInstance,
        node: &ApprovalNode,
    ) -> Result<Vec<Approval>, WorkflowEngineError> {
        let mut approvals = Vec::new();

        for approver_str in &node.approvers {
            if let Ok(approver_id) = Uuid::parse_str(approver_str) {
                let approval = self
                    .create_approval(CreateApprovalRequest {
                        workflow_instance_id: instance.id,
                        node_id: Some(node.node_id.clone()),
                        task_name: node.name.clone(),
                        assignee_id: Some(approver_id),
                        approval_type: Some(serde_json::to_string(&node.approval_type).unwrap_or_else(|_| "single".to_string())),
                        timeout_hours: node.timeout_hours,
                    })
                    .await?;
                approvals.push(approval);
            }
        }

        Ok(approvals)
    }

    fn check_conditions(
        &self,
        instance_data: &Option<Value>,
        conditions: &Option<Vec<Condition>>,
    ) -> bool {
        let conditions = match conditions {
            Some(c) => c,
            None => return true,
        };

        let data = match instance_data {
            Some(d) => d,
            None => return true,
        };

        for condition in conditions {
            let field_value = data.get(&condition.field);
            let field_value_str = match field_value {
                Some(Value::String(s)) => s.clone(),
                Some(v) => v.to_string(),
                None => return false,
            };

            let condition_value_str = match &condition.value {
                Value::String(s) => s.clone(),
                v => v.to_string(),
            };

            let result = match condition.operator.as_str() {
                "eq" | "=" | "==" => field_value_str == condition_value_str,
                "ne" | "!=" => field_value_str != condition_value_str,
                "gt" | ">" => {
                    field_value_str.parse::<f64>().unwrap_or(0.0)
                        > condition_value_str.parse::<f64>().unwrap_or(0.0)
                }
                "gte" | ">=" => {
                    field_value_str.parse::<f64>().unwrap_or(0.0)
                        >= condition_value_str.parse::<f64>().unwrap_or(0.0)
                }
                "lt" | "<" => {
                    field_value_str.parse::<f64>().unwrap_or(0.0)
                        < condition_value_str.parse::<f64>().unwrap_or(0.0)
                }
                "lte" | "<=" => {
                    field_value_str.parse::<f64>().unwrap_or(0.0)
                        <= condition_value_str.parse::<f64>().unwrap_or(0.0)
                }
                "contains" => field_value_str.contains(&condition_value_str),
                "in" => {
                    if let Ok(values) = serde_json::from_value::<Vec<String>>(condition.value.clone()) {
                        values.contains(&field_value_str)
                    } else {
                        false
                    }
                }
                _ => false,
            };

            if !result {
                return false;
            }
        }

        true
    }

    fn can_proceed_past_node(&self, approvals: &[Approval], node: &ApprovalNode) -> bool {
        let node_approvals: Vec<_> = approvals
            .iter()
            .filter(|a| a.node_id.as_ref() == Some(&node.node_id))
            .collect();

        match node.approval_type {
            ApprovalType::Single => {
                node_approvals.iter().any(|a| a.status == "approved")
            }
            ApprovalType::Counter => {
                let approved_count = node_approvals
                    .iter()
                    .filter(|a| a.status == "approved")
                    .count();
                approved_count >= (node.approvers.len() + 1) / 2
            }
            ApprovalType::Or => {
                node_approvals.iter().any(|a| a.status == "approved")
            }
        }
    }

    fn get_next_node(
        &self,
        instance: &WorkflowInstance,
        definition: &WorkflowDefinition,
        current_node_id: &str,
    ) -> Option<String> {
        let current_node = definition.nodes.iter().find(|n| n.node_id == current_node_id)?;

        match &current_node.next_nodes {
            Some(next_nodes) => {
                if next_nodes.is_empty() {
                    return None;
                }
                for next_node_id in next_nodes {
                    if let Some(next_node) = definition.nodes.iter().find(|n| n.node_id == *next_node_id) {
                        if self.check_conditions(&instance.data, &next_node.conditions) {
                            return Some(next_node_id.clone());
                        }
                    }
                }
                None
            }
            None => {
                let current_index = definition
                    .nodes
                    .iter()
                    .position(|n| n.node_id == current_node_id)?;

                for i in (current_index + 1)..definition.nodes.len() {
                    let next_node = &definition.nodes[i];
                    if self.check_conditions(&instance.data, &next_node.conditions) {
                        return Some(next_node.node_id.clone());
                    }
                }
                None
            }
        }
    }

    pub async fn get_instance_details(
        &self,
        instance_id: Uuid,
    ) -> Result<(WorkflowInstance, Vec<Approval>, Vec<ApprovalRecord>), WorkflowEngineError> {
        let instance = self
            .get_instance(instance_id)
            .await?
            .ok_or(WorkflowEngineError::InstanceNotFound)?;

        let approvals = self.get_approvals_by_instance(instance_id).await?;

        let mut records = Vec::new();
        for approval in &approvals {
            let mut approval_records = self.get_approval_records(approval.id).await?;
            records.append(&mut approval_records);
        }

        Ok((instance, approvals, records))
    }

    pub async fn process_expired_approvals(&self) -> Result<usize, WorkflowEngineError> {
        let expired_approvals = self.get_expired_approvals().await?;
        let mut processed_count = 0;

        for approval in expired_approvals {
            let instance_id = match approval.workflow_instance_id {
                Some(id) => id,
                None => continue,
            };

            let instance = match self.get_instance(instance_id).await? {
                Some(inst) => inst,
                None => continue,
            };

            let workflow = match self.get_workflow(instance.workflow_id.unwrap()).await? {
                Some(wf) => wf,
                None => continue,
            };

            let definition: WorkflowDefinition = match serde_json::from_value(workflow.definition) {
                Ok(def) => def,
                Err(_) => continue,
            };

            let timeout_action = match definition.timeout_action.as_deref() {
                Some("reject") => "reject",
                Some("approve") => "approve",
                _ => "reject",
            };

            let req = ProcessApprovalRequest {
                action: timeout_action.to_string(),
                comment: Some("审批超时自动处理".to_string()),
                actor_id: Uuid::nil(),
                actor_name: Some("system".to_string()),
                delegate_to: None,
                delegate_to_name: None,
            };

            if let Ok(_) = self.process_approval(approval.id, req).await {
                processed_count += 1;
            }
        }

        Ok(processed_count)
    }
}
