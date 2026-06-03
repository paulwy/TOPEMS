use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::{Serialize, Deserialize};
use serde_json::Value;
use uuid::Uuid;

use crate::api::response::ApiResponse;
use crate::state::AppState;
use crate::models::*;

#[derive(Debug, Deserialize)]
pub struct TriggerWorkflowRequest {
    pub workflow_id: Uuid,
    pub initiator_id: Option<String>,
    pub business_key: Option<String>,
    pub data: Option<Value>,
    pub callback_url: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct TriggerWorkflowResponse {
    pub instance_id: Uuid,
    pub workflow_id: Uuid,
    pub status: String,
    pub message: String,
}

#[derive(Debug, Deserialize)]
pub struct GetPendingApprovalsRequest {
    pub user_id: String,
    pub service: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PendingApproval {
    pub approval_id: Uuid,
    pub instance_id: Uuid,
    pub workflow_name: String,
    pub task_name: String,
    pub business_key: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub deadline: Option<chrono::DateTime<chrono::Utc>>,
    pub priority: String,
}

#[derive(Debug, Deserialize)]
pub struct SubmitApprovalRequest {
    pub approval_id: Uuid,
    pub action: String,
    pub comment: Option<String>,
    pub actor_id: String,
    pub actor_name: String,
}

#[derive(Debug, Serialize)]
pub struct ApprovalResult {
    pub approval_id: Uuid,
    pub status: String,
    pub instance_status: Option<String>,
    pub message: String,
}

#[derive(Debug, Deserialize)]
pub struct QueryInstanceRequest {
    pub instance_id: Option<Uuid>,
    pub business_key: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct InstanceDetail {
    pub instance: WorkflowInstance,
    pub approvals: Vec<Approval>,
    pub records: Vec<ApprovalRecord>,
    pub workflow_name: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct WorkflowDefinitionSummary {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub is_active: bool,
}

pub async fn trigger_workflow(
    State(state): State<AppState>,
    Json(req): Json<TriggerWorkflowRequest>,
) -> (StatusCode, Json<ApiResponse<TriggerWorkflowResponse>>) {
    let initiator_uuid = req.initiator_id
        .as_ref()
        .and_then(|id| Uuid::parse_str(id).ok());

    match state.engine.start_workflow_instance(req.workflow_id, initiator_uuid, req.data).await {
        Ok(instance) => {
            let response = TriggerWorkflowResponse {
                instance_id: instance.id,
                workflow_id: req.workflow_id,
                status: instance.status,
                message: "Workflow started successfully".to_string(),
            };
            (
                StatusCode::CREATED,
                Json(ApiResponse::success(response)),
            )
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::error(e.to_string())),
        ),
    }
}

pub async fn get_pending_approvals(
    State(state): State<AppState>,
    Json(req): Json<GetPendingApprovalsRequest>,
) -> (StatusCode, Json<ApiResponse<Vec<PendingApproval>>) {
    let user_id = match Uuid::parse_str(&req.user_id) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(ApiResponse::error("Invalid user_id format".to_string())),
            );
        }
    };

    match state.repo.list_approvals(None, Some(user_id), Some("pending".to_string()), 100, 0).await {
        Ok(approvals) => {
            let pending_approvals: Vec<PendingApproval> = approvals
                .into_iter()
                .map(|a| PendingApproval {
                    approval_id: a.id,
                    instance_id: a.workflow_instance_id.unwrap_or_default(),
                    workflow_name: "Workflow".to_string(),
                    task_name: a.task_name,
                    business_key: None,
                    created_at: a.created_at,
                    deadline: a.deadline,
                    priority: a.priority.unwrap_or("normal".to_string()),
                })
                .collect();
            (
                StatusCode::OK,
                Json(ApiResponse::success(pending_approvals)),
            )
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::error(e.to_string())),
        ),
    }
}

