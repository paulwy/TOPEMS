//! Business Tools routes for unified-core service.
//!
//! Provides API endpoints for managing and executing business tools
//! that connect to real services (CRM, ERP, Finance, HR, MES, EHS,
//! WMS, QMS, PM, LIMS, BI, APS, CS, SCM, IoT, OA).

use std::sync::Arc;

use axum::extract::{Path, State};
use axum::Json;
use axum::Router;
use serde::{Deserialize, Serialize};

use crate::modules::business_tools::{
    BusinessRequest, BusinessResponse, BusinessToolRegistry,
};
use crate::AppState;

// ===== Request/Response Types =====

/// Request to execute a business tool operation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecuteToolRequest {
    /// Operation name (e.g., "create_customer", "get_order").
    pub operation: String,
    /// Request parameters.
    #[serde(default)]
    pub params: std::collections::HashMap<String, serde_json::Value>,
    /// Request body data.
    #[serde(default)]
    pub data: Option<serde_json::Value>,
    /// Tenant ID for multi-tenant support.
    #[serde(default)]
    pub tenant_id: Option<String>,
    /// User ID for audit.
    #[serde(default)]
    pub user_id: Option<String>,
}

/// Information about a business tool.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolInfo {
    /// Tool name.
    pub name: String,
    /// Tool description.
    pub description: String,
    /// List of supported operations.
    pub operations: Vec<String>,
    /// Number of operations.
    pub operation_count: usize,
}

/// List of all business tools.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolListResponse {
    /// Total number of tools.
    pub total: usize,
    /// List of tools.
    pub tools: Vec<ToolInfo>,
}

/// Health status of a business tool.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolHealthResponse {
    /// Tool name.
    pub tool: String,
    /// Whether the tool is healthy.
    pub healthy: bool,
    /// Health check message.
    pub message: String,
}

// ===== Route Handlers =====

/// `GET /api/business-tools` — List all business tools.
pub async fn list_tools(
    State(state): State<AppState>,
) -> Json<ToolListResponse> {
    let registry = &state.business_tool_registry;
    let tool_names = registry.list();

    let mut tools = Vec::new();
    for name in tool_names {
        if let Ok(tool) = registry.get(&name) {
            tools.push(ToolInfo {
                name: tool.name().to_string(),
                description: tool.description().to_string(),
                operations: tool.operations(),
                operation_count: tool.operations().len(),
            });
        }
    }

    tools.sort_by(|a, b| a.name.cmp(&b.name));

    Json(ToolListResponse {
        total: tools.len(),
        tools,
    })
}

/// `GET /api/business-tools/{tool}` — Get details of a specific tool.
pub async fn get_tool(
    State(state): State<AppState>,
    Path(tool_name): Path<String>,
) -> Result<Json<ToolInfo>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let registry = &state.business_tool_registry;

    let tool = registry.get(&tool_name).map_err(|_| {
        (
            axum::http::StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "error": "Tool not found",
                "tool": tool_name,
            })),
        )
    })?;

    Ok(Json(ToolInfo {
        name: tool.name().to_string(),
        description: tool.description().to_string(),
        operations: tool.operations(),
        operation_count: tool.operations().len(),
    }))
}

/// `POST /api/business-tools/{tool}/execute` — Execute a tool operation.
pub async fn execute_tool(
    State(state): State<AppState>,
    Path(tool_name): Path<String>,
    Json(request): Json<ExecuteToolRequest>,
) -> Result<Json<BusinessResponse>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let registry = &state.business_tool_registry;

    // Check if tool exists
    let tool = registry.get(&tool_name).map_err(|_| {
        (
            axum::http::StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "error": "Tool not found",
                "tool": tool_name,
            })),
        )
    })?;

    // Check if operation is supported
    let operations = tool.operations();
    if !operations.contains(&request.operation) {
        return Err((
            axum::http::StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": "Operation not supported",
                "tool": tool_name,
                "operation": request.operation,
                "supported_operations": operations,
            })),
        ));
    }

    // Build business request
    let business_request = BusinessRequest::new(tool_name.clone(), request.operation.clone())
        .with_params_map(request.params)
        .with_optional_data(request.data)
        .with_optional_tenant(request.tenant_id)
        .with_optional_user(request.user_id);

    // Execute the operation
    let response = registry.execute(business_request).await.map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "Execution failed",
                "tool": tool_name,
                "operation": request.operation,
                "message": e.to_string(),
            })),
        )
    })?;

    Ok(Json(response))
}

/// `GET /api/business-tools/{tool}/health` — Check health of a specific tool.
pub async fn tool_health(
    State(state): State<AppState>,
    Path(tool_name): Path<String>,
) -> Result<Json<ToolHealthResponse>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let registry = &state.business_tool_registry;

    let tool = registry.get(&tool_name).map_err(|_| {
        (
            axum::http::StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "error": "Tool not found",
                "tool": tool_name,
            })),
        )
    })?;

    let healthy = tool.health_check().await.unwrap_or(false);

    Ok(Json(ToolHealthResponse {
        tool: tool_name,
        healthy,
        message: if healthy {
            "Tool is healthy".to_string()
        } else {
            "Tool is unhealthy".to_string()
        },
    }))
}

/// `GET /api/business-tools/health/all` — Check health of all tools.
pub async fn all_tools_health(
    State(state): State<AppState>,
) -> Json<serde_json::Value> {
    let registry = &state.business_tool_registry;
    let health_results = registry.health_check_all().await;

    let mut healthy_count = 0;
    let mut unhealthy_count = 0;
    let mut tools = Vec::new();

    for (name, healthy) in &health_results {
        if *healthy {
            healthy_count += 1;
        } else {
            unhealthy_count += 1;
        }
        tools.push(serde_json::json!({
            "tool": name,
            "healthy": healthy,
        }));
    }

    tools.sort_by(|a, b| a["tool"].as_str().cmp(&b["tool"].as_str()));

    Json(serde_json::json!({
        "total": health_results.len(),
        "healthy": healthy_count,
        "unhealthy": unhealthy_count,
        "tools": tools,
    }))
}

// ===== Route Registration =====

/// Create business tools routes.
pub fn business_tools_routes() -> Router<AppState> {
    Router::new()
        .route("/business-tools", axum::routing::get(list_tools))
        .route("/business-tools/health/all", axum::routing::get(all_tools_health))
        .route("/business-tools/{tool}", axum::routing::get(get_tool))
        .route(
            "/business-tools/{tool}/execute",
            axum::routing::post(execute_tool),
        )
        .route(
            "/business-tools/{tool}/health",
            axum::routing::get(tool_health),
        )
}

// ===== Helper Extensions for BusinessRequest =====

trait BusinessRequestExt {
    fn with_params_map(self, params: std::collections::HashMap<String, serde_json::Value>) -> Self;
    fn with_optional_data(self, data: Option<serde_json::Value>) -> Self;
    fn with_optional_tenant(self, tenant_id: Option<String>) -> Self;
    fn with_optional_user(self, user_id: Option<String>) -> Self;
}

impl BusinessRequestExt for BusinessRequest {
    fn with_params_map(mut self, params: std::collections::HashMap<String, serde_json::Value>) -> Self {
        self.params = params;
        self
    }

    fn with_optional_data(mut self, data: Option<serde_json::Value>) -> Self {
        self.data = data;
        self
    }

    fn with_optional_tenant(mut self, tenant_id: Option<String>) -> Self {
        self.tenant_id = tenant_id;
        self
    }

    fn with_optional_user(mut self, user_id: Option<String>) -> Self {
        self.user_id = user_id;
        self
    }
}
