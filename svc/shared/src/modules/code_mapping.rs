//! Code Mapping Module - 编码映射管理

use axum::{
    extract::{Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::AppState;
use topems_shared::ApiResponse;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodeMapping {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub external_system: String,
    pub external_code: String,
    pub internal_code: String,
    pub entity_type: String,
    pub sync_status: String,
    pub last_sync_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateMapping {
    pub external_system: String,
    pub external_code: String,
    pub internal_code: String,
    pub entity_type: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct MappingQuery {
    pub external_system: Option<String>,
    pub internal_code: Option<String>,
    pub sync_status: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SyncRequest {
    pub external_system: String,
    pub entity_type: String,
    pub records: Vec<SyncRecord>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SyncRecord {
    pub external_code: String,
    pub data: serde_json::Value,
}

pub async fn list_mappings(
    State(state): State<AppState>,
    Query(query): Query<MappingQuery>,
) -> Json<ApiResponse<Vec<CodeMapping>>> {
    let mappings = sqlx::query_as::<_, CodeMapping>(
        r#"
        SELECT id, tenant_id, external_system, external_code, internal_code,
               entity_type, sync_status, last_sync_at
        FROM shared.code_mappings
        WHERE ($1::text IS NULL OR external_system = $1)
          AND ($2::text IS NULL OR internal_code = $2)
          AND ($3::text IS NULL OR sync_status = $3)
        ORDER BY created_at DESC
        LIMIT 100
        "#
    )
    .bind(&query.external_system)
    .bind(&query.internal_code)
    .bind(&query.sync_status)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    Json(ApiResponse::success(mappings, "Mappings retrieved"))
}

pub async fn create_mapping(
    State(state): State<AppState>,
    Json(payload): Json<CreateMapping>,
) -> Json<ApiResponse<CodeMapping>> {
    let tenant_id = state.auth_state.tenant_id.unwrap_or(Uuid::nil());

    let result = sqlx::query_as::<_, CodeMapping>(
        r#"
        INSERT INTO shared.code_mappings (tenant_id, external_system, external_code,
                                          internal_code, entity_type, sync_status)
        VALUES ($1, $2, $3, $4, $5, 'synced')
        ON CONFLICT (external_system, external_code)
        DO UPDATE SET internal_code = $4, sync_status = 'synced', last_sync_at = NOW()
        RETURNING id, tenant_id, external_system, external_code, internal_code,
                  entity_type, sync_status, last_sync_at
        "#
    )
    .bind(tenant_id)
    .bind(&payload.external_system)
    .bind(&payload.external_code)
    .bind(&payload.internal_code)
    .bind(&payload.entity_type)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(mapping) => Json(ApiResponse::success(mapping, "Mapping created")),
        Err(e) => Json(ApiResponse::error(500, &format!("Failed to create mapping: {}", e))),
    }
}

pub async fn sync_data(
    State(state): State<AppState>,
    Json(payload): Json<SyncRequest>,
) -> Json<ApiResponse<SyncResult>> {
    let mut synced = 0;
    let mut failed = 0;
    let mut errors = vec![];

    for record in payload.records {
        let result = sqlx::query(
            r#"
            INSERT INTO shared.sync_logs (tenant_id, sync_type, source_system, target_system,
                                          entity_type, source_code, operation, status, request_data)
            VALUES ($1, 'external_sync', $2, 'internal', $3, $4, 'sync', 'pending', $5)
            "#
        )
        .bind(state.auth_state.tenant_id.unwrap_or(Uuid::nil()))
        .bind(&payload.external_system)
        .bind(&payload.entity_type)
        .bind(&record.external_code)
        .bind(&record.data)
        .execute(&state.pool)
        .await;

        match result {
            Ok(_) => synced += 1,
            Err(e) => {
                failed += 1;
                errors.push(format!("{}: {}", record.external_code, e));
            }
        }
    }

    Json(ApiResponse::success(
        SyncResult { synced, failed, errors },
        "Sync completed",
    ))
}

#[derive(Debug, Serialize)]
pub struct SyncResult {
    pub synced: i32,
    pub failed: i32,
    pub errors: Vec<String>,
}

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/api/shared/mappings", get(list_mappings))
        .route("/api/shared/mappings", post(create_mapping))
        .route("/api/shared/sync", post(sync_data))
}
