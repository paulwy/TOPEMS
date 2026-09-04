//! V462: Permission Batch Operations API
//!
//! Provides REST API endpoints for batch operations on permission
//! configurations. Supports batch create, update, and delete with
//! partial success reporting.

use axum::extract::State;
use axum::http::StatusCode;
use axum::Json;
use axum::Router;
use serde::{Deserialize, Serialize};

use super::permission_api::{ErrorResponse, PermissionRequest, PermissionResponse};
use super::permission_store::PermissionStore;
use super::TenantPermission;
use crate::shared::AppState;

// ===== Batch Request Types =====

/// Request for batch creating permissions.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct BatchCreateRequest {
    /// List of permission configurations to create.
    pub permissions: Vec<PermissionRequest>,
}

/// Request for batch updating permissions.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct BatchUpdateRequest {
    /// List of permission configurations to update.
    pub permissions: Vec<PermissionRequest>,
}

/// Request for batch deleting permissions.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct BatchDeleteRequest {
    /// List of (tenant_id, user_id) pairs to delete.
    pub permissions: Vec<BatchDeleteItem>,
}

/// A single item in a batch delete request.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct BatchDeleteItem {
    /// Tenant ID.
    pub tenant_id: String,
    /// User ID.
    pub user_id: String,
}

// ===== Batch Response Types =====

