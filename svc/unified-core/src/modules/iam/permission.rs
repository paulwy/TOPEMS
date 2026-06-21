//! Permission submodule - Permission management handlers

use axum::{extract::State, Json};
use crate::AppState;
use serde::{Serialize, Deserialize};
use chrono::NaiveDateTime;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
struct PermissionRow {
    id: uuid::Uuid,
    code: String,
    name: String,
    description: Option<String>,
    resource: Option<String>,
    action: Option<String>,
    created_at: Option<NaiveDateTime>,
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

pub async fn list_permissions(
    State(state): State<AppState>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM permission list_permissions called");

    let result = sqlx::query_as::<_, PermissionRow>(
        "SELECT id, code, name, description, resource, action, created_at FROM core_permissions ORDER BY code"
    )
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(permissions) => {
            let permission_responses: Vec<PermissionResponse> = permissions.into_iter().map(|p| {
                // 从 code 中提取 category（例如 "iam:users_read" -> "iam"）
                let category = p.code.split(':').next().unwrap_or("other").to_string();

                PermissionResponse {
                    id: p.id.to_string(),
                    code: p.code.clone(),
                    name: p.name,
                    description: p.description,
                    category,
                    resource: p.resource,
                    action: p.action,
                }
            }).collect();

            Json(serde_json::json!({
                "success": true,
                "message": "获取权限列表成功",
                "data": permission_responses
            }))
        }
        Err(e) => {
            tracing::error!("Failed to fetch permissions: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("获取权限列表失败: {}", e),
                "data": null,
                "code": 500
            }))
        }
    }
}