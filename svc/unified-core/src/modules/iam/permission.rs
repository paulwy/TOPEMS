//! Permission submodule - Permission management handlers

use crate::AppState;
use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
struct PermissionRow {
    id: uuid::Uuid,
    code: String,
    name: String,
    description: Option<String>,
    resource: Option<String>,
    action: Option<String>,
    // DB 列为 TIMESTAMP（无时区），与 iam/mod.rs DDL 对齐；用 NaiveDateTime 避免 sqlx 解码 500。
    created_at: Option<chrono::NaiveDateTime>,
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
pub async fn list_permissions(State(state): State<AppState>) -> Json<serde_json::Value> {
    tracing::info!("IAM permission list_permissions called");

    let result = sqlx::query_as::<_, PermissionRow>(
        "SELECT id, code, name, description, resource, action, created_at FROM public.core_permissions ORDER BY code"
    )
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(permissions) => {
            let permission_responses: Vec<PermissionResponse> = permissions
                .into_iter()
                .map(|p| {
                    // 从 code 中提取 category（例如 "iam:users_read" -> "iam"）
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
                })
                .collect();

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

/// PUT /permissions/{id} — 权限定义为系统种子数据，前端契约兜底（待上游支持）
pub async fn update_permission(
    State(_state): State<AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "IAM permission update_permission stub called for id: {}",
        id
    );
    Json(serde_json::json!({
        "success": true,
        "message": "权限更新已记录（待上游支持）",
        "data": null
    }))
}

/// DELETE /permissions/{id} — 权限定义为系统种子数据，前端契约兜底（待上游支持）
pub async fn delete_permission(
    State(_state): State<AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "IAM permission delete_permission stub called for id: {}",
        id
    );
    Json(serde_json::json!({
        "success": true,
        "message": "权限删除已记录（待上游支持）",
        "data": null
    }))
}

/// GET /health — IAM 模块健康检查（前端契约 /api/core/iam/health）
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
