use crate::AppState;
use axum::http::StatusCode;
use axum::Extension;
use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::Deserialize;
use sqlx::Row;
use topems_shared_auth::auth::Claims;
use uuid::Uuid;

use super::models::record_audit_log;

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct LoginHistoryQuery {
    pub limit: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct AccessLogQuery {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, sqlx::FromRow)]
struct LoginLogRow {
    id: Uuid,
    ip_address: String,
    user_agent: Option<String>,
    status: String,
    login_time: chrono::NaiveDateTime,
}

/// GET /users/{userId}/login-history?limit=10 — 返回用户登录历史
pub async fn get_login_history(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(user_id): Path<String>,
    Query(query): Query<LoginHistoryQuery>,
) -> (StatusCode, Json<serde_json::Value>) {
    tracing::info!(
        "IAM user get_login_history called with user_id: {}",
        user_id
    );

    let user_uuid = match Uuid::parse_str(&user_id) {
        Ok(id) => id,
        Err(e) => {
            tracing::warn!("Invalid user ID format: {}", e);
            return (
                StatusCode::BAD_REQUEST,
                Json(topems_shared_core::response::error_value(
                    400,
                    "无效的用户ID格式",
                )),
            );
        }
    };

    let limit = query.limit.unwrap_or(10).clamp(1, 100);

    let total: i64 =
        match sqlx::query_scalar("SELECT COUNT(*) FROM public.core_login_logs WHERE user_id = $1")
            .bind(user_uuid)
            .fetch_one(&state.pool)
            .await
        {
            Ok(t) => t,
            Err(e) => {
                tracing::error!("Failed to count login logs: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(topems_shared_core::response::error_value(
                        500,
                        &format!("查询登录历史总数失败: {}", e),
                    )),
                );
            }
        };

    let logs: Vec<LoginLogRow> = sqlx::query_as::<_, LoginLogRow>(
        r#"
        SELECT id, ip_address, user_agent, status, login_time
        FROM public.core_login_logs
        WHERE user_id = $1
        ORDER BY login_time DESC
        LIMIT $2
        "#,
    )
    .bind(user_uuid)
    .bind(limit)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_else(|e| {
        tracing::error!("Failed to fetch login logs: {}", e);
        vec![]
    });

    let logs_json: Vec<serde_json::Value> = logs
        .iter()
        .map(|l| {
            serde_json::json!({
                "id": l.id.to_string(),
                "ip_address": l.ip_address,
                "user_agent": l.user_agent,
                "success": l.status == "success",
                "created_at": l.login_time.to_string(),
            })
        })
        .collect();

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "success": true,
            "message": "获取用户登录历史成功",
            "data": {
                "logs": logs_json,
                "total": total
            },
            "code": 200
        })),
    )
}

/// GET /access-logs?limit=10&offset=0 — 返回访问日志列表
pub async fn list_access_logs(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Query(query): Query<AccessLogQuery>,
) -> (StatusCode, Json<serde_json::Value>) {
    tracing::info!("IAM user list_access_logs called");

    let limit = query.limit.unwrap_or(10).clamp(1, 100);
    let offset = query.offset.unwrap_or(0).max(0);

    let rows = sqlx::query(
        r#"
        SELECT a.id, a.user_id, u.username, a.action, a.resource_type, a.resource_id,
               a.ip_address::text, a.user_agent, a.status, a.created_at
        FROM public.audit_logs a
        LEFT JOIN public.core_users u ON a.user_id = u.id
        ORDER BY a.created_at DESC
        LIMIT $1 OFFSET $2
        "#,
    )
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_else(|e| {
        tracing::error!("Failed to fetch access logs: {}", e);
        vec![]
    });

    let logs_json: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            let status: Option<i16> = r.try_get("status").ok().flatten();
            let success = status.map(|s| s < 400).unwrap_or(true);
            serde_json::json!({
                "id": r.get::<Uuid, _>("id").to_string(),
                "user_id": r.get::<Option<Uuid>, _>("user_id").map(|u| u.to_string()).unwrap_or_default(),
                "username": r.get::<Option<String>, _>("username").unwrap_or_default(),
                "action": r.get::<String, _>("action"),
                "resource": r.get::<Option<String>, _>("resource_type").unwrap_or_default(),
                "resource_id": r.get::<Option<String>, _>("resource_id"),
                "ip_address": r.get::<Option<String>, _>("ip_address"),
                "user_agent": r.get::<Option<String>, _>("user_agent"),
                "success": success,
                "error_message": if success { None } else { Some("操作失败") },
                "created_at": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_string(),
            })
        })
        .collect();

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "success": true,
            "message": "获取访问日志列表成功",
            "data": logs_json,
            "code": 200
        })),
    )
}

