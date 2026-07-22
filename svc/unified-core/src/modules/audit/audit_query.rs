//! 审计日志查询与导出 handler
//!
//! 提供以下能力：
//! - 通用审计日志查询（iam.audit_logs / iam.permission_audit_logs / core.login_logs）
//! - 通用审计日志统计
//! - 通用审计日志导出（CSV / JSON）
//!
//! 统一 API 路径：`/api/core/iam/v1/audit/*`

use axum::{
    extract::{Query, State},
    http::{header, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use chrono::{DateTime, NaiveDateTime, TimeZone, Utc};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;

use crate::AppState;
use topems_shared::{api_error, api_success, ApiResponse};

// ==================== 数据模型 ====================

/// 审计日志统一条目
#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct AuditLogEntry {
    pub id: Uuid,
    pub source: String,
    pub tenant_id: Option<Uuid>,
    pub user_id: Option<Uuid>,
    pub username: Option<String>,
    pub action: String,
    pub entity_type: Option<String>,
    pub entity_id: Option<Uuid>,
    pub resource: Option<String>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub status: Option<String>,
    pub success: Option<bool>,
    pub error_message: Option<String>,
    pub details: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct AuditLogQueryParams {
    pub source: Option<String>,
    pub user_id: Option<String>,
    pub username: Option<String>,
    pub action: Option<String>,
    pub entity_type: Option<String>,
    pub resource: Option<String>,
    pub status: Option<String>,
    pub success: Option<bool>,
    pub ip_address: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub search: Option<String>,
    pub page: Option<i64>,
    pub pagesize: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct PaginatedAuditLogs {
    pub items: Vec<AuditLogEntry>,
    pub total: i64,
    pub page: i64,
    pub pagesize: i64,
}

#[derive(Debug, Serialize)]
pub struct AuditLogStats {
    pub total: i64,
    pub today_total: i64,
    pub success_total: i64,
    pub failure_total: i64,
    pub by_action: Vec<AuditLogCount>,
    pub by_source: Vec<AuditLogCount>,
    pub by_user: Vec<AuditLogCount>,
    pub trend: Vec<AuditLogTrend>,
}

#[derive(Debug, Serialize)]
pub struct AuditLogCount {
    pub key: String,
    pub count: i64,
}

#[derive(Debug, Serialize)]
pub struct AuditLogTrend {
    pub date: String,
    pub count: i64,
}

#[derive(Debug, Deserialize)]
pub struct ExportQueryParams {
    pub source: Option<String>,
    pub format: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub action: Option<String>,
    pub status: Option<String>,
    pub user_id: Option<String>,
    pub search: Option<String>,
}

// ==================== Handler ====================

const ALLOWED_SOURCES: &[&str] = &["audit_logs", "permission_audit_logs", "login_logs"];

fn resolve_source(source: Option<&str>) -> &'static str {
    match source.unwrap_or("audit_logs") {
        "permission_audit_logs" => "permission_audit_logs",
        "login_logs" => "login_logs",
        _ => "audit_logs",
    }
}

fn clamp_pagination(page: Option<i64>, page_size: Option<i64>) -> (i64, i64) {
    let page = page.unwrap_or(1).max(1);
    let page_size = page_size.unwrap_or(20).clamp(1, 200);
    (page, page_size)
}

fn parse_datetime(value: Option<&str>) -> Option<DateTime<Utc>> {
    value.and_then(|s| {
        if let Ok(dt) = DateTime::parse_from_rfc3339(s) {
            Some(dt.with_timezone(&Utc))
        } else if let Ok(naive) = NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S") {
            Some(Utc.from_utc_datetime(&naive))
        } else if let Ok(date) = chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d") {
            Some(Utc.from_utc_datetime(&date.and_hms_opt(0, 0, 0)?))
        } else {
            None
        }
    })
}

