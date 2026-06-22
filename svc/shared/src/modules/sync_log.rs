//! Sync Log Module - 同步日志

use axum::{
    extract::{Query, State},
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;

use crate::AppState;
use topems_shared::ApiResponse;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncLog {
    pub id: uuid::Uuid,
    pub tenant_id: uuid::Uuid,
    pub sync_type: String,
    pub source_system: String,
    pub target_system: String,
    pub entity_type: String,
    pub source_code: Option<String>,
    pub target_code: Option<String>,
    pub operation: String,
    pub status: String,
    pub error_message: Option<String>,
    pub retry_count: i32,
    pub executed_at: Option<chrono::DateTime<chrono::Utc>>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SyncLogQuery {
    pub sync_type: Option<String>,
    pub status: Option<String>,
    pub source_system: Option<String>,
    pub entity_type: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

pub async fn list_sync_logs(
    State(state): State<AppState>,
    Query(query): Query<SyncLogQuery>,
) -> Json<ApiResponse<Vec<SyncLog>>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let logs = sqlx::query_as::<_, SyncLog>(
        r#"
        SELECT id, tenant_id, sync_type, source_system, target_system,
               entity_type, source_code, target_code, operation, status,
               error_message, retry_count, executed_at, created_at
        FROM shared.sync_logs
        WHERE ($1::text IS NULL OR sync_type = $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($3::text IS NULL OR source_system = $3)
          AND ($4::text IS NULL OR entity_type = $4)
        ORDER BY created_at DESC
        LIMIT $5 OFFSET $6
        "#
    )
    .bind(&query.sync_type)
    .bind(&query.status)
    .bind(&query.source_system)
    .bind(&query.entity_type)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    Json(ApiResponse::success(logs, "Sync logs retrieved"))
}

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/api/shared/sync/logs", get(list_sync_logs))
}
