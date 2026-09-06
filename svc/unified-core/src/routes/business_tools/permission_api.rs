//! V452: Business Tools Permission Management API
//!
//! Provides REST API endpoints for managing tenant-based permission
//! configurations. Supports CRUD operations for permissions and a
//! permission check endpoint for runtime authorization.

use axum::extract::{Path, State};
use axum::http::{HeaderMap, StatusCode};
use axum::Json;
use axum::Router;
use serde::{Deserialize, Serialize};

use super::audit_integration::ActorInfo;
use super::permission_audit_log::AuditLogger;
use super::permission_store::{
    PermissionChangeAction, PermissionChangeEvent, PermissionStoreError,
};
use super::{MaxPermission, TenantPermission, TenantRole, ToolPermission};
use crate::shared::AppState;

// ===== Request Types =====

/// Request to create or update a permission configuration.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct PermissionRequest {
    /// Tenant ID.
    pub tenant_id: String,
    /// User ID.
    pub user_id: String,
    /// Tenant role (owner, admin, member, viewer).
    #[serde(default = "default_role")]
    pub role: String,
    /// Whether the permission is active.
    #[serde(default = "default_active")]
    pub active: bool,
    /// Tool-specific permission overrides.
    #[serde(default)]
    pub tool_permissions: Vec<ToolPermissionRequest>,
}

fn default_role() -> String {
    "member".to_string()
}

fn default_active() -> bool {
    true
}

/// Tool-specific permission override in a request.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ToolPermissionRequest {
    /// Tool name.
    pub tool: String,
    /// Maximum permission level (read, write, admin).
    #[serde(default = "default_max_permission")]
    pub max_permission: String,
    /// Allowed operations (empty means all operations allowed up to max_permission).
    #[serde(default)]
    pub allowed_operations: Vec<String>,
    /// Denied operations (takes precedence over allowed).
    #[serde(default)]
    pub denied_operations: Vec<String>,
}

fn default_max_permission() -> String {
    "read".to_string()
}

/// Request to check if a user can perform an operation.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct PermissionCheckRequest {
    /// Tenant ID.
    pub tenant_id: String,
    /// User ID.
    pub user_id: String,
    /// Tool name.
    pub tool: String,
    /// Operation to check.
    pub operation: String,
}

// ===== Response Types =====

/// Response containing a permission configuration.
#[derive(Debug, Clone, Serialize)]
pub struct PermissionResponse {
    /// Tenant ID.
    pub tenant_id: String,
    /// User ID.
    pub user_id: String,
    /// Tenant role.
    pub role: String,
    /// Whether the permission is active.
    pub active: bool,
    /// Tool-specific permission overrides.
    pub tool_permissions: Vec<ToolPermissionResponse>,
}

/// Tool-specific permission override in a response.
#[derive(Debug, Clone, Serialize)]
pub struct ToolPermissionResponse {
    /// Tool name.
    pub tool: String,
    /// Maximum permission level.
    pub max_permission: String,
    /// Allowed operations.
    pub allowed_operations: Vec<String>,
    /// Denied operations.
    pub denied_operations: Vec<String>,
}

/// Response for permission check.
#[derive(Debug, Clone, Serialize)]
pub struct PermissionCheckResponse {
    /// Whether the operation is allowed.
    pub allowed: bool,
    /// Tenant ID.
    pub tenant_id: String,
    /// User ID.
    pub user_id: String,
    /// Tool name.
    pub tool: String,
    /// Operation checked.
    pub operation: String,
    /// Reason for the decision (optional).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
}

/// Response for listing permissions.
#[derive(Debug, Clone, Serialize)]
pub struct PermissionListResponse {
    /// Total number of permissions.
    pub total: usize,
    /// Permission configurations.
    pub permissions: Vec<PermissionResponse>,
}

/// Error response.
#[derive(Debug, Clone, Serialize)]
pub struct ErrorResponse {
    /// Error message.
    pub error: String,
    /// Error code (optional).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
}

// ===== Conversion Helpers =====