/// 查询审计日志
pub async fn query_audit_logs(
    State(state): State<AppState>,
    Query(params): Query<AuditLogQueryParams>,
) -> Json<ApiResponse<PaginatedAuditLogs>> {
    let source = resolve_source(params.source.as_deref());
    let (page, page_size) = clamp_pagination(params.page, params.pagesize);
    let offset = (page - 1) * page_size;

    let start_date = parse_datetime(params.start_date.as_deref());
    let end_date = parse_datetime(params.end_date.as_deref());

    let (items, total) = match source {
        "permission_audit_logs" => {
            let total: i64 = sqlx::query_scalar(
                r#"
                SELECT COUNT(*) FROM iam.permission_audit_logs
                WHERE ($1::uuid IS NULL OR user_id = $1)
                  AND ($2::text IS NULL OR action = $2)
                  AND ($3::timestamptz IS NULL OR created_at >= $3)
                  AND ($4::timestamptz IS NULL OR created_at <= $4)
                  AND ($5::text IS NULL OR COALESCE(reason, '') ILIKE '%' || $5 || '%')
                "#,
            )
            .bind(
                params
                    .user_id
                    .as_deref()
                    .and_then(|s| Uuid::parse_str(s).ok()),
            )
            .bind(params.action.as_deref())
            .bind(start_date)
            .bind(end_date)
            .bind(params.search.as_deref())
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

            let items: Vec<AuditLogEntry> = sqlx::query_as(
                r#"
                SELECT
                    id,
                    'permission_audit_logs' AS source,
                    tenant_id,
                    user_id,
                    NULL::text AS username,
                    action,
                    target_type AS entity_type,
                    target_id AS entity_id,
                    NULL::text AS resource,
                    NULL::text AS ip_address,
                    NULL::text AS user_agent,
                    NULL::text AS status,
                    NULL::bool AS success,
                    NULL::text AS error_message,
                    jsonb_build_object(
                        'before', before,
                        'after', after,
                        'reason', reason
                    ) AS details,
                    created_at
                FROM iam.permission_audit_logs
                WHERE ($1::uuid IS NULL OR user_id = $1)
                  AND ($2::text IS NULL OR action = $2)
                  AND ($3::timestamptz IS NULL OR created_at >= $3)
                  AND ($4::timestamptz IS NULL OR created_at <= $4)
                  AND ($5::text IS NULL OR COALESCE(reason, '') ILIKE '%' || $5 || '%')
                ORDER BY created_at DESC
                LIMIT $6 OFFSET $7
                "#,
            )
            .bind(
                params
                    .user_id
                    .as_deref()
                    .and_then(|s| Uuid::parse_str(s).ok()),
            )
            .bind(params.action.as_deref())
            .bind(start_date)
            .bind(end_date)
            .bind(params.search.as_deref())
            .bind(page_size)
            .bind(offset)
            .fetch_all(&state.pool)
            .await
            .unwrap_or_default();

            (items, total)
        }
        "login_logs" => {
            let total: i64 = sqlx::query_scalar(
                r#"
                SELECT COUNT(*) FROM core_login_logs
                WHERE ($1::uuid IS NULL OR user_id = $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND ($3::text IS NULL OR username ILIKE '%' || $3 || '%')
                  AND ($4::text IS NULL OR ip_address = $4)
                  AND ($5::timestamptz IS NULL OR login_time >= $5)
                  AND ($6::timestamptz IS NULL OR login_time <= $6)
                "#,
            )
            .bind(
                params
                    .user_id
                    .as_deref()
                    .and_then(|s| Uuid::parse_str(s).ok()),
            )
            .bind(params.status.as_deref())
            .bind(params.username.as_deref())
            .bind(params.ip_address.as_deref())
            .bind(start_date)
            .bind(end_date)
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

            let items: Vec<AuditLogEntry> = sqlx::query_as(
                r#"
                SELECT
                    id,
                    'login_logs' AS source,
                    tenant_id,
                    user_id,
                    username,
                    'login' AS action,
                    NULL::text AS entity_type,
                    NULL::uuid AS entity_id,
                    '/api/core/iam/auth/login' AS resource,
                    ip_address,
                    user_agent,
                    status,
                    (status = 'success') AS success,
                    error_message,
                    jsonb_build_object(
                        'login_time', login_time
                    ) AS details,
                    COALESCE(login_time, created_at) AS created_at
                FROM core_login_logs
                WHERE ($1::uuid IS NULL OR user_id = $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND ($3::text IS NULL OR username ILIKE '%' || $3 || '%')
                  AND ($4::text IS NULL OR ip_address = $4)
                  AND ($5::timestamptz IS NULL OR login_time >= $5)
                  AND ($6::timestamptz IS NULL OR login_time <= $6)
                ORDER BY login_time DESC
                LIMIT $7 OFFSET $8
                "#,
            )
            .bind(
                params
                    .user_id
                    .as_deref()
                    .and_then(|s| Uuid::parse_str(s).ok()),
            )
            .bind(params.status.as_deref())
            .bind(params.username.as_deref())
            .bind(params.ip_address.as_deref())
            .bind(start_date)
            .bind(end_date)
            .bind(page_size)
            .bind(offset)
            .fetch_all(&state.pool)
            .await
            .unwrap_or_default();

            (items, total)
        }
        _ => {
            let total: i64 = sqlx::query_scalar(
                r#"
                SELECT COUNT(*) FROM iam.audit_logs
                WHERE ($1::text IS NULL OR user_id::text = $1)
                  AND ($2::text IS NULL OR action = $2)
                  AND ($3::text IS NULL OR entity_type = $3)
                  AND ($4::text IS NULL OR status = $4)
                  AND ($5::text IS NULL OR ip_address = $5)
                  AND ($6::timestamptz IS NULL OR created_at >= $6)
                  AND ($7::timestamptz IS NULL OR created_at <= $7)
                  AND ($8::text IS NULL OR COALESCE(user_name, '') ILIKE '%' || $8 || '%'
                       OR COALESCE(action, '') ILIKE '%' || $8 || '%'
                       OR COALESCE(entity_type, '') ILIKE '%' || $8 || '%')
                "#,
            )
            .bind(params.user_id.as_deref())
            .bind(params.action.as_deref())
            .bind(params.entity_type.as_deref())
            .bind(params.status.as_deref())
            .bind(params.ip_address.as_deref())
            .bind(start_date)
            .bind(end_date)
            .bind(params.search.as_deref())
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

            let items: Vec<AuditLogEntry> = sqlx::query_as(
                r#"
                SELECT
                    id,
                    'audit_logs' AS source,
                    NULL::uuid AS tenant_id,
                    CASE WHEN user_id ~ '^[0-9a-fA-F-]{36}$' THEN user_id::uuid ELSE NULL END AS user_id,
                    user_name AS username,
                    action,
                    entity_type,
                    entity_id,
                    NULL::text AS resource,
                    ip_address,
                    user_agent,
                    status,
                    (status = 'success') AS success,
                    error_message,
                    jsonb_build_object(
                        'request_details', request_details,
                        'response_details', response_details,
                        'entity_ids', entity_ids
                    ) AS details,
                    created_at
                FROM iam.audit_logs
                WHERE ($1::text IS NULL OR user_id::text = $1)
                  AND ($2::text IS NULL OR action = $2)
                  AND ($3::text IS NULL OR entity_type = $3)
                  AND ($4::text IS NULL OR status = $4)
                  AND ($5::text IS NULL OR ip_address = $5)
                  AND ($6::timestamptz IS NULL OR created_at >= $6)
                  AND ($7::timestamptz IS NULL OR created_at <= $7)
                  AND ($8::text IS NULL OR COALESCE(user_name, '') ILIKE '%' || $8 || '%'
                       OR COALESCE(action, '') ILIKE '%' || $8 || '%'
                       OR COALESCE(entity_type, '') ILIKE '%' || $8 || '%')
                ORDER BY created_at DESC
                LIMIT $9 OFFSET $10
                "#,
            )
            .bind(params.user_id.as_deref())
            .bind(params.action.as_deref())
            .bind(params.entity_type.as_deref())
            .bind(params.status.as_deref())
            .bind(params.ip_address.as_deref())
            .bind(start_date)
            .bind(end_date)
            .bind(params.search.as_deref())
            .bind(page_size)
            .bind(offset)
            .fetch_all(&state.pool)
            .await
            .unwrap_or_default();

            (items, total)
        }
    };

    Json(api_success(PaginatedAuditLogs {
        items,
        total,
        page,
        pagesize: page_size,
    }))
}

/// 审计日志统计
pub async fn get_audit_log_stats(
    State(state): State<AppState>,
    Query(params): Query<AuditLogQueryParams>,
) -> Json<ApiResponse<AuditLogStats>> {
    let source = resolve_source(params.source.as_deref());
    let start_date = parse_datetime(params.start_date.as_deref());
    let end_date = parse_datetime(params.end_date.as_deref());

    let mut stats = AuditLogStats {
        total: 0,
        today_total: 0,
        success_total: 0,
        failure_total: 0,
        by_action: Vec::new(),
        by_source: Vec::new(),
        by_user: Vec::new(),
        trend: Vec::new(),
    };

    match source {
        "permission_audit_logs" => {
            stats.total = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM iam.permission_audit_logs WHERE ($1::timestamptz IS NULL OR created_at >= $1) AND ($2::timestamptz IS NULL OR created_at <= $2)",
            )
            .bind(start_date)
            .bind(end_date)
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

            stats.today_total = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM iam.permission_audit_logs WHERE created_at >= CURRENT_DATE",
            )
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

            stats.by_action = load_top_by_column(
                &state,
                "iam.permission_audit_logs",
                "action",
                start_date,
                end_date,
            )
            .await;
        }
        "login_logs" => {
            stats.total = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM core_login_logs WHERE ($1::timestamptz IS NULL OR login_time >= $1) AND ($2::timestamptz IS NULL OR login_time <= $2)",
            )
            .bind(start_date)
            .bind(end_date)
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

            stats.today_total = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM core_login_logs WHERE login_time >= CURRENT_DATE",
            )
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

            stats.success_total = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM core_login_logs WHERE status = 'success'",
            )
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

            stats.failure_total = stats.total - stats.success_total;

            stats.by_user = load_login_top_users(&state).await;
        }
        _ => {
            stats.total = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM iam.audit_logs WHERE ($1::timestamptz IS NULL OR created_at >= $1) AND ($2::timestamptz IS NULL OR created_at <= $2)",
            )
            .bind(start_date)
            .bind(end_date)
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

            stats.today_total = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM iam.audit_logs WHERE created_at >= CURRENT_DATE",
            )
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

            stats.success_total = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM iam.audit_logs WHERE status = 'success'",
            )
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

            stats.failure_total = stats.total - stats.success_total;

            stats.by_action =
                load_top_by_column(&state, "iam.audit_logs", "action", start_date, end_date).await;
            stats.by_user = load_audit_top_users(&state).await;
        }
    }

    stats.by_source = ALLOWED_SOURCES
        .iter()
        .map(|s| AuditLogCount {
            key: s.to_string(),
            count: 0,
        })
        .collect();

    stats.trend = load_trend(&state, source, start_date, end_date).await;

    Json(api_success(stats))
}

