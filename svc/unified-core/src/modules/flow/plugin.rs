//! Workflow plugin module
//!
//! Provides plugin info and routes for the workflow module

use axum::{
    extract::State,
    routing::{delete, get, post, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{AppState, CoreResponse};

/// Plugin information for workflow module
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginInfo {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub version: String,
    pub plugin_type: String,
    pub is_published: bool,
    pub category: Option<String>,
}

/// Permission definition for workflow module
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionDef {
    pub code: String,
    pub name: String,
    pub resource_type: String,
    pub action: String,
}

/// Get plugin information for workflow module
pub async fn get_plugin_info() -> Json<CoreResponse<PluginInfo>> {
    tracing::info!("[Workflow Plugin] Getting plugin info");

    let plugin_info = PluginInfo {
        id: Uuid::nil(), // Will be assigned by plugin registry
        code: "workflow".to_string(),
        name: "工作流引擎".to_string(),
        description: Some("Workflow 工作流引擎，包含流程设计、流程实例、审批、历史记录等模块".to_string()),
        version: "1.0.0".to_string(),
        plugin_type: "core".to_string(),
        is_published: true,
        category: Some("workflow".to_string()),
    };

    Json(CoreResponse::success(plugin_info, "Plugin info retrieved"))
}

/// Plugin health check handler
pub async fn plugin_health_check(
    State(state): State<AppState>,
) -> Json<CoreResponse<serde_json::Value>> {
    tracing::info!("[Workflow Plugin] Running health check");

    let db_status = match sqlx::query("SELECT 1").fetch_one(&state.pool).await {
        Ok(_) => "healthy",
        Err(_) => "unhealthy",
    };

    let health = serde_json::json!({
        "plugin": "workflow",
        "status": if db_status == "healthy" { "healthy" } else { "unhealthy" },
        "database": db_status,
        "timestamp": chrono::Utc::now().to_rfc3339(),
    });

    Json(CoreResponse::success(health, "Health check completed"))
}

/// Create routes for workflow plugin
pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/api/flow/workflows", get(super::workflow::list_workflows))
        .route("/api/flow/workflows", post(super::workflow::create_workflow))
        .route("/api/flow/workflows/{id}", get(super::workflow::get_workflow))
        .route("/api/flow/workflows/{id}", put(super::workflow::update_workflow))
        .route("/api/flow/workflows/{id}", delete(super::workflow::delete_workflow))
        .route("/api/flow/workflows/{id}/publish", post(super::workflow::publish_workflow))
        .route("/api/flow/workflows/{id}/unpublish", post(super::workflow::unpublish_workflow))
        .route("/api/flow/instances", get(super::instance::list_instances))
        .route("/api/flow/instances", post(super::instance::create_instance))
        .route("/api/flow/instances/{id}", get(super::instance::get_instance))
        .route("/api/flow/instances/{id}/start", post(super::instance::start_instance))
        .route("/api/flow/instances/{id}/approve", post(super::instance::approve_instance))
        .route("/api/flow/instances/{id}/reject", post(super::instance::reject_instance))
        .route("/api/flow/instances/{id}/cancel", post(super::instance::cancel_instance))
        .route("/api/flow/approvals/pending", get(super::approval::list_pending_approvals))
        .route("/api/flow/approval-tasks", get(super::approval::list_approval_tasks))
        .route("/api/flow/approval-tasks/{id}", get(super::approval::get_approval_task))
        .route("/api/flow/approval-tasks/{id}/approve", post(super::approval::approve_task))
        .route("/api/flow/approval-tasks/{id}/reject", post(super::approval::reject_task))
        .route("/api/flow/approvals/{id}/approve", post(super::approval::approve_task))
        .route("/api/flow/approvals/{id}/reject", post(super::approval::reject_task))
        .route("/api/flow/statistics", get(super::statistics::get_statistics))
}