//! Business Tools routes for unified-core service.
//!
//! Provides API endpoints for managing and executing business tools
//! that connect to real services (CRM, ERP, Finance, HR, MES, EHS,
//! WMS, QMS, PM, LIMS, BI, APS, CS, SCM, IoT, OA).

// V444: Permission store module
pub mod permission_store;

// V448: Database-backed permission store
pub mod database_permission_store;

// V450: Permission store factory
pub mod permission_store_factory;

// V452: Permission management API
pub mod permission_api;

// V454: Permission audit log
pub mod permission_audit_log;

// V454: Audit log API
pub mod audit_api;

// V456: Database-backed audit log store
pub mod database_audit_log_store;

// V458: Permission audit log integration
pub mod audit_integration;

// V461: Audit log export API
pub mod audit_export_api;

// V462: Permission batch operations API
pub mod permission_batch_api;

// V463: Permission export/import API
pub mod permission_export_import_api;

// V464: Audit log retention policy
pub mod audit_retention;

// V465: Audit log retention policy API
pub mod audit_retention_api;

// V466: Audit log retention cleanup task
pub mod audit_retention_task;

use std::sync::Arc;

use axum::extract::{Path, State};
use axum::Json;
use axum::Router;
use serde::{Deserialize, Serialize};

use crate::modules::business_tools::{
    BusinessRequest, BusinessResponse, BusinessToolRegistry,
};
use crate::AppState;

// ===== V440: Permission Control Types =====

/// Permission level required for an operation.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum PermissionLevel {
    /// Read-only access (e.g., get, list, query).
    Read,
    /// Write access (e.g., create, update, delete).
    Write,
    /// Admin access (e.g., configure, manage, bulk operations).
    Admin,
}

impl PermissionLevel {
    /// Get the permission level as a string.
    pub fn as_str(&self) -> &'static str {
        match self {
            PermissionLevel::Read => "read",
            PermissionLevel::Write => "write",
            PermissionLevel::Admin => "admin",
        }
    }

    /// Check if this permission level includes the required level.
    pub fn includes(&self, required: &PermissionLevel) -> bool {
        match (self, required) {
            (PermissionLevel::Admin, _) => true,
            (PermissionLevel::Write, PermissionLevel::Read) => true,
            (PermissionLevel::Write, PermissionLevel::Write) => true,
            (PermissionLevel::Read, PermissionLevel::Read) => true,
            _ => false,
        }
    }
}

/// User role with associated permission level.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum UserRole {
    /// Viewer - read-only access.
    Viewer,
    /// Editor - read and write access.
    Editor,
    /// Admin - full access.
    Admin,
}

impl UserRole {
    /// Get the permission level for this role.
    pub fn permission_level(&self) -> PermissionLevel {
        match self {
            UserRole::Viewer => PermissionLevel::Read,
            UserRole::Editor => PermissionLevel::Write,
            UserRole::Admin => PermissionLevel::Admin,
        }
    }

    /// Get the role as a string.
    pub fn as_str(&self) -> &'static str {
        match self {
            UserRole::Viewer => "viewer",
            UserRole::Editor => "editor",
            UserRole::Admin => "admin",
        }
    }

    /// Parse a role from a string.
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "viewer" => Some(UserRole::Viewer),
            "editor" => Some(UserRole::Editor),
            "admin" => Some(UserRole::Admin),
            _ => None,
        }
    }
}