async fn load_top_by_column(
    state: &AppState,
    table: &str,
    column: &str,
    start_date: Option<DateTime<Utc>>,
    end_date: Option<DateTime<Utc>>,
) -> Vec<AuditLogCount> {
    let date_col = if table.contains("login") {
        "login_time"
    } else {
        "created_at"
    };
    let sql = format!(
        r#"
        SELECT COALESCE({column}, 'unknown') AS key, COUNT(*) AS count
        FROM {table}
        WHERE ($1::timestamptz IS NULL OR {date_col} >= $1)
          AND ($2::timestamptz IS NULL OR {date_col} <= $2)
        GROUP BY {column}
        ORDER BY count DESC
        LIMIT 10
        "#,
        column = column,
        table = table,
        date_col = date_col,
    );
    let rows = sqlx::query(&sql)
        .bind(start_date)
        .bind(end_date)
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default();
    rows.into_iter()
        .map(|row| AuditLogCount {
            key: row.try_get::<String, _>("key").unwrap_or_default(),
            count: row.try_get::<i64, _>("count").unwrap_or(0),
        })
        .collect()
}

async fn load_audit_top_users(state: &AppState) -> Vec<AuditLogCount> {
    let rows = sqlx::query(
        r#"
        SELECT COALESCE(user_name, user_id::text, 'unknown') AS key, COUNT(*) AS count
        FROM iam.audit_logs
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY user_name, user_id
        ORDER BY count DESC
        LIMIT 10
        "#,
    )
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();
    rows.into_iter()
        .map(|row| AuditLogCount {
            key: row.try_get::<String, _>("key").unwrap_or_default(),
            count: row.try_get::<i64, _>("count").unwrap_or(0),
        })
        .collect()
}

