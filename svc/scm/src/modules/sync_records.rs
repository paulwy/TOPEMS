//! 同步记录管理（P2 更多模块业务 API）：/sync-records CRUD + retry + details + 触发同步
//! 数据源：scm.sync_records / scm.sync_record_details（owner DDL 建表）

use axum::{
    extract::{Extension, Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Row};

use crate::modules::sync_status::SyncRecordStatus;
use crate::modules::ApiState;
use crate::shared::permission::require_tenant_bind;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;
use topems_shared_core::TopemsError;

#[derive(Debug, Deserialize)]
pub struct ListSyncRecordParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub source_system: Option<String>,
    pub target_system: Option<String>,
    pub sync_type: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct SyncRecord {
    pub id: uuid::Uuid,
    pub sync_no: String,
    pub source_system: String,
    pub target_system: String,
    pub sync_type: String,
    pub sync_direction: String,
    pub status: String,
    pub total_count: Option<i32>,
    pub success_count: Option<i32>,
    pub failed_count: Option<i32>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub duration_seconds: Option<i32>,
    pub error_message: Option<String>,
    pub tenant_id: Option<uuid::Uuid>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSyncRecordRequest {
    pub source_system: String,
    pub target_system: String,
    pub sync_type: String,
    pub sync_direction: Option<String>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct SyncDetailRecord {
    pub id: uuid::Uuid,
    pub sync_id: uuid::Uuid,
    pub record_id: Option<String>,
    pub record_name: Option<String>,
    pub status: String,
    pub error_message: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct SyncResult {
    pub sync_id: uuid::Uuid,
    pub status: String,
    pub total_count: i32,
    pub success_count: i32,
    pub failed_count: i32,
    pub message: Option<String>,
    pub started_at: DateTime<Utc>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/health", get(scm_health))
        .route(
            "/sync-records",
            get(list_sync_records).post(create_sync_record),
        )
        .route("/sync-records/{id}", get(get_sync_record))
        .route("/sync-records/{id}/retry", post(retry_sync_record))
        .route("/sync-records/{id}/details", get(list_sync_details))
        .route("/sync/wms/{sync_type}", post(trigger_wms_sync))
        .route("/sync/srm/{sync_type}", post(trigger_srm_sync))
}

/// GET /health — 前端 scmApi.health() 探测服务存活。
/// 轻量兜底：探一次 DB 连接，返回 ok 字符串。
#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/api/scm/health",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM"
)]
pub async fn scm_health(State(state): State<ApiState>) -> ApiResponse<String> {
    match sqlx::query("SELECT 1").execute(&state.system_pool).await {
        Ok(_) => ApiResponse::success("ok".to_string(), "SCM 服务正常"),
        Err(e) => {
            tracing::error!("SCM health 检查失败: {}", e);
            ApiResponse::success("degraded".to_string(), "SCM 服务异常")
        }
    }
}

async fn current_tenant_id(claims: &Claims) -> Option<uuid::Uuid> {
    claims
        .tenant_id
        .as_deref()
        .and_then(|s| uuid::Uuid::parse_str(s).ok())
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["scm:sync:read"])),
    path = "/sync-records",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM/sync"
)]
pub async fn list_sync_records(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ListSyncRecordParams>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let tenant_bind = match require_tenant_bind(&claims) {
        Ok(v) => v,
        Err(e) => return e.0,
    };
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;
    let status_filter = match params.status.as_deref() {
        Some(raw) => match SyncRecordStatus::from_db_str(raw) {
            Some(s) => Some(s.as_db_str().to_string()),
            None => return ApiResponse::bad_request("无效的同步状态过滤值"),
        },
        None => None,
    };

    // B-2 后 scm 全表 fail-closed：裸池读会 0 行，必须复用请求级 RLS 事务。
    let db = state.db.clone();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("rls transaction unavailable");
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };

    let result = sqlx::query_as::<_, SyncRecord>(
        r#"
        SELECT id, sync_no, source_system, target_system, sync_type, sync_direction,
               status, total_count, success_count, failed_count, started_at, completed_at,
               duration_seconds, error_message, tenant_id, created_at
        FROM scm.sync_records
        WHERE ($1::text IS NULL OR source_system = $1)
          AND ($2::text IS NULL OR target_system = $2)
          AND ($3::text IS NULL OR sync_type = $3)
          AND ($4::text IS NULL OR status = $4)
          AND tenant_id = $7::uuid
        ORDER BY created_at DESC
        LIMIT $5 OFFSET $6
        "#,
    )
    .bind(&params.source_system)
    .bind(&params.target_system)
    .bind(&params.sync_type)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .bind(tenant_bind)
    .fetch_all(&mut scope)
    .await;

    match result {
        Ok(items) => {
            let total = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM scm.sync_records
                WHERE ($1::text IS NULL OR source_system = $1)
                  AND ($2::text IS NULL OR target_system = $2)
                  AND ($3::text IS NULL OR sync_type = $3)
                  AND ($4::text IS NULL OR status = $4)
                  AND tenant_id = $5::uuid
                "#,
            )
            .bind(&params.source_system)
            .bind(&params.target_system)
            .bind(&params.sync_type)
            .bind(&status_filter)
            .bind(tenant_bind)
            .fetch_one(&mut scope)
            .await
            .map_err(|e| {
                tracing::error!("获取同步记录总数失败: {}", e);
                e
            })
            .unwrap_or(0);

            ApiResponse::success(
                serde_json::json!({
                    "items": items,
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                }),
                "同步记录列表获取成功",
            )
        }
        Err(e) => {
            tracing::error!("获取同步记录列表失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取同步记录列表失败".to_string()))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["scm:sync:read"])),
    path = "/sync-records/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM/sync"
)]
pub async fn get_sync_record(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<uuid::Uuid>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
) -> ApiResponse<SyncRecord> {
    let tenant_bind = match require_tenant_bind(&claims) {
        Ok(v) => v,
        Err(e) => return e.0,
    };
    let db = state.db.clone();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("rls transaction unavailable");
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let result = sqlx::query_as::<_, SyncRecord>(
        r#"
        SELECT id, sync_no, source_system, target_system, sync_type, sync_direction,
               status, total_count, success_count, failed_count, started_at, completed_at,
               duration_seconds, error_message, tenant_id, created_at
        FROM scm.sync_records WHERE id = $1
          AND tenant_id = $2::uuid
        "#,
    )
    .bind(id)
    .bind(tenant_bind)
    .fetch_optional(&mut scope)
    .await;

    match result {
        Ok(Some(record)) => ApiResponse::success(record, "同步记录获取成功"),
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("同步记录不存在".to_string())),
        Err(e) => {
            tracing::error!("获取同步记录失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取同步记录失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/api/scm/sync-records",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM"
)]

pub async fn create_sync_record(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Json(req): Json<CreateSyncRecordRequest>,
) -> ApiResponse<SyncRecord> {
    let tenant_id = match require_tenant_bind(&claims) {
        Ok(v) => v,
        Err(e) => return e.0,
    };
    let sync_no = format!("SYNC-{}-{:04}", Utc::now().format("%Y%m%d"), rand_no());
    let started = Utc::now();
    // 连接级租户上下文：复用请求级 RLS 事务，裸池写入在严格 RLS 策略下会被拒绝。
    let db = state.db.clone();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务不可用");
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };

    let result = sqlx::query_as::<_, SyncRecord>(
        r#"
        INSERT INTO scm.sync_records
            (sync_no, source_system, target_system, sync_type, sync_direction, status,
             started_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, sync_no, source_system, target_system, sync_type, sync_direction,
                  status, total_count, success_count, failed_count, started_at, completed_at,
                  duration_seconds, error_message, tenant_id, created_at
        "#,
    )
    .bind(sync_no)
    .bind(&req.source_system)
    .bind(&req.target_system)
    .bind(&req.sync_type)
    .bind(req.sync_direction.unwrap_or_else(|| "push".to_string()))
    .bind(SyncRecordStatus::Running.as_db_str())
    .bind(started)
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    match result {
        Ok(record) => {
            // 异步模拟完成：标记 completed。
            // 后台任务没有请求上下文，用系统写作用域（显式 nil 租户），否则严格 RLS 下会被拒写。
            let rid = record.id;
            let pool = state.system_pool.clone();
            let tenant = tenant_id;
            tokio::spawn(async move {
                let db = topems_shared_db::scope::Db::new(pool, "scm, public, shared");
                let Ok(mut scope) = db.scope_system().await else {
                    return;
                };
                let update_res = sqlx::query(
                    r#"
                    UPDATE scm.sync_records
                    SET status = $3, total_count = 0, success_count = 0,
                        failed_count = 0, completed_at = NOW(),
                        duration_seconds = 0
                    WHERE id = $1 AND tenant_id = $2::uuid
                    "#,
                )
                .bind(rid)
                .bind(tenant)
                .bind(SyncRecordStatus::Completed.as_db_str())
                .execute(&mut scope)
                .await;
                if let Err(e) = update_res {
                    tracing::error!(target: "scm_sync", sync_record_id = %rid, "后台标记同步记录完成失败: {}", e);
                    return;
                }
                if let Err(e) = scope.commit().await {
                    tracing::error!(target: "scm_sync", sync_record_id = %rid, "后台提交同步记录完成状态失败: {}", e);
                }
            });
            ApiResponse::success(record, "同步任务已创建")
        }
        Err(e) => {
            tracing::error!("创建同步记录失败: {}", e);
            ApiResponse::from(TopemsError::Internal("创建同步记录失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["scm:sync:write"])),
    path = "/sync-records/{id}/retry",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM/sync"
)]
pub async fn retry_sync_record(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<uuid::Uuid>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
) -> ApiResponse<SyncResult> {
    let tenant_bind = match require_tenant_bind(&claims) {
        Ok(v) => v,
        Err(e) => return e.0,
    };
    let now = Utc::now();
    let db = state.db.clone();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("rls transaction unavailable");
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let updated = sqlx::query(
        r#"
        UPDATE scm.sync_records
        SET status = $4, started_at = $2, completed_at = NOW(),
            duration_seconds = 0, error_message = NULL, updated_at = NOW()
        WHERE id = $1
          AND tenant_id = $3::uuid
        RETURNING id
        "#,
    )
    .bind(id)
    .bind(now)
    .bind(tenant_bind)
    .bind(SyncRecordStatus::Completed.as_db_str())
    .fetch_optional(&mut scope)
    .await;

    match updated {
        Ok(Some(row)) => {
            let sync_id: uuid::Uuid = row.get(0);
            ApiResponse::success(
                SyncResult {
                    sync_id,
                    status: SyncRecordStatus::Completed.as_db_str().to_string(),
                    total_count: 0,
                    success_count: 0,
                    failed_count: 0,
                    message: Some("重试完成".to_string()),
                    started_at: now,
                },
                "同步记录重试成功",
            )
        }
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("同步记录不存在".to_string())),
        Err(e) => {
            tracing::error!("重试同步记录失败: {}", e);
            ApiResponse::from(TopemsError::Internal("重试同步记录失败".to_string()))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["scm:sync:read"])),
    path = "/sync-records/{id}/details",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM/sync"
)]
pub async fn list_sync_details(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(sync_id): Path<uuid::Uuid>,
    Query(params): Query<ListSyncRecordParams>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let tenant_bind = match require_tenant_bind(&claims) {
        Ok(v) => v,
        Err(e) => return e.0,
    };
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let db = state.db.clone();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("rls transaction unavailable");
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };

    let items = sqlx::query_as::<_, SyncDetailRecord>(
        r#"
        SELECT id, sync_id, record_id, record_name, status, error_message, created_at
        FROM scm.sync_record_details
        WHERE sync_id = $1
          AND tenant_id = $4::uuid
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(sync_id)
    .bind(page_size)
    .bind(offset)
    .bind(tenant_bind)
    .fetch_all(&mut scope)
    .await;

    match items {
        Ok(items) => {
            let total = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM scm.sync_record_details WHERE sync_id = $1 AND tenant_id = $2::uuid",
            )
            .bind(sync_id)
            .bind(tenant_bind)
            .fetch_one(&mut scope)
            .await
            .unwrap_or(0);

            ApiResponse::success(
                serde_json::json!({
                    "items": items,
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                }),
                "同步明细获取成功",
            )
        }
        Err(e) => {
            tracing::error!("获取同步明细失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取同步明细失败".to_string()))
        }
    }
}

