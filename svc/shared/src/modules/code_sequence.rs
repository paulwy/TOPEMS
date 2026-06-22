//! Code Sequence Module - 编码序列管理

use axum::{
    extract::{Path, State},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;

use crate::AppState;
use topems_shared::ApiResponse;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodeSequence {
    pub id: uuid::Uuid,
    pub tenant_id: uuid::Uuid,
    pub code_type: String,
    pub prefix: String,
    pub current_value: i64,
    pub padding_length: i32,
    pub step: i32,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateSequence {
    pub code_type: String,
    pub prefix: String,
    pub padding_length: Option<i32>,
    pub step: Option<i32>,
    pub description: Option<String>,
}

pub async fn list_sequences(
    State(state): State<AppState>,
) -> Json<ApiResponse<Vec<CodeSequence>>> {
    let sequences = sqlx::query_as::<_, CodeSequence>(
        r#"
        SELECT id, tenant_id, code_type, prefix, current_value,
               padding_length, step, description
        FROM shared.code_sequences
        ORDER BY code_type
        "#
    )
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    Json(ApiResponse::success(sequences, "Sequences retrieved"))
}

pub async fn get_next_code(
    State(state): State<AppState>,
    Path(code_type): Path<String>,
) -> Json<ApiResponse<NextCode>> {
    let result = sqlx::query_as::<_, (String, i64, i32)>(
        r#"
        UPDATE shared.code_sequences
        SET current_value = current_value + COALESCE(step, 1)
        WHERE code_type = $1
        RETURNING prefix, current_value, padding_length
        "#
    )
    .bind(&code_type)
    .fetch_optional(&state.pool)
    .await
    .unwrap();

    match result {
        Some((prefix, seq, padding)) => {
            let code = format!("{}-{:0>width$}", prefix, seq, width = padding as usize);
            Json(ApiResponse::success(NextCode { code, sequence: seq }, "Code generated"))
        }
        None => Json(ApiResponse::error(404, "Code sequence not found")),
    }
}

pub async fn create_sequence(
    State(state): State<AppState>,
    Json(payload): Json<CreateSequence>,
) -> Json<ApiResponse<CodeSequence>> {
    let tenant_id = state.auth_state.tenant_id.unwrap_or(uuid::Uuid::nil());

    let result = sqlx::query_as::<_, CodeSequence>(
        r#"
        INSERT INTO shared.code_sequences (tenant_id, code_type, prefix, padding_length, step, description)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, tenant_id, code_type, prefix, current_value, padding_length, step, description
        "#
    )
    .bind(tenant_id)
    .bind(&payload.code_type)
    .bind(&payload.prefix)
    .bind(&payload.padding_length.unwrap_or(6))
    .bind(&payload.step.unwrap_or(1))
    .bind(&payload.description)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(seq) => Json(ApiResponse::success(seq, "Sequence created")),
        Err(e) => Json(ApiResponse::error(500, &format!("Failed to create sequence: {}", e))),
    }
}

#[derive(Debug, Serialize)]
pub struct NextCode {
    pub code: String,
    pub sequence: i64,
}

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/api/shared/sequences", get(list_sequences))
        .route("/api/shared/sequences", post(create_sequence))
        .route("/api/shared/sequences/{code_type}/next", post(get_next_code))
}
