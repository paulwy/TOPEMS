use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::get,
    Router,
};
use serde::Deserialize;
use sqlx::postgres::PgPool;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use uuid::Uuid;

use super::ApiState;
use crate::models::AuditLog;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;
use topems_shared_core::TopemsError;
use topems_shared_db::{AuditOrigin, SchemaAwareAuditLogService};

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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["crm:audit:read"])),
    path = "/audit-logs",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "audit"
)]
pub async fn list_audit_logs(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ListAuditLogsQuery>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    // crm.audit_logs 仅系统通道：读侧显式打开，不能依赖请求租户通道（会静默 0 行）。
    if let Err(e) = topems_shared_db::set_system_channel(txn).await {
        tracing::error!("打开审计系统通道失败: {}", e);
        return ApiResponse::server_error("获取审计日志失败");
    }
    match check_permission(&state.db, &claims, &ModulePermission::All).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, AuditLog>(
        r#"
        SELECT id, tenant_id, action, entity_type, entity_id, entity_ids,
               user_id::text, user_name, request_details, response_details,
               status, error_message, ip_address, user_agent, created_at
        -- U12: 读归位 crm 自有 schema（原误读 public.audit_logs 平台公共表，与下方写路径
        -- SchemaAwareAuditLogService::new(db, "crm") 写入 crm.audit_logs 错位；
        -- 对齐 mes/hrm/erp/rd 兄弟服务“读自己 schema audit_logs”的既有模式）。
        FROM crm.audit_logs
        WHERE ($1::text IS NULL OR action = $1)
          AND ($2::text IS NULL OR entity_type = $2)
          AND ($3::text IS NULL OR user_id::text = $3)
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
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(logs) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                -- U12: 同 list 查询，读 crm.audit_logs（见上注释）
                SELECT COUNT(*) FROM crm.audit_logs
                WHERE ($1::text IS NULL OR action = $1)
                  AND ($2::text IS NULL OR entity_type = $2)
                  AND ($3::text IS NULL OR user_id::text = $3)
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
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            ApiResponse::success(
                serde_json::json!({
                    "items": logs,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取审计日志成功",
            )
        }
        Err(e) => {
            tracing::error!("获取审计日志失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取审计日志失败".to_string()))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["crm:audit:read"])),
    path = "/audit-logs/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "audit"
)]
pub async fn get_audit_log(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<i64>,
) -> ApiResponse<AuditLog> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    // crm.audit_logs 仅系统通道：读侧显式打开，不能依赖请求租户通道（会静默 0 行）。
    if let Err(e) = topems_shared_db::set_system_channel(txn).await {
        tracing::error!("打开审计系统通道失败: {}", e);
        return ApiResponse::server_error("获取审计日志失败");
    }
    match check_permission(&state.db, &claims, &ModulePermission::All).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let result = sqlx::query_as::<_, AuditLog>(
        r#"
        SELECT id, tenant_id, action, entity_type, entity_id, entity_ids,
               user_id::text, user_name, request_details, response_details,
               status, error_message, ip_address, user_agent, created_at
        -- U12: 读归位 crm.audit_logs（见 list_audit_logs 注释）
        FROM crm.audit_logs WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(log)) => ApiResponse::success(log, "获取审计日志成功"),
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("审计日志不存在".to_string())),
        Err(e) => {
            tracing::error!("获取审计日志失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取审计日志失败".to_string()))
        }
    }
}

/// 请求边界内捕获的审计主体。
///
/// `tenant_id` 必须来自「被操作实体」而非操作者 claims：
/// - spawn 前从实体行（或插入结果）读取；
/// - 超管代租户操作时，实体行的 tenant 才是租户管理员应看到的那一行；
/// - 实体本身为 nil 时才落 nil。
#[derive(Debug, Clone)]
pub struct AuditActor {
    pub tenant_id: Option<Uuid>,
    pub user_id: Option<String>,
    pub user_name: Option<String>,
    pub origin: AuditOrigin,
}

impl AuditActor {
    /// 从请求 Claims 捕获用户身份；租户必须由调用方按「被操作实体」传入。
    ///
    /// 实体 tenant 在查询结果中常以全零 UUID 表示 NULL（SQL 侧 COALESCE 兜底），
    /// 这里统一归一为 `None`，避免给系统级 nil 行写入一个假的租户值。
    pub fn from_claims(tenant_id: Option<Uuid>, claims: &Claims) -> Self {
        Self {
            tenant_id: tenant_id.filter(|t| *t != Uuid::nil()),
            user_id: Some(claims.sub.clone()),
            user_name: Some(claims.username.clone()),
            origin: if claims.is_superuser {
                AuditOrigin::System
            } else {
                AuditOrigin::Request
            },
        }
    }
}

pub async fn log_audit_event(db: &PgPool, params: AuditEventParams, headers: &HeaderMap) {
    let ctx = topems_shared_auth::middleware::tenant::current_request_tenant();
    let actor = AuditActor {
        // None 表示交给 sink 使用请求 task-local（非 spawn 路径）。
        tenant_id: None,
        user_id: params.user_id.clone(),
        user_name: params.user_name.clone(),
        origin: if ctx.map(|c| c.system).unwrap_or(false) {
            AuditOrigin::System
        } else {
            AuditOrigin::Request
        },
    };
    log_audit_event_with_actor(db, params, headers, actor).await;
}

/// 显式主体的审计写入。spawn 路径必须使用本函数，避免 task-local 丢失。
pub async fn log_audit_event_with_actor(
    db: &PgPool,
    params: AuditEventParams,
    headers: &HeaderMap,
    actor: AuditActor,
) {
    use topems_shared_db::CreateAuditLogRequest;
    let AuditActor {
        tenant_id: actor_tenant,
        user_id: actor_user_id,
        user_name: actor_user_name,
        origin,
    } = actor;
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

    // P1-3 migration: inner INSERT SQL delegated to shared-db
    // SchemaAwareAuditLogService so the 13-col insert is maintained in one place.
    // schema_prefix = Some("crm") → writes crm.audit_logs (NOT public.audit_logs).
    // crm.audit_logs is the exact Cluster-A 15-col standard (see
    // svc/crm/src/schema_defense.rs TABLE_DEFS), so no column mapping is needed.
    // U12: 读路径（list/get_audit_log）已同步改读 crm.audit_logs，读写同表。
    let mut req = CreateAuditLogRequest::new(action, entity_type, status);
    if let Some(tid) = actor_tenant {
        req = req.with_tenant_id(tid);
    }
    if let Some(eid) = entity_id {
        req = req.with_entity_id(eid);
    }
    if let Some(eids) = entity_ids {
        req = req.with_entity_ids(eids);
    }
    let user_id = actor_user_id.or(user_id);
    let user_name = actor_user_name.or(user_name);
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
    req = req.with_origin(origin);
    req.ip_address = ip_address;
    req.user_agent = user_agent;

    // crm.audit_logs 策略仅保留系统通道（fail-closed），写入必须显式系统作用域。
    let service = SchemaAwareAuditLogService::new_system_channel(db, "crm");
    if let Err(e) = service.create_audit_log(&req).await {
        tracing::error!("记录审计日志失败: {}", e);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

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
