use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    routing::get,
    Json, Router,
};
use serde::Deserialize;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::models::AuditLog;
use topems_shared::response::ApiResponse;

pub fn create_routes() -> Router<super::ApiState> {
    Router::<super::ApiState>::new()
        .route("/api/v1/audit-logs", get(list_audit_logs))
        .route("/api/v1/audit-logs/{id}", get(get_audit_log))
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ListAuditLogsQuery {
    pub action: Option<String>,
    pub entity_type: Option<String>,
    pub user_id: Option<String>,
    pub status: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[utoipa::path(
    get,
    path = "/api/v1/audit-logs",
    tag = "audit",
    params(
        ("action" = Option<String>, Query, description = "操作类型"),
        ("entity_type" = Option<String>, Query, description = "实体类型"),
        ("user_id" = Option<String>, Query, description = "用户 ID"),
        ("status" = Option<String>, Query, description = "操作状态"),
        ("start_date" = Option<String>, Query, description = "开始时间"),
        ("end_date" = Option<String>, Query, description = "结束时间"),
        ("page" = Option<i64>, Query, description = "页码"),
        ("page_size" = Option<i64>, Query, description = "每页数量")
    ),
    responses(
        (status = 200, description = "获取审计日志成功", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器错误")
    )
)]
async fn list_audit_logs(
    State(state): State<super::ApiState>,
    Query(params): Query<ListAuditLogsQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, AuditLog>(
        r#"
        SELECT id, action, entity_type, entity_id, entity_ids,
               user_id, user_name, request_details, response_details,
               status, error_message, ip_address, user_agent, created_at
        FROM rs.audit_logs
        WHERE ($1::text IS NULL OR action = $1)
          AND ($2::text IS NULL OR entity_type = $2)
          AND ($3::text IS NULL OR user_id = $3)
          AND ($4::text IS NULL OR status = $4)
          AND ($5::text IS NULL OR created_at >= $5::timestamptz)
          AND ($6::text IS NULL OR created_at <= $6::timestamptz)
        ORDER BY created_at DESC
        LIMIT $7 OFFSET $8
        "#,
    )
    .bind(&params.action)
    .bind(&params.entity_type)
    .bind(&params.user_id)
    .bind(&params.status)
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
                SELECT COUNT(*) FROM rs.audit_logs
                WHERE ($1::text IS NULL OR action = $1)
                  AND ($2::text IS NULL OR entity_type = $2)
                  AND ($3::text IS NULL OR user_id = $3)
                  AND ($4::text IS NULL OR status = $4)
                  AND ($5::text IS NULL OR created_at >= $5::timestamptz)
                  AND ($6::text IS NULL OR created_at <= $6::timestamptz)
                "#,
            )
            .bind(&params.action)
            .bind(&params.entity_type)
            .bind(&params.user_id)
            .bind(&params.status)
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

#[utoipa::path(
    get,
    path = "/api/v1/audit-logs/{id}",
    tag = "audit",
    params(
        ("id" = Uuid, Path, description = "审计日志 ID")
    ),
    responses(
        (status = 200, description = "获取审计日志成功", body = ApiResponse<AuditLog>),
        (status = 404, description = "审计日志不存在"),
        (status = 500, description = "服务器错误")
    )
)]
async fn get_audit_log(
    State(state): State<super::ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<AuditLog>> {
    let result = sqlx::query_as::<_, AuditLog>(
        r#"
        SELECT id, action, entity_type, entity_id, entity_ids,
               user_id, user_name, request_details, response_details,
               status, error_message, ip_address, user_agent, created_at
        FROM rs.audit_logs WHERE id = $1
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

pub async fn log_audit_event(
    db: &sqlx::postgres::PgPool,
    action: String,
    entity_type: String,
    entity_id: Option<Uuid>,
    entity_ids: Option<serde_json::Value>,
    user_id: Option<String>,
    user_name: Option<String>,
    request_details: Option<serde_json::Value>,
    response_details: Option<serde_json::Value>,
    status: String,
    error_message: Option<String>,
    headers: &HeaderMap,
) {
    let id = Uuid::new_v4();
    let ip_address = headers
        .get("x-forwarded-for")
        .and_then(|h| h.to_str().ok())
        .or_else(|| headers.get("x-real-ip").and_then(|h| h.to_str().ok()))
        .map(|s| s.to_string());

    let user_agent = headers
        .get("user-agent")
        .and_then(|h| h.to_str().ok())
        .map(|s| s.to_string());

    let result = sqlx::query(
        r#"
        INSERT INTO rs.audit_logs (
            id, action, entity_type, entity_id, entity_ids,
            user_id, user_name, request_details, response_details,
            status, error_message, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        "#,
    )
    .bind(id)
    .bind(action)
    .bind(entity_type)
    .bind(entity_id)
    .bind(entity_ids)
    .bind(user_id)
    .bind(user_name)
    .bind(request_details)
    .bind(response_details)
    .bind(status)
    .bind(error_message)
    .bind(ip_address)
    .bind(user_agent)
    .execute(db)
    .await;

    if let Err(e) = result {
        tracing::error!("记录审计日志失败: {}", e);
    }
}
