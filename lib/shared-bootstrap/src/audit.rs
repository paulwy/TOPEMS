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

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::HeaderMap;
    use chrono::Utc;
    use serde_json::json;
    use sqlx::postgres::PgPoolOptions;
    use std::time::Duration;

    // ===== AuditLog 序列化/反序列化测试 =====

    #[test]
    fn test_audit_log_serde_roundtrip_full() {
        let log = AuditLog {
            id: Uuid::new_v4(),
            action: "create".to_string(),
            entity_type: Some("customer".to_string()),
            entity_id: Some(Uuid::new_v4()),
            entity_ids: Some(json!([1, 2, 3])),
            user_id: Some("user-123".to_string()),
            user_name: Some("Alice".to_string()),
            request_details: Some(json!({"key": "value"})),
            response_details: Some(json!({"code": 200})),
            status: "success".to_string(),
            error_message: None,
            ip_address: Some("127.0.0.1".to_string()),
            user_agent: Some("Mozilla/5.0".to_string()),
            created_at: Utc::now(),
        };
        let serialized = serde_json::to_string(&log).unwrap();
        let deserialized: AuditLog = serde_json::from_str(&serialized).unwrap();
        // AuditLog 未派生 PartialEq，通过再次序列化后比较字符串
        let reserialized = serde_json::to_string(&deserialized).unwrap();
        assert_eq!(serialized, reserialized);
    }

    #[test]
    fn test_audit_log_serde_roundtrip_minimal() {
        let log = AuditLog {
            id: Uuid::new_v4(),
            action: "delete".to_string(),
            entity_type: None,
            entity_id: None,
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: None,
            response_details: None,
            status: "success".to_string(),
            error_message: None,
            ip_address: None,
            user_agent: None,
            created_at: Utc::now(),
        };
        let serialized = serde_json::to_string(&log).unwrap();
        let deserialized: AuditLog = serde_json::from_str(&serialized).unwrap();
        let reserialized = serde_json::to_string(&deserialized).unwrap();
        assert_eq!(serialized, reserialized);
    }

    #[test]
    fn test_audit_log_serde_roundtrip_with_error() {
        let log = AuditLog {
            id: Uuid::new_v4(),
            action: "create".to_string(),
            entity_type: Some("order".to_string()),
            entity_id: Some(Uuid::new_v4()),
            entity_ids: None,
            user_id: Some("u1".to_string()),
            user_name: None,
            request_details: None,
            response_details: None,
            status: "failed".to_string(),
            error_message: Some("DB timeout".to_string()),
            ip_address: None,
            user_agent: None,
            created_at: Utc::now(),
        };
        let serialized = serde_json::to_string(&log).unwrap();
        let deserialized: AuditLog = serde_json::from_str(&serialized).unwrap();
        let reserialized = serde_json::to_string(&deserialized).unwrap();
        assert_eq!(serialized, reserialized);
    }

    #[test]
    fn test_audit_log_deserialize_from_json() {
        let id = Uuid::new_v4();
        let entity_id = Uuid::new_v4();
        let json_str = format!(
            r#"{{
                "id": "{}",
                "action": "update",
                "entity_type": "order",
                "entity_id": "{}",
                "entity_ids": null,
                "user_id": "u1",
                "user_name": "Bob",
                "request_details": {{"foo": "bar"}},
                "response_details": null,
                "status": "success",
                "error_message": null,
                "ip_address": "10.0.0.1",
                "user_agent": "curl/8.0",
                "created_at": "2026-01-15T10:30:00Z"
            }}"#,
            id, entity_id
        );
        let log: AuditLog = serde_json::from_str(&json_str).unwrap();
        assert_eq!(log.id, id);
        assert_eq!(log.action, "update");
        assert_eq!(log.entity_type.as_deref(), Some("order"));
        assert_eq!(log.entity_id, Some(entity_id));
        assert_eq!(log.entity_ids, None);
        assert_eq!(log.user_id.as_deref(), Some("u1"));
        assert_eq!(log.user_name.as_deref(), Some("Bob"));
        assert_eq!(log.status, "success");
        assert_eq!(log.error_message, None);
        assert_eq!(log.ip_address.as_deref(), Some("10.0.0.1"));
        assert_eq!(log.user_agent.as_deref(), Some("curl/8.0"));
    }

    #[test]
    fn test_audit_log_field_names_are_snake_case() {
        let log = AuditLog {
            id: Uuid::new_v4(),
            action: "a".to_string(),
            entity_type: None,
            entity_id: None,
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: None,
            response_details: None,
            status: "s".to_string(),
            error_message: None,
            ip_address: None,
            user_agent: None,
            created_at: Utc::now(),
        };
        let json = serde_json::to_value(&log).unwrap();
        let obj = json.as_object().unwrap();
        // 验证 snake_case 字段名
        for key in [
            "id",
            "action",
            "entity_type",
            "entity_id",
            "entity_ids",
            "user_id",
            "user_name",
            "request_details",
            "response_details",
            "status",
            "error_message",
            "ip_address",
            "user_agent",
            "created_at",
        ] {
            assert!(obj.contains_key(key), "缺失字段: {}", key);
        }
        // 验证不存在 camelCase 字段
        assert!(!obj.contains_key("entityType"));
        assert!(!obj.contains_key("userId"));
        assert!(!obj.contains_key("createdAt"));
        assert!(!obj.contains_key("errorMessage"));
        assert!(!obj.contains_key("ipAddress"));
        assert!(!obj.contains_key("userAgent"));
    }

    #[test]
    fn test_audit_log_clone_preserves_data() {
        let log = AuditLog {
            id: Uuid::new_v4(),
            action: "create".to_string(),
            entity_type: Some("t".to_string()),
            entity_id: Some(Uuid::new_v4()),
            entity_ids: Some(json!([1, 2])),
            user_id: Some("u".to_string()),
            user_name: Some("n".to_string()),
            request_details: Some(json!({})),
            response_details: Some(json!({"r": 1})),
            status: "success".to_string(),
            error_message: Some("err".to_string()),
            ip_address: Some("ip".to_string()),
            user_agent: Some("ua".to_string()),
            created_at: Utc::now(),
        };
        let cloned = log.clone();
        assert_eq!(log.id, cloned.id);
        assert_eq!(log.action, cloned.action);
        assert_eq!(log.entity_type, cloned.entity_type);
        assert_eq!(log.entity_id, cloned.entity_id);
        assert_eq!(log.status, cloned.status);
    }

    #[test]
    fn test_audit_log_option_fields_serialize_as_null() {
        let log = AuditLog {
            id: Uuid::new_v4(),
            action: "a".to_string(),
            entity_type: None,
            entity_id: None,
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: None,
            response_details: None,
            status: "s".to_string(),
            error_message: None,
            ip_address: None,
            user_agent: None,
            created_at: Utc::now(),
        };
        let json = serde_json::to_value(&log).unwrap();
        assert!(json["entity_type"].is_null());
        assert!(json["entity_id"].is_null());
        assert!(json["entity_ids"].is_null());
        assert!(json["user_id"].is_null());
        assert!(json["user_name"].is_null());
        assert!(json["request_details"].is_null());
        assert!(json["response_details"].is_null());
        assert!(json["error_message"].is_null());
        assert!(json["ip_address"].is_null());
        assert!(json["user_agent"].is_null());
    }

    // ===== ListAuditLogsQuery 反序列化测试 =====

    #[test]
    fn test_list_query_deserialize_empty() {
        let query: ListAuditLogsQuery = serde_json::from_str("{}").unwrap();
        assert!(query.action.is_none());
        assert!(query.entity_type.is_none());
        assert!(query.user_id.is_none());
        assert!(query.status.is_none());
        assert!(query.start_date.is_none());
        assert!(query.end_date.is_none());
        assert!(query.page.is_none());
        assert!(query.page_size.is_none());
    }

    #[test]
    fn test_list_query_deserialize_full() {
        let json_str = r#"{
            "action": "create",
            "entity_type": "customer",
            "user_id": "u1",
            "status": "success",
            "start_date": "2026-01-01",
            "end_date": "2026-12-31",
            "page": 1,
            "page_size": 50
        }"#;
        let query: ListAuditLogsQuery = serde_json::from_str(json_str).unwrap();
        assert_eq!(query.action.as_deref(), Some("create"));
        assert_eq!(query.entity_type.as_deref(), Some("customer"));
        assert_eq!(query.user_id.as_deref(), Some("u1"));
        assert_eq!(query.status.as_deref(), Some("success"));
        assert_eq!(query.start_date.as_deref(), Some("2026-01-01"));
        assert_eq!(query.end_date.as_deref(), Some("2026-12-31"));
        assert_eq!(query.page, Some(1));
        assert_eq!(query.page_size, Some(50));
    }

    #[test]
    fn test_list_query_field_name_is_page_size_not_pagesize() {
        // 标准字段为 page_size（带下划线），非 pagesize
        let json_str = r#"{"page_size": 100}"#;
        let query: ListAuditLogsQuery = serde_json::from_str(json_str).unwrap();
        assert_eq!(query.page_size, Some(100));
    }

    #[test]
    fn test_list_query_does_not_accept_pagesize_alias() {
        // pagesize（无下划线）不应反序列化到 page_size 字段
        let json_str = r#"{"pagesize": 100}"#;
        let query: ListAuditLogsQuery = serde_json::from_str(json_str).unwrap();
        assert_eq!(query.page_size, None);
    }

    #[test]
    fn test_list_query_deserialize_partial() {
        let json_str = r#"{"action": "delete", "page": 2}"#;
        let query: ListAuditLogsQuery = serde_json::from_str(json_str).unwrap();
        assert_eq!(query.action.as_deref(), Some("delete"));
        assert_eq!(query.page, Some(2));
        assert!(query.entity_type.is_none());
        assert!(query.page_size.is_none());
    }

    #[test]
    fn test_list_query_deserialize_negative_page() {
        // i64 允许负值，handler 中用 .max(1) 钳制
        let json_str = r#"{"page": -5}"#;
        let query: ListAuditLogsQuery = serde_json::from_str(json_str).unwrap();
        assert_eq!(query.page, Some(-5));
    }

    #[test]
    fn test_list_query_default_page_is_none() {
        let query: ListAuditLogsQuery = serde_json::from_str("{}").unwrap();
        assert!(query.page.is_none());
        // handler: params.page.unwrap_or(1).max(1) => 1
    }

    #[test]
    fn test_list_query_default_page_size_is_none() {
        let query: ListAuditLogsQuery = serde_json::from_str("{}").unwrap();
        assert!(query.page_size.is_none());
        // handler: params.page_size.unwrap_or(20).min(100) => 20
    }

    // ===== AuditEventParams 构造与 Clone 测试 =====

    #[test]
    fn test_audit_event_params_construction_full() {
        let params = AuditEventParams {
            action: "create".to_string(),
            entity_type: "customer".to_string(),
            entity_id: Some(Uuid::new_v4()),
            entity_ids: Some(json!([1, 2, 3])),
            user_id: Some("u1".to_string()),
            user_name: Some("Alice".to_string()),
            request_details: Some(json!({"method": "POST"})),
            response_details: Some(json!({"id": 42})),
            status: "success".to_string(),
            error_message: None,
        };
        assert_eq!(params.action, "create");
        assert_eq!(params.entity_type, "customer");
        assert!(params.entity_id.is_some());
        assert!(params.entity_ids.is_some());
        assert_eq!(params.user_id.as_deref(), Some("u1"));
        assert_eq!(params.user_name.as_deref(), Some("Alice"));
        assert_eq!(params.status, "success");
        assert!(params.error_message.is_none());
    }

    #[test]
    fn test_audit_event_params_construction_minimal() {
        let params = AuditEventParams {
            action: "delete".to_string(),
            entity_type: "session".to_string(),
            entity_id: None,
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: None,
            response_details: None,
            status: "success".to_string(),
            error_message: None,
        };
        assert_eq!(params.action, "delete");
        assert_eq!(params.entity_type, "session");
        assert!(params.entity_id.is_none());
        assert!(params.entity_ids.is_none());
        assert!(params.user_id.is_none());
        assert!(params.request_details.is_none());
    }

    #[test]
    fn test_audit_event_params_with_error() {
        let params = AuditEventParams {
            action: "create".to_string(),
            entity_type: "order".to_string(),
            entity_id: None,
            entity_ids: None,
            user_id: Some("u1".to_string()),
            user_name: None,
            request_details: None,
            response_details: None,
            status: "failed".to_string(),
            error_message: Some("Database timeout".to_string()),
        };
        assert_eq!(params.status, "failed");
        assert_eq!(params.error_message.as_deref(), Some("Database timeout"));
    }

    #[test]
    fn test_audit_event_params_clone_preserves_data() {
        let params = AuditEventParams {
            action: "create".to_string(),
            entity_type: "customer".to_string(),
            entity_id: Some(Uuid::new_v4()),
            entity_ids: Some(json!([1, 2])),
            user_id: Some("u1".to_string()),
            user_name: Some("Alice".to_string()),
            request_details: Some(json!({})),
            response_details: None,
            status: "success".to_string(),
            error_message: None,
        };
        let cloned = params.clone();
        assert_eq!(cloned.action, params.action);
        assert_eq!(cloned.entity_type, params.entity_type);
        assert_eq!(cloned.entity_id, params.entity_id);
        assert_eq!(cloned.entity_ids, params.entity_ids);
        assert_eq!(cloned.user_id, params.user_id);
        assert_eq!(cloned.status, params.status);
        assert_eq!(cloned.error_message, params.error_message);
    }

    // ===== create_routes 工厂函数测试 =====

    #[test]
    fn test_create_routes_returns_router_with_unqualified_table() {
        // 验证工厂函数能编译并返回 Router，不 panic
        // 使用 PgPool 作为状态类型（PgPool: FromRef<PgPool> 自反实现）
        let router: Router<PgPool> = create_routes("audit_logs");
        let _ = router;
    }

    #[test]
    fn test_create_routes_with_schema_qualified_table() {
        let router: Router<PgPool> = create_routes("plugin_crm.audit_logs");
        let _ = router;
    }

    #[test]
    fn test_create_routes_with_public_schema() {
        let router: Router<PgPool> = create_routes("public.audit_logs");
        let _ = router;
    }

    #[test]
    fn test_create_routes_with_rs_schema() {
        let router: Router<PgPool> = create_routes("rs.audit_logs");
        let _ = router;
    }

    // ===== 异步函数错误处理测试（使用不可达的 lazy pool）=====
    // 验证 DB 不可达时函数不 panic、不传播错误

    fn make_lazy_pool() -> PgPool {
        PgPoolOptions::new()
            .acquire_timeout(Duration::from_millis(100))
            .connect_lazy("postgres://u:p@127.0.0.1:1/db")
            .expect("lazy pool 构建不应失败")
    }

    #[tokio::test]
    async fn test_log_audit_event_does_not_panic_on_db_error() {
        let pool = make_lazy_pool();
        let mut headers = HeaderMap::new();
        headers.insert("x-forwarded-for", "127.0.0.1".parse().unwrap());
        headers.insert("user-agent", "test-agent/1.0".parse().unwrap());

        let params = AuditEventParams {
            action: "create".to_string(),
            entity_type: "customer".to_string(),
            entity_id: Some(Uuid::new_v4()),
            entity_ids: None,
            user_id: Some("u1".to_string()),
            user_name: Some("Alice".to_string()),
            request_details: Some(json!({})),
            response_details: None,
            status: "success".to_string(),
            error_message: None,
        };

        // DB 不可达但函数不应 panic
        log_audit_event("test.audit_logs", &pool, params, &headers).await;
    }

    #[tokio::test]
    async fn test_log_audit_event_with_empty_headers() {
        let pool = make_lazy_pool();
        let headers = HeaderMap::new();

        let params = AuditEventParams {
            action: "create".to_string(),
            entity_type: "customer".to_string(),
            entity_id: None,
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: None,
            response_details: None,
            status: "success".to_string(),
            error_message: None,
        };

        log_audit_event("test.audit_logs", &pool, params, &headers).await;
    }

    #[tokio::test]
    async fn test_log_audit_event_with_x_real_ip_fallback() {
        let pool = make_lazy_pool();
        let mut headers = HeaderMap::new();
        // 无 x-forwarded-for，仅有 x-real-ip
        headers.insert("x-real-ip", "192.168.1.1".parse().unwrap());
        headers.insert("user-agent", "test".parse().unwrap());

        let params = AuditEventParams {
            action: "update".to_string(),
            entity_type: "order".to_string(),
            entity_id: None,
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: None,
            response_details: None,
            status: "success".to_string(),
            error_message: None,
        };

        log_audit_event("test.audit_logs", &pool, params, &headers).await;
    }

    #[tokio::test]
    async fn test_log_audit_event_with_no_ip_no_ua() {
        let pool = make_lazy_pool();
        let mut headers = HeaderMap::new();
        // 仅 user-agent，无 IP 头
        headers.insert("user-agent", "curl/8.0".parse().unwrap());

        let params = AuditEventParams {
            action: "delete".to_string(),
            entity_type: "session".to_string(),
            entity_id: None,
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: None,
            response_details: None,
            status: "success".to_string(),
            error_message: None,
        };

        log_audit_event("test.audit_logs", &pool, params, &headers).await;
    }

    #[tokio::test]
    async fn test_log_audit_event_with_error_status() {
        let pool = make_lazy_pool();
        let headers = HeaderMap::new();

        let params = AuditEventParams {
            action: "create".to_string(),
            entity_type: "order".to_string(),
            entity_id: None,
            entity_ids: None,
            user_id: Some("u1".to_string()),
            user_name: None,
            request_details: None,
            response_details: None,
            status: "failed".to_string(),
            error_message: Some("Validation failed".to_string()),
        };

        log_audit_event("test.audit_logs", &pool, params, &headers).await;
    }

    // ===== log_audit_event_with_id 测试 =====

    #[tokio::test]
    async fn test_log_audit_event_with_id_does_not_panic_on_db_error() {
        let pool = make_lazy_pool();
        let mut headers = HeaderMap::new();
        headers.insert("x-forwarded-for", "10.0.0.1".parse().unwrap());

        let params = AuditEventParams {
            action: "create".to_string(),
            entity_type: "customer".to_string(),
            entity_id: Some(Uuid::new_v4()),
            entity_ids: None,
            user_id: Some("u1".to_string()),
            user_name: Some("Bob".to_string()),
            request_details: None,
            response_details: None,
            status: "success".to_string(),
            error_message: None,
        };

        log_audit_event_with_id("test.audit_logs", &pool, params, &headers).await;
    }

    #[tokio::test]
    async fn test_log_audit_event_with_id_empty_headers() {
        let pool = make_lazy_pool();
        let headers = HeaderMap::new();

        let params = AuditEventParams {
            action: "delete".to_string(),
            entity_type: "session".to_string(),
            entity_id: None,
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: None,
            response_details: None,
            status: "success".to_string(),
            error_message: None,
        };

        log_audit_event_with_id("test.audit_logs", &pool, params, &headers).await;
    }

    // ===== list_audit_logs_inner 私有函数测试 =====

    #[tokio::test]
    async fn test_list_audit_logs_inner_returns_error_on_db_failure() {
        let pool = make_lazy_pool();
        let params = ListAuditLogsQuery {
            action: None,
            entity_type: None,
            user_id: None,
            status: None,
            start_date: None,
            end_date: None,
            page: None,
            page_size: None,
        };

        let response = list_audit_logs_inner("test.audit_logs", pool, params).await;
        let value = serde_json::to_value(&response.0).unwrap();
        // DB 不可达时应返回 500 错误
        let code = value.get("code").and_then(|v| v.as_u64());
        assert_eq!(code, Some(500));
        assert_eq!(value["success"], false);
    }

    #[tokio::test]
    async fn test_list_audit_logs_inner_with_all_filters() {
        let pool = make_lazy_pool();
        let params = ListAuditLogsQuery {
            action: Some("create".to_string()),
            entity_type: Some("customer".to_string()),
            user_id: Some("u1".to_string()),
            status: Some("success".to_string()),
            start_date: Some("2026-01-01".to_string()),
            end_date: Some("2026-12-31".to_string()),
            page: Some(1),
            page_size: Some(20),
        };

        let response = list_audit_logs_inner("test.audit_logs", pool, params).await;
        let value = serde_json::to_value(&response.0).unwrap();
        let code = value.get("code").and_then(|v| v.as_u64());
        assert_eq!(code, Some(500));
    }

    // ===== get_audit_log_inner 私有函数测试 =====

    #[tokio::test]
    async fn test_get_audit_log_inner_returns_error_on_db_failure() {
        let pool = make_lazy_pool();
        let id = Uuid::new_v4();

        let response = get_audit_log_inner("test.audit_logs", pool, id).await;
        let value = serde_json::to_value(&response.0).unwrap();
        let code = value.get("code").and_then(|v| v.as_u64());
        assert_eq!(code, Some(500));
        assert_eq!(value["success"], false);
    }

    // ===== HeaderMap IP 提取逻辑测试 =====
    // log_audit_event 中的 IP 提取优先级：x-forwarded-for > x-real-ip > None
    // 通过构造不同 header 组合验证函数不 panic

    #[tokio::test]
    async fn test_log_audit_event_x_forwarded_for_takes_priority() {
        let pool = make_lazy_pool();
        let mut headers = HeaderMap::new();
        // 两个 IP 头都存在，x-forwarded-for 应优先
        headers.insert("x-forwarded-for", "1.2.3.4".parse().unwrap());
        headers.insert("x-real-ip", "5.6.7.8".parse().unwrap());

        let params = AuditEventParams {
            action: "create".to_string(),
            entity_type: "t".to_string(),
            entity_id: None,
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: None,
            response_details: None,
            status: "success".to_string(),
            error_message: None,
        };

        log_audit_event("test.audit_logs", &pool, params, &headers).await;
    }
}
