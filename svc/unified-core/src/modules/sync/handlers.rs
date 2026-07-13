use axum::extract::{Json, State};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;

use super::models::{
    CreateSyncTaskRequest, MobileSyncRequest, MobileSyncResponse, RetryFailedRequest,
    SyncStatistics, SyncTask,
};
use super::service::{
    create_sync_task, get_pending_sync_tasks, get_sync_statistics, get_sync_task_by_id,
    retry_failed_tasks, trigger_scm_to_wms_sync, trigger_srm_to_scm_sync, trigger_wms_to_crm_sync,
    update_sync_task_status,
};
use crate::AppState;
use topems_shared::{api_error, ApiResponse};

#[derive(Debug, Deserialize, Serialize)]
pub struct UpdateStatusRequest {
    pub status: String,
    pub error_message: Option<String>,
}

pub async fn create_task(
    State(state): State<AppState>,
    Json(req): Json<CreateSyncTaskRequest>,
) -> Json<ApiResponse<SyncTask>> {
    let tenant_id = Uuid::nil();
    let source_id = req.source_id.as_ref().and_then(|s| Uuid::parse_str(s).ok());

    match create_sync_task(
        &state.pool,
        tenant_id,
        &req.sync_type,
        &req.source_module,
        &req.target_module,
        &req.source_entity,
        source_id,
        req.source_code,
    )
    .await
    {
        Ok(task) => Json(ApiResponse::success(task, "同步任务创建成功")),
        Err(e) => {
            tracing::error!("创建同步任务失败: {}", e);
            Json(api_error(500, "创建同步任务失败"))
        }
    }
}

pub async fn get_task(
    State(state): State<AppState>,
    axum::extract::Path(task_id): axum::extract::Path<String>,
) -> Json<ApiResponse<Option<SyncTask>>> {
    match Uuid::parse_str(&task_id) {
        Ok(id) => match get_sync_task_by_id(&state.pool, id).await {
            Ok(task) => Json(ApiResponse::success(task, "查询同步任务成功")),
            Err(e) => {
                tracing::error!("查询同步任务失败: {}", e);
                Json(api_error(500, "查询同步任务失败"))
            }
        },
        Err(_) => Json(api_error(400, "任务ID格式错误")),
    }
}

pub async fn update_status(
    State(state): State<AppState>,
    axum::extract::Path(task_id): axum::extract::Path<String>,
    Json(req): Json<UpdateStatusRequest>,
) -> Json<ApiResponse<SyncTask>> {
    match Uuid::parse_str(&task_id) {
        Ok(id) => {
            match update_sync_task_status(&state.pool, id, &req.status, req.error_message).await {
                Ok(task) => Json(ApiResponse::success(task, "同步任务状态更新成功")),
                Err(e) => {
                    tracing::error!("更新同步任务状态失败: {}", e);
                    Json(api_error(500, "更新同步任务状态失败"))
                }
            }
        }
        Err(_) => Json(api_error(400, "任务ID格式错误")),
    }
}

pub async fn get_pending(State(state): State<AppState>) -> Json<ApiResponse<Vec<SyncTask>>> {
    match get_pending_sync_tasks(&state.pool).await {
        Ok(tasks) => Json(ApiResponse::success(tasks, "查询待处理同步任务成功")),
        Err(e) => {
            tracing::error!("查询待处理同步任务失败: {}", e);
            Json(api_error(500, "查询待处理同步任务失败"))
        }
    }
}

pub async fn get_statistics(State(state): State<AppState>) -> Json<ApiResponse<SyncStatistics>> {
    match get_sync_statistics(&state.pool).await {
        Ok(stats) => Json(ApiResponse::success(stats, "获取同步统计数据成功")),
        Err(e) => {
            tracing::error!("获取同步统计数据失败: {}", e);
            Json(api_error(500, "获取同步统计数据失败"))
        }
    }
}

pub async fn retry_failed(
    State(state): State<AppState>,
    Json(req): Json<RetryFailedRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    match retry_failed_tasks(
        &state.pool,
        req.sync_type.as_deref(),
        req.source_module.as_deref(),
    )
    .await
    {
        Ok(count) => Json(ApiResponse::success(
            serde_json::json!({ "retried_count": count }),
            "重试失败任务成功",
        )),
        Err(e) => {
            tracing::error!("重试失败任务失败: {}", e);
            Json(api_error(500, "重试失败任务失败"))
        }
    }
}

#[derive(Debug, Deserialize, Serialize)]
pub struct TriggerSyncRequest {
    pub entity_id: String,
}

pub async fn trigger_scm_wms(
    State(state): State<AppState>,
    Json(req): Json<TriggerSyncRequest>,
) -> Json<ApiResponse<SyncTask>> {
    match Uuid::parse_str(&req.entity_id) {
        Ok(id) => match trigger_scm_to_wms_sync(&state.pool, id).await {
            Ok(task) => Json(ApiResponse::success(task, "触发SCM→WMS同步成功")),
            Err(e) => {
                tracing::error!("触发SCM→WMS同步失败: {}", e);
                Json(api_error(500, "触发SCM→WMS同步失败"))
            }
        },
        Err(_) => Json(api_error(400, "采购订单ID格式错误")),
    }
}

