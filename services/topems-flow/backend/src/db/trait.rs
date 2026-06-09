use crate::models::*;
use uuid::Uuid;

#[async_trait::async_trait]
pub trait WorkflowStorage {
    async fn create_workflow(&self, req: CreateWorkflowRequest) -> Result<Workflow, String>;
    async fn get_workflow(&self, id: Uuid) -> Result<Option<Workflow>, String>;
    async fn list_workflows(&self, is_active: Option<bool>, limit: i64, offset: i64) -> Result<PaginatedResult<Workflow>, String>;
    async fn update_workflow(&self, id: Uuid, req: UpdateWorkflowRequest) -> Result<Option<Workflow>, String>;
    async fn delete_workflow(&self, id: Uuid) -> Result<bool, String>;
    
    async fn create_instance(&self, req: CreateInstanceRequest) -> Result<WorkflowInstance, String>;
    async fn get_instance(&self, id: Uuid) -> Result<Option<WorkflowInstance>, String>;
    async fn list_instances(&self, workflow_id: Option<Uuid>, status: Option<String>, limit: i64, offset: i64) -> Result<PaginatedResult<WorkflowInstance>, String>;
    
    async fn create_approval(&self, req: CreateApprovalRequest) -> Result<ApprovalRecord, String>;
    async fn get_approval(&self, id: Uuid) -> Result<Option<ApprovalRecord>, String>;
    async fn list_approvals(&self, instance_id: Option<Uuid>, assignee: Option<String>, status: Option<String>, limit: i64, offset: i64) -> Result<PaginatedResult<ApprovalRecord>, String>;
    async fn process_approval(&self, id: Uuid, req: ProcessApprovalRequest) -> Result<Option<ApprovalRecord>, String>;
    
    async fn list_records(&self, approval_id: Option<Uuid>, limit: i64, offset: i64) -> Result<PaginatedResult<ApprovalRecord>, String>;
}
