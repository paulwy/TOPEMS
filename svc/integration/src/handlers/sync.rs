//! 通用跨服务数据同步处理器
//!
//! 从 unified-core 的 modules::sync 迁移而来（2026-07 方案 C）。
//! 提供同步任务的 CRUD、统计、重试以及供应链触发器（SCM→WMS、WMS→CRM、SRM→SCM）。
//! 统一由 integration 服务承载，与既有 mes_erp / wms_scm / lims_qms 等同步模块并列。

use axum::extract::{Extension, Json, State};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::TopemsError;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::models::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

#[derive(Debug, Deserialize, Serialize, ToSchema)]
pub struct UpdateStatusRequest {
    pub status: String,
    pub error_message: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, ToSchema)]
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

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct CreateSyncTaskRequest {
    pub sync_type: String,
    pub source_module: String,
    pub target_module: String,
    pub source_entity: String,
    pub source_id: Option<String>,
    pub source_code: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
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
    operation: Option<String>,
    entity_type: Option<String>,
    entity_ids: Option<JsonValue>,
    status: String,
    error_message: Option<String>,
    started_at: Option<chrono::DateTime<chrono::Utc>>,
    finished_at: Option<chrono::DateTime<chrono::Utc>>,
    created_at: chrono::DateTime<chrono::Utc>,
    updated_at: chrono::DateTime<chrono::Utc>,
    data: Option<JsonValue>,
}

