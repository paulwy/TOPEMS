use anyhow::Result;
use axum::{
    extract::{Path, Query, State},
    routing::get,
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::postgres::PgPool;
use std::sync::Arc;
use uuid::Uuid;

#[derive(Debug, Serialize)]
pub struct ApiResponse<T> {
    pub code: u16,
    pub success: bool,
    pub data: Option<T>,
    pub message: String,
    pub timestamp: String,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T, message: &str) -> Self {
        Self {
            code: 200,
            success: true,
            data: Some(data),
            message: message.to_string(),
            timestamp: Utc::now().to_rfc3339(),
        }
    }

    pub fn error(code: u16, message: &str) -> Self {
        Self {
            code,
            success: false,
            data: None,
            message: message.to_string(),
            timestamp: Utc::now().to_rfc3339(),
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub action_type: Option<String>,
    pub target_type: Option<String>,
    pub user_id: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

pub struct AppState {
    pub db: PgPool,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct AuditLog {
    pub id: Uuid,
    pub action_type: String,
    pub target_type: String,
    pub target_id: String,
    pub target_name: Option<String>,
    pub user_id: String,
    pub user_name: Option<String>,
    pub details: serde_json::Value,
    pub ip_address: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

pub async fn create_routes(db: PgPool) -> Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route("/api/v1/audit-logs", get(list_audit_logs))
        .route("/api/v1/audit-logs/{id}", get(get_audit_log))
        .route("/api/v1/audit-logs/target/{target_type}/{target_id}", get(get_target_audit))
        .with_state(state);

    Ok(app)
}

async fn list_audit_logs(
    State(state): State<Arc<AppState>>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, AuditLog>(
        r#"
        SELECT id, action_type, target_type, target_id, target_name,
               user_id, user_name, details, ip_address, created_at
        FROM audit_logs
        WHERE ($1::text IS NULL OR target_name ILIKE $1 OR user_name ILIKE $1)
          AND ($2::text IS NULL OR action_type = $2)
          AND ($3::text IS NULL OR target_type = $3)
          AND ($4::text IS NULL OR user_id = $4)
          AND ($5::text IS NULL OR created_at >= $5::timestamptz)
          AND ($6::text IS NULL OR created_at <= $6::timestamptz)
        ORDER BY created_at DESC
        LIMIT $7 OFFSET $8
        "#,
    )
    .bind(&params.search)
    .bind(&params.action_type)
    .bind(&params.target_type)
    .bind(&params.user_id)
    .bind(params.start_date.clone())
    .bind(params.end_date.clone())
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(logs) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM audit_logs
                WHERE ($1::text IS NULL OR target_name ILIKE $1 OR user_name ILIKE $1)
                  AND ($2::text IS NULL OR action_type = $2)
                  AND ($3::text IS NULL OR target_type = $3)
                  AND ($4::text IS NULL OR user_id = $4)
                  AND ($5::text IS NULL OR created_at >= $5::timestamptz)
                  AND ($6::text IS NULL OR created_at <= $6::timestamptz)
                "#,
            )
            .bind(&params.search)
            .bind(&params.action_type)
            .bind(&params.target_type)
            .bind(&params.user_id)
            .bind(params.start_date)
            .bind(params.end_date)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "audit_logs": logs,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取审计日志成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取审计日志失败: {}", e);
            Json(ApiResponse::error(500, "获取审计日志失败"))
        }
    }
}

async fn get_audit_log(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<AuditLog>> {
    let result = sqlx::query_as::<_, AuditLog>(
        r#"
        SELECT id, action_type, target_type, target_id, target_name,
               user_id, user_name, details, ip_address, created_at
        FROM audit_logs WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(log)) => Json(ApiResponse::success(log, "获取审计日志成功")),
        Ok(None) => Json(ApiResponse::error(404, "审计日志不存在")),
        Err(e) => {
            tracing::error!("获取审计日志失败: {}", e);
            Json(ApiResponse::error(500, "获取审计日志失败"))
        }
    }
}

async fn get_target_audit(
    State(state): State<Arc<AppState>>,
    Path((target_type, target_id)): Path<(String, String)>,
) -> Json<ApiResponse<Vec<AuditLog>>> {
    let result = sqlx::query_as::<_, AuditLog>(
        r#"
        SELECT id, action_type, target_type, target_id, target_name,
               user_id, user_name, details, ip_address, created_at
        FROM audit_logs
        WHERE target_type = $1 AND target_id = $2
        ORDER BY created_at DESC
        "#,
    )
    .bind(target_type)
    .bind(target_id)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(logs) => Json(ApiResponse::success(logs, "获取对象审计日志成功")),
        Err(e) => {
            tracing::error!("获取对象审计日志失败: {}", e);
            Json(ApiResponse::error(500, "获取对象审计日志失败"))
        }
    }
}