//! System Audit Logs module - /system/audit-logs 端点实现

use crate::AppState;
use axum::{
    extract::{Path, Query, State},
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::FromRow;
use uuid::Uuid;

use topems_shared::ApiResponse;
use topems_shared_core::response::{api_error, PaginatedResponse};

// ─── Models ──────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct AuditLog {
    pub id: Uuid,
    pub tenant_id: Option<Uuid>,
    pub action: String,
    pub entity_type: String,
    pub entity_id: Option<Uuid>,
    pub entity_ids: Option<Value>,
    pub user_id: Option<Uuid>,
    pub user_name: Option<String>,
    pub request_details: Option<Value>,
    pub response_details: Option<Value>,
    pub status: String,
    pub error_message: Option<String>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub created_at: DateTime<Utc>,
}

// ─── Query params ────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct AuditLogQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,

    pub user_id: Option<String>,
    pub user_name: Option<String>,
    pub action: Option<String>,
    pub entity_type: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub status: Option<String>,
    pub search: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AuditStatsParams {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub group_by: Option<String>,
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

pub async fn list_audit_logs(
    State(state): State<AppState>,
    Query(params): Query<AuditLogQueryParams>,
) -> Json<ApiResponse<PaginatedResponse<AuditLog>>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.or(params.page_size).unwrap_or(20).min(200);
    let offset = (page - 1) * page_size;

    let user_uuid = params
        .user_id
        .clone()
        .and_then(|s| Uuid::parse_str(&s).ok());
    let search = params.search.clone().unwrap_or_default();

    let total: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM audit_logs
           WHERE ($1::uuid IS NULL OR user_id = $1)
             AND ($2::text IS NULL OR user_name ILIKE '%' || $2 || '%')
             AND ($3::text IS NULL OR action = $3)
             AND ($4::text IS NULL OR entity_type = $4)
             AND ($5::text IS NULL OR status = $5)
             AND ($6::timestamptz IS NULL OR created_at >= $6)
             AND ($7::timestamptz IS NULL OR created_at <= $7)
             AND ($8 = '' OR action ILIKE '%' || $8 || '%' OR entity_type ILIKE '%' || $8 || '%' OR COALESCE(user_name, '') ILIKE '%' || $8 || '%')"#,
    )
    .bind(user_uuid)
    .bind(&params.user_name)
    .bind(&params.action)
    .bind(&params.entity_type)
    .bind(&params.status)
    .bind(&params.start_date)
    .bind(&params.end_date)
    .bind(&search)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);

    let items: Vec<AuditLog> = sqlx::query_as(
        r#"SELECT * FROM audit_logs
           WHERE ($1::uuid IS NULL OR user_id = $1)
             AND ($2::text IS NULL OR user_name ILIKE '%' || $2 || '%')
             AND ($3::text IS NULL OR action = $3)
             AND ($4::text IS NULL OR entity_type = $4)
             AND ($5::text IS NULL OR status = $5)
             AND ($6::timestamptz IS NULL OR created_at >= $6)
             AND ($7::timestamptz IS NULL OR created_at <= $7)
             AND ($8 = '' OR action ILIKE '%' || $8 || '%' OR entity_type ILIKE '%' || $8 || '%' OR COALESCE(user_name, '') ILIKE '%' || $8 || '%')
           ORDER BY created_at DESC LIMIT $9 OFFSET $10"#,
    )
    .bind(user_uuid)
    .bind(&params.user_name)
    .bind(&params.action)
    .bind(&params.entity_type)
    .bind(&params.status)
    .bind(&params.start_date)
    .bind(&params.end_date)
    .bind(&search)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    Json(ApiResponse::success(
        PaginatedResponse::new(items, total, page, page_size),
        "查询成功",
    ))
}

pub async fn get_audit_log(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<AuditLog>> {
    let log: Result<AuditLog, _> = sqlx::query_as("SELECT * FROM audit_logs WHERE id = $1")
        .bind(id)
        .fetch_one(&state.pool)
        .await;

    match log {
        Ok(v) => Json(ApiResponse::success(v, "查询成功")),
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                Json(api_error(404, "审计日志不存在"))
            } else {
                tracing::error!("查询审计日志失败: {}", e);
                Json(api_error(500, "查询审计日志失败"))
            }
        }
    }
}