impl From<SyncTaskRow> for SyncTask {
    fn from(row: SyncTaskRow) -> Self {
        // 兼容映射：表新 schema（operation/entity_type/entity_ids/started_at/finished_at/data）
        // → 旧 SyncTask DTO 形状（source_entity/source_id/retry 等保留默认值，避免破坏前端契约）
        let source_id = row.entity_ids.as_ref().and_then(|v| {
            v.as_array()
                .and_then(|arr| arr.first())
                .and_then(|f| f.as_str())
                .and_then(|s| Uuid::parse_str(s).ok())
        });
        SyncTask {
            id: row.id,
            tenant_id: row.tenant_id,
            sync_type: row.sync_type,
            source_module: row.source_module,
            target_module: row.target_module,
            source_entity: row.entity_type.unwrap_or_default(),
            source_id,
            source_code: None,
            status: row.status,
            retry_count: 0,
            max_retries: 0,
            error_message: row.error_message,
            next_retry_at: None,
            executed_at: row.finished_at,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["integration:sync:write"])),
    path = "/api/integration/sync/tasks",
    request_body = CreateSyncTaskRequest,
    tag = "integration",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn create_task(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreateSyncTaskRequest>,
) -> ApiResponse<SyncTask> {
    let tenant_id = Uuid::nil();
    let now = chrono::Utc::now();
    let task_id = Uuid::new_v4();

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
        }
    };

    match sqlx::query_as::<_, SyncTaskRow>(only_own_schema_query!(
        "integration",
        r#"
        INSERT INTO integration.core_inter_module_sync
            (id, tenant_id, sync_type, source_module, target_module, entity_type, entity_ids,
             status, started_at, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9, $10)
        RETURNING *
        "#
    ))
    .bind(task_id)
    .bind(tenant_id)
    .bind(&req.sync_type)
    .bind(&req.source_module)
    .bind(&req.target_module)
    .bind(&req.source_entity)
    .bind(req.source_id.as_deref().map(|s| serde_json::json!([s])))
    .bind(now)
    .bind(now)
    .bind(now)
    .fetch_one(&mut scope)
    .await
    {
        Ok(row) => ApiResponse::success(row.into(), "同步任务创建成功"),
        Err(e) => {
            tracing::error!("创建同步任务失败: {}", e);
            ApiResponse::from(TopemsError::Internal("创建同步任务失败".to_string()))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["integration:sync:task:read"])),
    path = "/api/integration/sync/tasks/{task_id}",
    tag = "integration",
    params(
        ("task_id" = String, Path, description = "task_id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_task(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    axum::extract::Path(task_id): axum::extract::Path<String>,
) -> ApiResponse<Option<SyncTask>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
        }
    };

    match Uuid::parse_str(&task_id) {
        Ok(id) => {
            let row = sqlx::query_as::<_, SyncTaskRow>(
                only_own_schema_query!("integration", "SELECT id, tenant_id, sync_type, source_module, target_module, operation, entity_type, entity_ids, status, error_message, started_at, finished_at, created_at, updated_at, data FROM integration.core_inter_module_sync WHERE id = $1 AND deleted_at IS NULL"),
            )
            .bind(id)
            .fetch_optional(&mut scope)
            .await;

            match row {
                Ok(opt) => ApiResponse::success(opt.map(|r| r.into()), "查询同步任务成功"),
                Err(e) => {
                    tracing::error!("查询同步任务失败: {}", e);
                    ApiResponse::from(TopemsError::Internal("查询同步任务失败".to_string()))
                }
            }
        }
        Err(_) => ApiResponse::from(TopemsError::ValidationFailed("任务ID格式错误".to_string())),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["integration:sync:task:write"])),
    path = "/api/integration/sync/tasks/{task_id}/status",
    request_body = UpdateStatusRequest,
    tag = "integration",
    params(
        ("task_id" = String, Path, description = "task_id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn update_status(
    State(state): State<AppState>,
    axum::extract::Path(task_id): axum::extract::Path<String>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<UpdateStatusRequest>,
) -> ApiResponse<SyncTask> {
    let tenant_filter: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok())
    };
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
        }
    };

    match Uuid::parse_str(&task_id) {
        Ok(id) => {
            let now = chrono::Utc::now();
            match sqlx::query_as::<_, SyncTaskRow>(only_own_schema_query!(
                "integration",
                r#"
                UPDATE integration.core_inter_module_sync
                SET status = $2, error_message = $3, finished_at = $4, updated_at = $5
                WHERE id = $1 AND deleted_at IS NULL AND ($6::uuid IS NULL OR tenant_id = $6::uuid)
                RETURNING *
                "#
            ))
            .bind(id)
            .bind(&req.status)
            .bind(&req.error_message)
            .bind(now)
            .bind(now)
            .bind(tenant_filter)
            .fetch_one(&mut scope)
            .await
            {
                Ok(row) => ApiResponse::success(row.into(), "同步任务状态更新成功"),
                Err(e) => {
                    tracing::error!("更新同步任务状态失败: {}", e);
                    ApiResponse::from(TopemsError::Internal("更新同步任务状态失败".to_string()))
                }
            }
        }
        Err(_) => ApiResponse::from(TopemsError::ValidationFailed("任务ID格式错误".to_string())),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["integration:sync:task:read"])),
    path = "/api/integration/sync/pending",
    tag = "integration",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_pending(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> ApiResponse<Vec<SyncTask>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
        }
    };

    match sqlx::query_as::<_, SyncTaskRow>(
        only_own_schema_query!("integration", r#"
        SELECT id, tenant_id, sync_type, source_module, target_module, operation, entity_type, entity_ids, status, error_message, started_at, finished_at, created_at, updated_at, data FROM integration.core_inter_module_sync
        WHERE status = 'pending' AND deleted_at IS NULL
        ORDER BY created_at ASC
        "#),
    )
    .fetch_all(&mut scope)
    .await
    {
        Ok(rows) => {
            let tasks: Vec<SyncTask> = rows.into_iter().map(|r| r.into()).collect();
            ApiResponse::success(tasks, "查询待处理同步任务成功")
        }
        Err(e) => {
            tracing::error!("查询待处理同步任务失败: {}", e);
            ApiResponse::from(TopemsError::Internal("查询待处理同步任务失败".to_string()))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["integration:sync:read"])),
    path = "/api/integration/sync/statistics",
    tag = "integration",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_statistics(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> ApiResponse<SyncStatistics> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
        }
    };

    let result: Result<SyncStatistics, sqlx::Error> = async {
        let total_tasks = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
            "integration",
            "SELECT COUNT(*) FROM integration.core_inter_module_sync"
        ))
        .fetch_one(&mut scope)
        .await?;

        let pending_tasks = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
            "integration",
            "SELECT COUNT(*) FROM integration.core_inter_module_sync WHERE status = 'pending'"
        ))
        .fetch_one(&mut scope)
        .await?;

        let success_tasks = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
            "integration",
            "SELECT COUNT(*) FROM integration.core_inter_module_sync WHERE status = 'success'"
        ))
        .fetch_one(&mut scope)
        .await?;

        let failed_tasks = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
            "integration",
            "SELECT COUNT(*) FROM integration.core_inter_module_sync WHERE status = 'failed'"
        ))
        .fetch_one(&mut scope)
        .await?;

        let in_progress_tasks = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
            "integration",
            "SELECT COUNT(*) FROM integration.core_inter_module_sync WHERE status = 'in_progress'"
        ))
        .fetch_one(&mut scope)
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
        Ok(stats) => ApiResponse::success(stats, "获取同步统计数据成功"),
        Err(e) => {
            tracing::error!("获取同步统计数据失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取同步统计数据失败".to_string()))
        }
    }
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["integration:sync:admin"])),
    path = "/api/integration/sync/retry-failed",
    request_body = RetryFailedRequest,
    tag = "integration",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn retry_failed(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<RetryFailedRequest>,
) -> ApiResponse<serde_json::Value> {
    let now = chrono::Utc::now();
    let tenant_filter: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok())
    };
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
        }
    };
    let result = if req.sync_type.is_some() && req.source_module.is_some() {
        sqlx::query(only_own_schema_query!(
            "integration",
            r#"
            UPDATE integration.core_inter_module_sync
            SET status = 'pending', updated_at = $1
            WHERE status = 'failed' AND sync_type = $2 AND source_module = $3 AND ($4::uuid IS NULL OR tenant_id = $4::uuid)
            "#
        ))
        .bind(now)
        .bind(req.sync_type.unwrap_or_default())
        .bind(req.source_module.unwrap_or_default())
        .bind(tenant_filter)
        .execute(&mut scope)
        .await
    } else if req.sync_type.is_some() {
        sqlx::query(only_own_schema_query!(
            "integration",
            r#"
            UPDATE integration.core_inter_module_sync
            SET status = 'pending', updated_at = $1
            WHERE status = 'failed' AND sync_type = $2 AND ($3::uuid IS NULL OR tenant_id = $3::uuid)
            "#
        ))
        .bind(now)
        .bind(req.sync_type.unwrap_or_default())
        .bind(tenant_filter)
        .execute(&mut scope)
        .await
    } else if req.source_module.is_some() {
        sqlx::query(only_own_schema_query!(
            "integration",
            r#"
            UPDATE integration.core_inter_module_sync
            SET status = 'pending', updated_at = $1
            WHERE status = 'failed' AND source_module = $2 AND ($3::uuid IS NULL OR tenant_id = $3::uuid)
            "#
        ))
        .bind(now)
        .bind(req.source_module.unwrap_or_default())
        .bind(tenant_filter)
        .execute(&mut scope)
        .await
    } else {
        sqlx::query(only_own_schema_query!(
            "integration",
            r#"
            UPDATE integration.core_inter_module_sync
            SET status = 'pending', updated_at = $1
            WHERE status = 'failed' AND ($2::uuid IS NULL OR tenant_id = $2::uuid)
            "#
        ))
        .bind(now)
        .bind(tenant_filter)
        .execute(&mut scope)
        .await
    };

    match result {
        Ok(res) => ApiResponse::success(
            serde_json::json!({ "retried_count": res.rows_affected() }),
            "重试失败任务成功",
        ),
        Err(e) => {
            tracing::error!("重试失败任务失败: {}", e);
            ApiResponse::from(TopemsError::Internal("重试失败任务失败".to_string()))
        }
    }
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["integration:sync:admin"])),
    path = "/api/integration/sync/trigger/scm-to-wms",
    request_body = TriggerSyncRequest,
    tag = "integration",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn trigger_scm_wms(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<TriggerSyncRequest>,
) -> ApiResponse<SyncTask> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
        }
    };

    match Uuid::parse_str(&req.entity_id) {
        Ok(id) => {
            let now = chrono::Utc::now();
            let task_id = Uuid::new_v4();
            match sqlx::query_as::<_, SyncTaskRow>(
                only_own_schema_query!("integration", r#"
                INSERT INTO integration.core_inter_module_sync
                    (id, tenant_id, sync_type, source_module, target_module, entity_type, entity_ids,
                     status, started_at, created_at, updated_at)
                VALUES ($1, $2, 'purchase_order_sync', 'scm', 'wms', 'purchase_order', $3, 'pending', $4, $5, $6)
                RETURNING *
                "#),
            )
            .bind(task_id)
            .bind(Uuid::nil())
            .bind(serde_json::json!([id.to_string()]))
            .bind(now)
            .bind(now)
            .bind(now)
            .fetch_one(&mut scope)
            .await
            {
                Ok(row) => ApiResponse::success(row.into(), "触发SCM→WMS同步成功"),
                Err(e) => {
                    tracing::error!("触发SCM→WMS同步失败: {}", e);
                    ApiResponse::from(TopemsError::Internal("触发SCM→WMS同步失败".to_string()))
                }
            }
        }
        Err(_) => ApiResponse::from(TopemsError::ValidationFailed(
            "采购订单ID格式错误".to_string(),
        )),
    }
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["integration:sync:admin"])),
    path = "/api/integration/sync/trigger/wms-to-crm",
    request_body = TriggerSyncRequest,
    tag = "integration",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn trigger_wms_crm(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<TriggerSyncRequest>,
) -> ApiResponse<SyncTask> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
        }
    };

    match Uuid::parse_str(&req.entity_id) {
        Ok(id) => {
            let now = chrono::Utc::now();
            let task_id = Uuid::new_v4();
            match sqlx::query_as::<_, SyncTaskRow>(
                only_own_schema_query!("integration", r#"
                INSERT INTO integration.core_inter_module_sync
                    (id, tenant_id, sync_type, source_module, target_module, entity_type, entity_ids,
                     status, started_at, created_at, updated_at)
                VALUES ($1, $2, 'outbound_order_sync', 'wms', 'crm', 'outbound_order', $3, 'pending', $4, $5, $6)
                RETURNING *
                "#),
            )
            .bind(task_id)
            .bind(Uuid::nil())
            .bind(serde_json::json!([id.to_string()]))
            .bind(now)
            .bind(now)
            .bind(now)
            .fetch_one(&mut scope)
            .await
            {
                Ok(row) => ApiResponse::success(row.into(), "触发WMS→CRM同步成功"),
                Err(e) => {
                    tracing::error!("触发WMS→CRM同步失败: {}", e);
                    ApiResponse::from(TopemsError::Internal("触发WMS→CRM同步失败".to_string()))
                }
            }
        }
        Err(_) => ApiResponse::from(TopemsError::ValidationFailed(
            "出库单ID格式错误".to_string(),
        )),
    }
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["integration:sync:admin"])),
    path = "/api/integration/sync/trigger/srm-to-scm",
    request_body = TriggerSyncRequest,
    tag = "integration",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn trigger_srm_scm(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<TriggerSyncRequest>,
) -> ApiResponse<SyncTask> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
        }
    };

    match Uuid::parse_str(&req.entity_id) {
        Ok(id) => {
            let now = chrono::Utc::now();
            let task_id = Uuid::new_v4();
            match sqlx::query_as::<_, SyncTaskRow>(
                only_own_schema_query!("integration", r#"
                INSERT INTO integration.core_inter_module_sync
                    (id, tenant_id, sync_type, source_module, target_module, source_entity,
                     source_id, status, retry_count, max_retries, created_at, updated_at)
                VALUES ($1, $2, 'supplier_sync', 'srm', 'scm', 'supplier', $3, 'pending', 0, 3, $4, $5)
                RETURNING *
                "#),
            )
            .bind(task_id)
            .bind(Uuid::nil())
            .bind(id)
            .bind(now)
            .bind(now)
            .fetch_one(&mut scope)
            .await
            {
                Ok(row) => ApiResponse::success(row.into(), "触发SRM→SCM同步成功"),
                Err(e) => {
                    tracing::error!("触发SRM→SCM同步失败: {}", e);
                    ApiResponse::from(TopemsError::Internal("触发SRM→SCM同步失败".to_string()))
                }
            }
        }
        Err(_) => ApiResponse::from(TopemsError::ValidationFailed(
            "供应商ID格式错误".to_string(),
        )),
    }
}