/// Determine the required permission level for an operation.
/// 
/// Rules:
/// - Operations starting with "get_", "list_", "query_", "search_", "count_", "health" → Read
/// - Operations starting with "create_", "update_", "delete_", "add_", "remove_", "modify_" → Write
/// - Operations containing "bulk_", "batch_", "configure_", "manage_", "admin_" → Admin
/// - Default → Read
pub fn required_permission_for_operation(operation: &str) -> PermissionLevel {
    let op = operation.to_lowercase();

    // Admin operations
    if op.contains("bulk_") || op.contains("batch_") || op.contains("configure_")
        || op.contains("manage_") || op.contains("admin_") || op.contains("import_")
        || op.contains("export_")
    {
        return PermissionLevel::Admin;
    }

    // Write operations
    if op.starts_with("create_") || op.starts_with("update_") || op.starts_with("delete_")
        || op.starts_with("add_") || op.starts_with("remove_") || op.starts_with("modify_")
        || op.starts_with("submit_") || op.starts_with("approve_") || op.starts_with("reject_")
        || op.starts_with("cancel_") || op.starts_with("complete_") || op.starts_with("start_")
        || op.starts_with("stop_") || op.starts_with("pause_") || op.starts_with("resume_")
    {
        return PermissionLevel::Write;
    }

    // Default: Read
    PermissionLevel::Read
}

/// Check if a user role has permission for an operation.
pub fn check_permission(role: &UserRole, operation: &str) -> bool {
    let required = required_permission_for_operation(operation);
    role.permission_level().includes(&required)
}

/// Permission check result.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionCheckResult {
    /// Whether the permission is granted.
    pub granted: bool,
    /// The required permission level.
    pub required: String,
    /// The user's permission level.
    pub user_level: String,
    /// The user's role.
    pub user_role: String,
    /// The operation being checked.
    pub operation: String,
    /// Error message if not granted.
    pub error: Option<String>,
}

/// Perform a permission check and return detailed result.
pub fn perform_permission_check(
    role: &UserRole,
    operation: &str,
) -> PermissionCheckResult {
    let required = required_permission_for_operation(operation);
    let user_level = role.permission_level();
    let granted = user_level.includes(&required);

    PermissionCheckResult {
        granted,
        required: required.as_str().to_string(),
        user_level: user_level.as_str().to_string(),
        user_role: role.as_str().to_string(),
        operation: operation.to_string(),
        error: if granted {
            None
        } else {
            Some(format!(
                "Permission denied: operation '{}' requires '{}' permission, but user has '{}' permission (role: '{}')",
                operation,
                required.as_str(),
                user_level.as_str(),
                role.as_str()
            ))
        },
    }
}

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
    /// V440: User role for permission control (viewer, editor, admin).
    /// Defaults to "admin" for backward compatibility.
    #[serde(default = "default_user_role")]
    pub role: String,
    /// V442: Tenant role for multi-tenant permission control (owner, admin, member, viewer).
    /// Defaults to "owner" for backward compatibility.
    #[serde(default = "default_tenant_role")]
    pub tenant_role: String,
}

fn default_user_role() -> String {
    "admin".to_string()
}

fn default_tenant_role() -> String {
    "owner".to_string()
}

// ===== V442: Tenant-based Permission Control & Fine-grained Operation Permissions =====

/// Tenant role for multi-tenant permission control.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum TenantRole {
    /// Owner - full access to all tenant resources and settings.
    Owner,
    /// Admin - manage users and settings, but cannot transfer ownership.
    Admin,
    /// Member - standard user with access to assigned tools.
    Member,
    /// Viewer - read-only access to tenant resources.
    Viewer,
}

impl TenantRole {
    /// Get the tenant role as a string.
    pub fn as_str(&self) -> &'static str {
        match self {
            TenantRole::Owner => "owner",
            TenantRole::Admin => "admin",
            TenantRole::Member => "member",
            TenantRole::Viewer => "viewer",
        }
    }

    /// Parse a tenant role from a string.
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "owner" => Some(TenantRole::Owner),
            "admin" => Some(TenantRole::Admin),
            "member" => Some(TenantRole::Member),
            "viewer" => Some(TenantRole::Viewer),
            _ => None,
        }
    }

    /// Get the permission level for this tenant role.
    pub fn permission_level(&self) -> PermissionLevel {
        match self {
            TenantRole::Owner => PermissionLevel::Admin,
            TenantRole::Admin => PermissionLevel::Admin,
            TenantRole::Member => PermissionLevel::Write,
            TenantRole::Viewer => PermissionLevel::Read,
        }
    }

    /// Check if this role can manage tenant settings.
    pub fn can_manage_settings(&self) -> bool {
        matches!(self, TenantRole::Owner | TenantRole::Admin)
    }

    /// Check if this role can manage users.
    pub fn can_manage_users(&self) -> bool {
        matches!(self, TenantRole::Owner | TenantRole::Admin)
    }

    /// Check if this role can transfer ownership.
    pub fn can_transfer_ownership(&self) -> bool {
        matches!(self, TenantRole::Owner)
    }
}