/// Result of a single batch operation.
#[derive(Debug, Clone, Serialize)]
pub struct BatchOperationResult {
    /// Tenant ID.
    pub tenant_id: String,
    /// User ID.
    pub user_id: String,
    /// Whether the operation succeeded.
    pub success: bool,
    /// Error message if the operation failed (optional).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// Response for batch create operations.
#[derive(Debug, Clone, Serialize)]
pub struct BatchCreateResponse {
    /// Total number of requests.
    pub total: usize,
    /// Number of successful operations.
    pub succeeded: usize,
    /// Number of failed operations.
    pub failed: usize,
    /// Successfully created permissions.
    pub created: Vec<PermissionResponse>,
    /// Failed operations with error details.
    pub errors: Vec<BatchOperationResult>,
}

/// Response for batch update operations.
#[derive(Debug, Clone, Serialize)]
pub struct BatchUpdateResponse {
    /// Total number of requests.
    pub total: usize,
    /// Number of successful operations.
    pub succeeded: usize,
    /// Number of failed operations.
    pub failed: usize,
    /// Successfully updated permissions.
    pub updated: Vec<PermissionResponse>,
    /// Failed operations with error details.
    pub errors: Vec<BatchOperationResult>,
}

/// Response for batch delete operations.
#[derive(Debug, Clone, Serialize)]
pub struct BatchDeleteResponse {
    /// Total number of requests.
    pub total: usize,
    /// Number of successful operations.
    pub succeeded: usize,
    /// Number of failed operations.
    pub failed: usize,
    /// Failed operations with error details.
    pub errors: Vec<BatchOperationResult>,
}

// ===== Conversion Helpers =====

/// Convert a PermissionRequest to TenantPermission, returning an error string on failure.
fn try_convert(request: &PermissionRequest) -> Result<TenantPermission, String> {
    TenantPermission::try_from(request)
}

// ===== Route Handlers =====

/// Pure batch create logic, testable without a full `AppState`.
async fn execute_batch_create(
    store: &dyn PermissionStore,
    permissions: &[PermissionRequest],
) -> BatchCreateResponse {
    let mut created = Vec::new();
    let mut errors = Vec::new();

    for req in permissions {
        match try_convert(req) {
            Ok(permission) => match store.create_permission(permission.clone()).await {
                Ok(_) => {
                    created.push(PermissionResponse::from(&permission));
                }
                Err(e) => {
                    errors.push(BatchOperationResult {
                        tenant_id: req.tenant_id.clone(),
                        user_id: req.user_id.clone(),
                        success: false,
                        error: Some(format!("{}", e)),
                    });
                }
            },
            Err(e) => {
                errors.push(BatchOperationResult {
                    tenant_id: req.tenant_id.clone(),
                    user_id: req.user_id.clone(),
                    success: false,
                    error: Some(e),
                });
            }
        }
    }

    let total = permissions.len();
    let succeeded = created.len();
    let failed = errors.len();

    BatchCreateResponse {
        total,
        succeeded,
        failed,
        created,
        errors,
    }
}

/// Pure batch update logic, testable without a full `AppState`.
async fn execute_batch_update(
    store: &dyn PermissionStore,
    permissions: &[PermissionRequest],
) -> BatchUpdateResponse {
    let mut updated = Vec::new();
    let mut errors = Vec::new();

    for req in permissions {
        match try_convert(req) {
            Ok(permission) => match store.update_permission(permission.clone()).await {
                Ok(_) => {
                    updated.push(PermissionResponse::from(&permission));
                }
                Err(e) => {
                    errors.push(BatchOperationResult {
                        tenant_id: req.tenant_id.clone(),
                        user_id: req.user_id.clone(),
                        success: false,
                        error: Some(format!("{}", e)),
                    });
                }
            },
            Err(e) => {
                errors.push(BatchOperationResult {
                    tenant_id: req.tenant_id.clone(),
                    user_id: req.user_id.clone(),
                    success: false,
                    error: Some(e),
                });
            }
        }
    }

    let total = permissions.len();
    let succeeded = updated.len();
    let failed = errors.len();

    BatchUpdateResponse {
        total,
        succeeded,
        failed,
        updated,
        errors,
    }
}

/// Pure batch delete logic, testable without a full `AppState`.
async fn execute_batch_delete(
    store: &dyn PermissionStore,
    items: &[BatchDeleteItem],
) -> BatchDeleteResponse {
    let mut errors = Vec::new();
    let mut succeeded = 0;

    for item in items {
        match store
            .delete_permission(&item.tenant_id, &item.user_id)
            .await
        {
            Ok(_) => {
                succeeded += 1;
            }
            Err(e) => {
                errors.push(BatchOperationResult {
                    tenant_id: item.tenant_id.clone(),
                    user_id: item.user_id.clone(),
                    success: false,
                    error: Some(format!("{}", e)),
                });
            }
        }
    }

    let total = items.len();
    let failed = errors.len();

    BatchDeleteResponse {
        total,
        succeeded,
        failed,
        errors,
    }
}

/// `POST /api/business-tools/permissions/batch` — Batch create permissions.
pub async fn batch_create_permissions(
    State(state): State<AppState>,
    Json(request): Json<BatchCreateRequest>,
) -> Result<Json<BatchCreateResponse>, (StatusCode, Json<ErrorResponse>)> {
    let response =
        execute_batch_create(state.permission_store.as_ref(), &request.permissions).await;
    Ok(Json(response))
}

/// `PUT /api/business-tools/permissions/batch` — Batch update permissions.
pub async fn batch_update_permissions(
    State(state): State<AppState>,
    Json(request): Json<BatchUpdateRequest>,
) -> Result<Json<BatchUpdateResponse>, (StatusCode, Json<ErrorResponse>)> {
    let response =
        execute_batch_update(state.permission_store.as_ref(), &request.permissions).await;
    Ok(Json(response))
}

/// `DELETE /api/business-tools/permissions/batch` — Batch delete permissions.
pub async fn batch_delete_permissions(
    State(state): State<AppState>,
    Json(request): Json<BatchDeleteRequest>,
) -> Result<Json<BatchDeleteResponse>, (StatusCode, Json<ErrorResponse>)> {
    let response =
        execute_batch_delete(state.permission_store.as_ref(), &request.permissions).await;
    Ok(Json(response))
}

// ===== Route Registration =====

/// Create permission batch operation routes.
pub fn permission_batch_routes() -> Router<AppState> {
    Router::new().route(
        "/business-tools/permissions/batch",
        axum::routing::post(batch_create_permissions)
            .put(batch_update_permissions)
            .delete(batch_delete_permissions),
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::routes::business_tools::TenantRole;

    #[test]
    fn test_batch_create_request_deserialization() {
        let json = r#"{
            "permissions": [
                {"tenant_id": "t1", "user_id": "u1", "role": "admin"},
                {"tenant_id": "t2", "user_id": "u2", "role": "member"}
            ]
        }"#;
        let req: BatchCreateRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.permissions.len(), 2);
        assert_eq!(req.permissions[0].tenant_id, "t1");
        assert_eq!(req.permissions[0].role, "admin");
        assert_eq!(req.permissions[1].tenant_id, "t2");
    }