impl From<&TenantPermission> for PermissionResponse {
    fn from(perm: &TenantPermission) -> Self {
        Self {
            tenant_id: perm.tenant_id.clone(),
            user_id: perm.user_id.clone(),
            role: perm.role.as_str().to_string(),
            active: perm.active,
            tool_permissions: perm
                .tool_permissions
                .iter()
                .map(|tp| ToolPermissionResponse {
                    tool: tp.tool.clone(),
                    max_permission: tp.max_permission.as_str().to_string(),
                    allowed_operations: tp.allowed_operations.clone(),
                    denied_operations: tp.denied_operations.clone(),
                })
                .collect(),
        }
    }
}

impl TryFrom<&PermissionRequest> for TenantPermission {
    type Error = String;

    fn try_from(req: &PermissionRequest) -> Result<Self, Self::Error> {
        let role =
            TenantRole::from_str(&req.role).ok_or_else(|| format!("Invalid role: {}", req.role))?;

        let tool_permissions = req
            .tool_permissions
            .iter()
            .map(|tp| {
                let max_permission =
                    MaxPermission::from_str(&tp.max_permission).ok_or_else(|| {
                        format!(
                            "Invalid max_permission for tool {}: {}",
                            tp.tool, tp.max_permission
                        )
                    })?;
                Ok(ToolPermission {
                    tool: tp.tool.clone(),
                    allowed_operations: tp.allowed_operations.clone(),
                    denied_operations: tp.denied_operations.clone(),
                    max_permission,
                })
            })
            .collect::<Result<Vec<_>, String>>()?;

        Ok(TenantPermission {
            tenant_id: req.tenant_id.clone(),
            user_id: req.user_id.clone(),
            role,
            tool_permissions,
            active: req.active,
        })
    }
}

// ===== Error Handling =====

fn map_store_error(err: PermissionStoreError) -> (StatusCode, Json<ErrorResponse>) {
    match err {
        PermissionStoreError::NotFound(tenant, user) => (
            StatusCode::NOT_FOUND,
            Json(ErrorResponse {
                error: format!("Permission not found for tenant={}, user={}", tenant, user),
                code: Some("NOT_FOUND".to_string()),
            }),
        ),
        PermissionStoreError::AlreadyExists(tenant, user) => (
            StatusCode::CONFLICT,
            Json(ErrorResponse {
                error: format!(
                    "Permission already exists for tenant={}, user={}",
                    tenant, user
                ),
                code: Some("ALREADY_EXISTS".to_string()),
            }),
        ),
        PermissionStoreError::Invalid(msg) => (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: msg,
                code: Some("INVALID".to_string()),
            }),
        ),
        PermissionStoreError::StoreError(msg) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: format!("Store error: {}", msg),
                code: Some("STORE_ERROR".to_string()),
            }),
        ),
    }
}

// ===== Route Handlers =====

/// `POST /api/business-tools/permissions` — Create a new permission configuration.
pub async fn create_permission(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(request): Json<PermissionRequest>,
) -> Result<(StatusCode, Json<PermissionResponse>), (StatusCode, Json<ErrorResponse>)> {
    let permission = TenantPermission::try_from(&request).map_err(|msg| {
        (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: msg,
                code: Some("INVALID_REQUEST".to_string()),
            }),
        )
    })?;

    state
        .permission_store
        .create_permission(permission.clone())
        .await
        .map_err(map_store_error)?;

    // Record audit log using AppState's audit_logger
    let actor = ActorInfo::from_headers(&headers);
    let audit_logger = AuditLogger::new(state.audit_logger.clone());
    if let Err(e) = audit_logger
        .log_create(
            &permission,
            &actor.changed_by,
            actor.ip_address.as_deref(),
            actor.user_agent.as_deref(),
        )
        .await
    {
        tracing::warn!("Failed to record create audit log: {}", e);
    }

    Ok((
        StatusCode::CREATED,
        Json(PermissionResponse::from(&permission)),
    ))
}