/// Fine-grained tool permission for a specific user/tenant.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ToolPermission {
    /// Tool name (e.g., "crm", "erp").
    pub tool: String,
    /// Allowed operations (empty means all operations allowed).
    pub allowed_operations: Vec<String>,
    /// Denied operations (takes precedence over allowed_operations).
    pub denied_operations: Vec<String>,
    /// Maximum permission level for this tool.
    pub max_permission: PermissionLevel,
}

impl ToolPermission {
    /// Create a new tool permission with full access.
    pub fn full_access(tool: &str) -> Self {
        Self {
            tool: tool.to_string(),
            allowed_operations: Vec::new(),
            denied_operations: Vec::new(),
            max_permission: PermissionLevel::Admin,
        }
    }

    /// Create a new tool permission with read-only access.
    pub fn read_only(tool: &str) -> Self {
        Self {
            tool: tool.to_string(),
            allowed_operations: Vec::new(),
            denied_operations: Vec::new(),
            max_permission: PermissionLevel::Read,
        }
    }

    /// Check if a specific operation is allowed.
    pub fn is_operation_allowed(&self, operation: &str) -> bool {
        // Check denied operations first (takes precedence)
        if self.denied_operations.iter().any(|op| {
            op == operation || op == "*" || operation.starts_with(op.trim_end_matches('*'))
        }) {
            return false;
        }

        // If allowed_operations is empty, all operations are allowed
        if self.allowed_operations.is_empty() {
            return true;
        }

        // Check allowed operations
        self.allowed_operations.iter().any(|op| {
            op == operation || op == "*" || operation.starts_with(op.trim_end_matches('*'))
        })
    }
}

/// Tenant permission configuration for a user.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TenantPermission {
    /// Tenant ID.
    pub tenant_id: String,
    /// User ID.
    pub user_id: String,
    /// Tenant role.
    pub role: TenantRole,
    /// Tool-specific permissions (empty means default role permissions apply).
    pub tool_permissions: Vec<ToolPermission>,
    /// Whether the user is active in this tenant.
    pub active: bool,
}

impl TenantPermission {
    /// Create a new tenant permission with owner role.
    pub fn owner(tenant_id: &str, user_id: &str) -> Self {
        Self {
            tenant_id: tenant_id.to_string(),
            user_id: user_id.to_string(),
            role: TenantRole::Owner,
            tool_permissions: Vec::new(),
            active: true,
        }
    }

    /// Get the tool permission for a specific tool.
    pub fn get_tool_permission(&self, tool: &str) -> Option<&ToolPermission> {
        self.tool_permissions.iter().find(|tp| tp.tool == tool)
    }

    /// Check if a user can perform an operation on a tool.
    pub fn can_perform(&self, tool: &str, operation: &str) -> bool {
        if !self.active {
            return false;
        }

        // Get the effective permission level
        let effective_permission = if let Some(tp) = self.get_tool_permission(tool) {
            tp.max_permission.clone()
        } else {
            self.role.permission_level()
        };

        // Check if the operation is allowed by tool-specific permissions
        if let Some(tp) = self.get_tool_permission(tool) {
            if !tp.is_operation_allowed(operation) {
                return false;
            }
        }

        // Check the required permission level for the operation
        let required = required_permission_for_operation(operation);
        effective_permission.includes(&required)
    }
}