// ============================================================================
// 集成同步统计 + 历史 + 端点清单（前端契约 /sync-stats、/sync-stats/history、/endpoints）
// ============================================================================

#[derive(Debug, Serialize)]
pub struct IntegrationSyncStatsResp {
    pub total_syncs: i64,
    pub success_rate: f64,
    pub last_sync_at: Option<chrono::DateTime<chrono::Utc>>,
    pub integration_stats: std::collections::HashMap<String, SyncTypeStats>,
}

#[derive(Debug, Serialize)]
pub struct SyncTypeStats {
    pub total: i64,
    pub synced: i64,
    pub failed: i64,
}

#[derive(Debug, Serialize)]
pub struct SyncHistoryItemResp {
    pub id: Uuid,
    pub sync_type: String,
    pub source_system: String,
    pub target_system: String,
    pub status: String,
    pub total_records: i64,
    pub success_count: i64,
    pub failed_count: i64,
    pub started_at: String,
    pub completed_at: Option<String>,
    pub duration_ms: Option<i64>,
}

#[derive(Debug, sqlx::FromRow)]
struct SyncStatsAggRow {
    sync_type: String,
    total: i64,
    synced: i64,
    failed: i64,
}

/// GET /api/integration/sync-stats —— 集成同步整体统计（按 sync_type 聚合）
#[allow(clippy::cast_precision_loss, clippy::as_conversions)]
#[utoipa::path(
    get,
    security(("BearerAuth" = ["integration:sync:read"])),
    path = "/api/integration/sync-stats",
    tag = "integration",
    responses(
        (status = 200, description = "Get integration sync stats"),
    ),
)]
pub async fn get_integration_sync_stats(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> ApiResponse<IntegrationSyncStatsResp> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
        }
    };

    let result: Result<IntegrationSyncStatsResp, sqlx::Error> = async {
        let (total_syncs,): (i64,) = sqlx::query_as(only_own_schema_query!(
            "integration",
            "SELECT COUNT(*) FROM integration.core_inter_module_sync"
        ))
        .fetch_one(&mut scope)
        .await?;

        let (success_count,): (i64,) = sqlx::query_as(only_own_schema_query!(
            "integration",
            "SELECT COUNT(*) FROM integration.core_inter_module_sync WHERE status = 'success'"
        ))
        .fetch_one(&mut scope)
        .await?;

        let (_failed_count,): (i64,) = sqlx::query_as(only_own_schema_query!(
            "integration",
            "SELECT COUNT(*) FROM integration.core_inter_module_sync WHERE status = 'failed'"
        ))
        .fetch_one(&mut scope)
        .await?;

        let last_sync: Option<chrono::DateTime<chrono::Utc>> =
            sqlx::query_scalar(only_own_schema_query!(
                "integration",
                "SELECT MAX(created_at) FROM integration.core_inter_module_sync"
            ))
            .fetch_one(&mut scope)
            .await?;

        let rows: Vec<SyncStatsAggRow> = sqlx::query_as(only_own_schema_query!(
            "integration",
            "SELECT sync_type,
                    COUNT(*)::bigint AS total,
                    COUNT(*) FILTER (WHERE status = 'success')::bigint AS synced,
                    COUNT(*) FILTER (WHERE status = 'failed')::bigint AS failed
             FROM integration.core_inter_module_sync
             GROUP BY sync_type"
        ))
        .fetch_all(&mut scope)
        .await?;

        let integration_stats = rows
            .into_iter()
            .map(|r| {
                (
                    r.sync_type,
                    SyncTypeStats {
                        total: r.total,
                        synced: r.synced,
                        failed: r.failed,
                    },
                )
            })
            .collect();

        let success_rate = if total_syncs > 0 {
            (success_count as f64 / total_syncs as f64) * 100.0
        } else {
            0.0
        };

        Ok(IntegrationSyncStatsResp {
            total_syncs,
            success_rate: (success_rate * 100.0).round() / 100.0,
            last_sync_at: last_sync,
            integration_stats,
        })
    }
    .await;

    match result {
        Ok(stats) => ApiResponse::success(stats, "获取同步统计成功"),
        Err(e) => {
            tracing::error!("获取同步统计失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取同步统计失败".to_string()))
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct SyncHistoryQuery {
    pub connection_id: Option<String>,
    pub sync_type: Option<String>,
    pub status: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, sqlx::FromRow)]