/// `GET /api/business-tools/permissions/{tenant_id}/{user_id}` — Get a permission configuration.
pub async fn get_permission(
    State(state): State<AppState>,
    Path((tenant_id, user_id)): Path<(String, String)>,
) -> Result<Json<PermissionResponse>, (StatusCode, Json<ErrorResponse>)> {
    let permission = state
        .permission_store
        .get_permission(&tenant_id, &user_id)
        .await
        .map_err(map_store_error)?;

    match permission {
        Some(perm) => Ok(Json(PermissionResponse::from(&perm))),
        None => Err((
            StatusCode::NOT_FOUND,
            Json(ErrorResponse {
                error: format!(
                    "Permission not found for tenant={}, user={}",
                    tenant_id, user_id
                ),
                code: Some("NOT_FOUND".to_string()),
            }),
        )),
    }
}

/// `PUT /api/business-tools/permissions/{tenant_id}/{user_id}` — Update a permission configuration.
pub async fn update_permission(
    State(state): State<AppState>,
    Path((tenant_id, user_id)): Path<(String, String)>,
    headers: HeaderMap,
    Json(request): Json<PermissionRequest>,
) -> Result<Json<PermissionResponse>, (StatusCode, Json<ErrorResponse>)> {
    // Ensure path parameters match request body
    if request.tenant_id != tenant_id || request.user_id != user_id {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "Path parameters do not match request body".to_string(),
                code: Some("PATH_MISMATCH".to_string()),
            }),
        ));
    }

    let permission = TenantPermission::try_from(&request).map_err(|msg| {
        (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: msg,
                code: Some("INVALID_REQUEST".to_string()),
            }),
        )
    })?;

    // Get old permission for audit log
    let old_permission = state
        .permission_store
        .get_permission(&tenant_id, &user_id)
        .await
        .ok()
        .flatten();

    state
        .permission_store
        .update_permission(permission.clone())
        .await
        .map_err(map_store_error)?;

    // Record audit log using AppState's audit_logger
    let actor = ActorInfo::from_headers(&headers);
    if let Some(old_perm) = old_permission {
        let audit_logger = AuditLogger::new(state.audit_logger.clone());
        if let Err(e) = audit_logger
            .log_update(
                &old_perm,
                &permission,
                &actor.changed_by,
                actor.ip_address.as_deref(),
                actor.user_agent.as_deref(),
            )
            .await
        {
            tracing::warn!("Failed to record update audit log: {}", e);
        }
    }

    Ok(Json(PermissionResponse::from(&permission)))
}

/// `DELETE /api/business-tools/permissions/{tenant_id}/{user_id}` — Delete a permission configuration.
pub async fn delete_permission(
    State(state): State<AppState>,
    Path((tenant_id, user_id)): Path<(String, String)>,
    headers: HeaderMap,
) -> Result<StatusCode, (StatusCode, Json<ErrorResponse>)> {
    // Get permission for audit log before deleting
    let permission = state
        .permission_store
        .get_permission(&tenant_id, &user_id)
        .await
        .ok()
        .flatten();

    state
        .permission_store
        .delete_permission(&tenant_id, &user_id)
        .await
        .map_err(map_store_error)?;

    // Record audit log using AppState's audit_logger
    if let Some(perm) = permission {
        let actor = ActorInfo::from_headers(&headers);
        let audit_logger = AuditLogger::new(state.audit_logger.clone());
        if let Err(e) = audit_logger
            .log_delete(
                &perm,
                &actor.changed_by,
                actor.ip_address.as_deref(),
                actor.user_agent.as_deref(),
            )
            .await
        {
            tracing::warn!("Failed to record delete audit log: {}", e);
        }
    }

    Ok(StatusCode::NO_CONTENT)
}

/// `GET /api/business-tools/permissions/tenant/{tenant_id}` — List all permissions for a tenant.
pub async fn list_tenant_permissions(
    State(state): State<AppState>,
    Path(tenant_id): Path<String>,
) -> Result<Json<PermissionListResponse>, (StatusCode, Json<ErrorResponse>)> {
    let permissions = state
        .permission_store
        .list_tenant_permissions(&tenant_id)
        .await
        .map_err(map_store_error)?;

    let responses: Vec<PermissionResponse> =
        permissions.iter().map(PermissionResponse::from).collect();

    Ok(Json(PermissionListResponse {
        total: responses.len(),
        permissions: responses,
    }))
}

