//! # 通用审计日志模块
//!
//! 从 7 个服务（crm/wms/erp/hrm/scm/lims/rd）的重复 `audit.rs` 抽取的通用实现。
//!
//! ## 使用方式
//!
//! ```rust,ignore
//! use topems_shared_bootstrap::audit::{create_routes, log_audit_event};
//!
//! // 路由：传入完整表标识符（含 schema 前缀，如 "plugin_crm.audit_logs"、"public.audit_logs"、"audit_logs"）
//! let audit_routes = create_routes::<AppState>("plugin_crm.audit_logs");
//!
//! // 记录审计日志
//! log_audit_event(
//!     "plugin_crm.audit_logs",
//!     &db,
//!     "create".to_string(),
//!     "customer".to_string(),
//!     Some(entity_id),
//!     None,
//!     Some(claims.sub.clone()),
//!     Some(claims.name.clone()),
//!     Some(request_json),
//!     Some(response_json),
//!     "success".to_string(),
//!     None,
//!     &headers,
//! ).await;
//! ```
//!
//! ## 不兼容场景（服务需继续使用本地实现，V67.2 手动适配）
//!
//! - **scm**：`scm.audit_logs` 列名完全不同（table_name/record_id/changed_by/old_values/new_values/changed_at），
//!   依赖别名映射，无法用通用 SQL
//! - **lims**：`qa_lims_audit_logs` 有自定义 `tenant_id` 列、`pagesize` 拼写（非 page_size）、
//!   日期格式校验、CSV 导出、手动 Row 映射
//! - **rd**：INSERT 显式指定 id 列、CSV 导出有 `entity_type` 非 Option 处理、utoipa 注解

