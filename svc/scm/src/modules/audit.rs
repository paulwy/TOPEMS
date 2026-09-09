use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::get,
    Json, Router,
};
use serde::Deserialize;
use sqlx::postgres::PgPool;
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use super::ApiState;
use crate::models::audit_log::AuditLog;
use topems_shared_core::response::{api_error, ApiResponse};

#[derive(Debug, Deserialize)]
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

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/audit-logs", get(list_audit_logs))
        .route("/audit-logs/{id}", get(get_audit_log))
}

pub async fn list_audit_logs(
    State(state): State<ApiState>,
    Query(params): Query<ListAuditLogsQuery>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, AuditLog>(only_own_schema_query!(
        "scm",
        r#"
        SELECT id, action, table_name as entity_type, record_id as entity_id, 
               NULL as entity_ids, changed_by::text as user_id, NULL as user_name, 
               old_values as request_details, new_values as response_details,
               'success' as status, NULL as error_message, ip_address, user_agent, 
               changed_at as created_at
        FROM scm.audit_logs
        WHERE ($1::text IS NULL OR action = $1)
          AND ($2::text IS NULL OR table_name = $2)
          AND ($3::text IS NULL OR changed_by::text = $3)
          AND ($4::text IS NULL OR changed_at >= $4::timestamptz)
          AND ($5::text IS NULL OR changed_at <= $5::timestamptz)
        ORDER BY changed_at DESC
        LIMIT $6 OFFSET $7
        "#
    ))
    .bind(&params.action)
    .bind(&params.entity_type)
    .bind(&params.user_id)
    .bind(params.start_date.clone())
    .bind(params.end_date.clone())
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(logs) => {
            let count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "scm",
                r#"
                SELECT COUNT(*) FROM scm.audit_logs
                WHERE ($1::text IS NULL OR action = $1)
                  AND ($2::text IS NULL OR table_name = $2)
                  AND ($3::text IS NULL OR changed_by::text = $3)
                  AND ($4::text IS NULL OR changed_at >= $4::timestamptz)
                  AND ($5::text IS NULL OR changed_at <= $5::timestamptz)
                "#
            ))
            .bind(&params.action)
            .bind(&params.entity_type)
            .bind(&params.user_id)
            .bind(params.start_date)
            .bind(params.end_date)
            .fetch_one(&mut **txn)
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
            Json(api_error(500, "获取审计日志失败"))
        }
    }
}

pub async fn get_audit_log(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<AuditLog>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query_as::<_, AuditLog>(only_own_schema_query!(
        "scm",
        r#"
        SELECT id, action, table_name as entity_type, record_id as entity_id, 
               NULL as entity_ids, changed_by::text as user_id, NULL as user_name, 
               old_values as request_details, new_values as response_details,
               'success' as status, NULL as error_message, ip_address, user_agent, 
               changed_at as created_at
        FROM scm.audit_logs WHERE id = $1
        "#
    ))
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(log)) => Json(ApiResponse::success(log, "获取审计日志成功")),
        Ok(None) => Json(api_error(404, "审计日志不存在")),
        Err(e) => {
            tracing::error!("获取审计日志失败: {}", e);
            Json(api_error(500, "获取审计日志失败"))
        }
    }
}

pub async fn log_audit_event(
    db: &PgPool,
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
    let ip_address = headers
        .get("x-forwarded-for")
        .and_then(|h| h.to_str().ok())
        .or_else(|| headers.get("x-real-ip").and_then(|h| h.to_str().ok()))
        .map(|s| s.to_string());

    let user_agent = headers
        .get("user-agent")
        .and_then(|h| h.to_str().ok())
        .map(|s| s.to_string());

    let result = sqlx::query(only_own_schema_query!(
        "scm",
        r#"
        INSERT INTO scm.audit_logs (
            action, entity_type, entity_id, entity_ids,
            user_id, user_name, request_details, response_details,
            status, error_message, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        "#
    ))
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn list_audit_logs_query_defaults_via_serde() {
        let q: ListAuditLogsQuery = serde_json::from_str("{}").expect("deserialize empty");
        assert!(q.action.is_none());
        assert!(q.entity_type.is_none());
        assert!(q.user_id.is_none());
        assert!(q.status.is_none());
        assert!(q.start_date.is_none());
        assert!(q.end_date.is_none());
        assert!(q.page.is_none());
        assert!(q.page_size.is_none());
    }

    #[test]
    fn list_audit_logs_query_roundtrip_preserves_fields() {
        let json = r#"{
            "action": "create",
            "entity_type": "supplier",
            "user_id": "u-123",
            "status": "success",
            "start_date": "2026-01-01",
            "end_date": "2026-01-31",
            "page": 2,
            "page_size": 50
        }"#;
        let q: ListAuditLogsQuery = serde_json::from_str(json).expect("deserialize");
        assert_eq!(q.action.as_deref(), Some("create"));
        assert_eq!(q.entity_type.as_deref(), Some("supplier"));
        assert_eq!(q.user_id.as_deref(), Some("u-123"));
        assert_eq!(q.status.as_deref(), Some("success"));
        assert_eq!(q.start_date.as_deref(), Some("2026-01-01"));
        assert_eq!(q.end_date.as_deref(), Some("2026-01-31"));
        assert_eq!(q.page, Some(2));
        assert_eq!(q.page_size, Some(50));
    }

    #[test]
    fn list_audit_logs_query_ignores_unknown_fields() {
        let json = r#"{"action": "delete", "extra": "ignored"}"#;
        let q: ListAuditLogsQuery = serde_json::from_str(json).expect("deserialize");
        assert_eq!(q.action.as_deref(), Some("delete"));
    }

    #[test]
    fn list_audit_logs_query_partial_population() {
        let json = r#"{"page": 5}"#;
        let q: ListAuditLogsQuery = serde_json::from_str(json).expect("deserialize");
        assert_eq!(q.page, Some(5));
        assert!(q.action.is_none());
    }

    #[test]
    fn create_routes_returns_router_without_panic() {
        // Smoke test that the router can be constructed.
        let _router = create_routes();
    }
}
