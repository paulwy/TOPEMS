//! Role submodule - Role management handlers

use axum::{extract::{Path, State}, Json};
use crate::AppState;
use serde::{Serialize, Deserialize};
use chrono::NaiveDateTime;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
struct RoleRow {
    id: uuid::Uuid,
    name: String,
    description: Option<String>,
    tenant_id: Option<uuid::Uuid>,
    created_at: Option<NaiveDateTime>,
    updated_at: Option<NaiveDateTime>,
}

#[derive(Debug, Clone, Serialize)]
struct RoleResponse {
    id: String,
    name: String,
    description: Option<String>,
    created_at: Option<String>,
}

pub async fn list_roles(
    State(state): State<AppState>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM role list_roles called");

    let result = sqlx::query_as::<_, RoleRow>(
        "SELECT id, name, description, tenant_id, created_at, updated_at FROM core_roles ORDER BY created_at DESC"
    )
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(roles) => {
            let role_responses: Vec<RoleResponse> = roles.into_iter().map(|r| {
                RoleResponse {
                    id: r.id.to_string(),
                    name: r.name,
                    description: r.description,
                    created_at: r.created_at.map(|t| t.to_string()),
                }
            }).collect();

            Json(serde_json::json!({
                "success": true,
                "message": "获取角色列表成功",
                "data": role_responses
            }))
        }
        Err(e) => {
            tracing::error!("Failed to fetch roles: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("获取角色列表失败: {}", e),
                "data": null,
                "code": 500
            }))
        }
    }
}

pub async fn create_role(
    State(_state): State<AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM role create_role called with: {:?}", payload);
    Json(serde_json::json!({
        "success": true,
        "message": "create_role success",
        "data": null
    }))
}

pub async fn get_role(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM role get_role called with id: {}", id);
    Json(serde_json::json!({
        "success": true,
        "message": "get_role success",
        "data": null
    }))
}

pub async fn update_role(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM role update_role called with id: {} and payload: {:?}", id, payload);
    Json(serde_json::json!({
        "success": true,
        "message": "update_role success",
        "data": null
    }))
}

pub async fn delete_role(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM role delete_role called with id: {}", id);
    Json(serde_json::json!({
        "success": true,
        "message": "delete_role success",
        "data": null
    }))
}