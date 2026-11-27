use axum::{
    extract::{Extension, FromRef, Path, Query, State},
    http::HeaderMap,
    routing::get,
    Router,
};
use serde::Deserialize;
use sqlx::postgres::PgPool;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;
use uuid::Uuid;

use crate::models::AuditLog;
use crate::modules::ApiState;
use crate::shared::scope::tenant_of;
use topems_shared_auth::auth::Claims;
use topems_shared_db::SchemaAwareAuditLogService;

pub fn create_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    ApiState: FromRef<S>,
{
    Router::new()
        .route("/audit-logs", get(list_audit_logs))
        .route("/audit-logs/modules", get(list_audit_modules))
        .route("/audit-logs/{id}", get(get_audit_log))
}

/// GET /audit-logs/modules —— 审计日志模块清单（前端 auditLogApi.getModules 契约）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:read"])),
    path = "/audit-logs/modules",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn list_audit_modules() -> ApiResponse<serde_json::Value> {
    let modules = serde_json::json!({
        "modules": [
            "warehouse", "inventory", "inbound", "outbound", "wave-pick",
            "transfer", "stock-take", "batch", "location", "sync"
        ]
    });
    ApiResponse::success(modules, "审计模块清单获取成功")
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
    security(("BearerAuth" = ["wms:read"])),
    path = "/api/wms/audit-logs",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn list_audit_logs(
    State(_state): State<ApiState>,
    Query(params): Query<ListAuditLogsQuery>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let tenant = match tenant_of(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, AuditLog>(only_own_schema_query!(
        "wms",
        r#"
        SELECT id, tenant_id, action, COALESCE(entity_type, '') AS entity_type, entity_id, entity_ids,
               user_id::text, user_name, request_details, response_details,
               COALESCE(status, '') AS status, error_message, ip_address::text, user_agent, created_at
        -- A3 防御性加固：wms.audit_logs.entity_type 为可空 text、ip_address 为 inet 列、
        -- status 为可空 varchar（CHECK 约束对 NULL 放行，SQL 三值逻辑）。
        -- 共享 AuditLog 结构体要求 entity_type/status 为非空 String、ip_address 按 text 解码；
        -- 一旦出现历史/手插的 NULL entity_type/status 或非空 inet ip 行，sqlx 反序列化直接报错
        -- （外层 200/内层 code:500）。COALESCE(entity_type,'')/COALESCE(status,'') 保证非空 String 解码；
        -- ip_address::text 把 inet 统一转 text（NULL 仍为 NULL，映射 Option<String>）。
        -- 真实写路径（log_audit_event→SchemaAwareAuditLogService）写入合规行不受影响。
        -- U12b: 读归位 wms 自有 schema（原误读 public.audit_logs 平台公共表，与写路径
        -- 旧版 new(db, None) 经 search_path=wms 解析到 wms.audit_logs 的错位历史；
        -- 现写入目标由 new(db, "wms") 显式给出，对齐 mes/hrm/erp/rd/crm“读自己 schema”模式）。
        -- R-5 修复：wms.audit_logs.user_id 为 uuid 列，查询参数 user_id 绑定为 text，
        -- 直接 `user_id = $3` 触发 `operator does not exist: uuid = text`（外层 200/内层 code:500）。
        -- 对齐 crm 服务 audit 模块与 shared-db query_audit_logs 的既有写法：SELECT user_id::text、
        -- WHERE user_id::text = $3，并补 tenant_id 列（AuditLog 结构体字段，与 crm 一致）。
        FROM wms.audit_logs
        WHERE ($1::text IS NULL OR action = $1)
          AND ($2::text IS NULL OR entity_type = $2)
          AND ($3::text IS NULL OR user_id::text = $3)
          AND ($4::text IS NULL OR status = $4)
          AND ($5::text IS NULL OR created_at >= $5::timestamptz)
          AND ($6::text IS NULL OR created_at <= $6::timestamptz)
          AND tenant_id = $9::uuid
        ORDER BY created_at DESC
        LIMIT $7 OFFSET $8
        "#
    ))
    .bind(&params.action)
    .bind(&params.entity_type)
    .bind(&params.user_id)
    .bind(&params.status)
    .bind(params.start_date.clone())
    .bind(params.end_date.clone())
    .bind(page_size)
    .bind(offset)
    .bind(tenant)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(logs) => {
            let count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "wms",
                r#"
                -- U12b: 同 list 查询，读 wms.audit_logs（见上注释）
                -- R-5: WHERE user_id::text = $3（uuid 列 vs text 绑定，对齐 crm，见 list 注释）
                SELECT COUNT(*) FROM wms.audit_logs
                WHERE ($1::text IS NULL OR action = $1)
                  AND ($2::text IS NULL OR entity_type = $2)
                  AND ($3::text IS NULL OR user_id::text = $3)
                  AND ($4::text IS NULL OR status = $4)
                  AND ($5::text IS NULL OR created_at >= $5::timestamptz)
                  AND ($6::text IS NULL OR created_at <= $6::timestamptz)
                  AND tenant_id = $7::uuid
                "#
            ))
            .bind(&params.action)
            .bind(&params.entity_type)
            .bind(&params.user_id)
            .bind(&params.status)
            .bind(params.start_date)
            .bind(params.end_date)
            .bind(tenant)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            ApiResponse::success(
                serde_json::json!({
                    "audit_logs": logs,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取审计日志成功",
            )
        }
        Err(e) => {
            tracing::error!("获取审计日志失败: {}", e);
            ApiResponse::server_error("获取审计日志失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:read"])),
    path = "/api/wms/audit-logs/{id}",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn get_audit_log(
    State(_state): State<ApiState>,
    // 2026-10-06 修复：id 为 Uuid（AuditLog.id），原 i64 致 UUID 路径 400（get 端点不可用）
    Path(id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<AuditLog> {
    let tenant = match tenant_of(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let result = sqlx::query_as::<_, AuditLog>(only_own_schema_query!(
        "wms",
        r#"
        SELECT id, tenant_id, action, COALESCE(entity_type, '') AS entity_type, entity_id, entity_ids,
               user_id::text, user_name, request_details, response_details,
               COALESCE(status, '') AS status, error_message, ip_address::text, user_agent, created_at
        -- U12b: 读归位 wms.audit_logs（见 list_audit_logs 注释）
        -- R-5: user_id::text、补 tenant_id（对齐 crm，见 list 注释）
        -- A3: COALESCE(entity_type,'') + ip_address::text（见 list 注释，防御 NULL/inet 行 500）
        FROM wms.audit_logs WHERE id = $1 AND tenant_id = $2::uuid
        "#
    ))
    .bind(id)
    .bind(tenant)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(log)) => ApiResponse::success(log, "获取审计日志成功"),
        Ok(None) => ApiResponse::not_found("审计日志不存在"),
        Err(e) => {
            tracing::error!("获取审计日志失败: {}", e);
            ApiResponse::server_error("获取审计日志失败")
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
    use topems_shared_db::CreateAuditLogRequest;
    let ip_address = headers
        .get("x-forwarded-for")
        .and_then(|h| h.to_str().ok())
        .or_else(|| headers.get("x-real-ip").and_then(|h| h.to_str().ok()))
        .map(|s| s.to_string());

    let user_agent = headers
        .get("user-agent")
        .and_then(|h| h.to_str().ok())
        .map(|s| s.to_string());

    // P1-3: schema_prefix = None for WMS — the connection search_path already
    // sets `wms` (main.rs SEARCH_PATH="wms, public, shared"), so SchemaAware
    // writes bare `audit_logs` which resolves to wms.audit_logs (NOT public).
    // wms.audit_logs carries the Cluster-A 15-col standard (columns aligned
    // via migrations 20260918000033/38/44/45). U12b: 读路径（list/get_audit_log）
    // 已同步改读 wms.audit_logs，读写同表。
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

    let service = SchemaAwareAuditLogService::new(db, "wms");
    if let Err(e) = service.create_audit_log(&req).await {
        tracing::error!("记录审计日志失败: {}", e);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_list_audit_logs_query_deserialize() {
        let query = "action=create&entity_type=warehouse&user_id=user1&status=success";
        let params: ListAuditLogsQuery = serde_urlencoded::from_str(query).unwrap();
        assert_eq!(params.action.as_deref(), Some("create"));
        assert_eq!(params.entity_type.as_deref(), Some("warehouse"));
        assert_eq!(params.user_id.as_deref(), Some("user1"));
        assert_eq!(params.status.as_deref(), Some("success"));
    }

    #[test]
    fn test_list_audit_logs_query_default() {
        let query = "";
        let params: ListAuditLogsQuery = serde_urlencoded::from_str(query).unwrap();
        assert!(params.action.is_none());
        assert!(params.entity_type.is_none());
        assert!(params.user_id.is_none());
        assert!(params.status.is_none());
        assert!(params.start_date.is_none());
        assert!(params.end_date.is_none());
        assert!(params.page.is_none());
        assert!(params.page_size.is_none());
    }

    #[test]
    fn test_list_audit_logs_query_with_dates() {
        let query = "start_date=2024-01-01&end_date=2024-12-31";
        let params: ListAuditLogsQuery = serde_urlencoded::from_str(query).unwrap();
        assert_eq!(params.start_date.as_deref(), Some("2024-01-01"));
        assert_eq!(params.end_date.as_deref(), Some("2024-12-31"));
    }

    #[test]
    fn test_audit_sql_guards_nullable_decode() {
        // A3 扩展：entity_type/status 可空列 + inet ip 的解码防护必须在 list/get 两条 SQL 同时存在，
        // 防止未来重构回归（NULL 行经 CHECK 三值逻辑可入库，String 非 Option 字段解码即 500）。
        let src = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/src/modules/audit.rs"));
        let src = src.split("#[cfg(test)]").next().unwrap_or(src); // 排除测试段自匹配
        let count_et = src
            .matches("COALESCE(entity_type, '') AS entity_type")
            .count();
        let count_st = src.matches("COALESCE(status, '') AS status").count();
        let count_ip = src.matches("ip_address::text, user_agent").count();
        assert_eq!(count_et, 2, "list+get 均应含 COALESCE(entity_type,'')");
        assert_eq!(count_st, 2, "list+get 均应含 COALESCE(status,'')");
        assert_eq!(count_ip, 2, "list+get 均应含 ip_address::text");
    }

    #[test]
    fn test_list_audit_logs_query_with_pagination() {
        let query = "page=2&page_size=50";
        let params: ListAuditLogsQuery = serde_urlencoded::from_str(query).unwrap();
        assert_eq!(params.page, Some(2));
        assert_eq!(params.page_size, Some(50));
    }
}
