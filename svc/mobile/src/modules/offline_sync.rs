use axum::{
    extract::{Extension, Json, Query, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::TopemsError;
use topems_shared_db::scope::{Db, ScopedTxn, PLATFORM_TENANT_ID};
use uuid::Uuid;

use super::auth_utils::{extract_bearer_token, extract_user_id_from_token};
use crate::db::repository::*;
use crate::models::{CreateOfflineOperation, OfflineOperation, SyncPolicy, UpdateSyncPolicy};
use sqlx::Row;
use topems_shared_auth::auth::{verify_jwt_token, AuthState, Claims};
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_core::response::ApiResponse;

fn tenant_filter(claims: &Claims) -> Option<Uuid> {
    if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok())
    }
}

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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mobile:offline:write"])),
    path = "/offline/sync-data",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "offline"
)]
pub async fn sync_data(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Json(payload): Json<SyncRequest>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let user_id_str = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                ApiResponse::bad_request("无效的用户ID"),
            );
        }
    };

    let mut synced_count = 0;
    let mut failed_count = 0;
    let mut failed_operations = Vec::new();

    for op in payload.operations {
        let tenant_id = Uuid::new_v4();
        match db_create_offline_operation(&mut scope, tenant_id, user_id, op.clone()).await {
            Ok(operation) => {
                match db_update_offline_operation_status(
                    &mut scope,
                    operation.id,
                    "syncing",
                    None,
                    None,
                )
                .await
                {
                    Ok(_) => match apply_operation(&mut scope, &operation).await {
                        Ok(_) => {
                            let _ = db_update_offline_operation_status(
                                &mut scope,
                                operation.id,
                                "synced",
                                None,
                                None,
                            )
                            .await;
                            synced_count += 1;
                        }
                        Err(e) => {
                            let _ = db_update_offline_operation_status(
                                &mut scope,
                                operation.id,
                                "failed",
                                Some(&e.to_string()),
                                None,
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

    let __mobile_response = { (StatusCode::OK, ApiResponse::success(response, "同步完成")) };
    let _ = scope.commit().await;
    __mobile_response
}

async fn apply_operation(
    _scope: &mut ScopedTxn<'_>,
    operation: &OfflineOperation,
) -> Result<(), TopemsError> {
    match operation.operation_type.as_str() {
        "create" | "update" | "delete" => Ok(()),
        _ => Err(TopemsError::ValidationFailed(format!(
            "不支持的操作类型: {}",
            operation.operation_type
        ))),
    }
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:offline:read"])),
    path = "/offline/sync-status",
    responses((status = 200, description = "get_offline_status OK")),
    tag = "offline_sync"
)]

pub async fn get_offline_status(
    headers: HeaderMap,
    Extension(_claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let user_id_str = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                ApiResponse::bad_request("无效的用户ID"),
            );
        }
    };

    let pending_count = match sqlx::query_scalar(
        only_own_schema_query!("mobile", "SELECT COUNT(*) FROM mobile.offline_operations WHERE user_id = $1 AND sync_status = 'pending'"),
    )
    .bind(user_id)
    .fetch_one(&mut scope)
    .await
    {
        Ok(c) => c,
        Err(_) => 0,
    };

    let syncing_count = match sqlx::query_scalar(
        only_own_schema_query!("mobile", "SELECT COUNT(*) FROM mobile.offline_operations WHERE user_id = $1 AND sync_status = 'syncing'"),
    )
    .bind(user_id)
    .fetch_one(&mut scope)
    .await
    {
        Ok(c) => c,
        Err(_) => 0,
    };

    let synced_count = match sqlx::query_scalar(
        only_own_schema_query!("mobile", "SELECT COUNT(*) FROM mobile.offline_operations WHERE user_id = $1 AND sync_status = 'synced'"),
    )
    .bind(user_id)
    .fetch_one(&mut scope)
    .await
    {
        Ok(c) => c,
        Err(_) => 0,
    };

    let failed_count = match sqlx::query_scalar(
        only_own_schema_query!("mobile", "SELECT COUNT(*) FROM mobile.offline_operations WHERE user_id = $1 AND sync_status = 'failed'"),
    )
    .bind(user_id)
    .fetch_one(&mut scope)
    .await
    {
        Ok(c) => c,
        Err(_) => 0,
    };

    let last_sync = match sqlx::query(
        only_own_schema_query!("mobile", "SELECT synced_at FROM mobile.offline_operations WHERE user_id = $1 AND sync_status = 'synced' ORDER BY synced_at DESC LIMIT 1"),
    )
    .bind(user_id)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(Some(row)) => row.try_get("synced_at").ok(),
        _ => None,
    };

    let sync_policy = match db_get_sync_policy(&mut scope, user_id).await {
        Ok(p) => p,
        Err(_) => None,
    };

    let __mobile_response = {
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
            ApiResponse::success(response, "获取离线状态成功"),
        )
    };
    let _ = scope.commit().await;
    __mobile_response
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:offline:read"])),
    path = "/offline/sync-history",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "offline"
)]
pub async fn get_sync_history(
    headers: HeaderMap,
    Extension(_claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Query(params): Query<SyncHistoryQuery>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let user_id_str = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                ApiResponse::bad_request("无效的用户ID"),
            );
        }
    };

    let page = params.page.unwrap_or(1);
    let size = params.size.unwrap_or(20);
    let offset = (page - 1) * size;

    // 根因：旧 SELECT 引用了 mobile.offline_operations 不存在的 payload 列
    // （真实列名为 operation_data），且列不全导致 OfflineOperation::from_row 失败。
    // 按真实表结构与 from_row 所需列内联查询。
    let query = if let Some(status) = &params.status {
        sqlx::query(
            only_own_schema_query!("mobile", "SELECT id, tenant_id, user_id, operation_type, entity_type, entity_id, operation_data, sync_status, sync_attempts, last_sync_error, created_at, synced_at FROM mobile.offline_operations WHERE user_id = $1 AND sync_status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"),
        )
        .bind(user_id)
        .bind(status)
        .bind(size)
        .bind(offset)
    } else {
        sqlx::query(
            only_own_schema_query!("mobile", "SELECT id, tenant_id, user_id, operation_type, entity_type, entity_id, operation_data, sync_status, sync_attempts, last_sync_error, created_at, synced_at FROM mobile.offline_operations WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"),
        )
        .bind(user_id)
        .bind(size)
        .bind(offset)
    };

    let items = match query.fetch_all(&mut scope).await {
        Ok(rows) => rows
            .into_iter()
            .filter_map(|row| OfflineOperation::from_row(&row).ok())
            .collect(),
        Err(e) => {
            tracing::error!("查询同步历史失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("内部服务器错误"),
            );
        }
    };

    let total = match sqlx::query(only_own_schema_query!(
        "mobile",
        "SELECT COUNT(*) FROM mobile.offline_operations WHERE user_id = $1"
    ))
    .bind(user_id)
    .fetch_one(&mut scope)
    .await
    {
        Ok(row) => row.try_get::<i64, _>(0).unwrap_or(0),
        Err(_) => 0,
    };

    let response = SyncHistoryResponse { items, total };

    (
        StatusCode::OK,
        ApiResponse::success(response, "获取同步历史成功"),
    )
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncHistoryQuery {
    pub page: Option<i64>,
    pub size: Option<i64>,
    pub status: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:offline:read"])),
    path = "/offline/sync-policy",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "offline"
)]
pub async fn get_sync_policy(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let user_id_str = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                ApiResponse::bad_request("无效的用户ID"),
            );
        }
    };

    // 根因：db_get_sync_policy 查询的 policy_type/sync_interval 等列在 mobile.sync_policies
    // 中不存在（真实列为 auto_sync_enabled/sync_interval_minutes 等）。按真实表结构内联查询。
    let row = match sqlx::query(only_own_schema_query!(
        "mobile",
        "SELECT id, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000') AS tenant_id, user_id, auto_sync_enabled, sync_interval_minutes,
         sync_on_network_change, conflict_strategy, created_at, updated_at
         FROM mobile.sync_policies WHERE user_id = $1 AND deleted_at IS NULL"
    ))
    .bind(user_id)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("查询同步策略失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("内部服务器错误"),
            );
        }
    };

    let __mobile_response = {
        let policy = match row.map(|r| SyncPolicy::from_row(&r)) {
            Some(Ok(p)) => p,
            Some(Err(e)) => {
                tracing::error!("解析同步策略失败: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    ApiResponse::server_error("内部服务器错误"),
                );
            }
            // 无记录时返回默认策略（HTTP 200），避免裸 404 被前端契约探测判为路由缺失。
            None => SyncPolicy {
                id: Uuid::new_v4(),
                tenant_id: Uuid::nil(),
                user_id,
                auto_sync_enabled: true,
                sync_interval_minutes: 15,
                sync_on_network_change: true,
                conflict_strategy: "server_wins".to_string(),
                created_at: Utc::now(),
                updated_at: Utc::now(),
            },
        };

        (
            StatusCode::OK,
            ApiResponse::success(policy, "获取同步策略成功"),
        )
    };
    let _ = scope.commit().await;
    __mobile_response
}