/// `GET /api/business-tools/permissions/user/{user_id}` — List all permissions for a user.
pub async fn list_user_permissions(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
) -> Result<Json<PermissionListResponse>, (StatusCode, Json<ErrorResponse>)> {
    let permissions = state
        .permission_store
        .list_user_permissions(&user_id)
        .await
        .map_err(map_store_error)?;

    let responses: Vec<PermissionResponse> =
        permissions.iter().map(PermissionResponse::from).collect();

    Ok(Json(PermissionListResponse {
        total: responses.len(),
        permissions: responses,
    }))
}

/// `POST /api/business-tools/permissions/check` — Check if a user can perform an operation.
pub async fn check_permission(
    State(state): State<AppState>,
    Json(request): Json<PermissionCheckRequest>,
) -> Result<Json<PermissionCheckResponse>, (StatusCode, Json<ErrorResponse>)> {
    let allowed = state
        .permission_store
        .check_permission(
            &request.tenant_id,
            &request.user_id,
            &request.tool,
            &request.operation,
        )
        .await
        .map_err(map_store_error)?;

    let reason = if allowed {
        None
    } else {
        Some("Permission denied".to_string())
    };

    Ok(Json(PermissionCheckResponse {
        allowed,
        tenant_id: request.tenant_id,
        user_id: request.user_id,
        tool: request.tool,
        operation: request.operation,
        reason,
    }))
}

/// `GET /api/business-tools/permissions/count` — Get the total number of stored permissions.
pub async fn count_permissions(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<ErrorResponse>)> {
    let count = state
        .permission_store
        .count()
        .await
        .map_err(map_store_error)?;

    Ok(Json(serde_json::json!({
        "count": count,
    })))
}

// ===== Bulk Operations (V530f) =====

/// Request body for bulk create / bulk update.
#[derive(Debug, Deserialize)]
pub struct BulkPermissionRequest {
    pub permissions: Vec<PermissionRequest>,
}

/// A single delete key for bulk delete.
#[derive(Debug, Deserialize)]
pub struct BulkDeleteKey {
    pub tenant_id: String,
    pub user_id: String,
}

/// Request body for bulk delete.
#[derive(Debug, Deserialize)]
pub struct BulkDeleteRequest {
    pub keys: Vec<BulkDeleteKey>,
}

/// Response for bulk operations.
#[derive(Debug, Serialize)]
pub struct BulkPermissionResponse {
    pub total: usize,
    pub succeeded: usize,
    pub skipped: usize,
    pub events: Vec<PermissionChangeEventView>,
}

/// Lightweight event view returned to clients.
#[derive(Debug, Serialize)]
pub struct PermissionChangeEventView {
    pub action: String,
    pub tenant_id: String,
    pub user_id: String,
}

fn event_view(event: &PermissionChangeEvent) -> PermissionChangeEventView {
    PermissionChangeEventView {
        action: match event.action {
            PermissionChangeAction::Create => "create".to_string(),
            PermissionChangeAction::Update => "update".to_string(),
            PermissionChangeAction::Delete => "delete".to_string(),
            PermissionChangeAction::BulkCreate => "bulk_create".to_string(),
            PermissionChangeAction::BulkUpdate => "bulk_update".to_string(),
            PermissionChangeAction::BulkDelete => "bulk_delete".to_string(),
        },
        tenant_id: event.tenant_id.clone(),
        user_id: event.user_id.clone(),
    }
}

fn publish_events(state: &AppState, actions: &[PermissionChangeAction], keys: &[(String, String)]) {
    let now = chrono::Utc::now();
    for (idx, (tenant_id, user_id)) in keys.iter().enumerate() {
        let action = actions
            .get(idx)
            .copied()
            .unwrap_or(PermissionChangeAction::BulkCreate);
        state.permission_notifier.publish(PermissionChangeEvent {
            action,
            tenant_id: tenant_id.clone(),
            user_id: user_id.clone(),
            at: now,
        });
    }
}

