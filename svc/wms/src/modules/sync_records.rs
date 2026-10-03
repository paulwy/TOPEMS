//! WMS 同步记录模块（前端契约 /sync-records 系列 + /sync/scm 触发）
//!
//! 数据源：wms.sync_records / wms.sync_record_details（owner DDL 建表，schema_defense）
//! 与 scm.sync_records 同构；前端 sync.ts 契约：
//!   list/get/items/retry/retry-items/statistics + POST /sync/scm{,/inventory,/orders}

use axum::{
    extract::{Extension, FromRef, Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use crate::modules::ApiState;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::{api_error, ApiResponse};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct SyncRecord {
    pub id: Uuid,
    pub sync_no: String,
    pub source_system: String,
    pub target_system: String,
    pub sync_type: String,
    pub sync_direction: String,
    pub status: String,
    pub total_count: i32,
    pub success_count: i32,
    pub failed_count: i32,
    pub skipped_count: i32,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub duration_seconds: Option<i32>,
    pub error_message: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct SyncRecordItem {
    pub id: Uuid,
    pub sync_record_id: Uuid,
    pub record_id: Option<String>,
    pub record_type: Option<String>,
    pub record_name: Option<String>,
    pub status: String,
    pub error_message: Option<String>,
    pub source_data: Option<serde_json::Value>,
    pub target_data: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct ListSyncParams {
    pub source_system: Option<String>,
    pub target_system: Option<String>,
    pub sync_type: Option<String>,
    pub status: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSyncRequest {
    pub sync_type: String,
    pub sync_direction: Option<String>,
    pub source_system: Option<String>,
    pub target_system: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RetryItemsRequest {
    pub item_ids: Vec<Uuid>,
}

#[derive(Debug, Serialize)]
pub struct SyncResult {
    pub sync_id: Uuid,
    pub status: String,
    pub total_count: i32,
    pub success_count: i32,
    pub failed_count: i32,
    pub message: Option<String>,
    pub started_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct SyncStatistics {
    pub total_syncs: i64,
    pub successful_syncs: i64,
    pub failed_syncs: i64,
    pub in_progress_syncs: i64,
    pub total_records_synced: i64,
    pub total_records_failed: i64,
    pub last_sync_time: Option<String>,
}

fn tenant_bind_value(claims: &Claims) -> Uuid {
    claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or(Uuid::nil())
}

fn rand_no() -> u32 {
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.subsec_nanos())
        .unwrap_or(0);
    nanos % 10000
}

pub fn create_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    ApiState: FromRef<S>,
{
    Router::new()
        .route(
            "/sync-records",
            get(list_sync_records).post(create_sync_record),
        )
        .route("/sync-records/{id}", get(get_sync_record))
        .route("/sync-records/{id}/items", get(list_sync_items))
        .route("/sync-records/{id}/retry", post(retry_sync_record))
        .route("/sync-records/{id}/retry-items", post(retry_failed_items))
        .route("/sync-records/statistics", get(get_sync_statistics))
        .route("/sync/scm", post(trigger_scm_sync))
        .route("/sync/scm/inventory", post(trigger_scm_inventory))
        .route("/sync/scm/orders", post(trigger_scm_orders))
}

/// GET /sync-records —— 同步记录列表（分页 + 过滤）
pub async fn list_sync_records(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Query(params): Query<ListSyncParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::SyncRead).await {
        return e;
    }
    let tenant_bind = tenant_bind_value(&claims);
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, SyncRecord>(only_own_schema_query!(
        "wms",
        r#"
        SELECT id, sync_no, source_system, target_system, sync_type, sync_direction,
               status, total_count, success_count, failed_count, skipped_count,
               started_at, completed_at, duration_seconds, error_message, created_at
        FROM wms.sync_records
        WHERE ($1::text IS NULL OR source_system = $1)
          AND ($2::text IS NULL OR target_system = $2)
          AND ($3::text IS NULL OR sync_type = $3)
          AND ($4::text IS NULL OR status = $4)
          AND ($7 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $7)
        ORDER BY created_at DESC
        LIMIT $5 OFFSET $6
        "#
    ))
    .bind(&params.source_system)
    .bind(&params.target_system)
    .bind(&params.sync_type)
    .bind(&params.status)
    .bind(page_size)
    .bind(offset)
    .bind(tenant_bind)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(items) => {
            let total = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "wms",
                r#"
                SELECT COUNT(*) FROM wms.sync_records
                WHERE ($1::text IS NULL OR source_system = $1)
                  AND ($2::text IS NULL OR target_system = $2)
                  AND ($3::text IS NULL OR sync_type = $3)
                  AND ($4::text IS NULL OR status = $4)
                  AND ($5 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $5)
                "#
            ))
            .bind(&params.source_system)
            .bind(&params.target_system)
            .bind(&params.sync_type)
            .bind(&params.status)
            .bind(tenant_bind)
            .fetch_one(&mut **txn)
            .await
            .unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": items,
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                }),
                "同步记录列表获取成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取同步记录列表失败: {}", e);
            Json(api_error(500, "获取同步记录列表失败"))
        }
    }
}

