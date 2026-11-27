//! Permission submodule - Permission management handlers

use crate::AppState;
use axum::{extract::State, Extension, Json};
use serde::{Deserialize, Serialize};
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
struct PermissionRow {
    id: uuid::Uuid,
    code: String,
    name: String,
    description: Option<String>,
    resource: Option<String>,
    action: Option<String>,
    // DB 列为 TIMESTAMP（无时区），与 iam/mod.rs DDL 对齐；用 NaiveDateTime 避免 sqlx 解码 500。
    created_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Clone, Serialize)]
struct PermissionResponse {
    id: String,
    code: String,
    name: String,
    description: Option<String>,
    category: String,
    resource: Option<String>,
    action: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["unified-core:iam:permission:read"])),
    path = "/iam/permissions",
    tag = "IAM-Permissions",
    responses(
        (status = 200, description = "权限列表（含 category/resource/action 提取）"),
        (status = 500, description = "服务内部错误"),
    )
)]
pub async fn list_permissions(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM permission list_permissions called");

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(topems_shared_core::response::error_value(
            500,
            "数据库事务上下文缺失",
        ));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("权限目录作用域创建失败: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("获取权限列表失败: {}", e),
            ));
        }
    };
    let result = sqlx::query_as::<_, PermissionRow>(
        "SELECT id, code, name, description, resource, action, created_at::timestamptz AS created_at FROM public.core_permissions ORDER BY code"
    )
    .fetch_all(&mut scope)
    .await;
    let _ = scope.commit().await;

    match result {
        Ok(permissions) => {
            let permission_responses: Vec<PermissionResponse> =
                permissions.into_iter().map(to_response).collect();

            Json(serde_json::json!({
                "success": true,
                "message": "获取权限列表成功",
                "data": permission_responses
            }))
        }
        Err(e) => {
            tracing::error!("Failed to fetch permissions: {}", e);
            Json(topems_shared_core::response::error_value(
                500,
                &format!("获取权限列表失败: {}", e),
            ))
        }
    }
}

/// 从权限 code 中提取 category（例如 "iam:users_read" -> "iam"）
fn extract_category(code: &str) -> String {
    code.split(':').next().unwrap_or("other").to_string()
}

fn to_response(p: PermissionRow) -> PermissionResponse {
    let category = extract_category(&p.code);
    PermissionResponse {
        id: p.id.to_string(),
        code: p.code.clone(),
        name: p.name,
        description: p.description,
        category,
        resource: p.resource,
        action: p.action,
    }
}

/// GET /iam/permissions/grantable — 返回“当前操作者可授予”的权限目录。
///
/// 平台管理员（含超管）得到全量；租户管理员只得到自身权限集中的码，
/// 与 role handler 的“授予不得超出自身权限集”校验同源。
#[utoipa::path(
    get,
    security(("BearerAuth" = ["unified-core:iam:role:read"])),
    path = "/iam/permissions/grantable",
    tag = "IAM-Permissions",
    responses(
        (status = 200, description = "当前操作者可授予的权限列表"),
        (status = 500, description = "服务内部错误"),
    )
)]
pub async fn list_grantable_permissions(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM permission list_grantable_permissions called");

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return Json(topems_shared_core::response::error_value(
            500,
            "数据库事务上下文缺失",
        ));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("可授权限作用域创建失败: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("获取可授权限失败: {}", e),
            ));
        }
    };
    let result = sqlx::query_as::<_, PermissionRow>(
        "SELECT id, code, name, description, resource, action, created_at::timestamptz AS created_at FROM public.core_permissions WHERE deleted_at IS NULL ORDER BY code",
    )
    .fetch_all(&mut scope)
    .await;
    let _ = scope.commit().await;

    match result {
        Ok(permissions) => {
            let permission_responses: Vec<PermissionResponse> = permissions
                .into_iter()
                .filter(|p| claims.has_permission(&p.code))
                .map(to_response)
                .collect();

            Json(serde_json::json!({
                "success": true,
                "message": "获取可授权限列表成功",
                "data": permission_responses,
                "code": 200
            }))
        }
        Err(e) => {
            tracing::error!("Failed to fetch grantable permissions: {}", e);
            Json(topems_shared_core::response::error_value(
                500,
                &format!("获取可授权限列表失败: {}", e),
            ))
        }
    }
}