async fn trigger_sync(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path(sync_type): Path<String>,
    source: &str,
    target: &str,
) -> ApiResponse<SyncResult> {
    let tenant_id = match require_tenant_bind(&claims) {
        Ok(v) => v,
        Err(e) => return e.0,
    };
    let now = Utc::now();
    let sync_no = format!("SYNC-{}-{:04}", Utc::now().format("%Y%m%d"), rand_no());
    // 连接级租户上下文：复用请求级 RLS 事务，裸池写入在严格 RLS 策略下会被拒绝。
    let db = state.db.clone();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务不可用");
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立 RLS 事务作用域失败: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };

    let result = sqlx::query_as::<_, (uuid::Uuid,)>(
        r#"
        INSERT INTO scm.sync_records
            (sync_no, source_system, target_system, sync_type, sync_direction, status,
             started_at, completed_at, total_count, success_count, failed_count, tenant_id)
        VALUES ($1, $2, $3, $4, 'push', $6, $5, NOW(), 0, 0, 0, $7)
        RETURNING id
        "#,
    )
    .bind(sync_no)
    .bind(source)
    .bind(target)
    .bind(&sync_type)
    .bind(now)
    .bind(SyncRecordStatus::Completed.as_db_str())
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    match result {
        Ok((sync_id,)) => ApiResponse::success(
            SyncResult {
                sync_id,
                status: SyncRecordStatus::Completed.as_db_str().to_string(),
                total_count: 0,
                success_count: 0,
                failed_count: 0,
                message: Some(format!("{} 同步完成", sync_type)),
                started_at: now,
            },
            "同步触发成功",
        ),
        Err(e) => {
            tracing::error!("触发同步失败: {}", e);
            ApiResponse::from(TopemsError::Internal("触发同步失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["scm:sync:write"])),
    path = "/sync/wms/{sync_type}",
    params(
("sync_type" = String, Path, description = "sync_type")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM/sync"
)]
pub async fn trigger_wms_sync(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path(sync_type): Path<String>,
) -> ApiResponse<SyncResult> {
    trigger_sync(
        State(state),
        Extension(claims),
        Extension(txn_arc),
        Path(sync_type),
        "scm",
        "wms",
    )
    .await
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["scm:sync:write"])),
    path = "/sync/srm/{sync_type}",
    params(
("sync_type" = String, Path, description = "sync_type")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM/sync"
)]
pub async fn trigger_srm_sync(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<topems_shared_auth::middleware::tenant::RlsTxnCell>,
    Path(sync_type): Path<String>,
) -> ApiResponse<SyncResult> {
    trigger_sync(
        State(state),
        Extension(claims),
        Extension(txn_arc),
        Path(sync_type),
        "scm",
        "srm",
    )
    .await
}

fn rand_no() -> u32 {
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.subsec_nanos())
        .unwrap_or(0);
    nanos % 10000
}
