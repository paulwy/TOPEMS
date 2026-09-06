//! V463: Permission Export/Import API
//!
//! Provides REST API endpoints for exporting and importing permission
//! configurations. Supports JSON format for backup, migration, and
//! bulk configuration.

use axum::extract::{Query, State};
use axum::http::{header, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::Json;
use axum::Router;
use serde::{Deserialize, Serialize};

use super::permission_api::ErrorResponse;
use super::permission_store::PermissionStoreError;
use super::{MaxPermission, TenantPermission, TenantRole, ToolPermission};
use crate::shared::AppState;

// ===== Export Types =====

/// Export format for permissions.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExportFormat {
    /// JSON format.
    Json,
    /// CSV format (tenant_id,user_id,role,active,tool).
    Csv,
}

impl std::str::FromStr for ExportFormat {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "json" => Ok(Self::Json),
            "csv" => Ok(Self::Csv),
            _ => Err(format!(
                "Unknown export format: {}. Use 'json' or 'csv'.",
                s
            )),
        }
    }
}

impl std::fmt::Display for ExportFormat {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Json => write!(f, "json"),
            Self::Csv => write!(f, "csv"),
        }
    }
}

/// Render permission export items as CSV text.
fn render_permissions_csv(items: &[PermissionExportItem]) -> String {
    let mut out = String::from("tenant_id,user_id,role,active,tool_permissions\n");
    for item in items {
        let tools = item
            .tool_permissions
            .iter()
            .map(|tp| format!("{}:{}", tp.tool, tp.max_permission))
            .collect::<Vec<_>>()
            .join("|");
        out.push_str(&format!(
            "{},{},{},{},{}\n",
            csv_escape(&item.tenant_id),
            csv_escape(&item.user_id),
            csv_escape(&item.role),
            item.active,
            csv_escape(&tools),
        ));
    }
    out
}

/// Escape a value for a CSV field (quote if it contains comma/quote/newline).
fn csv_escape(value: &str) -> String {
    if value.contains(',') || value.contains('"') || value.contains('\n') {
        format!("\"{}\"", value.replace('"', "\"\""))
    } else {
        value.to_string()
    }
}

/// Query parameters for permission export.
#[derive(Debug, Clone, Deserialize)]
pub struct ExportQuery {
    /// Export format: json. Defaults to json.
    #[serde(default = "default_format")]
    pub format: String,
    /// Filter by tenant ID (optional).
    #[serde(default)]
    pub tenant_id: Option<String>,
}

fn default_format() -> String {
    "json".to_string()
}

impl Default for ExportQuery {
    fn default() -> Self {
        Self {
            format: default_format(),
            tenant_id: None,
        }
    }
}

/// Exported permission data.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionExportData {
    /// Export version.
    pub version: String,
    /// Export timestamp (RFC3339).
    pub exported_at: String,
    /// Number of permissions.
    pub count: usize,
    /// Permission configurations.
    pub permissions: Vec<PermissionExportItem>,
}

/// A single exported permission item.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionExportItem {
    /// Tenant ID.
    pub tenant_id: String,
    /// User ID.
    pub user_id: String,
    /// Tenant role.
    pub role: String,
    /// Whether the permission is active.
    pub active: bool,
    /// Tool-specific permission overrides.
    #[serde(default)]
    pub tool_permissions: Vec<ToolPermissionExportItem>,
}

/// A single exported tool permission item.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolPermissionExportItem {
    /// Tool name.
    pub tool: String,
    /// Maximum permission level.
    pub max_permission: String,
    /// Allowed operations.
    #[serde(default)]
    pub allowed_operations: Vec<String>,
    /// Denied operations.
    #[serde(default)]
    pub denied_operations: Vec<String>,
}

// ===== Import Types =====

/// Request for importing permissions.
#[derive(Debug, Clone, Deserialize)]
pub struct ImportRequest {
    /// Exported permission data (can be full PermissionExportData or just permissions array).
    #[serde(flatten)]
    pub data: ImportData,
    /// Import mode: create (only create new), update (only update existing), upsert (create or update).
    #[serde(default = "default_mode")]
    pub mode: String,
}

