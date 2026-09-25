//! MES 审计日志模块
//!
//! 复用 CRM audit 模式，写入 mes.audit_logs。
//! action 命名规范：mes.{entity}.{action}（如 mes.production_order.release）

use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::get,
    Json, Router,
};
use serde::Deserialize;
use sqlx::postgres::PgPool;
use uuid::Uuid;

use crate::models::audit_log::AuditLog;
use crate::shared::permission::{check_permission, MesPermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::{api_error, ApiResponse};
use topems_shared_db::SchemaAwareAuditLogService;

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

pub fn create_routes() -> Router<crate::AppState> {
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:audit:read"])),
    path = "/audit-logs",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Audit"
)]
async fn list_audit_logs(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ListAuditLogsQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.pool, &claims, &MesPermission::All).await {
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
        FROM mes.audit_logs
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
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(logs) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM mes.audit_logs
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
            .fetch_one(&state.pool)
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:audit:read"])),
    path = "/audit-logs/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Audit"
)]
async fn get_audit_log(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.pool, &claims, &MesPermission::All).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query_as::<_, AuditLog>(
        r#"
        SELECT id, action, entity_type, entity_id, entity_ids,
               user_id, user_name, request_details, response_details,
               status, error_message, ip_address, user_agent, created_at
        FROM mes.audit_logs WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(log)) => {
            let v = serde_json::to_value(&log).unwrap_or(serde_json::json!({}));
            Json(ApiResponse::success(v, "获取审计日志成功"))
        }
        Ok(None) => Json(api_error(404, "审计日志不存在")),
        Err(e) => {
            tracing::error!("获取审计日志失败: {}", e);
            Json(api_error(500, "获取审计日志失败"))
        }
    }
}

pub async fn log_audit_event(db: &PgPool, params: AuditEventParams, headers: &HeaderMap) {
    use topems_shared_db::CreateAuditLogRequest;
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

    // P1-3: 13-col INSERT delegated to SchemaAwareAuditLogService with
    // mes prefix so tenant_id / DEFAULT columns stay in sync with
    // the Cluster-A 15-col standard. SELECT endpoints retained unchanged.
    let mut req = CreateAuditLogRequest::new(action, entity_type, status);
    if let Some(eid) = entity_id {
        req = req.with_entity_id(eid);
    }
    if let Some(eids) = entity_ids {
        req = req.with_entity_ids(eids);
    }
    if user_id.is_some() || user_name.is_some() {
        req = req.with_user(user_id.unwrap_or_default(), user_name.unwrap_or_default());
    }
    if let Some(rd) = request_details {
        req = req.with_request_details(rd);
    }
    if let Some(rd) = response_details {
        req = req.with_response_details(rd);
    }
    if let Some(err) = error_message {
        req = req.with_error(err);
    }
    req.ip_address = ip_address;
    req.user_agent = user_agent;

    let service = SchemaAwareAuditLogService::new(db, Some("mes"));
    if let Err(e) = service.create_audit_log(&req).await {
        tracing::error!("记录审计日志失败: {}", e);
    }
}

/// 记录审批事件审计日志（写入 mes.audit_logs）
///
/// 用于审批流程的 start/approve/reject 动作审计。
/// action 会自动加 `approval_` 前缀，approval_id 与 comment 序列化到 request_details。
///
/// P1-3: 原 7 列简化 INSERT（只有 action/entity_type/entity_id/user_id/
/// request_details/status/tenant_id）已迁移至 SchemaAwareAuditLogService
/// 的 13 列标准签名。缺失列（entity_ids/response_details/error_message/
/// ip_address/user_agent）统一为 NULL；user_name 留空；status 固定 "success"。
pub async fn log_approval_event(
    pool: &PgPool,
    entity_type: &str,
    entity_id: Uuid,
    approval_id: Uuid,
    action: &str,
    approver_id: Uuid,
    comment: &str,
    tenant_id: Option<Uuid>,
) -> Result<(), sqlx::Error> {
    use topems_shared_db::CreateAuditLogRequest;

    let mut req = CreateAuditLogRequest::new(
        format!("approval_{}", action),
        entity_type.to_string(),
        "success".to_string(),
    );
    req = req.with_entity_id(entity_id);
    req = req.with_user(approver_id.to_string(), String::new());
    req = req.with_request_details(serde_json::json!({
        "approval_id": approval_id,
        "comment": comment,
    }));
    if let Some(tid) = tenant_id {
        req = req.with_tenant_id(tid);
    }

    let service = SchemaAwareAuditLogService::new(pool, Some("mes"));
    service.create_audit_log(&req).await?;
    Ok(())
}