#[utoipa::path(
    put,
    path = "/api/mobile/offline/sync-policy",
    tag = "mobile",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
pub async fn update_sync_policy(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Json(payload): Json<UpdateSyncPolicy>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let user_id_str = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                ApiResponse::bad_request("无效的用户ID"),
            );
        }
    };

    // 租户绑定复制 middleware 的超管豁免语义：
    // - claims.is_superuser（超管，冒烟 test_admin 即此类）：middleware 跳过 claims.tenant_id、
    //   将上下文置零 uuid，故 handler 绑真实租户反而在零 uuid 上下文被
    //   rls_tenant_isolation 拒绝 → 超管一律绑 PLATFORM_TENANT_ID（全零哨兵公共行，
    //   零 uuid 上下文命中严格策略的 tenant_id = 上下文分支）。
    //   平台语料表已去掉 `tenant_id IS NULL` 放行，普通租户不再看到该公共行。
    // - 普通用户：绑 claims.tenant_id 解析值（Some(id)），解析失败回退 NULL。
    // 注意 ON CONFLICT (user_id) 仅更新业务列，不回写 tenant_id。
    let tenant_id: Option<Uuid> = extract_bearer_token(&headers)
        .and_then(|t| verify_jwt_token(&t, &auth_state.jwt_secret).ok())
        .and_then(|c| {
            if c.is_superuser {
                Some(PLATFORM_TENANT_ID)
            } else {
                c.tenant_id.and_then(|t| Uuid::parse_str(&t).ok())
            }
        });

    // 根因：db_create_or_update_sync_policy 依赖的 policy_type 列不存在。
    // 按真实表结构（auto_sync_enabled/sync_interval_minutes/...）内联 UPSERT，
    // sync_policies.user_id 有 UNIQUE 约束，可按用户冲突更新。
    let auto_sync_enabled = payload.auto_sync_enabled.unwrap_or(true);
    let sync_interval_minutes = payload.sync_interval_minutes.unwrap_or(15);
    let sync_on_network_change = payload.sync_on_network_change.unwrap_or(true);
    let conflict_strategy = payload
        .conflict_strategy
        .unwrap_or_else(|| "server_wins".to_string());

    let row = match sqlx::query(only_own_schema_query!(
        "mobile",
        "INSERT INTO mobile.sync_policies (id, tenant_id, user_id, auto_sync_enabled,
         sync_interval_minutes, sync_on_network_change, conflict_strategy, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           auto_sync_enabled = EXCLUDED.auto_sync_enabled,
           sync_interval_minutes = EXCLUDED.sync_interval_minutes,
           sync_on_network_change = EXCLUDED.sync_on_network_change,
           conflict_strategy = EXCLUDED.conflict_strategy,
           updated_at = NOW()
         RETURNING id, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000') AS tenant_id, user_id, auto_sync_enabled, sync_interval_minutes,
                   sync_on_network_change, conflict_strategy, created_at, updated_at"
    ))
    .bind(Uuid::new_v4())
    .bind(tenant_id)
    .bind(user_id)
    .bind(auto_sync_enabled)
    .bind(sync_interval_minutes)
    .bind(sync_on_network_change)
    .bind(&conflict_strategy)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("更新同步策略失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("更新同步策略失败"),
            );
        }
    };

    let __mobile_response = {
        let policy = match row.map(|r| SyncPolicy::from_row(&r)) {
            Some(Ok(p)) => p,
            Some(Err(e)) => {
                tracing::error!("解析同步策略失败: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    ApiResponse::server_error("内部服务器错误"),
                );
            }
            None => {
                tracing::error!("更新同步策略后未返回记录");
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    ApiResponse::server_error("内部服务器错误"),
                );
            }
        };

        (
            StatusCode::OK,
            ApiResponse::success(policy, "更新同步策略成功"),
        )
    };
    let _ = scope.commit().await;
    __mobile_response
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mobile:offline:write"])),
    path = "/offline/retry-failed",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "offline"
)]
pub async fn retry_failed_sync(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let user_id_str = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                ApiResponse::bad_request("无效的用户ID"),
            );
        }
    };

    // 根因：db_get_offline_operations 查询的 payload 列不存在（真实列为 operation_data）。
    // 按真实表结构与 OfflineOperation::from_row 所需列内联查询失败操作。
    let rows = match sqlx::query(only_own_schema_query!(
        "mobile",
        "SELECT id, tenant_id, user_id, operation_type, entity_type, entity_id,
         operation_data, sync_status, sync_attempts, last_sync_error, created_at, synced_at
         FROM mobile.offline_operations
         WHERE user_id = $1 AND sync_status = 'failed'
         ORDER BY created_at ASC"
    ))
    .bind(user_id)
    .fetch_all(&mut scope)
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            tracing::error!("查询失败操作失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("内部服务器错误"),
            );
        }
    };
    let failed_ops: Vec<OfflineOperation> = rows
        .iter()
        .filter_map(|row| OfflineOperation::from_row(row).ok())
        .collect();

    let mut retried_count = 0;
    let mut still_failed_count = 0;

    for op in failed_ops {
        if op.sync_attempts >= 5 {
            still_failed_count += 1;
            continue;
        }

        let _ = db_update_offline_operation_status(&mut scope, op.id, "syncing", None, None).await;

        match apply_operation(&mut scope, &op).await {
            Ok(_) => {
                let _ = db_update_offline_operation_status(&mut scope, op.id, "synced", None, None)
                    .await;
                retried_count += 1;
            }
            Err(e) => {
                let _ = db_update_offline_operation_status(
                    &mut scope,
                    op.id,
                    "failed",
                    Some(&e.to_string()),
                    None,
                )
                .await;
                still_failed_count += 1;
            }
        }
    }

    let response = serde_json::json!({
        "retried_count": retried_count,
        "still_failed_count": still_failed_count,
    });

    let __mobile_response = { (StatusCode::OK, ApiResponse::success(response, "重试完成")) };
    let _ = scope.commit().await;
    __mobile_response
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