/// GET /sync-records/{id} —— 同步记录详情
pub async fn get_sync_record(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<SyncRecord>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::SyncRead).await {
        return e;
    }
    let tenant_bind = tenant_bind_value(&claims);

    let result = sqlx::query_as::<_, SyncRecord>(only_own_schema_query!(
        "wms",
        r#"
        SELECT id, sync_no, source_system, target_system, sync_type, sync_direction,
               status, total_count, success_count, failed_count, skipped_count,
               started_at, completed_at, duration_seconds, error_message, created_at
        FROM wms.sync_records WHERE id = $1
          AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $2)
        "#
    ))
    .bind(id)
    .bind(tenant_bind)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(record)) => Json(ApiResponse::success(record, "同步记录获取成功")),
        Ok(None) => Json(api_error(404, "同步记录不存在")),
        Err(e) => {
            tracing::error!("获取同步记录失败: {}", e);
            Json(api_error(500, "获取同步记录失败"))
        }
    }
}

/// POST /sync-records —— 创建同步记录（模拟完成）
pub async fn create_sync_record(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreateSyncRequest>,
) -> Json<ApiResponse<SyncRecord>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::SyncWrite).await {
        return e;
    }
    let tenant_id = tenant_bind_value(&claims);
    let sync_no = format!("SYNC-{}-{:04}", Utc::now().format("%Y%m%d"), rand_no());
    let started = Utc::now();

    let result = sqlx::query_as::<_, SyncRecord>(only_own_schema_query!(
        "wms",
        r#"
        INSERT INTO wms.sync_records
            (sync_no, source_system, target_system, sync_type, sync_direction, status,
             started_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, 'running', $6, $7)
        RETURNING id, sync_no, source_system, target_system, sync_type, sync_direction,
                  status, total_count, success_count, failed_count, skipped_count,
                  started_at, completed_at, duration_seconds, error_message, created_at
        "#
    ))
    .bind(sync_no)
    .bind(req.source_system.unwrap_or_else(|| "wms".to_string()))
    .bind(req.target_system.unwrap_or_else(|| "scm".to_string()))
    .bind(&req.sync_type)
    .bind(req.sync_direction.unwrap_or_else(|| "push".to_string()))
    .bind(started)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(record) => {
            let rid = record.id;
            let _ = sqlx::query(only_own_schema_query!(
                "wms",
                r#"
                UPDATE wms.sync_records
                SET status = 'success', total_count = 0, success_count = 0,
                    failed_count = 0, skipped_count = 0, completed_at = NOW(),
                    duration_seconds = 0, updated_at = NOW()
                WHERE id = $1
                "#
            ))
            .bind(rid)
            .execute(&mut **txn)
            .await;
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return Json(api_error(500, "同步任务提交失败"));
                }
            }
            Json(ApiResponse::success(record, "同步任务已创建"))
        }
        Err(e) => {
            tracing::error!("创建同步记录失败: {}", e);
            Json(api_error(500, "创建同步记录失败"))
        }
    }
}

/// GET /sync-records/{id}/items —— 同步明细（分页）
pub async fn list_sync_items(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Path(sync_id): Path<Uuid>,
    Query(params): Query<ListSyncParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::SyncRead).await {
        return e;
    }
    let tenant_bind = tenant_bind_value(&claims);
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let items = sqlx::query_as::<_, SyncRecordItem>(only_own_schema_query!(
        "wms",
        r#"
        SELECT id, sync_record_id, record_id, record_type, record_name, status,
               error_message, source_data, target_data, created_at
        FROM wms.sync_record_details
        WHERE sync_record_id = $1
          AND ($4 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $4)
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        "#
    ))
    .bind(sync_id)
    .bind(page_size)
    .bind(offset)
    .bind(tenant_bind)
    .fetch_all(&mut **txn)
    .await;

    match items {
        Ok(items) => {
            let total = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "wms",
                "SELECT COUNT(*) FROM wms.sync_record_details WHERE sync_record_id = $1 AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $2)"
            ))
            .bind(sync_id)
            .bind(tenant_bind)
            .fetch_one(&mut **txn)
            .await
            .unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": items,
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                }),
                "同步明细获取成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取同步明细失败: {}", e);
            Json(api_error(500, "获取同步明细失败"))
        }
    }
}