pub async fn export_audit_logs(
    State(state): State<AppState>,
    Query(params): Query<AuditLogQueryParams>,
) -> Json<ApiResponse<Value>> {
    let user_uuid = params
        .user_id
        .clone()
        .and_then(|s| Uuid::parse_str(&s).ok());
    let search = params.search.clone().unwrap_or_default();

    let items: Vec<AuditLog> = sqlx::query_as(
        r#"SELECT * FROM audit_logs
           WHERE ($1::uuid IS NULL OR user_id = $1)
             AND ($2::text IS NULL OR user_name ILIKE '%' || $2 || '%')
             AND ($3::text IS NULL OR action = $3)
             AND ($4::text IS NULL OR entity_type = $4)
             AND ($5::text IS NULL OR status = $5)
             AND ($6::timestamptz IS NULL OR created_at >= $6)
             AND ($7::timestamptz IS NULL OR created_at <= $7)
             AND ($8 = '' OR action ILIKE '%' || $8 || '%' OR entity_type ILIKE '%' || $8 || '%' OR COALESCE(user_name, '') ILIKE '%' || $8 || '%')
           ORDER BY created_at DESC LIMIT 10000"#,
    )
    .bind(user_uuid)
    .bind(&params.user_name)
    .bind(&params.action)
    .bind(&params.entity_type)
    .bind(&params.status)
    .bind(&params.start_date)
    .bind(&params.end_date)
    .bind(&search)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    Json(ApiResponse::success(
        serde_json::json!({
            "count": items.len(),
            "data": items,
            "format": "json",
            "exported_at": Utc::now().to_rfc3339(),
        }),
        "导出成功",
    ))
}

pub async fn get_audit_stats(
    State(state): State<AppState>,
    Query(params): Query<AuditStatsParams>,
) -> Json<ApiResponse<Value>> {
    let group_by = params
        .group_by
        .clone()
        .unwrap_or_else(|| "action".to_string());

    let total: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM audit_logs
           WHERE ($1::timestamptz IS NULL OR created_at >= $1)
             AND ($2::timestamptz IS NULL OR created_at <= $2)"#,
    )
    .bind(&params.start_date)
    .bind(&params.end_date)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);

    let success_count: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM audit_logs WHERE status = 'success'
           AND ($1::timestamptz IS NULL OR created_at >= $1)
           AND ($2::timestamptz IS NULL OR created_at <= $2)"#,
    )
    .bind(&params.start_date)
    .bind(&params.end_date)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);

    let failed_count: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM audit_logs WHERE status != 'success'
           AND ($1::timestamptz IS NULL OR created_at >= $1)
           AND ($2::timestamptz IS NULL OR created_at <= $2)"#,
    )
    .bind(&params.start_date)
    .bind(&params.end_date)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);

    let by_group: Vec<(String, i64)> = match group_by.as_str() {
        "action" => sqlx::query_as(
            r#"SELECT action as key, COUNT(*) as count FROM audit_logs
               WHERE ($1::timestamptz IS NULL OR created_at >= $1)
                 AND ($2::timestamptz IS NULL OR created_at <= $2)
               GROUP BY action ORDER BY count DESC LIMIT 50"#,
        )
        .bind(&params.start_date)
        .bind(&params.end_date)
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default(),
        "resource" => sqlx::query_as(
            r#"SELECT entity_type as key, COUNT(*) as count FROM audit_logs
               WHERE ($1::timestamptz IS NULL OR created_at >= $1)
                 AND ($2::timestamptz IS NULL OR created_at <= $2)
               GROUP BY entity_type ORDER BY count DESC LIMIT 50"#,
        )
        .bind(&params.start_date)
        .bind(&params.end_date)
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default(),
        "user" => sqlx::query_as(
            r#"SELECT COALESCE(user_name, user_id::text, 'unknown') as key, COUNT(*) as count
               FROM audit_logs
               WHERE ($1::timestamptz IS NULL OR created_at >= $1)
                 AND ($2::timestamptz IS NULL OR created_at <= $2)
               GROUP BY key ORDER BY count DESC LIMIT 50"#,
        )
        .bind(&params.start_date)
        .bind(&params.end_date)
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default(),
        "date" => sqlx::query_as(
            r#"SELECT created_at::date::text as key, COUNT(*) as count FROM audit_logs
               WHERE ($1::timestamptz IS NULL OR created_at >= $1)
                 AND ($2::timestamptz IS NULL OR created_at <= $2)
               GROUP BY key ORDER BY key DESC LIMIT 50"#,
        )
        .bind(&params.start_date)
        .bind(&params.end_date)
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default(),
        _ => Vec::new(),
    };

    let mut group_map = serde_json::Map::new();
    for (key, count) in by_group {
        group_map.insert(key, serde_json::json!(count));
    }

    Json(ApiResponse::success(
        serde_json::json!({
            "total": total,
            "success": success_count,
            "failed": failed_count,
            "success_rate": if total > 0 { (success_count as f64 / total as f64) * 100.0 } else { 0.0 },
            "by_group": Value::Object(group_map),
        }),
        "查询成功",
    ))
}
