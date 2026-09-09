use axum::{
    extract::{Path, State},
    http::{HeaderMap, HeaderValue},
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json;
use sqlx::Row;
use uuid::Uuid;

use crate::shared::AppState;
use topems_shared_core::response::ApiResponse;

fn validate_date_format(date_str: &str) -> bool {
    if date_str.len() < 10 {
        return false;
    }
    let parts: Vec<&str> = date_str.split('-').collect();
    if parts.len() < 3 {
        return false;
    }
    let year = parts[0].parse::<i32>().ok();
    let month = parts[1].parse::<u32>().ok();
    let day = parts[2].split('T').next().unwrap_or("").parse::<u32>().ok();
    match (year, month, day) {
        (Some(y), Some(m), Some(d)) => {
            (2000..=2100).contains(&y) && (1..=12).contains(&m) && (1..=31).contains(&d)
        }
        _ => false,
    }
}

#[derive(Debug, Deserialize, Serialize)]
pub struct AuditLog {
    pub id: Uuid,
    pub tenant_id: Uuid,
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

#[derive(Debug, Deserialize)]
pub struct ListAuditLogsQuery {
    pub action: Option<String>,
    pub entity_type: Option<String>,
    pub user_id: Option<String>,
    pub status: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub page: Option<i64>,
    pub pagesize: Option<i64>,
}

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/audit-logs", get(list_audit_logs))
        .route("/audit-logs/{id}", get(get_audit_log))
        .route("/audit-logs/export", get(export_audit_logs))
}

pub async fn list_audit_logs(
    State(state): State<AppState>,
    axum::extract::Query(params): axum::extract::Query<ListAuditLogsQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.pagesize.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    if let Some(ref start_date) = params.start_date {
        if !validate_date_format(start_date) {
            return Json(ApiResponse::error(
                400,
                "开始日期格式不正确，请使用 ISO 8601 格式",
            ));
        }
    }

    if let Some(ref end_date) = params.end_date {
        if !validate_date_format(end_date) {
            return Json(ApiResponse::error(
                400,
                "结束日期格式不正确，请使用 ISO 8601 格式",
            ));
        }
    }

    let result = sqlx::query(
        r#"
        SELECT id, action, entity_type, entity_id, entity_ids,
               user_id, user_name, request_details, response_details,
               status, error_message, ip_address, user_agent, created_at
        FROM qa_lims_audit_logs
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
        Ok(rows) => {
            let logs: Vec<AuditLog> = rows
                .into_iter()
                .map(|row| AuditLog {
                    id: row.get("id"),
                    tenant_id: row.get("tenant_id"),
                    action: row.get("action"),
                    entity_type: row.get("entity_type"),
                    entity_id: row.get("entity_id"),
                    entity_ids: row.get("entity_ids"),
                    user_id: row.get("user_id"),
                    user_name: row.get("user_name"),
                    request_details: row.get("request_details"),
                    response_details: row.get("response_details"),
                    status: row.get("status"),
                    error_message: row.get("error_message"),
                    ip_address: row.get("ip_address"),
                    user_agent: row.get("user_agent"),
                    created_at: row.get("created_at"),
                })
                .collect();

            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM qa_lims_audit_logs
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

pub async fn get_audit_log(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<AuditLog>> {
    let result = sqlx::query(
        r#"
        SELECT id, action, entity_type, entity_id, entity_ids,
               user_id, user_name, request_details, response_details,
               status, error_message, ip_address, user_agent, created_at
        FROM qa_lims_audit_logs WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(row)) => {
            let log = AuditLog {
                id: row.get("id"),
                tenant_id: row.get("tenant_id"),
                action: row.get("action"),
                entity_type: row.get("entity_type"),
                entity_id: row.get("entity_id"),
                entity_ids: row.get("entity_ids"),
                user_id: row.get("user_id"),
                user_name: row.get("user_name"),
                request_details: row.get("request_details"),
                response_details: row.get("response_details"),
                status: row.get("status"),
                error_message: row.get("error_message"),
                ip_address: row.get("ip_address"),
                user_agent: row.get("user_agent"),
                created_at: row.get("created_at"),
            };
            Json(ApiResponse::success(log, "获取审计日志成功"))
        }
        Ok(None) => Json(ApiResponse::error(404, "审计日志不存在")),
        Err(e) => {
            tracing::error!("获取审计日志失败: {}", e);
            Json(ApiResponse::error(500, "获取审计日志失败"))
        }
    }
}

pub async fn export_audit_logs(
    State(state): State<AppState>,
    axum::extract::Query(params): axum::extract::Query<ListAuditLogsQuery>,
) -> impl IntoResponse {
    if let Some(ref start_date) = params.start_date {
        if !validate_date_format(start_date) {
            return Json(ApiResponse::<serde_json::Value>::error(
                400,
                "开始日期格式不正确，请使用 ISO 8601 格式",
            ))
            .into_response();
        }
    }

    if let Some(ref end_date) = params.end_date {
        if !validate_date_format(end_date) {
            return Json(ApiResponse::<serde_json::Value>::error(
                400,
                "结束日期格式不正确，请使用 ISO 8601 格式",
            ))
            .into_response();
        }
    }

    let result = sqlx::query(
        r#"
        SELECT id, action, entity_type, entity_id, entity_ids,
               user_id, user_name, request_details, response_details,
               status, error_message, ip_address, user_agent, created_at
        FROM qa_lims_audit_logs
        WHERE ($1::text IS NULL OR action = $1)
          AND ($2::text IS NULL OR entity_type = $2)
          AND ($3::text IS NULL OR user_id = $3)
          AND ($4::text IS NULL OR status = $4)
          AND ($5::text IS NULL OR created_at >= $5::timestamptz)
          AND ($6::text IS NULL OR created_at <= $6::timestamptz)
        ORDER BY created_at DESC
        "#,
    )
    .bind(&params.action)
    .bind(&params.entity_type)
    .bind(&params.user_id)
    .bind(&params.status)
    .bind(params.start_date)
    .bind(params.end_date)
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(rows) => {
            let logs: Vec<AuditLog> = rows
                .into_iter()
                .map(|row| AuditLog {
                    id: row.get("id"),
                    tenant_id: row.get("tenant_id"),
                    action: row.get("action"),
                    entity_type: row.get("entity_type"),
                    entity_id: row.get("entity_id"),
                    entity_ids: row.get("entity_ids"),
                    user_id: row.get("user_id"),
                    user_name: row.get("user_name"),
                    request_details: row.get("request_details"),
                    response_details: row.get("response_details"),
                    status: row.get("status"),
                    error_message: row.get("error_message"),
                    ip_address: row.get("ip_address"),
                    user_agent: row.get("user_agent"),
                    created_at: row.get("created_at"),
                })
                .collect();

            let csv_content = generate_csv(&logs);
            let filename = format!("audit_logs_{}.csv", Utc::now().format("%Y%m%d_%H%M%S"));

            let mut headers = HeaderMap::new();
            headers.insert(
                "Content-Type",
                HeaderValue::from_static("text/csv; charset=utf-8"),
            );
            if let Ok(content_disposition) =
                HeaderValue::from_str(&format!("attachment; filename=\"{}\"", filename))
            {
                headers.insert("Content-Disposition", content_disposition);
            } else {
                headers.insert(
                    "Content-Disposition",
                    HeaderValue::from_static("attachment; filename=\"audit_logs.csv\""),
                );
            }

            (headers, csv_content).into_response()
        }
        Err(e) => {
            tracing::error!("导出审计日志失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "导出审计日志失败",
            ))
            .into_response()
        }
    }
}

fn generate_csv(logs: &[AuditLog]) -> String {
    let mut wtr = csv::WriterBuilder::new()
        .delimiter(b',')
        .quote_style(csv::QuoteStyle::Always)
        .from_writer(vec![]);

    if wtr
        .write_record([
            "ID",
            "操作",
            "实体类型",
            "实体ID",
            "用户ID",
            "用户名",
            "状态",
            "错误信息",
            "IP地址",
            "创建时间",
            "请求详情",
            "响应详情",
        ])
        .is_err()
    {
        return String::from("ID,操作,实体类型,实体ID,用户ID,用户名,状态,错误信息,IP地址,创建时间,请求详情,响应详情\n");
    }

    for log in logs {
        let request_details = log
            .request_details
            .as_ref()
            .and_then(|v| serde_json::to_string(v).ok())
            .unwrap_or_default();

        let response_details = log
            .response_details
            .as_ref()
            .and_then(|v| serde_json::to_string(v).ok())
            .unwrap_or_default();

        let _ = wtr.write_record(&[
            log.id.to_string(),
            log.action.clone(),
            log.entity_type.clone().unwrap_or_default(),
            log.entity_id.map(|id| id.to_string()).unwrap_or_default(),
            log.user_id.clone().unwrap_or_default(),
            log.user_name.clone().unwrap_or_default(),
            log.status.clone(),
            log.error_message.clone().unwrap_or_default(),
            log.ip_address.clone().unwrap_or_default(),
            log.created_at.to_rfc3339(),
            request_details,
            response_details,
        ]);
    }

    match wtr.into_inner() {
        Ok(bytes) => String::from_utf8_lossy(&bytes).to_string(),
        Err(_) => String::from("ID,操作,实体类型,实体ID,用户ID,用户名,状态,错误信息,IP地址,创建时间,请求详情,响应详情\n"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::{Deserialize, Serialize};

    fn roundtrip<T>(value: &T)
    where
        T: Serialize + for<'de> Deserialize<'de>,
    {
        let s1 = serde_json::to_string(value).expect("serialize to string");
        let v1: serde_json::Value = serde_json::from_str(&s1).expect("string -> Value");
        let s2 = serde_json::to_string(&v1).expect("Value -> string");
        let v2: serde_json::Value = serde_json::from_str(&s2).expect("roundtrip string -> Value");
        assert_eq!(v1, v2);
    }

    #[test]
    fn test_audit_log_roundtrip() {
        let log = AuditLog {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            action: "sample.create".to_string(),
            entity_type: Some("Sample".to_string()),
            entity_id: Some(Uuid::new_v4()),
            entity_ids: Some(serde_json::json!([Uuid::new_v4().to_string()])),
            user_id: Some("user-001".to_string()),
            user_name: Some("张三".to_string()),
            request_details: Some(serde_json::json!({"sample_no": "S-2026-001", "weight": 10.5})),
            response_details: Some(serde_json::json!({"status": "created"})),
            status: "success".to_string(),
            error_message: None,
            ip_address: Some("192.168.1.100".to_string()),
            user_agent: Some("Mozilla/5.0".to_string()),
            created_at: Utc::now(),
        };
        roundtrip(&log);

        let minimal = AuditLog {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            action: "system.startup".to_string(),
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
        roundtrip(&minimal);
    }
}
// ---- validate_date_format ----
#[test]
fn date_valid() {
    assert!(validate_date_format("2024-05-15"));
}

#[test]
fn date_datetime_format() {
    assert!(validate_date_format("2024-05-15T10:30:00"));
}

#[test]
fn date_invalid_month() {
    assert!(!validate_date_format("2024-13-01"));
    assert!(!validate_date_format("2024-00-01"));
}

#[test]
fn date_invalid_day() {
    assert!(!validate_date_format("2024-05-32"));
    assert!(!validate_date_format("2024-05-00"));
}

#[test]
fn date_out_of_year_range() {
    assert!(!validate_date_format("1999-01-01"));
    assert!(!validate_date_format("2101-01-01"));
}

#[test]
fn date_too_short() {
    assert!(!validate_date_format("2024"));
    assert!(!validate_date_format("2024-05"));
}

#[test]
fn date_non_numeric() {
    assert!(!validate_date_format("abc"));
    assert!(!validate_date_format("2024-aa-bb"));
}

#[test]
fn date_empty() {
    assert!(!validate_date_format(""));
}

fn make_audit_log(action: &str, status: &str) -> AuditLog {
    use chrono::TimeZone;
    AuditLog {
        id: Uuid::new_v4(),
        tenant_id: Uuid::new_v4(),
        action: action.to_string(),
        entity_type: None,
        entity_id: None,
        entity_ids: None,
        user_id: None,
        user_name: None,
        request_details: None,
        response_details: None,
        status: status.to_string(),
        error_message: None,
        ip_address: None,
        user_agent: None,
        created_at: Utc.with_ymd_and_hms(2026, 1, 2, 3, 4, 5).unwrap(),
    }
}

#[test]
fn csv_empty_logs_still_have_header() {
    let csv = generate_csv(&[]);
    // QuoteStyle::Always → 每个字段都被引号包裹
    assert!(
        csv.starts_with("\"ID\",\"操作\",\"实体类型\""),
        "header should be quoted: {csv}"
    );
    let lines: Vec<&str> = csv.lines().collect();
    assert_eq!(lines.len(), 1);
    assert_eq!(lines[0].split(',').count(), 12);
}

#[test]
fn csv_single_log_contains_all_fields() {
    let mut log = make_audit_log("sample.create", "success");
    log.entity_type = Some("sample".to_string());
    log.user_name = Some("tester".to_string());
    log.ip_address = Some("10.0.0.1".to_string());
    let csv = generate_csv(&[log]);
    let lines: Vec<&str> = csv.lines().collect();
    assert_eq!(lines.len(), 2);
    let row = lines[1];
    assert!(row.contains("sample.create"), "action should appear in row");
    assert!(row.contains("success"), "status should appear in row");
    assert!(row.contains("sample"), "entity_type should appear in row");
    assert!(row.contains("tester"), "user_name should appear in row");
    assert!(row.contains("10.0.0.1"), "ip should appear in row");
    assert!(
        row.contains("2026-01-02T03:04:05"),
        "timestamp should appear in row"
    );
}

#[test]
fn csv_none_fields_are_empty_placeholders() {
    let log = make_audit_log("x", "y");
    let csv = generate_csv(&[log]);
    let row = csv.lines().nth(1).unwrap();
    let cols: Vec<&str> = row.split(',').collect();
    assert_eq!(cols.len(), 12, "row should have 12 columns");
    assert_eq!(
        cols[2], "\"\"",
        "entity_type None should be empty placeholder"
    );
}

#[test]
fn csv_request_details_json_serialized() {
    let mut log = make_audit_log("sample.update", "success");
    log.request_details = Some(serde_json::json!({"key": "val", "n": 1}));
    let csv = generate_csv(&[log]);
    assert!(
        csv.contains("\"{\"\"key\"\":\"\"val\"\",\"\"n\"\":1}\""),
        "request details should be serialized & escaped"
    );
    assert!(csv.contains("sample.update"), "action should be present");
}

#[test]
fn csv_multiple_logs_one_row_per_log() {
    let logs = vec![
        make_audit_log("a", "ok"),
        make_audit_log("b", "ok"),
        make_audit_log("c", "ok"),
    ];
    let csv = generate_csv(&logs);
    assert_eq!(csv.lines().count(), 4, "header + 3 log rows");
}

#[test]
fn csv_field_with_comma_is_quoted() {
    let mut log = make_audit_log("create", "ok");
    log.error_message = Some("contains,comma".to_string());
    let csv = generate_csv(&[log]);
    assert!(
        csv.contains("\"contains,comma\""),
        "comma field should stay quoted as one column"
    );
}
