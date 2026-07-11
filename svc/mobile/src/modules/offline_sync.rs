use axum::{
    extract::{Json, Query, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use super::auth_utils::extract_user_id_from_token;
use crate::db::repository::*;
use crate::models::{CreateOfflineOperation, OfflineOperation, SyncPolicy, UpdateSyncPolicy};
use sqlx::Row;
use topems_shared::{ApiResponse, AuthState};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncRequest {
    pub operations: Vec<CreateOfflineOperation>,
    pub last_sync_time: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncResponse {
    pub synced_count: i32,
    pub failed_count: i32,
    pub failed_operations: Vec<FailedOperation>,
    pub server_time: DateTime<Utc>,
    pub next_sync_time: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FailedOperation {
    pub operation_id: Uuid,
    pub entity_type: String,
    pub entity_id: Option<String>,
    pub error: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OfflineStatus {
    pub pending_count: i32,
    pub syncing_count: i32,
    pub synced_count: i32,
    pub failed_count: i32,
    pub last_sync_time: Option<DateTime<Utc>>,
    pub sync_policy: Option<SyncPolicy>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncHistoryResponse {
    pub items: Vec<OfflineOperation>,
    pub total: i64,
}

pub async fn sync_data(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Json(payload): Json<SyncRequest>,
) -> impl IntoResponse {
    let user_id_str = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(ApiResponse::error(400, "无效的用户ID")),
            );
        }
    };

    let mut synced_count = 0;
    let mut failed_count = 0;
    let mut failed_operations = Vec::new();

    for op in payload.operations {
        let tenant_id = Uuid::new_v4();
        match db_create_offline_operation(&pool, tenant_id, user_id, op.clone()).await {
            Ok(operation) => {
                match db_update_offline_operation_status(&pool, operation.id, "syncing", None).await
                {
                    Ok(_) => match apply_operation(&pool, &operation).await {
                        Ok(_) => {
                            let _ = db_update_offline_operation_status(
                                &pool,
                                operation.id,
                                "synced",
                                None,
                            )
                            .await;
                            synced_count += 1;
                        }
                        Err(e) => {
                            let _ = db_update_offline_operation_status(
                                &pool,
                                operation.id,
                                "failed",
                                Some(&e.to_string()),
                            )
                            .await;
                            failed_count += 1;
                            failed_operations.push(FailedOperation {
                                operation_id: operation.id,
                                entity_type: op.entity_type,
                                entity_id: Some(op.entity_id),
                                error: e.to_string(),
                            });
                        }
                    },
                    Err(e) => {
                        failed_count += 1;
                        failed_operations.push(FailedOperation {
                            operation_id: operation.id,
                            entity_type: op.entity_type,
                            entity_id: Some(op.entity_id),
                            error: format!("更新状态失败: {}", e),
                        });
                    }
                }
            }
            Err(e) => {
                failed_count += 1;
                failed_operations.push(FailedOperation {
                    operation_id: Uuid::new_v4(),
                    entity_type: op.entity_type,
                    entity_id: Some(op.entity_id),
                    error: format!("创建操作记录失败: {}", e),
                });
            }
        }
    }

    let response = SyncResponse {
        synced_count,
        failed_count,
        failed_operations,
        server_time: Utc::now(),
        next_sync_time: Some(Utc::now() + chrono::Duration::minutes(5)),
    };

    (
        StatusCode::OK,
        Json(ApiResponse::success(response, "同步完成")),
    )
}

async fn apply_operation(_pool: &PgPool, operation: &OfflineOperation) -> Result<(), String> {
    match operation.operation_type.as_str() {
        "create" | "update" | "delete" => Ok(()),
        _ => Err(format!("不支持的操作类型: {}", operation.operation_type)),
    }
}

pub async fn get_offline_status(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
) -> impl IntoResponse {
    let user_id_str = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(ApiResponse::error(400, "无效的用户ID")),
            );
        }
    };

    let pending_count = match sqlx::query_scalar(
        "SELECT COUNT(*) FROM offline_operations WHERE user_id = $1 AND sync_status = 'pending'",
    )
    .bind(user_id)
    .fetch_one(&pool)
    .await
    {
        Ok(c) => c,
        Err(_) => 0,
    };

    let syncing_count = match sqlx::query_scalar(
        "SELECT COUNT(*) FROM offline_operations WHERE user_id = $1 AND sync_status = 'syncing'",
    )
    .bind(user_id)
    .fetch_one(&pool)
    .await
    {
        Ok(c) => c,
        Err(_) => 0,
    };

    let synced_count = match sqlx::query_scalar(
        "SELECT COUNT(*) FROM offline_operations WHERE user_id = $1 AND sync_status = 'synced'",
    )
    .bind(user_id)
    .fetch_one(&pool)
    .await
    {
        Ok(c) => c,
        Err(_) => 0,
    };

    let failed_count = match sqlx::query_scalar(
        "SELECT COUNT(*) FROM offline_operations WHERE user_id = $1 AND sync_status = 'failed'",
    )
    .bind(user_id)
    .fetch_one(&pool)
    .await
    {
        Ok(c) => c,
        Err(_) => 0,
    };

    let last_sync = match sqlx::query(
        "SELECT synced_at FROM offline_operations WHERE user_id = $1 AND sync_status = 'synced' ORDER BY synced_at DESC LIMIT 1",
    )
    .bind(user_id)
    .fetch_optional(&pool)
    .await
    {
        Ok(Some(row)) => row.try_get("synced_at").ok(),
        _ => None,
    };

    let sync_policy = match db_get_sync_policy(&pool, user_id).await {
        Ok(p) => p,
        Err(_) => None,
    };

    let response = OfflineStatus {
        pending_count,
        syncing_count,
        synced_count,
        failed_count,
        last_sync_time: last_sync,
        sync_policy,
    };

    (
        StatusCode::OK,
        Json(ApiResponse::success(response, "获取离线状态成功")),
    )
}