async fn load_login_top_users(state: &AppState) -> Vec<AuditLogCount> {
    let rows = sqlx::query(
        r#"
        SELECT username AS key, COUNT(*) AS count
        FROM core_login_logs
        WHERE login_time >= NOW() - INTERVAL '30 days'
        GROUP BY username
        ORDER BY count DESC
        LIMIT 10
        "#,
    )
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();
    rows.into_iter()
        .map(|row| AuditLogCount {
            key: row.try_get::<String, _>("key").unwrap_or_default(),
            count: row.try_get::<i64, _>("count").unwrap_or(0),
        })
        .collect()
}

async fn load_trend(
    state: &AppState,
    source: &str,
    start_date: Option<DateTime<Utc>>,
    end_date: Option<DateTime<Utc>>,
) -> Vec<AuditLogTrend> {
    let (table, date_col) = match source {
        "permission_audit_logs" => ("iam.permission_audit_logs", "created_at"),
        "login_logs" => ("core_login_logs", "login_time"),
        _ => ("iam.audit_logs", "created_at"),
    };
    let sql = format!(
        r#"
        SELECT TO_CHAR(DATE_TRUNC('day', {date_col}), 'YYYY-MM-DD') AS date,
               COUNT(*)::bigint AS count
        FROM {table}
        WHERE ($1::timestamptz IS NULL OR {date_col} >= $1)
          AND ($2::timestamptz IS NULL OR {date_col} <= $2)
        GROUP BY DATE_TRUNC('day', {date_col})
        ORDER BY date
        "#,
        table = table,
        date_col = date_col,
    );
    let rows = sqlx::query(&sql)
        .bind(start_date)
        .bind(end_date)
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default();
    rows.into_iter()
        .map(|row| AuditLogTrend {
            date: row.try_get::<String, _>("date").unwrap_or_default(),
            count: row.try_get::<i64, _>("count").unwrap_or(0),
        })
        .collect()
}