/// `POST /api/business-tools/permissions/bulk` — Bulk create permissions.
pub async fn bulk_create_permissions(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(request): Json<BulkPermissionRequest>,
) -> Result<(StatusCode, Json<BulkPermissionResponse>), (StatusCode, Json<ErrorResponse>)> {
    let mut permissions = Vec::with_capacity(request.permissions.len());
    for req in &request.permissions {
        let permission = TenantPermission::try_from(req)
            .map_err(|msg| (StatusCode::BAD_REQUEST, Json(ErrorResponse {
                error: msg,
                code: Some("INVALID_REQUEST".to_string()),
            })))?;
        permissions.push(permission);
    }

    let result = state
        .permission_store
        .bulk_create_permissions(permissions.clone())
        .await
        .map_err(map_store_error)?;

    let keys: Vec<(String, String)> = permissions
        .iter()
        .map(|p| (p.tenant_id.clone(), p.user_id.clone()))
        .collect();
    publish_events(
        &state,
        &[PermissionChangeAction::BulkCreate],
        &keys,
    );

    let _ = ActorInfo::from_headers(&headers);
    Ok((
        StatusCode::OK,
        Json(BulkPermissionResponse {
            total: result.total,
            succeeded: result.succeeded,
            skipped: result.skipped,
            events: keys
                .iter()
                .map(|(t, u)| PermissionChangeEventView {
                    action: "bulk_create".to_string(),
                    tenant_id: t.clone(),
                    user_id: u.clone(),
                })
                .collect(),
        }),
    ))
}

/// `PUT /api/business-tools/permissions/bulk` — Bulk update permissions.
pub async fn bulk_update_permissions(
    State(state): State<AppState>,
    Json(request): Json<BulkPermissionRequest>,
) -> Result<Json<BulkPermissionResponse>, (StatusCode, Json<ErrorResponse>)> {
    let mut permissions = Vec::with_capacity(request.permissions.len());
    for req in &request.permissions {
        let permission = TenantPermission::try_from(req)
            .map_err(|msg| (StatusCode::BAD_REQUEST, Json(ErrorResponse {
                error: msg,
                code: Some("INVALID_REQUEST".to_string()),
            })))?;
        permissions.push(permission);
    }

    let result = state
        .permission_store
        .bulk_update_permissions(permissions.clone())
        .await
        .map_err(map_store_error)?;

    let keys: Vec<(String, String)> = permissions
        .iter()
        .map(|p| (p.tenant_id.clone(), p.user_id.clone()))
        .collect();
    publish_events(
        &state,
        &[PermissionChangeAction::BulkUpdate],
        &keys,
    );

    Ok(Json(BulkPermissionResponse {
        total: result.total,
        succeeded: result.succeeded,
        skipped: result.skipped,
        events: keys
            .iter()
            .map(|(t, u)| PermissionChangeEventView {
                action: "bulk_update".to_string(),
                tenant_id: t.clone(),
                user_id: u.clone(),
            })
            .collect(),
    }))
}

/// `DELETE /api/business-tools/permissions/bulk` — Bulk delete permissions.
pub async fn bulk_delete_permissions(
    State(state): State<AppState>,
    Json(request): Json<BulkDeleteRequest>,
) -> Result<Json<BulkPermissionResponse>, (StatusCode, Json<ErrorResponse>)> {
    let keys: Vec<(String, String)> = request
        .keys
        .iter()
        .map(|k| (k.tenant_id.clone(), k.user_id.clone()))
        .collect();

    let result = state
        .permission_store
        .bulk_delete_permissions(keys.clone())
        .await
        .map_err(map_store_error)?;

    publish_events(
        &state,
        &[PermissionChangeAction::BulkDelete],
        &keys,
    );

    Ok(Json(BulkPermissionResponse {
        total: result.total,
        succeeded: result.succeeded,
        skipped: result.skipped,
        events: keys
            .iter()
            .map(|(t, u)| PermissionChangeEventView {
                action: "bulk_delete".to_string(),
                tenant_id: t.clone(),
                user_id: u.clone(),
            })
            .collect(),
    }))
}

// ===== Route Registration =====