pub async fn get_sync_history(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Query(params): Query<SyncHistoryQuery>,
) -> impl IntoResponse {
    let user_id_str = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(ApiResponse::error(400, "无效的用户ID")),
            );
        }
    };

    let page = params.page.unwrap_or(1);
    let size = params.size.unwrap_or(20);
    let offset = (page - 1) * size;

    let query = if let Some(status) = &params.status {
        sqlx::query(
            "SELECT * FROM offline_operations WHERE user_id = $1 AND sync_status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4",
        )
        .bind(user_id)
        .bind(status)
        .bind(size)
        .bind(offset)
    } else {
        sqlx::query(
            "SELECT * FROM offline_operations WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        )
        .bind(user_id)
        .bind(size)
        .bind(offset)
    };

    let items = match query.fetch_all(&pool).await {
        Ok(rows) => rows
            .into_iter()
            .filter_map(|row| OfflineOperation::from_row(&row).ok())
            .collect(),
        Err(e) => {
            tracing::error!("查询同步历史失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "内部服务器错误")),
            );
        }
    };

    let total = match sqlx::query("SELECT COUNT(*) FROM offline_operations WHERE user_id = $1")
        .bind(user_id)
        .fetch_one(&pool)
        .await
    {
        Ok(row) => row.try_get::<i64, _>(0).unwrap_or(0),
        Err(_) => 0,
    };

    let response = SyncHistoryResponse { items, total };

    (
        StatusCode::OK,
        Json(ApiResponse::success(response, "获取同步历史成功")),
    )
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncHistoryQuery {
    pub page: Option<i64>,
    pub size: Option<i64>,
    pub status: Option<String>,
}

pub async fn get_sync_policy(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
) -> impl IntoResponse {
    let user_id_str = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(ApiResponse::error(400, "无效的用户ID")),
            );
        }
    };

    let policy = match db_get_sync_policy(&pool, user_id).await {
        Ok(p) => p,
        Err(e) => {
            tracing::error!("查询同步策略失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "内部服务器错误")),
            );
        }
    };

    if let Some(policy) = policy {
        (
            StatusCode::OK,
            Json(ApiResponse::success(policy, "获取同步策略成功")),
        )
    } else {
        (
            StatusCode::NOT_FOUND,
            Json(ApiResponse::error(404, "同步策略不存在")),
        )
    }
}

pub async fn update_sync_policy(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Json(payload): Json<UpdateSyncPolicy>,
) -> impl IntoResponse {
    let user_id_str = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(ApiResponse::error(400, "无效的用户ID")),
            );
        }
    };

    let tenant_id = Uuid::new_v4();
    let policy = match db_create_or_update_sync_policy(&pool, tenant_id, user_id, payload).await {
        Ok(p) => p,
        Err(e) => {
            tracing::error!("更新同步策略失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "更新同步策略失败")),
            );
        }
    };

    (
        StatusCode::OK,
        Json(ApiResponse::success(policy, "更新同步策略成功")),
    )
}

pub async fn retry_failed_sync(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
) -> impl IntoResponse {
    let user_id_str = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(ApiResponse::error(400, "无效的用户ID")),
            );
        }
    };

    let failed_ops = match db_get_offline_operations(&pool, user_id, Some("failed")).await {
        Ok(ops) => ops,
        Err(e) => {
            tracing::error!("查询失败操作失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "内部服务器错误")),
            );
        }
    };

    let mut retried_count = 0;
    let mut still_failed_count = 0;

    for op in failed_ops {
        if op.sync_attempts >= 5 {
            still_failed_count += 1;
            continue;
        }

        let _ = db_update_offline_operation_status(&pool, op.id, "syncing", None).await;

        match apply_operation(&pool, &op).await {
            Ok(_) => {
                let _ = db_update_offline_operation_status(&pool, op.id, "synced", None).await;
                retried_count += 1;
            }
            Err(e) => {
                let _ = db_update_offline_operation_status(&pool, op.id, "failed", Some(&e)).await;
                still_failed_count += 1;
            }
        }
    }

    let response = serde_json::json!({
        "retried_count": retried_count,
        "still_failed_count": still_failed_count,
    });

    (
        StatusCode::OK,
        Json(ApiResponse::success(response, "重试完成")),
    )
}