/// Tenant permission check result.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TenantPermissionCheckResult {
    /// Whether the permission is granted.
    pub granted: bool,
    /// Tenant ID.
    pub tenant_id: String,
    /// User ID.
    pub user_id: String,
    /// Tenant role.
    pub role: String,
    /// Tool name.
    pub tool: String,
    /// Operation name.
    pub operation: String,
    /// Required permission level.
    pub required_permission: String,
    /// Effective permission level.
    pub effective_permission: String,
    /// Whether the user is active.
    pub active: bool,
    /// Error message if not granted.
    pub error: Option<String>,
}

/// Perform a tenant permission check.
pub fn perform_tenant_permission_check(
    permission: &TenantPermission,
    tool: &str,
    operation: &str,
) -> TenantPermissionCheckResult {
    let required = required_permission_for_operation(operation);
    let effective = if let Some(tp) = permission.get_tool_permission(tool) {
        tp.max_permission.clone()
    } else {
        permission.role.permission_level()
    };

    let granted = permission.can_perform(tool, operation);

    TenantPermissionCheckResult {
        granted,
        tenant_id: permission.tenant_id.clone(),
        user_id: permission.user_id.clone(),
        role: permission.role.as_str().to_string(),
        tool: tool.to_string(),
        operation: operation.to_string(),
        required_permission: required.as_str().to_string(),
        effective_permission: effective.as_str().to_string(),
        active: permission.active,
        error: if granted {
            None
        } else if !permission.active {
            Some(format!(
                "User '{}' is not active in tenant '{}'",
                permission.user_id, permission.tenant_id
            ))
        } else {
            Some(format!(
                "Tenant permission denied: user '{}' with role '{}' cannot perform '{}' on tool '{}' (required: '{}', effective: '{}')",
                permission.user_id,
                permission.role.as_str(),
                operation,
                tool,
                required.as_str(),
                effective.as_str()
            ))
        },
    }
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

    // V440: Permission check
    let user_role = UserRole::from_str(&request.role).unwrap_or(UserRole::Admin);
    let permission_result = perform_permission_check(&user_role, &request.operation);
    if !permission_result.granted {
        return Err((
            axum::http::StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "error": "Permission denied",
                "tool": tool_name,
                "operation": request.operation,
                "required_permission": permission_result.required,
                "user_permission": permission_result.user_level,
                "user_role": permission_result.user_role,
                "message": permission_result.error,
            })),
        ));
    }

    // V442: Tenant permission check
    let tenant_role = TenantRole::from_str(&request.tenant_role).unwrap_or(TenantRole::Owner);
    let tenant_permission = TenantPermission {
        tenant_id: request.tenant_id.clone().unwrap_or_else(|| "default".to_string()),
        user_id: request.user_id.clone().unwrap_or_else(|| "anonymous".to_string()),
        role: tenant_role,
        tool_permissions: Vec::new(),
        active: true,
    };
    let tenant_permission_result = perform_tenant_permission_check(
        &tenant_permission,
        &tool_name,
        &request.operation,
    );
    if !tenant_permission_result.granted {
        return Err((
            axum::http::StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "error": "Tenant permission denied",
                "tenant_id": tenant_permission_result.tenant_id,
                "user_id": tenant_permission_result.user_id,
                "tenant_role": tenant_permission_result.role,
                "tool": tool_name,
                "operation": request.operation,
                "required_permission": tenant_permission_result.required_permission,
                "effective_permission": tenant_permission_result.effective_permission,
                "active": tenant_permission_result.active,
                "message": tenant_permission_result.error,
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
        // V452: Permission management routes
        .merge(permission_api::permission_routes())
        // V462: Permission batch operation routes
        .merge(permission_batch_api::permission_batch_routes())
        // V463: Permission export/import routes
        .merge(permission_export_import_api::permission_export_import_routes())
        // V454: Audit log routes
        .merge(audit_api::audit_log_routes())
        // V461: Audit log export routes
        .merge(audit_export_api::audit_export_routes())
        // V465: Audit log retention policy routes
        .merge(audit_retention_api::audit_retention_routes())
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
