//! BI Sync Records handlers
//!
//! Provides full CRUD + retry operations for BI data-source sync records.

use axum::{
    extract::{Path, Query, State},
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::types::Uuid;
use topems_shared_core::response::PaginatedResponse;
use tracing::{info, warn};

use crate::shared::AppState;

// ==================== Data Structures ====================

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncRecordResponse {
    pub id: Uuid,
    pub data_source_id: Uuid,
    pub data_source_name: Option<String>,
    pub status: String,
    pub sync_type: String,
    pub records_count: Option<i64>,
    pub affected_records: Option<i64>,
    pub error_message: Option<String>,
    pub started_at: String,
    pub completed_at: Option<String>,
    pub duration_ms: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
}

pub type SyncRecordListResponse = PaginatedResponse<SyncRecordResponse>;

#[derive(Debug, Deserialize)]
pub struct SyncRecordQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub data_source_id: Option<Uuid>,
    pub status: Option<String>,
    pub sync_type: Option<String>,
    pub search: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSyncRecordRequest {
    pub data_source_id: Uuid,
    pub sync_type: String,
    pub status: Option<String>,
    pub records_count: Option<i64>,
    pub affected_records: Option<i64>,
    pub error_message: Option<String>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub duration_ms: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSyncRecordRequest {
    pub data_source_id: Option<Uuid>,
    pub sync_type: Option<String>,
    pub status: Option<String>,
    pub records_count: Option<i64>,
    pub affected_records: Option<i64>,
    pub error_message: Option<String>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub duration_ms: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct RetrySyncRequest {
    pub note: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct RetrySyncResponse {
    pub record: SyncRecordResponse,
    pub retry_no: String,
    pub message: String,
}

// ==================== Handler Functions ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:read"])),
    path = "/api/bi/sync-records",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
pub async fn list_sync_records(
    State(state): State<AppState>,
    Query(query): Query<SyncRecordQuery>,
) -> Json<serde_json::Value> {
    info!("Listing BI sync records with query: {:?}", query);

    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).clamp(1, 200);
    let offset = (page - 1) * page_size;

    // Build SQL with optional filters
    let mut sql = String::from(
        "SELECT s.id, s.data_source_id, d.name AS data_source_name, s.status, s.sync_type, \
         s.records_count, s.affected_records, s.error_message, s.started_at, s.completed_at, \
         s.duration_ms, s.created_at, s.updated_at \
         FROM analytics_sync_records s \
         LEFT JOIN analytics_datasources d ON s.data_source_id = d.id \
         WHERE 1=1",
    );
    let mut count_sql =
        String::from("SELECT COUNT(*) AS total FROM analytics_sync_records s WHERE 1=1");

    if query.data_source_id.is_some() {
        sql.push_str(" AND s.data_source_id = $1");
        count_sql.push_str(" AND s.data_source_id = $1");
    }
    if query.status.is_some() {
        let idx = if query.data_source_id.is_some() { 2 } else { 1 };
        sql.push_str(&format!(" AND s.status = ${}", idx));
        count_sql.push_str(&format!(" AND s.status = ${}", idx));
    }
    if query.sync_type.is_some() {
        let mut idx = 1;
        if query.data_source_id.is_some() {
            idx += 1;
        }
        if query.status.is_some() {
            idx += 1;
        }
        sql.push_str(&format!(" AND s.sync_type = ${}", idx));
        count_sql.push_str(&format!(" AND s.sync_type = ${}", idx));
    }
    if query.search.is_some() {
        let mut idx = 1;
        if query.data_source_id.is_some() {
            idx += 1;
        }
        if query.status.is_some() {
            idx += 1;
        }
        if query.sync_type.is_some() {
            idx += 1;
        }
        sql.push_str(&format!(" AND s.sync_type ILIKE ${}", idx));
        count_sql.push_str(&format!(" AND s.sync_type ILIKE ${}", idx));
    }

    sql.push_str(" ORDER BY s.started_at DESC LIMIT $");
    let limit_idx = {
        let mut idx = 1;
        if query.data_source_id.is_some() {
            idx += 1;
        }
        if query.status.is_some() {
            idx += 1;
        }
        if query.sync_type.is_some() {
            idx += 1;
        }
        if query.search.is_some() {
            idx += 1;
        }
        idx
    };
    sql.push_str(&format!("{} OFFSET ${}", limit_idx, limit_idx + 1));

    // Execute count query
    let mut count_query = sqlx::query_scalar::<_, i64>(&count_sql);
    if let Some(ds) = query.data_source_id {
        count_query = count_query.bind(ds);
    }
    if let Some(st) = &query.status {
        count_query = count_query.bind(st);
    }
    if let Some(ty) = &query.sync_type {
        count_query = count_query.bind(ty);
    }
    if let Some(s) = &query.search {
        count_query = count_query.bind(format!("%{}%", s));
    }

    let total: i64 = match count_query.fetch_one(&state.pool).await {
        Ok(t) => t,
        Err(e) => {
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("Failed to count sync records: {}", e),
            ));
        }
    };

    // Execute list query
    let mut list_query = sqlx::query_as::<_, SyncRecordRow>(&sql);
    if let Some(ds) = query.data_source_id {
        list_query = list_query.bind(ds);
    }
    if let Some(st) = &query.status {
        list_query = list_query.bind(st);
    }
    if let Some(ty) = &query.sync_type {
        list_query = list_query.bind(ty);
    }
    if let Some(s) = &query.search {
        list_query = list_query.bind(format!("%{}%", s));
    }
    list_query = list_query.bind(page_size).bind(offset);

    let rows = match list_query.fetch_all(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("Failed to list sync records: {}", e),
            ));
        }
    };

    let items: Vec<SyncRecordResponse> = rows.into_iter().map(Into::into).collect();

    Json(serde_json::json!({
        "success": true,
        "message": "List sync records",
        "data": PaginatedResponse::new(items, total, page, page_size)
    }))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:read"])),
    path = "/api/bi/sync-records/{id}",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