/// Import data (supports both full export format and bare array).
#[derive(Debug, Clone, Deserialize)]
#[serde(untagged)]
pub enum ImportData {
    /// Full export format with metadata.
    Full(PermissionExportData),
    /// Bare array of permissions.
    Bare(Vec<PermissionExportItem>),
}

fn default_mode() -> String {
    "upsert".to_string()
}

/// Result of a single import operation.
#[derive(Debug, Clone, Serialize)]
pub struct ImportOperationResult {
    /// Tenant ID.
    pub tenant_id: String,
    /// User ID.
    pub user_id: String,
    /// Whether the operation succeeded.
    pub success: bool,
    /// Operation performed: created, updated, skipped, error.
    pub operation: String,
    /// Error message if failed (optional).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// Response for import operations.
#[derive(Debug, Clone, Serialize)]
pub struct ImportResponse {
    /// Total number of items processed.
    pub total: usize,
    /// Number of successfully created permissions.
    pub created: usize,
    /// Number of successfully updated permissions.
    pub updated: usize,
    /// Number of skipped permissions.
    pub skipped: usize,
    /// Number of failed operations.
    pub failed: usize,
    /// Detailed results for each operation.
    pub results: Vec<ImportOperationResult>,
}

// ===== Conversion Helpers =====

impl From<&TenantPermission> for PermissionExportItem {
    fn from(perm: &TenantPermission) -> Self {
        Self {
            tenant_id: perm.tenant_id.clone(),
            user_id: perm.user_id.clone(),
            role: perm.role.as_str().to_string(),
            active: perm.active,
            tool_permissions: perm
                .tool_permissions
                .iter()
                .map(|tp| ToolPermissionExportItem {
                    tool: tp.tool.clone(),
                    max_permission: tp.max_permission.as_str().to_string(),
                    allowed_operations: tp.allowed_operations.clone(),
                    denied_operations: tp.denied_operations.clone(),
                })
                .collect(),
        }
    }
}

impl TryFrom<&PermissionExportItem> for TenantPermission {
    type Error = String;

    fn try_from(item: &PermissionExportItem) -> Result<Self, Self::Error> {
        let role = TenantRole::from_str(&item.role)
            .ok_or_else(|| format!("Invalid role: {}", item.role))?;

        let tool_permissions = item
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
            tenant_id: item.tenant_id.clone(),
            user_id: item.user_id.clone(),
            role,
            tool_permissions,
            active: item.active,
        })
    }
}

// ===== Route Handlers =====

/// `GET /api/business-tools/permissions/export` — Export permissions.
pub async fn export_permissions(
    State(state): State<AppState>,
    Query(query): Query<ExportQuery>,
) -> Result<Response, (StatusCode, Json<ErrorResponse>)> {
    // Parse export format
    let format: ExportFormat = query.format.parse().map_err(|e| {
        (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: e,
                code: Some("INVALID_FORMAT".to_string()),
            }),
        )
    })?;

    // Get permissions
    let permissions = if let Some(tenant_id) = &query.tenant_id {
        state
            .permission_store
            .list_tenant_permissions(tenant_id)
            .await
            .map_err(map_store_error)?
    } else {
        // List all permissions (if store supports it)
        // For now, we need to list by tenant. If no tenant specified, return empty.
        // In a full implementation, we'd add a list_all method to PermissionStore.
        Vec::new()
    };

    // Convert to export format
    let export_items: Vec<PermissionExportItem> =
        permissions.iter().map(PermissionExportItem::from).collect();

    let export_data = PermissionExportData {
        version: "1.0".to_string(),
        exported_at: chrono::Utc::now().to_rfc3339(),
        count: export_items.len(),
        permissions: export_items.clone(),
    };

    // Generate filename
    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let tenant_suffix = query
        .tenant_id
        .as_ref()
        .map(|t| format!("_{}", t))
        .unwrap_or_default();
    let filename = format!(
        "permissions{}_{}.{}",
        tenant_suffix,
        timestamp,
        match format {
            ExportFormat::Json => "json",
            ExportFormat::Csv => "csv",
        }
    );

    match format {
        ExportFormat::Json => {
            let json = serde_json::to_string_pretty(&export_data).map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse {
                        error: format!("Failed to serialize permissions: {}", e),
                        code: Some("SERIALIZE_ERROR".to_string()),
                    }),
                )
            })?;

            Ok((
                StatusCode::OK,
                [
                    (header::CONTENT_TYPE, "application/json".to_string()),
                    (
                        header::CONTENT_DISPOSITION,
                        format!("attachment; filename=\"{}\"", filename),
                    ),
                ],
                json,
            )
                .into_response())
        }
        ExportFormat::Csv => {
            let csv = render_permissions_csv(&export_items);
            Ok((
                StatusCode::OK,
                [
                    (header::CONTENT_TYPE, "text/csv; charset=utf-8".to_string()),
                    (
                        header::CONTENT_DISPOSITION,
                        format!("attachment; filename=\"{}\"", filename),
                    ),
                ],
                csv,
            )
                .into_response())
        }
    }
}