struct SyncHistoryRow {
    id: Uuid,
    sync_type: String,
    source_module: String,
    target_module: String,
    status: String,
    created_at: chrono::DateTime<chrono::Utc>,
}

/// GET /api/integration/sync-stats/history —— 同步历史记录（分页）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["integration:sync:read"])),
    path = "/api/integration/sync-stats/history",
    tag = "integration",
    responses(
        (status = 200, description = "Get sync history"),
    ),
)]
pub async fn get_sync_history(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    axum::extract::Query(q): axum::extract::Query<SyncHistoryQuery>,
) -> ApiResponse<Vec<SyncHistoryItemResp>> {
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;

    let mut sql = String::from(
        "SELECT id, sync_type, source_module, target_module, status, created_at \
         FROM integration.core_inter_module_sync WHERE 1=1",
    );
    let mut param_idx = 1i32;
    let sync_type_param = q.sync_type.clone();
    let status_param = q.status.clone();
    let connection_id_param = q
        .connection_id
        .as_ref()
        .and_then(|c| Uuid::parse_str(c).ok());

    if sync_type_param.is_some() {
        sql.push_str(&format!(" AND sync_type = ${}", param_idx));
        param_idx += 1;
    }
    if status_param.is_some() {
        sql.push_str(&format!(" AND status = ${}", param_idx));
        param_idx += 1;
    }
    if connection_id_param.is_some() {
        sql.push_str(&format!(" AND source_id = ${}", param_idx));
        param_idx += 1;
    }
    sql.push_str(&format!(
        " ORDER BY created_at DESC LIMIT ${} OFFSET ${}",
        param_idx,
        param_idx + 1
    ));

    // 全部条件参数化绑定，杜绝字符串拼接注入
    let mut query = sqlx::query_as::<_, SyncHistoryRow>(sqlx::AssertSqlSafe(sql));
    if let Some(st) = sync_type_param {
        query = query.bind(st);
    }
    if let Some(s) = status_param {
        query = query.bind(s);
    }
    if let Some(cid) = connection_id_param {
        query = query.bind(cid);
    }
    query = query.bind(page_size).bind(offset);

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("建立作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("数据库事务不可用".to_string()));
        }
    };

    let result: Result<Vec<SyncHistoryItemResp>, sqlx::Error> = async {
        let rows = query.fetch_all(&mut scope).await?;
        Ok(rows
            .into_iter()
            .map(|r| SyncHistoryItemResp {
                id: r.id,
                sync_type: r.sync_type,
                source_system: r.source_module,
                target_system: r.target_module,
                status: r.status.clone(),
                total_records: 0,
                success_count: if r.status == "success" { 1 } else { 0 },
                failed_count: if r.status == "failed" { 1 } else { 0 },
                started_at: r.created_at.to_rfc3339(),
                completed_at: r.created_at.to_rfc3339().into(),
                duration_ms: None,
            })
            .collect())
    }
    .await;

    match result {
        Ok(items) => ApiResponse::success(items, "获取同步历史成功"),
        Err(e) => {
            tracing::error!("获取同步历史失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取同步历史失败".to_string()))
        }
    }
}