pub async fn get_sync_record(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Getting BI sync record: {}", id);

    let row = match sqlx::query_as::<_, SyncRecordRow>(
        "SELECT s.id, s.data_source_id, d.name AS data_source_name, s.status, s.sync_type, \
         s.records_count, s.affected_records, s.error_message, s.started_at, s.completed_at, \
         s.duration_ms, s.created_at, s.updated_at \
         FROM analytics_sync_records s \
         LEFT JOIN analytics_datasources d ON s.data_source_id = d.id \
         WHERE s.id = $1",
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(r) => r,
        Err(e) => {
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("Failed to get sync record: {}", e),
            ));
        }
    };

    match row {
        Some(r) => Json(serde_json::json!({
            "success": true,
            "message": "Get sync record",
            "data": SyncRecordResponse::from(r)
        })),
        None => Json(topems_shared_core::response::error_value(
            500,
            "Sync record not found",
        )),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["analytics:report:write"])),
    path = "/api/bi/sync-records",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
pub async fn create_sync_record(
    State(state): State<AppState>,
    Json(req): Json<CreateSyncRecordRequest>,
) -> Json<serde_json::Value> {
    info!(
        "Creating BI sync record for data_source: {}",
        req.data_source_id
    );

    let id = Uuid::new_v4();
    let now = Utc::now();
    let status = req.status.unwrap_or_else(|| "pending".to_string());
    let started_at = req.started_at.unwrap_or_else(Utc::now);

    // Verify data source exists
    let ds_exists: Option<Uuid> =
        match sqlx::query_scalar("SELECT id FROM analytics_datasources WHERE id = $1")
            .bind(req.data_source_id)
            .fetch_optional(&state.pool)
            .await
        {
            Ok(r) => r,
            Err(e) => {
                return Json(topems_shared_core::response::error_value(
                    500,
                    &format!("Failed to validate data source: {}", e),
                ));
            }
        };
    if ds_exists.is_none() {
        return Json(topems_shared_core::response::error_value(
            500,
            "Data source not found",
        ));
    }

    // The INSERT...RETURNING below only returns table columns; re-fetch with the JOIN
    // so the response includes the data_source_name from analytics_datasources.
    let row = sqlx::query(
        "INSERT INTO analytics_sync_records \
         (id, data_source_id, status, sync_type, records_count, affected_records, error_message, \
          started_at, completed_at, duration_ms, created_at, updated_at) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)",
    )
    .bind(id)
    .bind(req.data_source_id)
    .bind(&status)
    .bind(&req.sync_type)
    .bind(req.records_count)
    .bind(req.affected_records)
    .bind(req.error_message.as_deref())
    .bind(started_at)
    .bind(req.completed_at)
    .bind(req.duration_ms)
    .bind(now)
    .bind(now)
    .execute(&state.pool)
    .await;

    if let Err(e) = row {
        return Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to create sync record: {}", e),
        ));
    }

    match get_sync_record(State(state), Path(id)).await {
        Json(value) => Json(serde_json::json!({
            "success": true,
            "message": "Create sync record",
            "data": value.get("data").cloned().unwrap_or(serde_json::Value::Null)
        })),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["analytics:update"])),
    path = "/api/bi/sync-records/{id}",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
