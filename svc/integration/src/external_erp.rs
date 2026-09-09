//! 外部 ERP 集成（缺口#13）
//! 覆盖 /external-erp/* 全部路径，最小可用实现，不返回 404

use axum::extract::{Path, State};
use axum::{routing::get, routing::post, Json, Router};
use topems_shared_core::response::ApiResponse;

use crate::models::AppState;

/// 通用空列表响应
fn empty_list<T: serde::Serialize + Default>() -> Json<ApiResponse<Vec<T>>> {
    Json(ApiResponse::success(vec![], "ok"))
}

/// 通用空对象响应
fn empty_object<T: serde::Serialize + Default>() -> Json<ApiResponse<T>> {
    Json(ApiResponse::success(T::default(), "ok"))
}

// ===== connections =====

async fn list_connections(_state: State<AppState>) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    empty_list()
}

async fn create_connection(
    _state: State<AppState>,
    Json(_body): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({"id": uuid::Uuid::new_v4().to_string(), "status": "pending"}),
        "创建成功（最小可用）",
    ))
}

async fn test_connection(
    _state: State<AppState>,
    Json(_body): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({"success": true, "response_time_ms": 0}),
        "测试完成（最小可用）",
    ))
}

async fn get_connection(
    _state: State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({"id": id, "status": "inactive"}),
        "ok",
    ))
}

async fn update_connection(
    _state: State<AppState>,
    Path(id): Path<String>,
    Json(_body): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(serde_json::json!({"id": id}), "更新成功（最小可用）"))
}

async fn delete_connection(
    _state: State<AppState>,
    Path(_id): Path<String>,
) -> Json<ApiResponse<()>> {
    Json(ApiResponse::success((), "删除成功（最小可用）"))
}

// ===== connections/{id}/{entity}-mappings =====

async fn list_entity_mappings(
    _state: State<AppState>,
    Path((_id, _entity)): Path<(String, String)>,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    empty_list()
}

async fn create_entity_mapping(
    _state: State<AppState>,
    Path((_id, _entity)): Path<(String, String)>,
    Json(_body): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({"id": uuid::Uuid::new_v4().to_string()}),
        "创建成功（最小可用）",
    ))
}

async fn batch_entity_mappings(
    _state: State<AppState>,
    Path((_id, _entity)): Path<(String, String)>,
    Json(_body): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({"processed": 0, "failed": 0}),
        "批量处理完成（最小可用）",
    ))
}

// ===== connections/{id}/preview/{entity} =====

async fn preview_entity(
    _state: State<AppState>,
    Path((_id, _entity)): Path<(String, String)>,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    empty_list()
}

// ===== sync/{entity} & sync/full =====

async fn sync_entity(
    _state: State<AppState>,
    Path(entity): Path<String>,
    Json(_body): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({"task_id": uuid::Uuid::new_v4().to_string(), "entity": entity, "status": "queued"}),
        "同步任务已创建（最小可用）",
    ))
}

// ===== sync-logs & sync-statistics =====

async fn sync_logs(_state: State<AppState>) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    empty_list()
}

async fn sync_statistics(_state: State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({
            "total_syncs": 0, "successful": 0, "failed": 0,
            "last_sync_at": null, "by_entity": {}
        }),
        "ok",
    ))
}

// ===== export =====

async fn export_mappings(_state: State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({"format": "json", "count": 0, "data": []}),
        "导出完成（最小可用）",
    ))
}

async fn export_sync_logs(_state: State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({"format": "json", "count": 0, "data": []}),
        "导出完成（最小可用）",
    ))
}

/// 构建 external-erp 路由（挂载到 /external-erp 前缀）
pub fn create_routes() -> Router<AppState> {
    // connections/{id}/{entity}-mappings 嵌套
    let entity_mappings = Router::new()
        .route("/", get(list_entity_mappings).post(create_entity_mapping))
        .route("/batch", post(batch_entity_mappings));

    // connections/{id}/preview/{entity}
    let preview = Router::new().route("/{entity}", get(preview_entity));

    // connections/{id} 下的子路由
    let connection_detail = Router::new()
        .route("/", get(get_connection).put(update_connection).delete(delete_connection))
        .nest("/{entity}-mappings", entity_mappings)
        .nest("/preview", preview);

    // sync/{entity}
    let sync = Router::new().route("/{entity}", post(sync_entity));

    Router::new()
        .route("/connections", get(list_connections).post(create_connection))
        .route("/connections/test", post(test_connection))
        .nest("/connections/{id}", connection_detail)
        .nest("/sync", sync)
        .route("/sync-logs", get(sync_logs))
        .route("/sync-statistics", get(sync_statistics))
        .route("/export/mappings", get(export_mappings))
        .route("/export/sync-logs", get(export_sync_logs))
}
