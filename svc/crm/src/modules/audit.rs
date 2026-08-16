use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::get,
    Json, Router,
};
use serde::Deserialize;
use sqlx::postgres::PgPool;
use uuid::Uuid;

use super::ApiState;
use crate::models::AuditLog;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::ApiResponse;
use topems_shared_core::response::api_error;

/// 审计日志参数包装（消除 clippy::too_many_arguments 告警）
#[derive(Debug, Clone)]
pub struct AuditEventParams {
    pub action: String,
    pub entity_type: String,
    pub entity_id: Option<Uuid>,
    pub entity_ids: Option<serde_json::Value>,
    pub user_id: Option<String>,
    pub user_name: Option<String>,
    pub request_details: Option<serde_json::Value>,
    pub response_details: Option<serde_json::Value>,
    pub status: String,
    pub error_message: Option<String>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/audit-logs", get(list_audit_logs))
        .route("/audit-logs/{id}", get(get_audit_log))
}

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

async fn list_audit_logs(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ListAuditLogsQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::All).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, AuditLog>(
        r#"
        SELECT id, action, entity_type, entity_id, entity_ids,
               user_id, user_name, request_details, response_details,
               status, error_message, ip_address, user_agent, created_at
        FROM plugin_crm.audit_logs
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
                SELECT COUNT(*) FROM plugin_crm.audit_logs
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
                    "items": logs,
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

async fn get_audit_log(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<AuditLog>> {
    match check_permission(&state.db, &claims, &ModulePermission::All).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query_as::<_, AuditLog>(
        r#"
        SELECT id, action, entity_type, entity_id, entity_ids,
               user_id, user_name, request_details, response_details,
               status, error_message, ip_address, user_agent, created_at
        FROM plugin_crm.audit_logs WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
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

pub async fn log_audit_event(db: &PgPool, params: AuditEventParams, headers: &HeaderMap) {
    let AuditEventParams {
        action,
        entity_type,
        entity_id,
        entity_ids,
        user_id,
        user_name,
        request_details,
        response_details,
        status,
        error_message,
    } = params;
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
        INSERT INTO plugin_crm.audit_logs (
            action, entity_type, entity_id, entity_ids,
            user_id, user_name, request_details, response_details,
            status, error_message, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        "#,
    )
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
    use serde::Deserialize;
    use uuid::Uuid;

    #[test]
    fn audit_event_params_clone() {
        let params = AuditEventParams {
            action: "create".to_string(),
            entity_type: "customer".to_string(),
            entity_id: Some(Uuid::nil()),
            entity_ids: Some(serde_json::json!([1, 2, 3])),
            user_id: Some("user-1".to_string()),
            user_name: Some("Alice".to_string()),
            request_details: Some(serde_json::json!({"name": "Test"})),
            response_details: None,
            status: "success".to_string(),
            error_message: Some("oops".to_string()),
        };
        let cloned = params.clone();
        assert_eq!(cloned.action, "create");
        assert_eq!(cloned.entity_type, "customer");
        assert_eq!(cloned.status, "success");
        assert!(cloned.entity_id.is_some());
        assert!(cloned.entity_ids.is_some());
        assert!(cloned.error_message.is_some());
    }

    #[test]
    fn audit_event_params_minimal() {
        let params = AuditEventParams {
            action: "read".to_string(),
            entity_type: "contact".to_string(),
            entity_id: None,
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: None,
            response_details: None,
            status: "success".to_string(),
            error_message: None,
        };
        assert!(params.entity_id.is_none());
        assert!(params.user_id.is_none());
    }

    #[test]
    fn list_audit_logs_query_empty() {
        let json = r#"{}"#;
        let q: ListAuditLogsQuery = serde_json::from_str(json).unwrap();
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
    fn list_audit_logs_query_all_fields() {
        let json = r#"{
            "action": "create",
            "entity_type": "customer",
            "user_id": "u1",
            "status": "success",
            "start_date": "2025-01-01",
            "end_date": "2025-12-31",
            "page": 2,
            "page_size": 50
        }"#;
        let q: ListAuditLogsQuery = serde_json::from_str(json).unwrap();
        assert_eq!(q.action.as_deref(), Some("create"));
        assert_eq!(q.entity_type.as_deref(), Some("customer"));
        assert_eq!(q.user_id.as_deref(), Some("u1"));
        assert_eq!(q.status.as_deref(), Some("success"));
        assert_eq!(q.start_date.as_deref(), Some("2025-01-01"));
        assert_eq!(q.end_date.as_deref(), Some("2025-12-31"));
        assert_eq!(q.page, Some(2));
        assert_eq!(q.page_size, Some(50));
    }

    #[test]
    fn list_audit_logs_query_partial() {
        let json = r#"{"action":"delete","page":1}"#;
        let q: ListAuditLogsQuery = serde_json::from_str(json).unwrap();
        assert_eq!(q.action.as_deref(), Some("delete"));
        assert_eq!(q.page, Some(1));
        assert!(q.entity_type.is_none());
    }

    #[test]
    fn create_routes_smoke() {
        let _router: Router<ApiState> = create_routes();
    }
}
