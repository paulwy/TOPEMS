use axum::{
    extract::{Path, Query, State},
    Json,
};
use chrono::{DateTime, Utc};
use serde_json::json;
use uuid::Uuid;

use crate::AppState;
use topems_shared::{api_error, api_success, ApiResponse};

use super::models::{
    DeleteLoginLogRequest, LoginLog, LoginLogListResponse, LoginLogQuery, RecordLoginRequest,
};

pub async fn record_login(
    State(state): State<AppState>,
    Json(req): Json<RecordLoginRequest>,
) -> Json<ApiResponse<LoginLog>> {
    let tenant_id = req
        .tenant_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or(Uuid::nil());

    let user_id = req.user_id.as_ref().and_then(|s| Uuid::parse_str(s).ok());

    let login_time = Utc::now();

    let log: LoginLog = match sqlx::query_as(
        r#"
        INSERT INTO core_login_logs
            (tenant_id, user_id, username, ip_address, user_agent, status, error_message, login_time)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, tenant_id, user_id, username, ip_address, user_agent, status, error_message, login_time, created_at
        "#,
    )
    .bind(tenant_id)
    .bind(user_id)
    .bind(req.username)
    .bind(req.ip_address)
    .bind(req.user_agent)
    .bind(req.status)
    .bind(req.error_message)
    .bind(login_time)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("记录登录日志失败: {}", e);
            return Json(api_error(500, "记录登录日志失败"));
        }
    };

    Json(api_success(log))
}

pub async fn list_login_logs(
    State(state): State<AppState>,
    Query(query): Query<LoginLogQuery>,
) -> Json<ApiResponse<LoginLogListResponse>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).clamp(1, 100);
    let offset = (page - 1) * page_size;

    let tenant_id = Uuid::nil();

    let username_like = query.username.as_ref().map(|s| format!("%{}%", s));
    let ip_address_like = query.ip_address.as_ref().map(|s| format!("%{}%", s));
    let user_id = query.user_id.as_ref().and_then(|s| Uuid::parse_str(s).ok());

    let start_time = query
        .start_time
        .as_ref()
        .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
        .map(|dt| dt.with_timezone(&Utc));

    let end_time = query
        .end_time
        .as_ref()
        .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
        .map(|dt| dt.with_timezone(&Utc));

    let total: i64 = match sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM core_login_logs
           WHERE deleted_at IS NULL AND tenant_id = $1
             AND ($2::text IS NULL OR username ILIKE $2)
             AND ($3::text IS NULL OR status = $3)
             AND ($4::uuid IS NULL OR user_id = $4)
             AND ($5::text IS NULL OR ip_address ILIKE $5)
             AND ($6::timestamp IS NULL OR login_time >= $6)
             AND ($7::timestamp IS NULL OR login_time <= $7)"#,
    )
    .bind(tenant_id)
    .bind(username_like)
    .bind(query.status.clone())
    .bind(user_id)
    .bind(ip_address_like)
    .bind(start_time)
    .bind(end_time)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询登录日志总数失败: {}", e);
            return Json(api_error(500, "查询登录日志总数失败"));
        }
    };

    let username_like2 = query.username.as_ref().map(|s| format!("%{}%", s));
    let ip_address_like2 = query.ip_address.as_ref().map(|s| format!("%{}%", s));
    let user_id2 = query.user_id.as_ref().and_then(|s| Uuid::parse_str(s).ok());

    let start_time2 = query
        .start_time
        .as_ref()
        .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
        .map(|dt| dt.with_timezone(&Utc));

    let end_time2 = query
        .end_time
        .as_ref()
        .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
        .map(|dt| dt.with_timezone(&Utc));

    let items: Vec<LoginLog> = match sqlx::query_as(
        r#"SELECT id, tenant_id, user_id, username, ip_address, user_agent, status, error_message, login_time, created_at
           FROM core_login_logs
           WHERE tenant_id = $1
             AND ($2::text IS NULL OR username ILIKE $2)
             AND ($3::text IS NULL OR status = $3)
             AND ($4::uuid IS NULL OR user_id = $4)
             AND ($5::text IS NULL OR ip_address ILIKE $5)
             AND ($6::timestamp IS NULL OR login_time >= $6)
             AND ($7::timestamp IS NULL OR login_time <= $7)
           ORDER BY login_time DESC
           LIMIT $8 OFFSET $9"#,
    )
    .bind(tenant_id)
    .bind(username_like2)
    .bind(query.status.clone())
    .bind(user_id2)
    .bind(ip_address_like2)
    .bind(start_time2)
    .bind(end_time2)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询登录日志列表失败: {}", e);
            return Json(api_error(500, "查询登录日志列表失败"));
        }
    };

    Json(api_success(LoginLogListResponse {
        items,
        total,
        page,
        page_size,
    }))
}