/// 导出审计日志
///
/// 支持 CSV / JSON 两种格式。
pub async fn export_audit_logs(
    State(state): State<AppState>,
    Query(params): Query<ExportQueryParams>,
) -> Result<Response, Response> {
    let source = resolve_source(params.source.as_deref());
    let format = params.format.as_deref().unwrap_or("csv").to_lowercase();
    let start_date = parse_datetime(params.start_date.as_deref());
    let end_date = parse_datetime(params.end_date.as_deref());

    let items = fetch_export_rows(&state, source, &params, start_date, end_date)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(api_error::<()>(500, &format!("查询审计日志失败: {}", e))),
            )
                .into_response()
        })?;

    let (body, content_type, filename) = match format.as_str() {
        "json" => {
            let body = serde_json::to_string_pretty(&items).unwrap_or_else(|_| "[]".to_string());
            (
                body,
                "application/json; charset=utf-8".to_string(),
                format!("audit_logs_{}.json", source),
            )
        }
        _ => {
            let body = render_csv(&items);
            (
                body,
                "text/csv; charset=utf-8".to_string(),
                format!("audit_logs_{}.csv", source),
            )
        }
    };

    let mut response = (
        StatusCode::OK,
        [
            (header::CONTENT_TYPE, content_type),
            (
                header::CONTENT_DISPOSITION,
                format!("attachment; filename=\"{}\"", filename),
            ),
        ],
        body,
    )
        .into_response();

    response
        .headers_mut()
        .insert("x-audit-source", header::HeaderValue::from_static(source));
    response.headers_mut().insert(
        "x-audit-row-count",
        header::HeaderValue::from_str(&items.len().to_string())
            .unwrap_or(header::HeaderValue::from_static("0")),
    );
    Ok(response)
}