pub async fn trigger_wms_crm(
    State(state): State<AppState>,
    Json(req): Json<TriggerSyncRequest>,
) -> Json<ApiResponse<SyncTask>> {
    match Uuid::parse_str(&req.entity_id) {
        Ok(id) => match trigger_wms_to_crm_sync(&state.pool, id).await {
            Ok(task) => Json(ApiResponse::success(task, "触发WMS→CRM同步成功")),
            Err(e) => {
                tracing::error!("触发WMS→CRM同步失败: {}", e);
                Json(api_error(500, "触发WMS→CRM同步失败"))
            }
        },
        Err(_) => Json(api_error(400, "出库单ID格式错误")),
    }
}

pub async fn trigger_srm_scm(
    State(state): State<AppState>,
    Json(req): Json<TriggerSyncRequest>,
) -> Json<ApiResponse<SyncTask>> {
    match Uuid::parse_str(&req.entity_id) {
        Ok(id) => match trigger_srm_to_scm_sync(&state.pool, id).await {
            Ok(task) => Json(ApiResponse::success(task, "触发SRM→SCM同步成功")),
            Err(e) => {
                tracing::error!("触发SRM→SCM同步失败: {}", e);
                Json(api_error(500, "触发SRM→SCM同步失败"))
            }
        },
        Err(_) => Json(api_error(400, "供应商ID格式错误")),
    }
}

pub async fn mobile_sync_records(
    State(state): State<AppState>,
    Json(req): Json<MobileSyncRequest>,
) -> Json<ApiResponse<MobileSyncResponse>> {
    let mut success: Vec<String> = Vec::new();
    let mut failed: Vec<super::models::MobileSyncFailedItem> = Vec::new();

    for record in req.records {
        let tenant_id = Uuid::nil();
        let user_id = Uuid::nil();

        match sqlx::query(
            r#"
            INSERT INTO core_mobile_offline_records
            (id, tenant_id, user_id, module, action, data, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'pending')
            ON CONFLICT (id) DO UPDATE SET data = $6, status = 'pending', updated_at = NOW()
            "#,
        )
        .bind(Uuid::parse_str(&record.id).unwrap_or_else(|_| Uuid::new_v4()))
        .bind(tenant_id)
        .bind(user_id)
        .bind(&record.module)
        .bind(&record.action)
        .bind(&record.data)
        .execute(&state.pool)
        .await
        {
            Ok(_) => {
                success.push(record.id);
            }
            Err(e) => {
                tracing::error!("保存离线记录失败: {}", e);
                failed.push(super::models::MobileSyncFailedItem {
                    id: record.id,
                    error: e.to_string(),
                });
            }
        }
    }

    let response = MobileSyncResponse {
        success,
        failed: failed.clone(),
    };

    if failed.is_empty() {
        Json(ApiResponse::success(response, "同步成功"))
    } else {
        Json(ApiResponse::success(response, "部分同步成功"))
    }
}

pub async fn mobile_get_pending_records(
    State(state): State<AppState>,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    match sqlx::query(
        r#"
        SELECT id, tenant_id, user_id, module, action, data, status,
               retry_count, max_retries, error_message, created_at, updated_at
        FROM core_mobile_offline_records
        WHERE status = 'pending'
        ORDER BY created_at ASC
        "#,
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => {
            let records: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|row| {
                    serde_json::json!({
                        "id": row.get::<Uuid, _>("id"),
                        "tenant_id": row.get::<Uuid, _>("tenant_id"),
                        "user_id": row.get::<Uuid, _>("user_id"),
                        "module": row.get::<String, _>("module"),
                        "action": row.get::<String, _>("action"),
                        "data": row.get::<serde_json::Value, _>("data"),
                        "status": row.get::<String, _>("status"),
                        "retry_count": row.get::<i32, _>("retry_count"),
                        "max_retries": row.get::<i32, _>("max_retries"),
                        "error_message": row.get::<Option<String>, _>("error_message"),
                        "created_at": row.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
                        "updated_at": row.get::<chrono::DateTime<chrono::Utc>, _>("updated_at"),
                    })
                })
                .collect();
            Json(ApiResponse::success(records, "查询成功"))
        }
        Err(e) => {
            tracing::error!("查询离线记录失败: {}", e);
            Json(api_error(500, "查询离线记录失败"))
        }
    }
}

pub async fn mobile_mark_synced(
    State(state): State<AppState>,
    axum::extract::Path(record_id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    match Uuid::parse_str(&record_id) {
        Ok(id) => {
            match sqlx::query(
                r#"
                UPDATE core_mobile_offline_records
                SET status = 'synced', updated_at = NOW()
                WHERE id = $1
                "#,
            )
            .bind(id)
            .execute(&state.pool)
            .await
            {
                Ok(_) => Json(ApiResponse::success((), "标记同步成功")),
                Err(e) => {
                    tracing::error!("更新离线记录状态失败: {}", e);
                    Json(api_error(500, "更新状态失败"))
                }
            }
        }
        Err(_) => Json(api_error(400, "记录ID格式错误")),
    }
}

pub async fn mobile_clear_synced(State(state): State<AppState>) -> Json<ApiResponse<()>> {
    match sqlx::query(
        r#"
        DELETE FROM core_mobile_offline_records
        WHERE status = 'synced'
        "#,
    )
    .execute(&state.pool)
    .await
    {
        Ok(_) => Json(ApiResponse::success((), "清理已同步记录成功")),
        Err(e) => {
            tracing::error!("清理已同步记录失败: {}", e);
            Json(api_error(500, "清理失败"))
        }
    }
}
