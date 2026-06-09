use axum::{
    extract::{State, Json},
    http::{StatusCode, HeaderMap},
    response::IntoResponse,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row, postgres::PgRow};
use uuid::Uuid;

use topems_shared::{ApiResponse, AuthState};
use super::auth_utils::extract_user_id_from_token;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OfflineSyncRequest {
    pub sync_type: String,
    pub data: serde_json::Value,
    pub last_sync_time: Option<DateTime<Utc>>,
    pub records_count: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OfflineSyncResponse {
    pub sync_id: Uuid,
    pub sync_type: String,
    pub status: String,
    pub synced_count: i32,
    pub failed_count: i32,
    pub server_time: DateTime<Utc>,
    pub next_sync_time: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OfflineStatusResponse {
    pub last_sync_time: Option<DateTime<Utc>>,
    pub pending_records: i32,
    pub sync_status: String,
    pub network_status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OfflineSyncRecord {
    pub id: Uuid,
    pub user_id: Uuid,
    pub sync_type: String,
    pub sync_data: serde_json::Value,
    pub status: String,
    pub synced_count: i32,
    pub failed_count: i32,
    pub created_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
}

impl OfflineSyncRecord {
    pub fn from_row(row: &PgRow) -> sqlx::Result<Self> {
        Ok(Self {
            id: row.try_get("id")?,
            user_id: row.try_get("user_id")?,
            sync_type: row.try_get("sync_type")?,
            sync_data: row.try_get("sync_data")?,
            status: row.try_get("status")?,
            synced_count: row.try_get("synced_count")?,
            failed_count: row.try_get("failed_count")?,
            created_at: row.try_get("created_at")?,
            completed_at: row.try_get("completed_at")?,
        })
    }
}

pub async fn sync_offline_data(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Json(payload): Json<OfflineSyncRequest>,
) -> impl IntoResponse {
    let user_id_str = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(ApiResponse::error(401, "未授权")));
        }
    };

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(u) => u,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(ApiResponse::error(400, "无效的用户ID")));
        }
    };

    let sync_id = Uuid::new_v4();
    
    if let Err(e) = sqlx::query("INSERT INTO offline_sync_records (id, user_id, sync_type, sync_data, status, synced_count, failed_count) VALUES ($1, $2, $3, $4, $5, $6, $7)")
        .bind(sync_id)
        .bind(user_id)
        .bind(&payload.sync_type)
        .bind(&payload.data)
        .bind("pending")
        .bind(0)
        .bind(0)
        .execute(&pool)
        .await
    {
        tracing::error!("创建同步记录失败: {}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(ApiResponse::error(500, "创建同步记录失败")));
    }

    let synced_count = payload.records_count;
    let failed_count = 0;

    if let Err(e) = sqlx::query("UPDATE offline_sync_records SET status = $1, synced_count = $2, failed_count = $3, completed_at = NOW() WHERE id = $4")
        .bind("completed")
        .bind(synced_count)
        .bind(failed_count)
        .bind(sync_id)
        .execute(&pool)
        .await
    {
        tracing::error!("更新同步状态失败: {}", e);
    }

    let response = OfflineSyncResponse {
        sync_id,
        sync_type: payload.sync_type,
        status: "completed".to_string(),
        synced_count,
        failed_count,
        server_time: Utc::now(),
        next_sync_time: Some(Utc::now() + chrono::Duration::minutes(5)),
    };

    (StatusCode::OK, Json(ApiResponse::success(response, "离线数据同步成功")))
}

pub async fn get_offline_status(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
) -> impl IntoResponse {
    let user_id_str = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (StatusCode::UNAUTHORIZED, Json(ApiResponse::error(401, "未授权")));
        }
    };

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(u) => u,
        Err(_) => {
            return (StatusCode::BAD_REQUEST, Json(ApiResponse::error(400, "无效的用户ID")));
        }
    };

    let last_sync = match sqlx::query("SELECT completed_at FROM offline_sync_records WHERE user_id = $1 AND status = 'completed' ORDER BY completed_at DESC LIMIT 1")
        .bind(user_id)
        .fetch_optional(&pool)
        .await
    {
        Ok(Some(row)) => row.try_get("completed_at").ok(),
        Ok(None) => None,
        Err(e) => {
            tracing::error!("查询最后同步时间失败: {}", e);
            None
        }
    };

    let pending_count = match sqlx::query("SELECT COUNT(*) FROM offline_sync_records WHERE user_id = $1 AND status = 'pending'")
        .bind(user_id)
        .fetch_one(&pool)
        .await
    {
        Ok(row) => row.try_get::<i64, _>(0).unwrap_or(0) as i32,
        Err(e) => {
            tracing::error!("统计待同步记录失败: {}", e);
            0
        }
    };

    let response = OfflineStatusResponse {
        last_sync_time: last_sync,
        pending_records: pending_count,
        sync_status: if pending_count > 0 { "pending" } else { "synced" }.to_string(),
        network_status: "online".to_string(),
    };

    (StatusCode::OK, Json(ApiResponse::success(response, "获取离线状态成功")))
}