/// Create permission management routes.
pub fn permission_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/business-tools/permissions",
            axum::routing::post(create_permission),
        )
        .route(
            "/business-tools/permissions/{tenant_id}/{user_id}",
            axum::routing::get(get_permission)
                .put(update_permission)
                .delete(delete_permission),
        )
        .route(
            "/business-tools/permissions/tenant/{tenant_id}",
            axum::routing::get(list_tenant_permissions),
        )
        .route(
            "/business-tools/permissions/user/{user_id}",
            axum::routing::get(list_user_permissions),
        )
        .route(
            "/business-tools/permissions/check",
            axum::routing::post(check_permission),
        )
        .route(
            "/business-tools/permissions/count",
            axum::routing::get(count_permissions),
        )
        .route(
            "/business-tools/permissions/bulk",
            axum::routing::post(bulk_create_permissions)
                .put(bulk_update_permissions)
                .delete(bulk_delete_permissions),
        )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_permission_request_defaults() {
        let json = r#"{"tenant_id":"t1","user_id":"u1"}"#;
        let req: PermissionRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.role, "member");
        assert!(req.active);
        assert!(req.tool_permissions.is_empty());
    }

    #[test]
    fn test_tool_permission_request_defaults() {
        let json = r#"{"tool":"crm"}"#;
        let req: ToolPermissionRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.max_permission, "read");
        assert!(req.allowed_operations.is_empty());
        assert!(req.denied_operations.is_empty());
    }

    #[test]
    fn test_permission_response_from_tenant_permission() {
        let perm = TenantPermission::owner("t1", "u1");
        let resp = PermissionResponse::from(&perm);
        assert_eq!(resp.tenant_id, "t1");
        assert_eq!(resp.user_id, "u1");
        assert_eq!(resp.role, "owner");
        assert!(resp.active);
    }

    #[test]
    fn test_tenant_permission_try_from_request() {
        let req = PermissionRequest {
            tenant_id: "t1".to_string(),
            user_id: "u1".to_string(),
            role: "admin".to_string(),
            active: true,
            tool_permissions: vec![ToolPermissionRequest {
                tool: "crm".to_string(),
                max_permission: "write".to_string(),
                allowed_operations: vec!["read".to_string(), "write".to_string()],
                denied_operations: vec!["delete".to_string()],
            }],
        };

        let perm = TenantPermission::try_from(&req).unwrap();
        assert_eq!(perm.tenant_id, "t1");
        assert_eq!(perm.user_id, "u1");
        assert!(matches!(perm.role, TenantRole::Admin));
        assert_eq!(perm.tool_permissions.len(), 1);
        assert_eq!(perm.tool_permissions[0].tool, "crm");
    }

    #[test]
    fn test_tenant_permission_try_from_invalid_role() {
        let req = PermissionRequest {
            tenant_id: "t1".to_string(),
            user_id: "u1".to_string(),
            role: "invalid".to_string(),
            active: true,
            tool_permissions: vec![],
        };

        let result = TenantPermission::try_from(&req);
        assert!(result.is_err());
    }

    #[test]
    fn test_permission_check_response_serialization() {
        let resp = PermissionCheckResponse {
            allowed: true,
            tenant_id: "t1".to_string(),
            user_id: "u1".to_string(),
            tool: "crm".to_string(),
            operation: "read".to_string(),
            reason: None,
        };

        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"allowed\":true"));
        assert!(!json.contains("reason"));
    }

    #[test]
    fn test_permission_check_response_with_reason() {
        let resp = PermissionCheckResponse {
            allowed: false,
            tenant_id: "t1".to_string(),
            user_id: "u1".to_string(),
            tool: "crm".to_string(),
            operation: "delete".to_string(),
            reason: Some("Permission denied".to_string()),
        };

        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"allowed\":false"));
        assert!(json.contains("Permission denied"));
    }

    #[test]
    fn test_error_response_serialization() {
        let resp = ErrorResponse {
            error: "Something went wrong".to_string(),
            code: Some("INTERNAL_ERROR".to_string()),
        };

        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("Something went wrong"));
        assert!(json.contains("INTERNAL_ERROR"));
    }

    #[test]
    fn test_permission_list_response() {
        let resp = PermissionListResponse {
            total: 2,
            permissions: vec![],
        };

        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"total\":2"));
    }
}