use axum::{
    extract::{FromRef, Path, Query, State},
    http::HeaderMap,
    routing::get,
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::postgres::PgPool;
use sqlx::FromRow;
use uuid::Uuid;

use topems_shared_core::response::ApiResponse;

// =============================================================================
// 数据结构
// =============================================================================

/// 审计日志参数包装（消除 clippy::too_many_arguments 告警）
///
/// 对应原 log_audit_event 的 11 个业务参数：
/// `action, entity_type, entity_id, entity_ids, user_id, user_name, request_details, response_details, status, error_message`
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

/// 审计日志记录（通用版本，与主流服务的 crate::models::AuditLog 字段对齐）
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AuditLog {
    pub id: Uuid,
    pub action: String,
    pub entity_type: Option<String>,
    pub entity_id: Option<Uuid>,
    pub entity_ids: Option<serde_json::Value>,
    pub user_id: Option<String>,
    pub user_name: Option<String>,
    pub request_details: Option<serde_json::Value>,
    pub response_details: Option<serde_json::Value>,
    pub status: String,
    pub error_message: Option<String>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub created_at: DateTime<Utc>,
}

/// 审计日志列表查询参数（标准字段：page_size 非 pagesize）
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

// =============================================================================
// 路由工厂
// =============================================================================

/// 创建审计日志通用路由（/audit-logs、/audit-logs/{id}）
///
/// # 泛型参数
/// - `S`: 服务自定义 AppState，要求 `PgPool: FromRef<S>`（axum 状态派生模式）
///
/// # 参数
/// - `table_qualifier`: 完整表标识符，如 `"plugin_crm.audit_logs"`、`"public.audit_logs"`、
///   `"rs.audit_logs"`、`"audit_logs"`（无前缀）
pub fn create_routes<S>(table_qualifier: &'static str) -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    PgPool: FromRef<S>,
{
    Router::new()
        .route(
            "/audit-logs",
            get(move |State(pool): State<PgPool>, Query(params): Query<ListAuditLogsQuery>| async move {
                list_audit_logs_inner(table_qualifier, pool, params).await
            }),
        )
        .route(
            "/audit-logs/{id}",
            get(move |State(pool): State<PgPool>, Path(id): Path<Uuid>| async move {
                get_audit_log_inner(table_qualifier, pool, id).await
            }),
        )
}

// =============================================================================
// Handler 内部实现
// =============================================================================

async fn list_audit_logs_inner(
    table_qualifier: &'static str,
    db: PgPool,
    params: ListAuditLogsQuery,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let select_sql = format!(
        r#"
        SELECT id, action, entity_type, entity_id, entity_ids,
               user_id, user_name, request_details, response_details,
               status, error_message, ip_address, user_agent, created_at
        FROM {table_qualifier}
        WHERE ($1::text IS NULL OR action = $1)
          AND ($2::text IS NULL OR entity_type = $2)
          AND ($3::text IS NULL OR user_id = $3)
          AND ($4::text IS NULL OR status = $4)
          AND ($5::text IS NULL OR created_at >= $5::timestamptz)
          AND ($6::text IS NULL OR created_at <= $6::timestamptz)
        ORDER BY created_at DESC
        LIMIT $7 OFFSET $8
        "#
    );

    let result = sqlx::query_as::<_, AuditLog>(&select_sql)
        .bind(&params.action)
        .bind(&params.entity_type)
        .bind(&params.user_id)
        .bind(&params.status)
        .bind(params.start_date.clone())
        .bind(params.end_date.clone())
        .bind(page_size)
        .bind(offset)
        .fetch_all(&db)
        .await;

    match result {
        Ok(logs) => {
            let count_sql = format!(
                r#"
                SELECT COUNT(*) FROM {table_qualifier}
                WHERE ($1::text IS NULL OR action = $1)
                  AND ($2::text IS NULL OR entity_type = $2)
                  AND ($3::text IS NULL OR user_id = $3)
                  AND ($4::text IS NULL OR status = $4)
                  AND ($5::text IS NULL OR created_at >= $5::timestamptz)
                  AND ($6::text IS NULL OR created_at <= $6::timestamptz)
                "#
            );

            let count_result = sqlx::query_scalar::<_, i64>(&count_sql)
                .bind(&params.action)
                .bind(&params.entity_type)
                .bind(&params.user_id)
                .bind(&params.status)
                .bind(params.start_date)
                .bind(params.end_date)
                .fetch_one(&db)
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
            Json(ApiResponse::error(500, "获取审计日志失败"))
        }
    }
}

async fn get_audit_log_inner(
    table_qualifier: &'static str,
    db: PgPool,
    id: Uuid,
) -> Json<ApiResponse<AuditLog>> {
    let select_sql = format!(
        r#"
        SELECT id, action, entity_type, entity_id, entity_ids,
               user_id, user_name, request_details, response_details,
               status, error_message, ip_address, user_agent, created_at
        FROM {table_qualifier} WHERE id = $1
        "#
    );

    let result = sqlx::query_as::<_, AuditLog>(&select_sql)
        .bind(id)
        .fetch_optional(&db)
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

// =============================================================================
// log_audit_event 通用函数
// =============================================================================

/// 记录审计日志（标准版本：id 由数据库默认生成）
///
/// # 参数
/// - `table_qualifier`: 完整表标识符，同 create_routes
/// - `params`: 审计事件参数包装结构体
/// - `headers`: HTTP 请求头（用于提取 IP / User-Agent）
pub async fn log_audit_event(
    table_qualifier: &str,
    db: &PgPool,
    params: AuditEventParams,
    headers: &HeaderMap,
) {
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

    let insert_sql = format!(
        r#"
        INSERT INTO {table_qualifier} (
            action, entity_type, entity_id, entity_ids,
            user_id, user_name, request_details, response_details,
            status, error_message, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        "#
    );

    let result = sqlx::query(&insert_sql)
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

/// 记录审计日志（RD 风格：显式 INSERT id 列，由调用方生成 Uuid）
///
/// 适用于 rs.audit_logs 这种表结构要求显式传入 id 的场景。
pub async fn log_audit_event_with_id(
    table_qualifier: &str,
    db: &PgPool,
    params: AuditEventParams,
    headers: &HeaderMap,
) {
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

    let insert_sql = format!(
        r#"
        INSERT INTO {table_qualifier} (
            id, action, entity_type, entity_id, entity_ids,
            user_id, user_name, request_details, response_details,
            status, error_message, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        "#
    );

    let result = sqlx::query(&insert_sql)
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