/// `POST /api/business-tools/permissions/import` — Import permissions.
pub async fn import_permissions(
    State(state): State<AppState>,
    Json(request): Json<ImportRequest>,
) -> Result<Json<ImportResponse>, (StatusCode, Json<ErrorResponse>)> {
    let mode = request.mode.to_lowercase();
    let items = match &request.data {
        ImportData::Full(data) => data.permissions.clone(),
        ImportData::Bare(items) => items.clone(),
    };

    let mut results = Vec::new();
    let mut created = 0;
    let mut updated = 0;
    let mut skipped = 0;
    let mut failed = 0;

    for item in &items {
        let permission = match TenantPermission::try_from(item) {
            Ok(p) => p,
            Err(e) => {
                failed += 1;
                results.push(ImportOperationResult {
                    tenant_id: item.tenant_id.clone(),
                    user_id: item.user_id.clone(),
                    success: false,
                    operation: "error".to_string(),
                    error: Some(e),
                });
                continue;
            }
        };

        // Check if permission exists
        let existing = state
            .permission_store
            .get_permission(&item.tenant_id, &item.user_id)
            .await
            .ok()
            .flatten();

        match (mode.as_str(), existing.is_some()) {
            ("create", true) => {
                // Create mode: skip existing
                skipped += 1;
                results.push(ImportOperationResult {
                    tenant_id: item.tenant_id.clone(),
                    user_id: item.user_id.clone(),
                    success: true,
                    operation: "skipped".to_string(),
                    error: None,
                });
            }
            ("update", false) => {
                // Update mode: skip non-existing
                skipped += 1;
                results.push(ImportOperationResult {
                    tenant_id: item.tenant_id.clone(),
                    user_id: item.user_id.clone(),
                    success: true,
                    operation: "skipped".to_string(),
                    error: None,
                });
            }
            ("create", false) | ("upsert", false) => {
                // Create new
                match state.permission_store.create_permission(permission).await {
                    Ok(_) => {
                        created += 1;
                        results.push(ImportOperationResult {
                            tenant_id: item.tenant_id.clone(),
                            user_id: item.user_id.clone(),
                            success: true,
                            operation: "created".to_string(),
                            error: None,
                        });
                    }
                    Err(e) => {
                        failed += 1;
                        results.push(ImportOperationResult {
                            tenant_id: item.tenant_id.clone(),
                            user_id: item.user_id.clone(),
                            success: false,
                            operation: "error".to_string(),
                            error: Some(format!("{}", e)),
                        });
                    }
                }
            }
            ("update", true) | ("upsert", true) => {
                // Update existing
                match state.permission_store.update_permission(permission).await {
                    Ok(_) => {
                        updated += 1;
                        results.push(ImportOperationResult {
                            tenant_id: item.tenant_id.clone(),
                            user_id: item.user_id.clone(),
                            success: true,
                            operation: "updated".to_string(),
                            error: None,
                        });
                    }
                    Err(e) => {
                        failed += 1;
                        results.push(ImportOperationResult {
                            tenant_id: item.tenant_id.clone(),
                            user_id: item.user_id.clone(),
                            success: false,
                            operation: "error".to_string(),
                            error: Some(format!("{}", e)),
                        });
                    }
                }
            }
            _ => {
                // Invalid mode
                failed += 1;
                results.push(ImportOperationResult {
                    tenant_id: item.tenant_id.clone(),
                    user_id: item.user_id.clone(),
                    success: false,
                    operation: "error".to_string(),
                    error: Some(format!("Invalid mode: {}", mode)),
                });
            }
        }
    }

    Ok(Json(ImportResponse {
        total: items.len(),
        created,
        updated,
        skipped,
        failed,
        results,
    }))
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

// ===== Route Registration =====

/// Create permission export/import routes.
pub fn permission_export_import_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/business-tools/permissions/export",
            axum::routing::get(export_permissions),
        )
        .route(
            "/business-tools/permissions/import",
            axum::routing::post(import_permissions),
        )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_export_format_from_str() {
        assert_eq!("json".parse::<ExportFormat>().unwrap(), ExportFormat::Json);
        assert_eq!("JSON".parse::<ExportFormat>().unwrap(), ExportFormat::Json);
        assert_eq!("csv".parse::<ExportFormat>().unwrap(), ExportFormat::Csv);
        assert_eq!("CSV".parse::<ExportFormat>().unwrap(), ExportFormat::Csv);
        assert!("xml".parse::<ExportFormat>().is_err());
    }

    #[test]
    fn test_export_format_display() {
        assert_eq!(ExportFormat::Json.to_string(), "json");
    }

    #[test]
    fn test_export_query_default() {
        let query = ExportQuery::default();
        assert_eq!(query.format, "json");
        assert!(query.tenant_id.is_none());
    }

    #[test]
    fn test_permission_export_item_from_tenant_permission() {
        let perm = TenantPermission::owner("t1", "u1");
        let item = PermissionExportItem::from(&perm);
        assert_eq!(item.tenant_id, "t1");
        assert_eq!(item.user_id, "u1");
        assert_eq!(item.role, "owner");
        assert!(item.active);
        assert!(item.tool_permissions.is_empty());
    }

    #[test]
    fn test_tenant_permission_try_from_export_item() {
        let item = PermissionExportItem {
            tenant_id: "t1".to_string(),
            user_id: "u1".to_string(),
            role: "admin".to_string(),
            active: true,
            tool_permissions: vec![],
        };
        let perm = TenantPermission::try_from(&item).unwrap();
        assert_eq!(perm.tenant_id, "t1");
        assert!(matches!(perm.role, TenantRole::Admin));
    }

    #[test]
    fn test_tenant_permission_try_from_invalid_role() {
        let item = PermissionExportItem {
            tenant_id: "t1".to_string(),
            user_id: "u1".to_string(),
            role: "invalid".to_string(),
            active: true,
            tool_permissions: vec![],
        };
        let result = TenantPermission::try_from(&item);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Invalid role"));
    }

    #[test]
    fn test_permission_export_data_serialization() {
        let data = PermissionExportData {
            version: "1.0".to_string(),
            exported_at: "2026-01-01T00:00:00Z".to_string(),
            count: 1,
            permissions: vec![PermissionExportItem {
                tenant_id: "t1".to_string(),
                user_id: "u1".to_string(),
                role: "member".to_string(),
                active: true,
                tool_permissions: vec![],
            }],
        };
        let json = serde_json::to_string(&data).unwrap();
        assert!(json.contains("\"version\":\"1.0\""));
        assert!(json.contains("\"count\":1"));
        assert!(json.contains("\"tenant_id\":\"t1\""));
    }

    #[test]
    fn test_import_request_full_format() {
        let json = r#"{
            "version": "1.0",
            "exported_at": "2026-01-01T00:00:00Z",
            "count": 1,
            "permissions": [
                {"tenant_id": "t1", "user_id": "u1", "role": "admin", "active": true}
            ],
            "mode": "upsert"
        }"#;
        let req: ImportRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.mode, "upsert");
        match req.data {
            ImportData::Full(data) => {
                assert_eq!(data.version, "1.0");
                assert_eq!(data.permissions.len(), 1);
            }
            _ => panic!("Expected Full format"),
        }
    }

    #[test]
    fn test_import_request_bare_format() {
        // Bare format is a direct array of permission items
        let json = r#"[
            {"tenant_id": "t1", "user_id": "u1", "role": "admin", "active": true},
            {"tenant_id": "t2", "user_id": "u2", "role": "member", "active": false}
        ]"#;
        let data: ImportData = serde_json::from_str(json).unwrap();
        match data {
            ImportData::Bare(items) => {
                assert_eq!(items.len(), 2);
                assert_eq!(items[0].tenant_id, "t1");
                assert_eq!(items[0].role, "admin");
                assert!(items[0].active);
                assert_eq!(items[1].tenant_id, "t2");
                assert_eq!(items[1].role, "member");
                assert!(!items[1].active);
            }
            _ => panic!("Expected Bare format"),
        }
    }

    #[test]
    fn test_import_response_serialization() {
        let response = ImportResponse {
            total: 3,
            created: 1,
            updated: 1,
            skipped: 0,
            failed: 1,
            results: vec![
                ImportOperationResult {
                    tenant_id: "t1".to_string(),
                    user_id: "u1".to_string(),
                    success: true,
                    operation: "created".to_string(),
                    error: None,
                },
                ImportOperationResult {
                    tenant_id: "t2".to_string(),
                    user_id: "u2".to_string(),
                    success: false,
                    operation: "error".to_string(),
                    error: Some("Invalid role".to_string()),
                },
            ],
        };
        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("\"total\":3"));
        assert!(json.contains("\"created\":1"));
        assert!(json.contains("\"failed\":1"));
        assert!(json.contains("Invalid role"));
    }

    #[test]
    fn test_tool_permission_export_item() {
        let item = ToolPermissionExportItem {
            tool: "crm".to_string(),
            max_permission: "write".to_string(),
            allowed_operations: vec!["read".to_string(), "write".to_string()],
            denied_operations: vec!["delete".to_string()],
        };
        let json = serde_json::to_string(&item).unwrap();
        assert!(json.contains("\"tool\":\"crm\""));
        assert!(json.contains("\"max_permission\":\"write\""));
    }
}

    // ===== CSV rendering tests (V530f) =====

    #[test]
    fn test_csv_escape_plain() {
        assert_eq!(csv_escape("plain"), "plain");
    }

    #[test]
    fn test_csv_escape_quotes_and_commas() {
        assert_eq!(csv_escape("a,b"), "\"a,b\"");
        assert_eq!(csv_escape("say \"hi\""), "\"say \"\"hi\"\"\"");
    }

    #[test]
    fn test_export_format_csv_parse() {
        assert_eq!("csv".parse::<ExportFormat>().unwrap(), ExportFormat::Csv);
        assert_eq!("JSON".parse::<ExportFormat>().unwrap(), ExportFormat::Json);
        assert!("xml".parse::<ExportFormat>().is_err());
    }

    #[test]
    fn test_render_permissions_csv_header_and_row() {
        let item = PermissionExportItem {
            tenant_id: "t1".to_string(),
            user_id: "u1".to_string(),
            role: "owner".to_string(),
            active: true,
            tool_permissions: vec![ToolPermissionExportItem {
                tool: "query".to_string(),
                max_permission: "all".to_string(),
                allowed_operations: Vec::new(),
                denied_operations: Vec::new(),
            }],
        };
        let csv = render_permissions_csv(std::slice::from_ref(&item));
        assert!(csv.starts_with("tenant_id,user_id,role,active,tool_permissions"));
        assert!(csv.contains("t1,u1,owner,true,query:all"));
    }