pub async fn get_login_log(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<LoginLog>> {
    let tenant_id = Uuid::nil();

    let log: Option<LoginLog> = match sqlx::query_as(
        r#"SELECT id, tenant_id, user_id, username, ip_address, user_agent, status, error_message, login_time, created_at
           FROM core_login_logs WHERE id = $1 AND tenant_id = $2"#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询登录日志详情失败: {}", e);
            return Json(api_error(500, "查询登录日志详情失败"));
        }
    };

    match log {
        Some(log) => Json(api_success(log)),
        None => Json(api_error(404, "登录日志不存在")),
    }
}

pub async fn delete_login_log(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let tenant_id = Uuid::nil();

    let result = sqlx::query(
        r#"UPDATE core_login_logs SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2"#,
    )
    .bind(id)
    .bind(tenant_id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(api_success(true)),
        Ok(_) => Json(api_error(404, "登录日志不存在")),
        Err(e) => {
            tracing::error!("删除登录日志失败: {}", e);
            Json(api_error(500, "删除登录日志失败"))
        }
    }
}

pub async fn batch_delete_login_logs(
    State(state): State<AppState>,
    Json(req): Json<DeleteLoginLogRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    if req.ids.is_empty() {
        return Json(api_error(400, "ID列表不能为空"));
    }

    let tenant_id = Uuid::nil();

    let uuids: Vec<Uuid> = req
        .ids
        .into_iter()
        .filter_map(|s| Uuid::parse_str(&s).ok())
        .collect();

    if uuids.is_empty() {
        return Json(api_error(400, "无效的ID格式"));
    }

    let placeholders = uuids
        .iter()
        .enumerate()
        .map(|(i, _)| format!("${}", i + 2))
        .collect::<Vec<_>>()
        .join(", ");

    let sql = format!(
        r#"UPDATE core_login_logs SET deleted_at = NOW() WHERE tenant_id = $1 AND id IN ({})"#,
        placeholders
    );

    let mut query = sqlx::query(&sql).bind(tenant_id);
    for uuid in uuids {
        query = query.bind(uuid);
    }

    let result = match query.execute(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("批量删除登录日志失败: {}", e);
            return Json(api_error(500, "批量删除登录日志失败"));
        }
    };

    Json(api_success(json!({
        "deleted_count": result.rows_affected(),
    })))
}

pub async fn record_login_event(
    pool: &sqlx::PgPool,
    tenant_id: Uuid,
    user_id: Option<Uuid>,
    username: &str,
    ip_address: Option<&str>,
    user_agent: Option<&str>,
    status: &str,
    error_message: Option<&str>,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO core_login_logs
            (tenant_id, user_id, username, ip_address, user_agent, status, error_message, login_time)
        VALUES ($1, $2, $3, $4::inet, $5, $6, $7, NOW())
        "#,
    )
    .bind(tenant_id)
    .bind(user_id)
    .bind(username)
    .bind(ip_address)
    .bind(user_agent)
    .bind(status)
    .bind(error_message)
    .execute(pool)
    .await
    .map(|_| ())
}