/// GET /access-logs/user/{userId}?limit=10&offset=0 — 返回指定用户访问日志
pub async fn get_user_access_logs(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(user_id): Path<String>,
    Query(query): Query<AccessLogQuery>,
) -> (StatusCode, Json<serde_json::Value>) {
    tracing::info!(
        "IAM user get_user_access_logs called with user_id: {}",
        user_id
    );

    let user_uuid = match Uuid::parse_str(&user_id) {
        Ok(id) => id,
        Err(e) => {
            tracing::warn!("Invalid user ID format: {}", e);
            return (
                StatusCode::BAD_REQUEST,
                Json(topems_shared_core::response::error_value(
                    400,
                    "无效的用户ID格式",
                )),
            );
        }
    };

    let limit = query.limit.unwrap_or(10).clamp(1, 100);
    let offset = query.offset.unwrap_or(0).max(0);

    let rows = sqlx::query(
        r#"
        SELECT a.id, a.user_id, u.username, a.action, a.resource_type, a.resource_id,
               a.ip_address::text, a.user_agent, a.status, a.created_at
        FROM public.audit_logs a
        LEFT JOIN public.core_users u ON a.user_id = u.id
        WHERE a.user_id = $1
        ORDER BY a.created_at DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(user_uuid)
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_else(|e| {
        tracing::error!("Failed to fetch user access logs: {}", e);
        vec![]
    });

    let logs_json: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            let status: Option<i16> = r.try_get("status").ok().flatten();
            let success = status.map(|s| s < 400).unwrap_or(true);
            serde_json::json!({
                "id": r.get::<Uuid, _>("id").to_string(),
                "user_id": r.get::<Option<Uuid>, _>("user_id").map(|u| u.to_string()).unwrap_or_default(),
                "username": r.get::<Option<String>, _>("username").unwrap_or_default(),
                "action": r.get::<String, _>("action"),
                "resource": r.get::<Option<String>, _>("resource_type").unwrap_or_default(),
                "resource_id": r.get::<Option<String>, _>("resource_id"),
                "ip_address": r.get::<Option<String>, _>("ip_address"),
                "user_agent": r.get::<Option<String>, _>("user_agent"),
                "success": success,
                "error_message": if success { None } else { Some("操作失败") },
                "created_at": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_string(),
            })
        })
        .collect();

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "success": true,
            "message": "获取用户访问日志成功",
            "data": logs_json,
            "code": 200
        })),
    )
}

/// POST /access-logs — 创建访问日志
pub async fn create_access_log(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<serde_json::Value>,
) -> (StatusCode, Json<serde_json::Value>) {
    tracing::info!(
        "IAM user create_access_log called by: {} with payload: {:?}",
        claims.sub,
        payload
    );

    let operator_id = &claims.sub;

    let user_id_str = payload
        .get("user_id")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let username = payload
        .get("username")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let action = payload.get("action").and_then(|v| v.as_str()).unwrap_or("");
    let resource = payload
        .get("resource")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let resource_id = payload.get("resource_id").and_then(|v| v.as_str());
    let ip_address = payload.get("ip_address").and_then(|v| v.as_str());
    let user_agent = payload.get("user_agent").and_then(|v| v.as_str());
    let success = payload
        .get("success")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);
    let error_message = payload.get("error_message").and_then(|v| v.as_str());

    if action.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(topems_shared_core::response::error_value(
                400,
                "action 是必填字段",
            )),
        );
    }

    let user_uuid = if user_id_str.is_empty() {
        None
    } else {
        Uuid::parse_str(user_id_str).ok()
    };

    let status_str = if success { "success" } else { "failed" };

    let result = sqlx::query(
        r#"
        INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, status, response_details, created_at)
        VALUES ($1, $2, $3, $4, $5::inet, $6, $7, $8, NOW())
        RETURNING id, created_at
        "#,
    )
    .bind(user_uuid)
    .bind(action)
    .bind(resource)
    .bind(resource_id.and_then(|s| Uuid::parse_str(s).ok()))
    .bind(ip_address)
    .bind(user_agent)
    .bind(status_str)
    .bind(error_message.map(|m| serde_json::json!({ "error": m })))
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(row) => {
            let log_id: Uuid = row.get("id");
            let created_at: chrono::DateTime<chrono::Utc> = row.get("created_at");
            tracing::info!("Access log created successfully: {}", log_id);

            let data = serde_json::json!({
                "id": log_id.to_string(),
                "user_id": user_id_str,
                "username": username,
                "action": action,
                "resource": resource,
                "resource_id": resource_id,
                "ip_address": ip_address,
                "user_agent": user_agent,
                "success": success,
                "error_message": error_message,
                "created_at": created_at.to_string(),
            });

            let response_body = serde_json::json!({
                "success": true,
                "message": "创建访问日志成功",
                "data": data,
                "code": 200
            });

            record_audit_log(
                &state.pool,
                operator_id,
                "create",
                "access_log",
                &log_id.to_string(),
                Some(payload),
                Some(response_body.clone()),
                200,
            )
            .await;

            (StatusCode::OK, Json(response_body))
        }
        Err(e) => {
            tracing::error!("Failed to create access log: {}", e);
            let response_body =
                topems_shared_core::response::error_value(500, &format!("创建访问日志失败: {}", e));

            record_audit_log(
                &state.pool,
                operator_id,
                "create",
                "access_log",
                "-",
                Some(payload),
                Some(response_body.clone()),
                500,
            )
            .await;

            (StatusCode::INTERNAL_SERVER_ERROR, Json(response_body))
        }
    }
}