#[derive(Debug, Serialize)]
struct ExportRow {
    id: String,
    source: String,
    tenant_id: Option<String>,
    user_id: Option<String>,
    username: Option<String>,
    action: String,
    entity_type: Option<String>,
    entity_id: Option<String>,
    resource: Option<String>,
    ip_address: Option<String>,
    user_agent: Option<String>,
    status: Option<String>,
    success: Option<bool>,
    error_message: Option<String>,
    created_at: String,
}

async fn fetch_export_rows(
    state: &AppState,
    source: &str,
    params: &ExportQueryParams,
    start_date: Option<DateTime<Utc>>,
    end_date: Option<DateTime<Utc>>,
) -> Result<Vec<ExportRow>, sqlx::Error> {
    let limit: i64 = 10_000;

    let rows: Vec<sqlx::postgres::PgRow> = match source {
        "permission_audit_logs" => {
            sqlx::query(
                r#"
                SELECT id, tenant_id, user_id, action, target_type, target_id,
                       reason, created_at
                FROM iam.permission_audit_logs
                WHERE ($1::timestamptz IS NULL OR created_at >= $1)
                  AND ($2::timestamptz IS NULL OR created_at <= $2)
                  AND ($3::text IS NULL OR action = $3)
                  AND ($4::uuid IS NULL OR user_id = $4)
                ORDER BY created_at DESC
                LIMIT $5
                "#,
            )
            .bind(start_date)
            .bind(end_date)
            .bind(params.action.as_deref())
            .bind(
                params
                    .user_id
                    .as_deref()
                    .and_then(|s| Uuid::parse_str(s).ok()),
            )
            .bind(limit)
            .fetch_all(&state.pool)
            .await?
        }
        "login_logs" => {
            sqlx::query(
                r#"
                SELECT id, tenant_id, user_id, username, status, ip_address, user_agent,
                       error_message, login_time, created_at
                FROM core_login_logs
                WHERE ($1::timestamptz IS NULL OR login_time >= $1)
                  AND ($2::timestamptz IS NULL OR login_time <= $2)
                  AND ($3::text IS NULL OR status = $3)
                  AND ($4::uuid IS NULL OR user_id = $4)
                ORDER BY login_time DESC
                LIMIT $5
                "#,
            )
            .bind(start_date)
            .bind(end_date)
            .bind(params.status.as_deref())
            .bind(
                params
                    .user_id
                    .as_deref()
                    .and_then(|s| Uuid::parse_str(s).ok()),
            )
            .bind(limit)
            .fetch_all(&state.pool)
            .await?
        }
        _ => {
            sqlx::query(
                r#"
                SELECT id, user_id, user_name, action, entity_type, entity_id,
                       status, error_message, ip_address, user_agent, created_at
                FROM iam.audit_logs
                WHERE ($1::timestamptz IS NULL OR created_at >= $1)
                  AND ($2::timestamptz IS NULL OR created_at <= $2)
                  AND ($3::text IS NULL OR action = $3)
                  AND ($4::text IS NULL OR status = $4)
                  AND ($5::text IS NULL OR user_id::text = $5)
                ORDER BY created_at DESC
                LIMIT $6
                "#,
            )
            .bind(start_date)
            .bind(end_date)
            .bind(params.action.as_deref())
            .bind(params.status.as_deref())
            .bind(params.user_id.as_deref())
            .bind(limit)
            .fetch_all(&state.pool)
            .await?
        }
    };

    let mut out = Vec::with_capacity(rows.len());
    for row in rows {
        let created_at: DateTime<Utc> = row
            .try_get::<DateTime<Utc>, _>("created_at")
            .or_else(|_| {
                row.try_get::<NaiveDateTime, _>("created_at")
                    .map(|d| Utc.from_utc_datetime(&d))
            })
            .unwrap_or_else(|_| Utc::now());

        let entry = match source {
            "permission_audit_logs" => ExportRow {
                id: row.try_get::<Uuid, _>("id")?.to_string(),
                source: source.to_string(),
                tenant_id: row
                    .try_get::<Option<Uuid>, _>("tenant_id")?
                    .map(|v| v.to_string()),
                user_id: row
                    .try_get::<Option<Uuid>, _>("user_id")?
                    .map(|v| v.to_string()),
                username: None,
                action: row.try_get::<String, _>("action").unwrap_or_default(),
                entity_type: row
                    .try_get::<Option<String>, _>("target_type")
                    .unwrap_or(None),
                entity_id: row
                    .try_get::<Option<Uuid>, _>("target_id")?
                    .map(|v| v.to_string()),
                resource: None,
                ip_address: None,
                user_agent: None,
                status: None,
                success: None,
                error_message: row.try_get::<Option<String>, _>("reason").unwrap_or(None),
                created_at: created_at.to_rfc3339(),
            },
            "login_logs" => ExportRow {
                id: row.try_get::<Uuid, _>("id")?.to_string(),
                source: source.to_string(),
                tenant_id: row
                    .try_get::<Option<Uuid>, _>("tenant_id")?
                    .map(|v| v.to_string()),
                user_id: row
                    .try_get::<Option<Uuid>, _>("user_id")?
                    .map(|v| v.to_string()),
                username: row.try_get::<Option<String>, _>("username").unwrap_or(None),
                action: "login".to_string(),
                entity_type: None,
                entity_id: None,
                resource: Some("/api/core/iam/auth/login".to_string()),
                ip_address: row
                    .try_get::<Option<String>, _>("ip_address")
                    .unwrap_or(None),
                user_agent: row
                    .try_get::<Option<String>, _>("user_agent")
                    .unwrap_or(None),
                status: row.try_get::<Option<String>, _>("status").unwrap_or(None),
                success: Some(
                    row.try_get::<Option<String>, _>("status")
                        .ok()
                        .flatten()
                        .map(|s| s == "success")
                        .unwrap_or(false),
                ),
                error_message: row
                    .try_get::<Option<String>, _>("error_message")
                    .unwrap_or(None),
                created_at: created_at.to_rfc3339(),
            },
            _ => ExportRow {
                id: row.try_get::<Uuid, _>("id")?.to_string(),
                source: source.to_string(),
                tenant_id: None,
                user_id: row.try_get::<Option<String>, _>("user_id").ok().flatten(),
                username: row
                    .try_get::<Option<String>, _>("user_name")
                    .unwrap_or(None),
                action: row.try_get::<String, _>("action").unwrap_or_default(),
                entity_type: row
                    .try_get::<Option<String>, _>("entity_type")
                    .unwrap_or(None),
                entity_id: row
                    .try_get::<Option<Uuid>, _>("entity_id")?
                    .map(|v| v.to_string()),
                resource: None,
                ip_address: row
                    .try_get::<Option<String>, _>("ip_address")
                    .unwrap_or(None),
                user_agent: row
                    .try_get::<Option<String>, _>("user_agent")
                    .unwrap_or(None),
                status: row.try_get::<Option<String>, _>("status").unwrap_or(None),
                success: Some(
                    row.try_get::<Option<String>, _>("status")
                        .ok()
                        .flatten()
                        .map(|s| s == "success")
                        .unwrap_or(false),
                ),
                error_message: row
                    .try_get::<Option<String>, _>("error_message")
                    .unwrap_or(None),
                created_at: created_at.to_rfc3339(),
            },
        };
        out.push(entry);
    }
    Ok(out)
}

