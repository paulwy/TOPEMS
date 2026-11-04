//! 前端页面真实消费但缺失的端点（主题二③ mobile 专项补充）
//! - GET  /inspection/tasks             MobileScanPage:listTasks
//! - GET  /analytics/usage              MobileHomePage:getUsageStats
//! - GET  /user/settings                MobileSettingsPage:getSettings
//! - GET  /push/config                  PushNotificationPage:getPushConfig
//! - PUT  /push/config                  PushNotificationPage:updatePushConfig
//! - PUT  /push/templates/{id}          PushNotificationPage:updatePushTemplate

#![allow(dead_code)]

use axum::{
    extract::{Extension, Path, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use serde_json::{json, Value};
use sqlx::{Pool, Postgres, Row};
use uuid::Uuid;

use super::auth_utils::{extract_bearer_token, extract_user_id_from_token};
use topems_shared_auth::auth::{verify_jwt_token, Claims};
use topems_shared_core::response::ApiResponse;

fn tenant_filter(claims: &Claims) -> Option<Uuid> {
    if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok())
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:inspection:read"])),
    path = "/inspection/tasks",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "inspection"
)]
pub async fn list_inspection_tasks(
    headers: HeaderMap,
    Extension(claims): Extension<Claims>,
    State(auth_state): State<topems_shared::AuthState>,
    State(pool): State<Pool<Postgres>>,
) -> impl IntoResponse {
    let _ = extract_user_id_from_token(&headers, &auth_state.jwt_secret);
    let rows = match sqlx::query(
        r#"SELECT id, title, description, patrol_type, status, checked_by::text AS checked_by, checked_at, created_at
           FROM mobile.patrol_records
           WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1::uuid)
           ORDER BY created_at DESC"#,
    )
    .bind(tenant_filter(&claims))
    .fetch_all(&pool)
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            tracing::error!("查询巡检任务失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::<Value>::server_error("查询巡检任务失败"),
            );
        }
    };
    let tasks: Vec<Value> = rows
        .iter()
        .map(|r| {
            json!({
                "id": r.get::<Uuid, _>("id"),
                "title": r.get::<String, _>("title"),
                "description": r.get::<Option<String>, _>("description"),
                "type": r.get::<Option<String>, _>("patrol_type"),
                "status": r.get::<String, _>("status"),
                "checkedBy": r.get::<Option<String>, _>("checked_by"),
                "checkedAt": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("checked_at"),
                "createdAt": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
            })
        })
        .collect();
    (
        StatusCode::OK,
        ApiResponse::success(json!(tasks), "巡检任务列表"),
    )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:analytics:read"])),
    path = "/analytics/usage",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "analytics"
)]
pub async fn get_usage_stats(
    headers: HeaderMap,
    Extension(claims): Extension<Claims>,
    State(auth_state): State<topems_shared::AuthState>,
    State(pool): State<Pool<Postgres>>,
) -> impl IntoResponse {
    let _ = extract_user_id_from_token(&headers, &auth_state.jwt_secret);
    let stats = sqlx::query(
        r#"SELECT
             (SELECT COUNT(*) FROM mobile.mobile_tasks WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1::uuid)) AS task_count,
             (SELECT COUNT(*) FROM mobile.mobile_attendance) AS attendance_count,
             (SELECT COUNT(*) FROM mobile.patrol_records WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1::uuid)) AS patrol_count,
             (SELECT COUNT(*) FROM mobile.push_notifications WHERE ($1::uuid IS NULL OR tenant_id = $1::uuid)) AS notification_count"#,
    )
    .bind(tenant_filter(&claims))
    .fetch_one(&pool)
    .await;
    let v = match stats {
        Ok(r) => json!({
            "modules": [
                {"key": "task", "label": "任务", "usage": r.get::<i64, _>("task_count")},
                {"key": "attendance", "label": "考勤", "usage": r.get::<i64, _>("attendance_count")},
                {"key": "patrol", "label": "巡检", "usage": r.get::<i64, _>("patrol_count")},
                {"key": "notification", "label": "通知", "usage": r.get::<i64, _>("notification_count")}
            ]
        }),
        Err(e) => {
            tracing::error!("统计使用量失败: {}", e);
            json!({"modules": []})
        }
    };
    (StatusCode::OK, ApiResponse::success(v, "使用量统计"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:user:read"])),
    path = "/user/settings",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "user"
)]
pub async fn get_user_settings(
    headers: HeaderMap,
    State(auth_state): State<topems_shared::AuthState>,
    State(_pool): State<Pool<Postgres>>,
) -> impl IntoResponse {
    let _ = extract_user_id_from_token(&headers, &auth_state.jwt_secret);
    let settings = json!({
        "notifications": {"push": true, "email": false, "inApp": true},
        "language": "zh-CN",
        "theme": "light",
        "offlineSync": {"auto": true, "intervalMinutes": 15}
    });
    (StatusCode::OK, ApiResponse::success(settings, "用户设置"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:push:read"])),
    path = "/push/config",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "push"
)]
pub async fn get_push_config(
    headers: HeaderMap,
    Extension(claims): Extension<Claims>,
    State(auth_state): State<topems_shared::AuthState>,
    State(pool): State<Pool<Postgres>>,
) -> impl IntoResponse {
    let _ = extract_user_id_from_token(&headers, &auth_state.jwt_secret);
    let row = sqlx::query(
        r#"SELECT channel_config FROM mobile.push_config WHERE ($1::uuid IS NULL OR tenant_id = $1::uuid) LIMIT 1"#,
    )
    .bind(tenant_filter(&claims))
    .fetch_optional(&pool)
        .await;
    let v = match row {
        Ok(Some(r)) => r.get::<Value, _>("channel_config"),
        _ => json!({
            "channels": [
                {"key": "app", "label": "应用内通知", "enabled": true},
                {"key": "sms", "label": "短信", "enabled": false},
                {"key": "email", "label": "邮件", "enabled": false}
            ],
            "quietHours": {"enabled": false, "start": "22:00", "end": "07:00"}
        }),
    };
    (StatusCode::OK, ApiResponse::success(v, "推送配置"))
}

pub async fn update_push_config(
    headers: HeaderMap,
    State(auth_state): State<topems_shared::AuthState>,
    State(pool): State<Pool<Postgres>>,
    Json(payload): Json<Value>,
) -> impl IntoResponse {
    // push_config.user_id 为 NOT NULL，必须绑定当前登录用户，否则触发约束冲突（500 根因）。
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => match Uuid::parse_str(&id) {
            Ok(u) => u,
            Err(_) => {
                return (
                    StatusCode::UNAUTHORIZED,
                    ApiResponse::<Value>::unauthorized("无效的用户ID"),
                );
            }
        },
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::<Value>::unauthorized("未授权"),
            );
        }
    };
    // 租户取自 token claims，去掉硬编码 '...0001' 字面量。
    // 注意与 offline_sync（sync_policies 可空 + RLS 含 tenant_id IS NULL 分支）不同：
    // 本表 mobile.push_config.tenant_id 为 NOT NULL 且未启用 RLS，故不做超管→SQL NULL 特判，
    // 直接落 claims.tenant_id；claims 无租户时退零 uuid，既满足 NOT NULL 约束，又保证
    // ON CONFLICT (tenant_id, user_id) 幂等命中——每个用户仍按 (tenant, user) 唯一一行 upsert。
    let tenant_id: Uuid = extract_bearer_token(&headers)
        .and_then(|t| verify_jwt_token(&t, &auth_state.jwt_secret).ok())
        .and_then(|c| c.tenant_id)
        .and_then(|t| Uuid::parse_str(&t).ok())
        .unwrap_or(Uuid::nil());
    match sqlx::query(
        r#"INSERT INTO mobile.push_config (tenant_id, user_id, channel_config, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (tenant_id, user_id) DO UPDATE SET channel_config = EXCLUDED.channel_config, updated_at = NOW()"#,
    )
    .bind(tenant_id)
    .bind(user_id)
    .bind(&payload)
    .execute(&pool)
    .await
    {
        Ok(_) => (
            StatusCode::OK,
            ApiResponse::success(payload, "推送配置已保存"),
        ),
        Err(e) => {
            tracing::error!("保存推送配置失败: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::<Value>::server_error("保存推送配置失败"),
            )
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mobile:push:write"])),
    path = "/push/templates/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "push"
)]
pub async fn update_push_template(
    headers: HeaderMap,
    State(auth_state): State<topems_shared::AuthState>,
    State(pool): State<Pool<Postgres>>,
    Path(id): Path<Uuid>,
    Json(payload): Json<Value>,
) -> impl IntoResponse {
    let _ = extract_user_id_from_token(&headers, &auth_state.jwt_secret);
    let name = payload.get("name").and_then(|v| v.as_str()).unwrap_or("");
    let title_template = payload
        .get("titleTemplate")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let body_template = payload
        .get("bodyTemplate")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let is_active = payload.get("isActive").and_then(|v| v.as_bool());
    match sqlx::query(
        r#"UPDATE mobile.push_templates
           SET name = COALESCE(NULLIF($2, ''), name),
               title_template = COALESCE(NULLIF($3, ''), title_template),
               body_template = COALESCE(NULLIF($4, ''), body_template),
               is_active = COALESCE($5, is_active),
               updated_at = NOW()
           WHERE id = $1 AND (COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000') IS NULL OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))
           RETURNING id, name, notification_type, title_template, body_template, is_active, created_at"#,
    )
    .bind(id)
    .bind(name)
    .bind(title_template)
    .bind(body_template)
    .bind(is_active)
    .fetch_optional(&pool)
    .await
    {
        Ok(Some(row)) => {
            let v = json!({
                "id": row.get::<Uuid, _>("id"),
                "name": row.get::<String, _>("name"),
                "templateType": row.get::<String, _>("notification_type"),
                "titleTemplate": row.get::<String, _>("title_template"),
                "bodyTemplate": row.get::<String, _>("body_template"),
                "isActive": row.get::<bool, _>("is_active"),
                "createdAt": row.get::<chrono::NaiveDateTime, _>("created_at"),
            });
            (
                StatusCode::OK,
                ApiResponse::success(v, "模板已更新"),
            )
        }
        Ok(None) => (
            // 契约约定：业务层未找到一律 HTTP200 + 内层 code=404，避免被探测误判为路由缺失
            StatusCode::OK,
            ApiResponse::<Value>::not_found("模板不存在"),
        ),
        Err(e) => {
            tracing::error!("更新模板失败: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::<Value>::server_error("更新模板失败"),
            )
        }
    }
}