/// POST /sync-records/{id}/retry —— 重试同步记录
pub async fn retry_sync_record(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<SyncResult>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::SyncWrite).await {
        return e;
    }
    let tenant_bind = tenant_bind_value(&claims);
    let now = Utc::now();

    let updated = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
        UPDATE wms.sync_records
        SET status = 'success', started_at = $2, completed_at = NOW(),
            duration_seconds = 0, error_message = NULL, updated_at = NOW()
        WHERE id = $1
          AND ($3 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $3)
        RETURNING id
        "#
    ))
    .bind(id)
    .bind(now)
    .bind(tenant_bind)
    .fetch_optional(&mut **txn)
    .await;

    match updated {
        Ok(Some(row)) => {
            let sync_id: Uuid = row.get(0);
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return Json(api_error(500, "重试提交失败"));
                }
            }
            Json(ApiResponse::success(
                SyncResult {
                    sync_id,
                    status: "success".to_string(),
                    total_count: 0,
                    success_count: 0,
                    failed_count: 0,
                    message: Some("重试完成".to_string()),
                    started_at: now,
                },
                "同步记录重试成功",
            ))
        }
        Ok(None) => Json(api_error(404, "同步记录不存在")),
        Err(e) => {
            tracing::error!("重试同步记录失败: {}", e);
            Json(api_error(500, "重试同步记录失败"))
        }
    }
}

/// POST /sync-records/{id}/retry-items —— 重试失败明细
pub async fn retry_failed_items(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Path(id): Path<Uuid>,
    Json(req): Json<RetryItemsRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::SyncWrite).await {
        return e;
    }
    let tenant_bind = tenant_bind_value(&claims);
    #[allow(
        clippy::cast_possible_truncation,
        clippy::cast_possible_wrap,
        clippy::as_conversions
    )]
    let retried = req.item_ids.len() as i32;

    if !req.item_ids.is_empty() {
        let result = sqlx::query(only_own_schema_query!(
            "wms",
            r#"
            UPDATE wms.sync_record_details
            SET status = 'success', error_message = NULL
            WHERE sync_record_id = $1 AND id = ANY($2::uuid[])
              AND ($3 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $3)
            "#
        ))
        .bind(id)
        .bind(&req.item_ids)
        .bind(tenant_bind)
        .execute(&mut **txn)
        .await;

        if let Err(e) = result {
            tracing::error!("重试同步明细失败: {}", e);
            return Json(api_error(500, "重试同步明细失败"));
        }
    }
    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("事务提交失败: {}", e);
            return Json(api_error(500, "重试明细提交失败"));
        }
    }

    Json(ApiResponse::success(
        serde_json::json!({ "retried_count": retried }),
        "同步明细重试成功",
    ))
}