fn render_csv(rows: &[ExportRow]) -> String {
    let mut output = String::with_capacity(rows.len() * 128);
    output.push_str("id,source,tenant_id,user_id,username,action,entity_type,entity_id,resource,ip_address,user_agent,status,success,error_message,created_at\n");
    for row in rows {
        let fields = [
            csv_field(&row.id),
            csv_field(&row.source),
            csv_field(row.tenant_id.as_deref().unwrap_or("")),
            csv_field(row.user_id.as_deref().unwrap_or("")),
            csv_field(row.username.as_deref().unwrap_or("")),
            csv_field(&row.action),
            csv_field(row.entity_type.as_deref().unwrap_or("")),
            csv_field(row.entity_id.as_deref().unwrap_or("")),
            csv_field(row.resource.as_deref().unwrap_or("")),
            csv_field(row.ip_address.as_deref().unwrap_or("")),
            csv_field(row.user_agent.as_deref().unwrap_or("")),
            csv_field(row.status.as_deref().unwrap_or("")),
            csv_field(if row.success.unwrap_or(false) {
                "true"
            } else {
                "false"
            }),
            csv_field(row.error_message.as_deref().unwrap_or("")),
            csv_field(&row.created_at),
        ];
        output.push_str(&fields.join(","));
        output.push('\n');
    }
    output
}

