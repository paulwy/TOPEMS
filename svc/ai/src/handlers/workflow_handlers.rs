//! Workflow orchestration HTTP handlers
//!
//! Routes prefixed `/api/ai/workflows` (registered in routes.rs).
//! Exposes WorkflowOrchestrator: list predefined workflows + execute by ID.

use crate::services::agent::{WorkflowExecutionRequest, WorkflowOrchestrator};
use crate::shared::AppState;
use axum::extract::State;
use axum::http::StatusCode;
use axum::Json;
use std::sync::Arc;
use topems_shared_core::response::ApiResponse;

type ApiOk<T> = Json<ApiResponse<T>>;

/// GET /api/ai/workflows - list available predefined workflows
pub async fn list_workflows(State(state): State<AppState>) -> ApiOk<serde_json::Value> {
    let workflows = state.workflow_orchestrator.get_available_workflows();
    Json(ApiResponse::success(
        serde_json::json!({ "workflows": workflows, "count": workflows.len() }),
        "Workflows retrieved",
    ))
}

/// GET /api/ai/workflows/{workflow_id} - get workflow detail
pub async fn get_workflow(
    State(state): State<AppState>,
    axum::extract::Path(workflow_id): axum::extract::Path<String>,
) -> ApiOk<serde_json::Value> {
    match state.workflow_orchestrator.get_workflow(&workflow_id) {
        Some(w) => Json(ApiResponse::success(
            serde_json::json!({
                "id": w.id,
                "name": w.name,
                "description": w.description,
                "steps": w.steps.iter().map(|s| serde_json::json!({
                    "id": s.id,
                    "name": s.name,
                    "description": s.description,
                    "executor": s.executor,
                    "prompt": s.prompt,
                    "condition": s.condition,
                    "retry_count": s.retry_count,
                    "timeout_seconds": s.timeout_seconds,
                })).collect::<Vec<_>>(),
                "step_count": w.steps.len(),
                "max_parallel_steps": w.max_parallel_steps,
                "on_failure": w.on_failure,
            }),
            "Workflow detail",
        )),
        None => Json(ApiResponse::error(
            StatusCode::NOT_FOUND.as_u16(),
            &format!("Workflow not found: {}", workflow_id),
        )),
    }
}

/// POST /api/ai/workflows/execute - execute a workflow by ID
pub async fn execute_workflow(
    State(state): State<AppState>,
    Json(req): Json<WorkflowExecutionRequest>,
) -> ApiOk<serde_json::Value> {
    let orchestrator: Arc<WorkflowOrchestrator> = state.workflow_orchestrator.clone();
    match orchestrator.execute_workflow(req).await {
        Ok(resp) => Json(ApiResponse::success(
            serde_json::json!({
                "execution_id": resp.execution_id,
                "status": resp.status,
                "results": resp.results,
                "final_output": resp.final_output,
                "error": resp.error,
                "duration_ms": resp.duration_ms,
            }),
            "Workflow executed",
        )),
        Err(e) => Json(ApiResponse::error(
            StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
            &format!("Workflow execution failed: {}", e),
        )),
    }
}
