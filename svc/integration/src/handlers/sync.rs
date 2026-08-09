//! 通用跨服务数据同步处理器
//!
//! 从 unified-core 的 modules::sync 迁移而来（2026-07 方案 C）。
//! 提供同步任务的 CRUD、统计、重试以及供应链触发器（SCM→WMS、WMS→CRM、SRM→SCM）。
//! 统一由 integration 服务承载，与既有 mes_erp / wms_scm / lims_qms 等同步模块并列。

use axum::extract::{Json, State};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::models::AppState;
use topems_shared_core::response::{api_error, ApiResponse};

#[derive(Debug, Deserialize, Serialize)]
pub struct UpdateStatusRequest {
    pub status: String,
    pub error_message: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct TriggerSyncRequest {
    pub entity_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncTask {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub sync_type: String,
    pub source_module: String,
    pub target_module: String,
    pub source_entity: String,
    pub source_id: Option<Uuid>,
    pub source_code: Option<String>,
    pub status: String,
    pub retry_count: i32,
    pub max_retries: i32,
    pub error_message: Option<String>,
    pub next_retry_at: Option<chrono::DateTime<chrono::Utc>>,
    pub executed_at: Option<chrono::DateTime<chrono::Utc>>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateSyncTaskRequest {
    pub sync_type: String,
    pub source_module: String,
    pub target_module: String,
    pub source_entity: String,
    pub source_id: Option<String>,
    pub source_code: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RetryFailedRequest {
    pub sync_type: Option<String>,
    pub source_module: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncStatistics {
    pub total_tasks: i64,
    pub pending_tasks: i64,
    pub success_tasks: i64,
    pub failed_tasks: i64,
    pub in_progress_tasks: i64,
}

#[derive(Debug, sqlx::FromRow)]
struct SyncTaskRow {
    id: Uuid,
    tenant_id: Uuid,
    sync_type: String,
    source_module: String,
    target_module: String,
    source_entity: String,
    source_id: Option<Uuid>,
    source_code: Option<String>,
    status: String,
    retry_count: i32,
    max_retries: i32,
    error_message: Option<String>,
    next_retry_at: Option<chrono::DateTime<chrono::Utc>>,
    executed_at: Option<chrono::DateTime<chrono::Utc>>,
    created_at: chrono::DateTime<chrono::Utc>,
    updated_at: chrono::DateTime<chrono::Utc>,
}

impl From<SyncTaskRow> for SyncTask {
    fn from(row: SyncTaskRow) -> Self {
        SyncTask {
            id: row.id,
            tenant_id: row.tenant_id,
            sync_type: row.sync_type,
            source_module: row.source_module,
            target_module: row.target_module,
            source_entity: row.source_entity,
            source_id: row.source_id,
            source_code: row.source_code,
            status: row.status,
            retry_count: row.retry_count,
            max_retries: row.max_retries,
            error_message: row.error_message,
            next_retry_at: row.next_retry_at,
            executed_at: row.executed_at,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/integration/sync/tasks",
    tag = "integration",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn create_task(
    State(state): State<AppState>,
    Json(req): Json<CreateSyncTaskRequest>,
) -> Json<ApiResponse<SyncTask>> {
    let tenant_id = Uuid::nil();
    let source_id = req.source_id.as_ref().and_then(|s| Uuid::parse_str(s).ok());
    let now = chrono::Utc::now();
    let task_id = Uuid::new_v4();

    match sqlx::query_as::<_, SyncTaskRow>(
        r#"
        INSERT INTO core_inter_module_sync
            (id, tenant_id, sync_type, source_module, target_module, source_entity,
             source_id, source_code, status, retry_count, max_retries,
             created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', 0, 3, $9, $10)
        RETURNING *
        "#,
    )
    .bind(task_id)
    .bind(tenant_id)
    .bind(&req.sync_type)
    .bind(&req.source_module)
    .bind(&req.target_module)
    .bind(&req.source_entity)
    .bind(source_id)
    .bind(&req.source_code)
    .bind(now)
    .bind(now)
    .fetch_one(&state.pool)
    .await
    {
        Ok(row) => Json(ApiResponse::success(row.into(), "同步任务创建成功")),
        Err(e) => {
            tracing::error!("创建同步任务失败: {}", e);
            Json(api_error(500, "创建同步任务失败"))
        }
    }
}

#[utoipa::path(
    get,
    path = "/api/integration/sync/tasks/{task_id}",
    tag = "integration",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_task(
    State(state): State<AppState>,
    axum::extract::Path(task_id): axum::extract::Path<String>,
) -> Json<ApiResponse<Option<SyncTask>>> {
    match Uuid::parse_str(&task_id) {
        Ok(id) => {
            let row = sqlx::query_as::<_, SyncTaskRow>(
                "SELECT id, source_module, target_module, sync_type, status, data, created_at, updated_at FROM core_inter_module_sync WHERE id = $1",
            )
            .bind(id)
            .fetch_optional(&state.pool)
            .await;

            match row {
                Ok(opt) => Json(ApiResponse::success(
                    opt.map(|r| r.into()),
                    "查询同步任务成功",
                )),
                Err(e) => {
                    tracing::error!("查询同步任务失败: {}", e);
                    Json(api_error(500, "查询同步任务失败"))
                }
            }
        }
        Err(_) => Json(api_error(400, "任务ID格式错误")),
    }
}

#[utoipa::path(
    post,
    path = "/api/integration/sync/tasks/{task_id}/status",
    tag = "integration",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn update_status(
    State(state): State<AppState>,
    axum::extract::Path(task_id): axum::extract::Path<String>,
    Json(req): Json<UpdateStatusRequest>,
) -> Json<ApiResponse<SyncTask>> {
    match Uuid::parse_str(&task_id) {
        Ok(id) => {
            let now = chrono::Utc::now();
            match sqlx::query_as::<_, SyncTaskRow>(
                r#"
                UPDATE core_inter_module_sync
                SET status = $2, error_message = $3, executed_at = $4, updated_at = $5
                WHERE id = $1
                RETURNING *
                "#,
            )
            .bind(id)
            .bind(&req.status)
            .bind(&req.error_message)
            .bind(now)
            .bind(now)
            .fetch_one(&state.pool)
            .await
            {
                Ok(row) => Json(ApiResponse::success(row.into(), "同步任务状态更新成功")),
                Err(e) => {
                    tracing::error!("更新同步任务状态失败: {}", e);
                    Json(api_error(500, "更新同步任务状态失败"))
                }
            }
        }
        Err(_) => Json(api_error(400, "任务ID格式错误")),
    }
}

#[utoipa::path(
    get,
    path = "/api/integration/sync/pending",
    tag = "integration",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_pending(State(state): State<AppState>) -> Json<ApiResponse<Vec<SyncTask>>> {
    match sqlx::query_as::<_, SyncTaskRow>(
        r#"
        SELECT id, source_module, target_module, sync_type, status, data, created_at, updated_at FROM core_inter_module_sync
        WHERE status = 'pending' OR (status = 'failed' AND retry_count < max_retries AND next_retry_at <= NOW())
        ORDER BY created_at ASC
        "#,
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => {
            let tasks: Vec<SyncTask> = rows.into_iter().map(|r| r.into()).collect();
            Json(ApiResponse::success(tasks, "查询待处理同步任务成功"))
        }
        Err(e) => {
            tracing::error!("查询待处理同步任务失败: {}", e);
            Json(api_error(500, "查询待处理同步任务失败"))
        }
    }
}

#[utoipa::path(
    get,
    path = "/api/integration/sync/statistics",
    tag = "integration",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_statistics(State(state): State<AppState>) -> Json<ApiResponse<SyncStatistics>> {
    let result: Result<SyncStatistics, sqlx::Error> = async {
        let total_tasks = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM core_inter_module_sync")
            .fetch_one(&state.pool)
            .await?;

        let pending_tasks = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM core_inter_module_sync WHERE status = 'pending'",
        )
        .fetch_one(&state.pool)
        .await?;

        let success_tasks = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM core_inter_module_sync WHERE status = 'success'",
        )
        .fetch_one(&state.pool)
        .await?;

        let failed_tasks = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM core_inter_module_sync WHERE status = 'failed' AND retry_count >= max_retries",
        )
        .fetch_one(&state.pool)
        .await?;

        let in_progress_tasks = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM core_inter_module_sync WHERE status = 'in_progress'",
        )
        .fetch_one(&state.pool)
        .await?;

        Ok(SyncStatistics {
            total_tasks,
            pending_tasks,
            success_tasks,
            failed_tasks,
            in_progress_tasks,
        })
    }
    .await;

    match result {
        Ok(stats) => Json(ApiResponse::success(stats, "获取同步统计数据成功")),
        Err(e) => {
            tracing::error!("获取同步统计数据失败: {}", e);
            Json(api_error(500, "获取同步统计数据失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/integration/sync/retry-failed",
    tag = "integration",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn retry_failed(
    State(state): State<AppState>,
    Json(req): Json<RetryFailedRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let now = chrono::Utc::now();
    let result = if req.sync_type.is_some() && req.source_module.is_some() {
        sqlx::query(
            r#"
            UPDATE core_inter_module_sync
            SET status = 'pending', retry_count = 0, next_retry_at = NULL, updated_at = $1
            WHERE status = 'failed' AND sync_type = $2 AND source_module = $3
            "#,
        )
        .bind(now)
        .bind(req.sync_type.unwrap_or_default())
        .bind(req.source_module.unwrap_or_default())
        .execute(&state.pool)
        .await
    } else if req.sync_type.is_some() {
        sqlx::query(
            r#"
            UPDATE core_inter_module_sync
            SET status = 'pending', retry_count = 0, next_retry_at = NULL, updated_at = $1
            WHERE status = 'failed' AND sync_type = $2
            "#,
        )
        .bind(now)
        .bind(req.sync_type.unwrap_or_default())
        .execute(&state.pool)
        .await
    } else if req.source_module.is_some() {
        sqlx::query(
            r#"
            UPDATE core_inter_module_sync
            SET status = 'pending', retry_count = 0, next_retry_at = NULL, updated_at = $1
            WHERE status = 'failed' AND source_module = $2
            "#,
        )
        .bind(now)
        .bind(req.source_module.unwrap_or_default())
        .execute(&state.pool)
        .await
    } else {
        sqlx::query(
            r#"
            UPDATE core_inter_module_sync
            SET status = 'pending', retry_count = 0, next_retry_at = NULL, updated_at = $1
            WHERE status = 'failed'
            "#,
        )
        .bind(now)
        .execute(&state.pool)
        .await
    };

    match result {
        Ok(res) => Json(ApiResponse::success(
            serde_json::json!({ "retried_count": res.rows_affected() }),
            "重试失败任务成功",
        )),
        Err(e) => {
            tracing::error!("重试失败任务失败: {}", e);
            Json(api_error(500, "重试失败任务失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/integration/sync/trigger/scm-to-wms",
    tag = "integration",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn trigger_scm_wms(
    State(state): State<AppState>,
    Json(req): Json<TriggerSyncRequest>,
) -> Json<ApiResponse<SyncTask>> {
    match Uuid::parse_str(&req.entity_id) {
        Ok(id) => {
            let now = chrono::Utc::now();
            let task_id = Uuid::new_v4();
            match sqlx::query_as::<_, SyncTaskRow>(
                r#"
                INSERT INTO core_inter_module_sync
                    (id, tenant_id, sync_type, source_module, target_module, source_entity,
                     source_id, status, retry_count, max_retries, created_at, updated_at)
                VALUES ($1, $2, 'purchase_order_sync', 'scm', 'wms', 'purchase_order', $3, 'pending', 0, 3, $4, $5)
                RETURNING *
                "#,
            )
            .bind(task_id)
            .bind(Uuid::nil())
            .bind(id)
            .bind(now)
            .bind(now)
            .fetch_one(&state.pool)
            .await
            {
                Ok(row) => Json(ApiResponse::success(row.into(), "触发SCM→WMS同步成功")),
                Err(e) => {
                    tracing::error!("触发SCM→WMS同步失败: {}", e);
                    Json(api_error(500, "触发SCM→WMS同步失败"))
                }
            }
        }
        Err(_) => Json(api_error(400, "采购订单ID格式错误")),
    }
}

#[utoipa::path(
    post,
    path = "/api/integration/sync/trigger/wms-to-crm",
    tag = "integration",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn trigger_wms_crm(
    State(state): State<AppState>,
    Json(req): Json<TriggerSyncRequest>,
) -> Json<ApiResponse<SyncTask>> {
    match Uuid::parse_str(&req.entity_id) {
        Ok(id) => {
            let now = chrono::Utc::now();
            let task_id = Uuid::new_v4();
            match sqlx::query_as::<_, SyncTaskRow>(
                r#"
                INSERT INTO core_inter_module_sync
                    (id, tenant_id, sync_type, source_module, target_module, source_entity,
                     source_id, status, retry_count, max_retries, created_at, updated_at)
                VALUES ($1, $2, 'outbound_order_sync', 'wms', 'crm', 'outbound_order', $3, 'pending', 0, 3, $4, $5)
                RETURNING *
                "#,
            )
            .bind(task_id)
            .bind(Uuid::nil())
            .bind(id)
            .bind(now)
            .bind(now)
            .fetch_one(&state.pool)
            .await
            {
                Ok(row) => Json(ApiResponse::success(row.into(), "触发WMS→CRM同步成功")),
                Err(e) => {
                    tracing::error!("触发WMS→CRM同步失败: {}", e);
                    Json(api_error(500, "触发WMS→CRM同步失败"))
                }
            }
        }
        Err(_) => Json(api_error(400, "出库单ID格式错误")),
    }
}

#[utoipa::path(
    post,
    path = "/api/integration/sync/trigger/srm-to-scm",
    tag = "integration",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn trigger_srm_scm(
    State(state): State<AppState>,
    Json(req): Json<TriggerSyncRequest>,
) -> Json<ApiResponse<SyncTask>> {
    match Uuid::parse_str(&req.entity_id) {
        Ok(id) => {
            let now = chrono::Utc::now();
            let task_id = Uuid::new_v4();
            match sqlx::query_as::<_, SyncTaskRow>(
                r#"
                INSERT INTO core_inter_module_sync
                    (id, tenant_id, sync_type, source_module, target_module, source_entity,
                     source_id, status, retry_count, max_retries, created_at, updated_at)
                VALUES ($1, $2, 'supplier_sync', 'srm', 'scm', 'supplier', $3, 'pending', 0, 3, $4, $5)
                RETURNING *
                "#,
            )
            .bind(task_id)
            .bind(Uuid::nil())
            .bind(id)
            .bind(now)
            .bind(now)
            .fetch_one(&state.pool)
            .await
            {
                Ok(row) => Json(ApiResponse::success(row.into(), "触发SRM→SCM同步成功")),
                Err(e) => {
                    tracing::error!("触发SRM→SCM同步失败: {}", e);
                    Json(api_error(500, "触发SRM→SCM同步失败"))
                }
            }
        }
        Err(_) => Json(api_error(400, "供应商ID格式错误")),
    }
}