/// PUT /permissions/{id} — P2-5 诚实 501：权限定义为系统种子数据，
/// unified-core 无权限定义写入数据源，不再返回假成功回执。
#[utoipa::path(
    put,
    security(("BearerAuth" = [])),
    path = "/iam/permissions/{id}",
    tag = "Auto-Backfill",
    params(
        ("id" = String, Path, description = "id"),
    ),
    responses((status = 200, description = "put /iam/permissions/{id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn update_permission(
    State(_state): State<AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "IAM permission update_permission not-implemented called for id: {}",
        id
    );
    Json(topems_shared_core::response::error_value(
        501,
        "权限更新未实现：权限为系统种子数据，unified-core 无权限定义写入数据源（Not Implemented）",
    ))
}

/// DELETE /permissions/{id} — P2-5 诚实 501：权限定义为系统种子数据，
/// unified-core 无权限定义写入数据源，不再返回假成功回执。
#[utoipa::path(
    delete,
    security(("BearerAuth" = [])),
    path = "/iam/permissions/{id}",
    tag = "Auto-Backfill",
    params(
        ("id" = String, Path, description = "id"),
    ),
    responses((status = 200, description = "delete /iam/permissions/{id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn delete_permission(
    State(_state): State<AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "IAM permission delete_permission not-implemented called for id: {}",
        id
    );
    Json(topems_shared_core::response::error_value(
        501,
        "权限删除未实现：权限为系统种子数据，unified-core 无权限定义写入数据源（Not Implemented）",
    ))
}

/// POST /permissions — P2-5 诚实 501：权限定义为系统种子数据，
/// unified-core 无权限定义写入数据源，不再返回假成功回执。
/// 对齐前端 PermissionManagementPage 的 createPermission；路由保留挂载避免 405。
#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/iam/permissions",
    tag = "Auto-Backfill",
    responses((status = 200, description = "post /iam/permissions"), (status = 500, description = "服务内部错误")),
)]
pub async fn create_permission(
    State(_state): State<AppState>,
    Json(_payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM permission create_permission not-implemented called");
    Json(topems_shared_core::response::error_value(
        501,
        "权限创建未实现：权限为系统种子数据，unified-core 无权限定义写入数据源（Not Implemented）",
    ))
}

/// GET /health — IAM 模块健康检查（前端契约 /api/core/iam/health）
#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/iam/health",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /iam/health"), (status = 500, description = "服务内部错误")),
)]
pub async fn health() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "success": true,
        "message": "iam service healthy",
        "data": { "status": "ok", "service": "iam" },
        "code": 200
    }))
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_category_normal() {
        assert_eq!(extract_category("iam:users_read"), "iam");
        assert_eq!(extract_category("crm:customers_create"), "crm");
        assert_eq!(extract_category("finance:invoices_read"), "finance");
    }

    #[test]
    fn test_extract_category_multiple_colons() {
        assert_eq!(extract_category("iam:users:read"), "iam");
        assert_eq!(extract_category("a:b:c:d"), "a");
    }

    #[test]
    fn test_extract_category_no_colon() {
        assert_eq!(extract_category("users_read"), "users_read");
        assert_eq!(extract_category("admin"), "admin");
    }

    #[test]
    fn test_extract_category_empty() {
        assert_eq!(extract_category(""), "");
    }

    #[test]
    fn test_extract_category_starts_with_colon() {
        assert_eq!(extract_category(":users_read"), "");
    }
}