    #[test]
    fn test_batch_delete_request_deserialization() {
        let json = r#"{
            "permissions": [
                {"tenant_id": "t1", "user_id": "u1"},
                {"tenant_id": "t2", "user_id": "u2"}
            ]
        }"#;
        let req: BatchDeleteRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.permissions.len(), 2);
        assert_eq!(req.permissions[0].tenant_id, "t1");
        assert_eq!(req.permissions[1].user_id, "u2");
    }

    #[test]
    fn test_batch_create_response_serialization() {
        let response = BatchCreateResponse {
            total: 3,
            succeeded: 2,
            failed: 1,
            created: vec![],
            errors: vec![BatchOperationResult {
                tenant_id: "t1".to_string(),
                user_id: "u1".to_string(),
                success: false,
                error: Some("Already exists".to_string()),
            }],
        };
        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("\"total\":3"));
        assert!(json.contains("\"succeeded\":2"));
        assert!(json.contains("\"failed\":1"));
        assert!(json.contains("Already exists"));
    }

    #[test]
    fn test_batch_operation_result_serialization() {
        let result = BatchOperationResult {
            tenant_id: "t1".to_string(),
            user_id: "u1".to_string(),
            success: true,
            error: None,
        };
        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("\"success\":true"));
        assert!(!json.contains("error")); // None should be skipped
    }

    #[test]
    fn test_batch_operation_result_with_error() {
        let result = BatchOperationResult {
            tenant_id: "t1".to_string(),
            user_id: "u1".to_string(),
            success: false,
            error: Some("Not found".to_string()),
        };
        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("\"success\":false"));
        assert!(json.contains("Not found"));
    }

    #[test]
    fn test_try_convert_valid() {
        let req = PermissionRequest {
            tenant_id: "t1".to_string(),
            user_id: "u1".to_string(),
            role: "admin".to_string(),
            active: true,
            tool_permissions: vec![],
        };
        let result = try_convert(&req);
        assert!(result.is_ok());
        let perm = result.unwrap();
        assert_eq!(perm.tenant_id, "t1");
        assert!(matches!(perm.role, TenantRole::Admin));
    }

    #[test]
    fn test_try_convert_invalid_role() {
        let req = PermissionRequest {
            tenant_id: "t1".to_string(),
            user_id: "u1".to_string(),
            role: "invalid".to_string(),
            active: true,
            tool_permissions: vec![],
        };
        let result = try_convert(&req);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Invalid role"));
    }

    #[test]
    fn test_batch_delete_item_serialization() {
        let item = BatchDeleteItem {
            tenant_id: "t1".to_string(),
            user_id: "u1".to_string(),
        };
        let json = serde_json::to_string(&item).unwrap();
        assert!(json.contains("\"tenant_id\":\"t1\""));
        assert!(json.contains("\"user_id\":\"u1\""));
    }

    #[test]
    fn test_batch_update_response_serialization() {
        let response = BatchUpdateResponse {
            total: 2,
            succeeded: 1,
            failed: 1,
            updated: vec![],
            errors: vec![],
        };
        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("\"total\":2"));
        assert!(json.contains("\"succeeded\":1"));
        assert!(json.contains("\"failed\":1"));
    }

    #[test]
    fn test_batch_delete_response_serialization() {
        let response = BatchDeleteResponse {
            total: 5,
            succeeded: 4,
            failed: 1,
            errors: vec![],
        };
        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("\"total\":5"));
        assert!(json.contains("\"succeeded\":4"));
        assert!(json.contains("\"failed\":1"));
    }

    // ===== execute_* pure logic tests (V478: MockPermissionStore coverage) =====

    fn make_request(tenant_id: &str, user_id: &str, role: &str) -> PermissionRequest {
        PermissionRequest {
            tenant_id: tenant_id.to_string(),
            user_id: user_id.to_string(),
            role: role.to_string(),
            active: true,
            tool_permissions: vec![],
        }
    }

    #[tokio::test]
    async fn test_batch_create_all_success() {
        let store = super::super::permission_store::InMemoryPermissionStore::new();
        let reqs = vec![
            make_request("t1", "u1", "admin"),
            make_request("t1", "u2", "member"),
        ];

        let resp = execute_batch_create(&store, &reqs).await;

        assert_eq!(resp.total, 2);
        assert_eq!(resp.succeeded, 2);
        assert_eq!(resp.failed, 0);
        assert_eq!(resp.created.len(), 2);
        assert!(resp.errors.is_empty());
        assert_eq!(store.count().await.unwrap(), 2);
    }

    #[tokio::test]
    async fn test_batch_create_partial_failure_duplicate() {
        let store = super::super::permission_store::InMemoryPermissionStore::new();
        // Pre-seed one permission so the batch create hits AlreadyExists.
        store
            .create_permission(TenantPermission::owner("t1", "u1"))
            .await
            .unwrap();
        let reqs = vec![
            make_request("t1", "u1", "admin"),
            make_request("t1", "u2", "member"),
        ];

        let resp = execute_batch_create(&store, &reqs).await;

        assert_eq!(resp.total, 2);
        assert_eq!(resp.succeeded, 1);
        assert_eq!(resp.failed, 1);
        assert_eq!(resp.created.len(), 1);
        assert_eq!(resp.errors.len(), 1);
        let err = &resp.errors[0];
        assert_eq!(err.tenant_id, "t1");
        assert_eq!(err.user_id, "u1");
        assert!(!err.success);
        assert!(err.error.as_deref().unwrap().contains("already exists"));
    }

    #[tokio::test]
    async fn test_batch_create_invalid_role_failure() {
        let store = super::super::permission_store::InMemoryPermissionStore::new();
        let reqs = vec![
            make_request("t1", "u1", "invalid_role"),
            make_request("t1", "u2", "member"),
        ];

        let resp = execute_batch_create(&store, &reqs).await;

        assert_eq!(resp.total, 2);
        assert_eq!(resp.succeeded, 1);
        assert_eq!(resp.failed, 1);
        assert_eq!(resp.created.len(), 1);
        assert_eq!(resp.errors.len(), 1);
        assert_eq!(resp.errors[0].user_id, "u1");
        assert!(resp.errors[0]
            .error
            .as_deref()
            .unwrap()
            .contains("Invalid role"));
        // The invalid request must not be persisted.
        assert!(store.get_permission("t1", "u1").await.unwrap().is_none());
    }

    #[tokio::test]
    async fn test_batch_create_empty() {
        let store = super::super::permission_store::InMemoryPermissionStore::new();

        let resp = execute_batch_create(&store, &[]).await;

        assert_eq!(resp.total, 0);
        assert_eq!(resp.succeeded, 0);
        assert_eq!(resp.failed, 0);
        assert!(resp.created.is_empty());
        assert!(resp.errors.is_empty());
    }

    #[tokio::test]
    async fn test_batch_update_all_success_and_missing() {
        let store = super::super::permission_store::InMemoryPermissionStore::new();
        store
            .create_permission(TenantPermission::owner("t1", "u1"))
            .await
            .unwrap();

        let reqs = vec![
            make_request("t1", "u1", "admin"),
            make_request("t1", "u2", "member"), // does not exist -> NotFound
        ];

        let resp = execute_batch_update(&store, &reqs).await;

        assert_eq!(resp.total, 2);
        assert_eq!(resp.succeeded, 1);
        assert_eq!(resp.failed, 1);
        assert_eq!(resp.updated.len(), 1);
        assert_eq!(resp.errors.len(), 1);
        assert_eq!(resp.errors[0].user_id, "u2");
        assert!(resp.errors[0]
            .error
            .as_deref()
            .unwrap()
            .contains("not found"));
        // The existing permission role should have been updated.
        let perm = store.get_permission("t1", "u1").await.unwrap().unwrap();
        assert!(matches!(perm.role, TenantRole::Admin));
    }

    #[tokio::test]
    async fn test_batch_delete_all_success() {
        let store = super::super::permission_store::InMemoryPermissionStore::new();
        store
            .create_permission(TenantPermission::owner("t1", "u1"))
            .await
            .unwrap();
        store
            .create_permission(TenantPermission::owner("t1", "u2"))
            .await
            .unwrap();

        let items = vec![
            BatchDeleteItem {
                tenant_id: "t1".to_string(),
                user_id: "u1".to_string(),
            },
            BatchDeleteItem {
                tenant_id: "t1".to_string(),
                user_id: "u2".to_string(),
            },
        ];

        let resp = execute_batch_delete(&store, &items).await;

        assert_eq!(resp.total, 2);
        assert_eq!(resp.succeeded, 2);
        assert_eq!(resp.failed, 0);
        assert!(resp.errors.is_empty());
        assert_eq!(store.count().await.unwrap(), 0);
    }

    #[tokio::test]
    async fn test_batch_delete_partial_failure_missing() {
        let store = super::super::permission_store::InMemoryPermissionStore::new();
        store
            .create_permission(TenantPermission::owner("t1", "u1"))
            .await
            .unwrap();

        let items = vec![
            BatchDeleteItem {
                tenant_id: "t1".to_string(),
                user_id: "u1".to_string(),
            },
            BatchDeleteItem {
                tenant_id: "t1".to_string(),
                user_id: "missing".to_string(),
            },
        ];

        let resp = execute_batch_delete(&store, &items).await;

        assert_eq!(resp.total, 2);
        assert_eq!(resp.succeeded, 1);
        assert_eq!(resp.failed, 1);
        assert_eq!(resp.errors.len(), 1);
        assert_eq!(resp.errors[0].user_id, "missing");
        assert!(resp.errors[0]
            .error
            .as_deref()
            .unwrap()
            .contains("not found"));
        assert_eq!(store.count().await.unwrap(), 0);
    }

    #[tokio::test]
    async fn test_batch_delete_empty() {
        let store = super::super::permission_store::InMemoryPermissionStore::new();

        let resp = execute_batch_delete(&store, &[]).await;

        assert_eq!(resp.total, 0);
        assert_eq!(resp.succeeded, 0);
        assert_eq!(resp.failed, 0);
        assert!(resp.errors.is_empty());
    }
}