pub async fn submit_approval(
    State(state): State<AppState>,
    Json(req): Json<SubmitApprovalRequest>,
) -> (StatusCode, Json<ApiResponse<ApprovalResult>>) {
    let actor_uuid = match Uuid::parse_str(&req.actor_id) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(ApiResponse::error("Invalid actor_id format".to_string())),
            );
        }
    };

    let process_req = ProcessApprovalRequest {
        action: req.action,
        comment: req.comment,
        actor_id: actor_uuid,
        actor_name: Some(req.actor_name),
        delegate_to: None,
        delegate_to_name: None,
    };

    match state.engine.process_approval(req.approval_id, process_req).await {
        Ok((approval, instance)) => {
            let result = ApprovalResult {
                approval_id: approval.id,
                status: approval.status,
                instance_status: instance.map(|i| i.status),
                message: format!("Approval {} successfully", approval.status),
            };
            (
                StatusCode::OK,
                Json(ApiResponse::success(result)),
            )
        }
        Err(e) => {
            let status_code = if matches!(e, crate::services::WorkflowEngineError::InstanceNotFound) {
                StatusCode::NOT_FOUND
            } else {
                StatusCode::INTERNAL_SERVER_ERROR
            };
            (
                status_code,
                Json(ApiResponse::error(e.to_string())),
            )
        }
    }
}

pub async fn get_instance_details(
    State(state): State<AppState>,
    Path(instance_id): Path<Uuid>,
) -> (StatusCode, Json<ApiResponse<InstanceDetail>>) {
    match state.engine.get_instance_details(instance_id).await {
        Ok((instance, approvals, records)) => {
            let workflow_name = if let Some(wf_id) = instance.workflow_id {
                state.repo.get_workflow(wf_id).await.ok().flatten().map(|w| w.name)
            } else {
                None
            };

            let detail = InstanceDetail {
                instance,
                approvals,
                records,
                workflow_name,
            };
            (
                StatusCode::OK,
                Json(ApiResponse::success(detail)),
            )
        }
        Err(e) => {
            let status_code = if matches!(e, crate::services::WorkflowEngineError::InstanceNotFound) {
                StatusCode::NOT_FOUND
            } else {
                StatusCode::INTERNAL_SERVER_ERROR
            };
            (
                status_code,
                Json(ApiResponse::error(e.to_string())),
            )
        }
    }
}

pub async fn query_instances(
    State(state): State<AppState>,
    Json(req): Json<QueryInstanceRequest>,
) -> (StatusCode, Json<ApiResponse<Vec<WorkflowInstance>>) {
    if let Some(instance_id) = req.instance_id {
        match state.repo.get_instance(instance_id).await {
            Ok(Some(instance)) => (
                StatusCode::OK,
                Json(ApiResponse::success(vec![instance])),
            ),
            Ok(None) => (
                StatusCode::NOT_FOUND,
                Json(ApiResponse::error("Instance not found".to_string())),
            ),
            Err(e) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(e.to_string())),
            ),
        }
    } else {
        match state.repo.list_instances(None, None, None, 100, 0).await {
            Ok(instances) => {
                let filtered = if let Some(bk) = &req.business_key {
                    instances.into_iter()
                        .filter(|i| {
                            i.data.as_ref().and_then(|d| d.get("business_key"))
                                .map(|k| k.as_str() == Some(bk))
                                .unwrap_or(false)
                        })
                        .collect()
                } else {
                    instances
                };
                (
                    StatusCode::OK,
                    Json(ApiResponse::success(filtered)),
                )
            }
            Err(e) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(e.to_string())),
            ),
        }
    }
}

pub async fn list_workflows(
    State(state): State<AppState>,
) -> (StatusCode, Json<ApiResponse<Vec<WorkflowDefinitionSummary>>) {
    match state.repo.list_workflows(Some(true), 100, 0).await {
        Ok(result) => {
            let summaries: Vec<WorkflowDefinitionSummary> = result.items
                .into_iter()
                .map(|w| WorkflowDefinitionSummary {
                    id: w.id,
                    name: w.name,
                    description: w.description,
                    category: w.category,
                    is_active: w.is_active,
                })
                .collect();
            (
                StatusCode::OK,
                Json(ApiResponse::success(summaries)),
            )
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::error(e.to_string())),
        ),
    }
}