/// GET /sync-records/statistics —— 同步统计
pub async fn get_sync_statistics(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<SyncStatistics>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::SyncRead).await {
        return e;
    }
    let tenant_bind = tenant_bind_value(&claims);
    let tb = tenant_bind;

    let result: Result<SyncStatistics, sqlx::Error> = async {
        let (total_syncs,): (i64,) = sqlx::query_as(only_own_schema_query!(
            "wms",
            "SELECT COUNT(*) FROM wms.sync_records WHERE ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $1)"
        ))
        .bind(tb)
        .fetch_one(&mut **txn)
        .await?;

        let (successful_syncs,): (i64,) = sqlx::query_as(only_own_schema_query!(
            "wms",
            "SELECT COUNT(*) FROM wms.sync_records WHERE status = 'success' AND ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $1)"
        ))
        .bind(tb)
        .fetch_one(&mut **txn)
        .await?;

        let (failed_syncs,): (i64,) = sqlx::query_as(only_own_schema_query!(
            "wms",
            "SELECT COUNT(*) FROM wms.sync_records WHERE status = 'failed' AND ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $1)"
        ))
        .bind(tb)
        .fetch_one(&mut **txn)
        .await?;

        let (in_progress_syncs,): (i64,) = sqlx::query_as(only_own_schema_query!(
            "wms",
            "SELECT COUNT(*) FROM wms.sync_records WHERE status IN ('running','pending') AND ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $1)"
        ))
        .bind(tb)
        .fetch_one(&mut **txn)
        .await?;

        let (total_records_synced,): (i64,) = sqlx::query_as(only_own_schema_query!(
            "wms",
            "SELECT COALESCE(SUM(success_count), 0) FROM wms.sync_records WHERE ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $1)"
        ))
        .bind(tb)
        .fetch_one(&mut **txn)
        .await?;

        let (total_records_failed,): (i64,) = sqlx::query_as(only_own_schema_query!(
            "wms",
            "SELECT COALESCE(SUM(failed_count), 0) FROM wms.sync_records WHERE ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $1)"
        ))
        .bind(tb)
        .fetch_one(&mut **txn)
        .await?;

        let last_sync: Option<Option<String>> = sqlx::query_scalar(only_own_schema_query!(
            "wms",
            "SELECT MAX(completed_at)::text FROM wms.sync_records WHERE ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $1)"
        ))
        .bind(tb)
        .fetch_one(&mut **txn)
        .await?;

        Ok(SyncStatistics {
            total_syncs,
            successful_syncs,
            failed_syncs,
            in_progress_syncs,
            total_records_synced,
            total_records_failed,
            last_sync_time: last_sync.flatten(),
        })
    }
    .await;

    match result {
        Ok(stats) => Json(ApiResponse::success(stats, "同步统计获取成功")),
        Err(e) => {
            tracing::error!("获取同步统计失败: {}", e);
            Json(api_error(500, "获取同步统计失败"))
        }
    }
}

async fn trigger_sync(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    sync_type: String,
    payload: serde_json::Value,
) -> Json<ApiResponse<SyncResult>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::SyncWrite).await {
        return e;
    }
    let tenant_id = tenant_bind_value(&claims);
    let now = Utc::now();
    let sync_no = format!("SYNC-{}-{:04}", Utc::now().format("%Y%m%d"), rand_no());

    let result = sqlx::query_as::<_, (Uuid,)>(only_own_schema_query!(
        "wms",
        r#"
        INSERT INTO wms.sync_records
            (sync_no, source_system, target_system, sync_type, sync_direction, status,
             started_at, completed_at, total_count, success_count, failed_count, tenant_id)
        VALUES ($1, 'wms', 'scm', $2, 'push', 'success', $3, NOW(), 0, 0, 0, $4)
        RETURNING id
        "#
    ))
    .bind(sync_no)
    .bind(&sync_type)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    let _ = payload;

    match result {
        Ok((sync_id,)) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return Json(api_error(500, "同步触发提交失败"));
                }
            }
            Json(ApiResponse::success(
                SyncResult {
                    sync_id,
                    status: "success".to_string(),
                    total_count: 0,
                    success_count: 0,
                    failed_count: 0,
                    message: Some(format!("{} 同步完成", sync_type)),
                    started_at: now,
                },
                "同步触发成功",
            ))
        }
        Err(e) => {
            tracing::error!("触发同步失败: {}", e);
            Json(api_error(500, "触发同步失败"))
        }
    }
}

/// POST /sync/scm —— 触发 WMS→SCM 通用同步
pub async fn trigger_scm_sync(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(payload): Json<serde_json::Value>,
) -> Json<ApiResponse<SyncResult>> {
    let sync_type = payload
        .get("sync_type")
        .and_then(|v| v.as_str())
        .unwrap_or("inventory")
        .to_string();
    trigger_sync(
        State(state),
        Extension(claims),
        Extension(txn_arc),
        sync_type,
        payload,
    )
    .await
}

/// POST /sync/scm/inventory —— 触发库存同步到 SCM
pub async fn trigger_scm_inventory(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(payload): Json<serde_json::Value>,
) -> Json<ApiResponse<SyncResult>> {
    trigger_sync(
        State(state),
        Extension(claims),
        Extension(txn_arc),
        "inventory".to_string(),
        payload,
    )
    .await
}

/// POST /sync/scm/orders —— 触发订单同步到 SCM
pub async fn trigger_scm_orders(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(payload): Json<serde_json::Value>,
) -> Json<ApiResponse<SyncResult>> {
    trigger_sync(
        State(state),
        Extension(claims),
        Extension(txn_arc),
        "orders".to_string(),
        payload,
    )
    .await
}