#[derive(Debug, Serialize)]
pub struct IntegrationEndpointResp {
    pub id: String,
    pub name: String,
    pub code: String,
    pub description: Option<String>,
    pub r#type: String,
    pub protocol: String,
    pub endpoint_url: String,
    pub method: Option<String>,
    pub auth_type: Option<String>,
    pub status: String,
}

/// GET /api/integration/endpoints —— 集成端点清单（供 automation designer 选择）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["integration:sync:read"])),
    path = "/api/integration/endpoints",
    tag = "integration",
    responses(
        (status = 200, description = "List integration endpoints"),
    ),
)]
pub async fn list_endpoints(
    State(state): State<AppState>,
) -> ApiResponse<Vec<IntegrationEndpointResp>> {
    let endpoints = vec![
        IntegrationEndpointResp {
            id: "erp-connections".into(),
            name: "ERP 连接".into(),
            code: "erp_connections".into(),
            description: Some("ERP 系统连接配置".into()),
            r#type: "inbound".into(),
            protocol: "rest".into(),
            endpoint_url: "/api/integration/erp/connections".into(),
            method: Some("GET/POST".into()),
            auth_type: Some("bearer".into()),
            status: "active".into(),
        },
        IntegrationEndpointResp {
            id: "erp-mappings".into(),
            name: "ERP 映射".into(),
            code: "erp_mappings".into(),
            description: Some("ERP 字段映射配置".into()),
            r#type: "inbound".into(),
            protocol: "rest".into(),
            endpoint_url: "/api/integration/erp/mappings".into(),
            method: Some("GET/POST".into()),
            auth_type: Some("bearer".into()),
            status: "active".into(),
        },
        IntegrationEndpointResp {
            id: "lims-qms".into(),
            name: "LIMS-QMS 同步".into(),
            code: "lims_qms".into(),
            description: Some("实验室到质检数据同步".into()),
            r#type: "outbound".into(),
            protocol: "rest".into(),
            endpoint_url: "/api/integration/lims-qms".into(),
            method: Some("GET/POST".into()),
            auth_type: Some("bearer".into()),
            status: "active".into(),
        },
        IntegrationEndpointResp {
            id: "mes-erp".into(),
            name: "MES-ERP 同步".into(),
            code: "mes_erp".into(),
            description: Some("制造执行到 ERP 数据同步".into()),
            r#type: "outbound".into(),
            protocol: "rest".into(),
            endpoint_url: "/api/integration/mes-erp".into(),
            method: Some("GET/POST".into()),
            auth_type: Some("bearer".into()),
            status: "active".into(),
        },
        IntegrationEndpointResp {
            id: "wms-scm".into(),
            name: "WMS-SCM 同步".into(),
            code: "wms_scm".into(),
            description: Some("仓储到供应链数据同步".into()),
            r#type: "outbound".into(),
            protocol: "rest".into(),
            endpoint_url: "/api/integration/wms-scm".into(),
            method: Some("GET/POST".into()),
            auth_type: Some("bearer".into()),
            status: "active".into(),
        },
        IntegrationEndpointResp {
            id: "mes-qms".into(),
            name: "MES-QMS 质检集成".into(),
            code: "mes_qms".into(),
            description: Some("制造质检数据集成".into()),
            r#type: "outbound".into(),
            protocol: "rest".into(),
            endpoint_url: "/api/integration/mes-qms".into(),
            method: Some("GET/POST".into()),
            auth_type: Some("bearer".into()),
            status: "active".into(),
        },
        IntegrationEndpointResp {
            id: "sync-tasks".into(),
            name: "跨服务同步任务".into(),
            code: "sync_tasks".into(),
            description: Some("通用跨服务同步任务".into()),
            r#type: "outbound".into(),
            protocol: "rest".into(),
            endpoint_url: "/api/integration/sync/tasks".into(),
            method: Some("POST".into()),
            auth_type: Some("bearer".into()),
            status: "active".into(),
        },
        IntegrationEndpointResp {
            id: "conversion-rules".into(),
            name: "转换规则".into(),
            code: "conversion_rules".into(),
            description: Some("数据转换规则配置".into()),
            r#type: "inbound".into(),
            protocol: "rest".into(),
            endpoint_url: "/api/integration/rules".into(),
            method: Some("GET/POST".into()),
            auth_type: Some("bearer".into()),
            status: "active".into(),
        },
    ];

    // state 仅用于保持签名一致（供中间件链路使用）
    let _ = state;
    ApiResponse::success(endpoints, "获取集成端点列表成功")
}