pub async fn update_sync_record(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateSyncRecordRequest>,
) -> Json<serde_json::Value> {
    info!("Updating BI sync record: {}", id);

    let now = Utc::now();

    let result = sqlx::query(
        "UPDATE analytics_sync_records SET \
         data_source_id = COALESCE($1, data_source_id), \
         sync_type = COALESCE($2, sync_type), \
         status = COALESCE($3, status), \
         records_count = COALESCE($4, records_count), \
         affected_records = COALESCE($5, affected_records), \
         error_message = COALESCE($6, error_message), \
         started_at = COALESCE($7, started_at), \
         completed_at = COALESCE($8, completed_at), \
         duration_ms = COALESCE($9, duration_ms), \
         updated_at = $10 \
         WHERE id = $11",
    )
    .bind(req.data_source_id)
    .bind(req.sync_type.as_deref())
    .bind(req.status.as_deref())
    .bind(req.records_count)
    .bind(req.affected_records)
    .bind(req.error_message.as_deref())
    .bind(req.started_at)
    .bind(req.completed_at)
    .bind(req.duration_ms)
    .bind(now)
    .bind(id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() == 0 => Json(topems_shared_core::response::error_value(
            500,
            "Sync record not found",
        )),
        Ok(_) => match get_sync_record(State(state), Path(id)).await {
            Json(value) => Json(serde_json::json!({
                "success": true,
                "message": "Update sync record",
                "data": value.get("data").cloned().unwrap_or(serde_json::Value::Null)
            })),
        },
        Err(e) => Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to update sync record: {}", e),
        )),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["analytics:delete"])),
    path = "/api/bi/sync-records/{id}",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
