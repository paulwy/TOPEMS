use axum::{
    extract::{Json, Query, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use super::auth_utils::extract_user_id_from_token;
use crate::db::repository::*;
use crate::models::{CreateOfflineOperation, OfflineOperation, SyncPolicy, UpdateSyncPolicy};
use sqlx::Row;
use topems_shared_auth::auth::AuthState;
use topems_shared_core::response::ApiResponse;

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

/// 同步冲突解决策略。
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ConflictStrategy {
    /// 始终使用本地版本。
    PreferLocal,
    /// 始终使用远端版本。
    PreferRemote,
    /// 优先使用较新的版本（按字符串比较；相等时回退到 local）。
    PreferLatest,
    /// 拒绝冲突，保留远端版本作为安全默认。
    Reject,
}

/// 根据给定策略解决同步冲突，返回最终采用的字符串。
pub fn resolve_sync_conflict(local: &str, remote: &str, strategy: ConflictStrategy) -> String {
    if local == remote {
        return local.to_string();
    }
    match strategy {
        ConflictStrategy::PreferLocal => local.to_string(),
        ConflictStrategy::PreferRemote => remote.to_string(),
        ConflictStrategy::PreferLatest => {
            // 简单按字典序：取较大者作为"较新"，相等时回退到 local。
            if remote > local {
                remote.to_string()
            } else {
                local.to_string()
            }
        }
        ConflictStrategy::Reject => remote.to_string(),
    }
}

/// 校验操作类型是否被支持。
pub fn is_valid_operation_type(op: &str) -> bool {
    matches!(op, "create" | "update" | "delete")
}

/// 校验同步状态字符串是否合法。
pub fn is_valid_sync_status(status: &str) -> bool {
    matches!(status, "pending" | "syncing" | "synced" | "failed")
}

/// 判断是否应继续重试同步：尝试次数小于上限且未同步成功。
pub fn should_retry_sync(sync_attempts: i32, max_attempts: i32, status: &str) -> bool {
    if max_attempts <= 0 {
        return false;
    }
    status == "failed" && sync_attempts < max_attempts
}

/// 计算分页查询的偏移量，并保证不会因 page < 1 而产生负数。
pub fn compute_pagination_offset(page: i64, size: i64) -> i64 {
    let page = if page < 1 { 1 } else { page };
    let size = if size < 1 { 1 } else { size };
    (page - 1) * size
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
        only_own_schema_query!("mobile", "SELECT COUNT(*) FROM public.offline_operations WHERE user_id = $1 AND sync_status = 'pending'"),
    )
    .bind(user_id)
    .fetch_one(&pool)
    .await
    {
        Ok(c) => c,
        Err(_) => 0,
    };

    let syncing_count = match sqlx::query_scalar(
        only_own_schema_query!("mobile", "SELECT COUNT(*) FROM public.offline_operations WHERE user_id = $1 AND sync_status = 'syncing'"),
    )
    .bind(user_id)
    .fetch_one(&pool)
    .await
    {
        Ok(c) => c,
        Err(_) => 0,
    };

    let synced_count = match sqlx::query_scalar(
        only_own_schema_query!("mobile", "SELECT COUNT(*) FROM public.offline_operations WHERE user_id = $1 AND sync_status = 'synced'"),
    )
    .bind(user_id)
    .fetch_one(&pool)
    .await
    {
        Ok(c) => c,
        Err(_) => 0,
    };

    let failed_count = match sqlx::query_scalar(
        only_own_schema_query!("mobile", "SELECT COUNT(*) FROM public.offline_operations WHERE user_id = $1 AND sync_status = 'failed'"),
    )
    .bind(user_id)
    .fetch_one(&pool)
    .await
    {
        Ok(c) => c,
        Err(_) => 0,
    };

    let last_sync = match sqlx::query(
        only_own_schema_query!("mobile", "SELECT synced_at FROM public.offline_operations WHERE user_id = $1 AND sync_status = 'synced' ORDER BY synced_at DESC LIMIT 1"),
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
            only_own_schema_query!("mobile", "SELECT id, user_id, operation_type, entity_type, entity_id, payload, sync_status, created_at FROM public.offline_operations WHERE user_id = $1 AND sync_status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"),
        )
        .bind(user_id)
        .bind(status)
        .bind(size)
        .bind(offset)
    } else {
        sqlx::query(
            only_own_schema_query!("mobile", "SELECT id, user_id, operation_type, entity_type, entity_id, payload, sync_status, created_at FROM public.offline_operations WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"),
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

    let total = match sqlx::query(only_own_schema_query!(
        "mobile",
        "SELECT COUNT(*) FROM public.offline_operations WHERE user_id = $1"
    ))
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

#[cfg(test)]
mod tests {
    use super::*;

    // ---- resolve_sync_conflict ----

    #[test]
    fn test_resolve_sync_conflict_equal_returns_local() {
        let result = resolve_sync_conflict("abc", "abc", ConflictStrategy::PreferLocal);
        assert_eq!(result, "abc");
    }

    #[test]
    fn test_resolve_sync_conflict_prefer_local() {
        let result =
            resolve_sync_conflict("local-val", "remote-val", ConflictStrategy::PreferLocal);
        assert_eq!(result, "local-val");
    }

    #[test]
    fn test_resolve_sync_conflict_prefer_remote() {
        let result =
            resolve_sync_conflict("local-val", "remote-val", ConflictStrategy::PreferRemote);
        assert_eq!(result, "remote-val");
    }

    #[test]
    fn test_resolve_sync_conflict_prefer_latest_remote_newer() {
        // "remote-zzz" > "local-aaa"
        let result =
            resolve_sync_conflict("local-aaa", "remote-zzz", ConflictStrategy::PreferLatest);
        assert_eq!(result, "remote-zzz");
    }

    #[test]
    fn test_resolve_sync_conflict_prefer_latest_local_newer() {
        // 字典序比较：'z' > 'a'，故 "zzz-aaa" > "aaa-zzz"，local 更"新"。
        let result = resolve_sync_conflict("zzz-aaa", "aaa-zzz", ConflictStrategy::PreferLatest);
        assert_eq!(result, "zzz-aaa");
    }

    #[test]
    fn test_resolve_sync_conflict_reject_returns_remote() {
        let result = resolve_sync_conflict("local-val", "remote-val", ConflictStrategy::Reject);
        assert_eq!(result, "remote-val");
    }

    #[test]
    fn test_resolve_sync_conflict_empty_strings() {
        // 两者都为空 -> 相等 -> 返回空字符串
        let result = resolve_sync_conflict("", "", ConflictStrategy::PreferLocal);
        assert_eq!(result, "");
    }

    #[test]
    fn test_resolve_sync_conflict_one_empty_prefer_local() {
        let result = resolve_sync_conflict("", "remote", ConflictStrategy::PreferLocal);
        assert_eq!(result, "");
    }

    // ---- is_valid_operation_type ----

    #[test]
    fn test_is_valid_operation_type_valid() {
        assert!(is_valid_operation_type("create"));
        assert!(is_valid_operation_type("update"));
        assert!(is_valid_operation_type("delete"));
    }

    #[test]
    fn test_is_valid_operation_type_invalid() {
        assert!(!is_valid_operation_type(""));
        assert!(!is_valid_operation_type("CREATE"));
        assert!(!is_valid_operation_type("read"));
        assert!(!is_valid_operation_type("patch"));
    }

    // ---- is_valid_sync_status ----

    #[test]
    fn test_is_valid_sync_status_valid() {
        assert!(is_valid_sync_status("pending"));
        assert!(is_valid_sync_status("syncing"));
        assert!(is_valid_sync_status("synced"));
        assert!(is_valid_sync_status("failed"));
    }

    #[test]
    fn test_is_valid_sync_status_invalid() {
        assert!(!is_valid_sync_status(""));
        assert!(!is_valid_sync_status("PENDING"));
        assert!(!is_valid_sync_status("done"));
        assert!(!is_valid_sync_status("error"));
    }

    // ---- should_retry_sync ----

    #[test]
    fn test_should_retry_sync_below_max() {
        assert!(should_retry_sync(1, 5, "failed"));
        assert!(should_retry_sync(4, 5, "failed"));
    }

    #[test]
    fn test_should_retry_sync_at_max() {
        // 等于上限时不重试
        assert!(!should_retry_sync(5, 5, "failed"));
        assert!(!should_retry_sync(6, 5, "failed"));
    }

    #[test]
    fn test_should_retry_sync_non_failed_status() {
        assert!(!should_retry_sync(0, 5, "synced"));
        assert!(!should_retry_sync(0, 5, "pending"));
        assert!(!should_retry_sync(0, 5, "syncing"));
    }

    #[test]
    fn test_should_retry_sync_zero_max() {
        assert!(!should_retry_sync(0, 0, "failed"));
        assert!(!should_retry_sync(0, -1, "failed"));
    }

    #[test]
    fn test_should_retry_sync_negative_attempts() {
        // 负尝试次数仍小于上限，状态为 failed 时应重试
        assert!(should_retry_sync(-1, 5, "failed"));
    }

    // ---- compute_pagination_offset ----

    #[test]
    fn test_compute_pagination_offset_first_page() {
        assert_eq!(compute_pagination_offset(1, 20), 0);
    }

    #[test]
    fn test_compute_pagination_offset_second_page() {
        assert_eq!(compute_pagination_offset(2, 20), 20);
    }

    #[test]
    fn test_compute_pagination_offset_invalid_page() {
        assert_eq!(compute_pagination_offset(0, 20), 0);
        assert_eq!(compute_pagination_offset(-1, 20), 0);
    }

    #[test]
    fn test_compute_pagination_offset_invalid_size() {
        assert_eq!(compute_pagination_offset(2, 0), 1);
        assert_eq!(compute_pagination_offset(2, -1), 1);
    }

    #[test]
    fn test_compute_pagination_offset_large() {
        assert_eq!(compute_pagination_offset(100, 50), 4950);
    }
}