fn csv_field(value: &str) -> String {
    if value.contains(',') || value.contains('"') || value.contains('\n') || value.contains('\r') {
        let escaped = value.replace('"', "\"\"");
        format!("\"{}\"", escaped)
    } else {
        value.to_string()
    }
}

/// 列出可用的审计日志源
pub async fn list_audit_sources() -> Json<ApiResponse<serde_json::Value>> {
    Json(api_success(serde_json::json!({
        "sources": ALLOWED_SOURCES,
        "default": "audit_logs",
    })))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_resolve_source() {
        assert_eq!(resolve_source(Some("audit_logs")), "audit_logs");
        assert_eq!(
            resolve_source(Some("permission_audit_logs")),
            "permission_audit_logs"
        );
        assert_eq!(resolve_source(Some("login_logs")), "login_logs");
        assert_eq!(resolve_source(None), "audit_logs");
        assert_eq!(resolve_source(Some("invalid")), "audit_logs");
    }

    #[test]
    fn test_clamp_pagination() {
        assert_eq!(clamp_pagination(None, None), (1, 20));
        assert_eq!(clamp_pagination(Some(0), Some(0)), (1, 1));
        assert_eq!(clamp_pagination(Some(-1), Some(500)), (1, 200));
        assert_eq!(clamp_pagination(Some(3), Some(50)), (3, 50));
    }

    #[test]
    fn test_csv_field_escape() {
        assert_eq!(csv_field("simple"), "simple");
        assert_eq!(csv_field("a,b"), "\"a,b\"");
        assert_eq!(csv_field("a\"b"), "\"a\"\"b\"");
        assert_eq!(csv_field("line\nbreak"), "\"line\nbreak\"");
    }

    #[test]
    fn test_parse_datetime_rfc3339() {
        let v = parse_datetime(Some("2026-07-21T00:00:00Z"));
        assert!(v.is_some());
    }

    #[test]
    fn test_parse_datetime_naive() {
        let v = parse_datetime(Some("2026-07-21 12:30:00"));
        assert!(v.is_some());
    }

    #[test]
    fn test_parse_datetime_invalid() {
        assert!(parse_datetime(Some("not-a-date")).is_none());
    }

    #[test]
    fn test_render_csv_header_and_row() {
        let rows = vec![ExportRow {
            id: "id-1".to_string(),
            source: "audit_logs".to_string(),
            tenant_id: None,
            user_id: Some("user-1".to_string()),
            username: Some("alice".to_string()),
            action: "create".to_string(),
            entity_type: Some("user".to_string()),
            entity_id: None,
            resource: None,
            ip_address: Some("127.0.0.1".to_string()),
            user_agent: None,
            status: Some("success".to_string()),
            success: Some(true),
            error_message: None,
            created_at: "2026-07-21T00:00:00Z".to_string(),
        }];
        let output = render_csv(&rows);
        assert!(output.starts_with("id,source"));
        assert!(output.contains("create"));
        assert!(output.contains("alice"));
    }
}