pub async fn delete_sync_record(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!("Deleting BI sync record: {}", id);

    let result = sqlx::query("DELETE FROM analytics_sync_records WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() == 0 => Json(topems_shared_core::response::error_value(
            500,
            "Sync record not found",
        )),
        Ok(_) => Json(serde_json::json!({
            "success": true,
            "message": "Delete sync record",
            "data": true
        })),
        Err(e) => Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to delete sync record: {}", e),
        )),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["analytics:write"])),
    path = "/api/bi/sync-records/{id}/retry",
    tag = "BI",
    responses((status = 200, description = "OK", body = serde_json::Value))
)]
pub async fn retry_sync(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    req: Option<Json<RetrySyncRequest>>,
) -> Json<serde_json::Value> {
    info!("Retrying BI sync record: {}", id);

    // Check that record exists
    let existing = sqlx::query_as::<_, SyncRecordRow>(
        "SELECT s.id, s.data_source_id, d.name AS data_source_name, s.status, s.sync_type, \
         s.records_count, s.affected_records, s.error_message, s.started_at, s.completed_at, \
         s.duration_ms, s.created_at, s.updated_at \
         FROM analytics_sync_records s \
         LEFT JOIN analytics_datasources d ON s.data_source_id = d.id \
         WHERE s.id = $1",
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await;

    let existing = match existing {
        Ok(Some(r)) => r,
        Ok(None) => {
            return Json(topems_shared_core::response::error_value(
                500,
                "Sync record not found",
            ));
        }
        Err(e) => {
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("Failed to load sync record: {}", e),
            ));
        }
    };

    if existing.status == "running" {
        warn!("Cannot retry sync record {} while it is running", id);
        return Json(topems_shared_core::response::error_value(
            500,
            "Sync is currently running and cannot be retried",
        ));
    }

    let now = Utc::now();
    let retry_no = format!(
        "RETRY-{}-{}",
        chrono::Utc::now().format("%Y%m%d%H%M%S"),
        &Uuid::new_v4().to_string()[..8].to_uppercase()
    );

    let note = req.and_then(|Json(r)| r.note).filter(|s| !s.is_empty());

    // Reset record to pending and clear error state
    let result = sqlx::query(
        "UPDATE analytics_sync_records SET \
         status = 'pending', \
         error_message = $1, \
         started_at = $2, \
         completed_at = NULL, \
         duration_ms = NULL, \
         records_count = NULL, \
         affected_records = NULL, \
         updated_at = $2 \
         WHERE id = $3",
    )
    .bind(note.as_deref())
    .bind(now)
    .bind(id)
    .execute(&state.pool)
    .await;

    if let Err(e) = result {
        return Json(topems_shared_core::response::error_value(
            500,
            &format!("Failed to reset sync record: {}", e),
        ));
    }

    let refreshed = match get_sync_record(State(state), Path(id)).await {
        Json(value) => value
            .get("data")
            .cloned()
            .unwrap_or(serde_json::Value::Null),
    };

    Json(serde_json::json!({
        "success": true,
        "message": "Sync record queued for retry",
        "data": RetrySyncResponse {
            record: serde_json::from_value(refreshed).unwrap_or_else(|_| SyncRecordResponse::from(existing)),
            retry_no,
            message: "重试已加入队列".to_string(),
        }
    }))
}

// ==================== Internal helpers ====================

#[derive(sqlx::FromRow)]
struct SyncRecordRow {
    id: Uuid,
    data_source_id: Uuid,
    data_source_name: Option<String>,
    status: String,
    sync_type: String,
    records_count: Option<i64>,
    affected_records: Option<i64>,
    error_message: Option<String>,
    started_at: Option<chrono::DateTime<Utc>>,
    completed_at: Option<chrono::DateTime<Utc>>,
    duration_ms: Option<i64>,
    created_at: Option<chrono::DateTime<Utc>>,
    updated_at: Option<chrono::DateTime<Utc>>,
}

impl From<SyncRecordRow> for SyncRecordResponse {
    fn from(row: SyncRecordRow) -> Self {
        Self {
            id: row.id,
            data_source_id: row.data_source_id,
            data_source_name: row.data_source_name,
            status: row.status,
            sync_type: row.sync_type,
            records_count: row.records_count,
            affected_records: row.affected_records,
            error_message: row.error_message,
            started_at: row.started_at.map(format_dt).unwrap_or_default(),
            completed_at: row.completed_at.map(format_dt),
            duration_ms: row.duration_ms,
            created_at: row.created_at.map(format_dt).unwrap_or_default(),
            updated_at: row.updated_at.map(format_dt).unwrap_or_default(),
        }
    }
}

fn format_dt(t: chrono::DateTime<Utc>) -> String {
    t.to_rfc3339()
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---- format_dt ----
    #[test]
    fn format_dt_rfc3339() {
        let dt = chrono::DateTime::from_timestamp(1704164645, 0).unwrap(); // 2024-01-02T03:04:05Z
        assert_eq!(format_dt(dt), "2024-01-02T03:04:05+00:00");
    }

    #[test]
    fn format_dt_zero_time() {
        let dt = chrono::DateTime::from_timestamp(1735603200, 0).unwrap(); // 2024-12-31T00:00:00Z
        assert_eq!(format_dt(dt), "2024-12-31T00:00:00+00:00");
    }
}
