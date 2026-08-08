use axum::{
    extract::{Json, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use uuid::Uuid;

use super::auth_utils::extract_user_id_from_token;
use topems_shared_auth::auth::AuthState;
use topems_shared_core::response::ApiResponse;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Shortcut {
    pub id: Uuid,
    pub user_id: Uuid,
    pub name: String,
    pub icon: String,
    pub action_type: String,
    pub action_params: Option<serde_json::Value>,
    pub sort_order: i32,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Shortcut {
    pub fn from_row(row: &sqlx::postgres::PgRow) -> sqlx::Result<Self> {
        Ok(Self {
            id: row.try_get("id")?,
            user_id: row.try_get("user_id")?,
            name: row.try_get("name")?,
            icon: row.try_get("icon")?,
            action_type: row.try_get("action_type")?,
            action_params: row.try_get("action_params")?,
            sort_order: row.try_get("sort_order")?,
            is_active: row.try_get("is_active")?,
            created_at: row.try_get("created_at")?,
            updated_at: row.try_get("updated_at")?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateShortcutRequest {
    pub name: String,
    pub icon: String,
    pub action_type: String,
    pub action_params: Option<serde_json::Value>,
    pub sort_order: Option<i32>,
}

pub async fn get_shortcuts(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let user_id_uuid = match Uuid::parse_str(&user_id) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(ApiResponse::error(400, "无效的用户ID")),
            );
        }
    };

    let shortcuts: Vec<Shortcut> = match sqlx::query_as::<_, Shortcut>(
        "SELECT id, user_id, name, icon, action_type, action_params, sort_order, is_active, created_at, updated_at 
         FROM shortcuts WHERE user_id = $1 AND is_active = true ORDER BY sort_order ASC"
    )
    .bind(user_id_uuid)
    .fetch_all(&pool)
    .await
    {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("查询快捷操作失败: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(ApiResponse::error(500, "内部服务器错误")));
        }
    };

    (
        StatusCode::OK,
        Json(ApiResponse::success(shortcuts, "获取快捷操作列表成功")),
    )
}

pub async fn create_shortcut(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Json(payload): Json<CreateShortcutRequest>,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let user_id_uuid = match Uuid::parse_str(&user_id) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(ApiResponse::error(400, "无效的用户ID")),
            );
        }
    };

    let sort_order = match payload.sort_order {
        Some(v) => v,
        None => {
            #[derive(Debug, sqlx::FromRow)]
            struct NextOrder {
                next_order: Option<i32>,
            }
            match sqlx::query_as::<_, NextOrder>(
                "SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM shortcuts WHERE user_id = $1"
            )
            .bind(user_id_uuid)
            .fetch_one(&pool)
            .await
            {
                Ok(r) => r.next_order.unwrap_or(1),
                Err(_) => 1,
            }
        }
    };

    let shortcut_id = Uuid::new_v4();
    if let Err(e) = sqlx::query(
        "INSERT INTO shortcuts (id, user_id, name, icon, action_type, action_params, sort_order, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"
    )
        .bind(shortcut_id)
        .bind(user_id_uuid)
        .bind(&payload.name)
        .bind(&payload.icon)
        .bind(&payload.action_type)
        .bind(&payload.action_params)
        .bind(sort_order)
        .bind(true)
        .execute(&pool)
        .await
    {
        tracing::error!("创建快捷操作失败: {}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(ApiResponse::error(500, "创建快捷操作失败")));
    }

    let shortcut = match sqlx::query_as::<_, Shortcut>(
        "SELECT id, user_id, name, icon, action_type, action_params, sort_order, is_active, created_at, updated_at 
         FROM shortcuts WHERE id = $1"
    )
    .bind(shortcut_id)
    .fetch_one(&pool)
    .await
    {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("查询创建的快捷操作失败: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(ApiResponse::error(500, "查询快捷操作失败")));
        }
    };

    (
        StatusCode::CREATED,
        Json(ApiResponse::success(shortcut, "创建快捷操作成功")),
    )
}
