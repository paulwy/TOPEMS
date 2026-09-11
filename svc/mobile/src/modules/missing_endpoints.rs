//! 前端页面真实消费但缺失的端点（主题二③ mobile 专项补充）
//! - GET  /inspection/tasks             MobileScanPage:listTasks
//! - GET  /analytics/usage              MobileHomePage:getUsageStats
//! - GET  /user/settings                MobileSettingsPage:getSettings
//! - GET  /push/config                  PushNotificationPage:getPushConfig
//! - PUT  /push/config                  PushNotificationPage:updatePushConfig
//! - PUT  /push/templates/{id}          PushNotificationPage:updatePushTemplate

#![allow(dead_code)]

use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use serde_json::{json, Value};
use sqlx::{Pool, Postgres, Row};
use uuid::Uuid;

use super::auth_utils::extract_user_id_from_token;
use topems_shared::ApiResponse;

const PUSH_CONFIG_TABLE_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS mobile.push_config (
    tenant_id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID,
    channel_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (tenant_id, user_id)
)"#;

pub async fn list_inspection_tasks(
    headers: HeaderMap,
    State(auth_state): State<topems_shared::AuthState>,
    State(pool): State<Pool<Postgres>>,
) -> impl IntoResponse {
    let _ = extract_user_id_from_token(&headers, &auth_state.jwt_secret);
    let rows = match sqlx::query(
        r#"SELECT id, title, description, patrol_type, status, checked_by, checked_at, created_at
           FROM mobile.patrol_records
           WHERE deleted_at IS NULL
           ORDER BY created_at DESC"#,
    )
    .fetch_all(&pool)
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            tracing::error!("查询巡检任务失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<Value>::error(500, "查询巡检任务失败")),
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
                "checkedAt": r.get::<Option<chrono::NaiveDateTime>, _>("checked_at"),
                "createdAt": r.get::<chrono::NaiveDateTime, _>("created_at"),
            })
        })
        .collect();
    (
        StatusCode::OK,
        Json(ApiResponse::success(json!(tasks), "巡检任务列表")),
    )
}

pub async fn get_usage_stats(
    headers: HeaderMap,
    State(auth_state): State<topems_shared::AuthState>,
    State(pool): State<Pool<Postgres>>,
) -> impl IntoResponse {
    let _ = extract_user_id_from_token(&headers, &auth_state.jwt_secret);
    let stats = sqlx::query(
        r#"SELECT
             (SELECT COUNT(*) FROM mobile.mobile_tasks WHERE deleted_at IS NULL) AS task_count,
             (SELECT COUNT(*) FROM mobile.mobile_attendance) AS attendance_count,
             (SELECT COUNT(*) FROM mobile.patrol_records WHERE deleted_at IS NULL) AS patrol_count,
             (SELECT COUNT(*) FROM mobile.push_notifications) AS notification_count"#,
    )
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
    (StatusCode::OK, Json(ApiResponse::success(v, "使用量统计")))
}

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
    (
        StatusCode::OK,
        Json(ApiResponse::success(settings, "用户设置")),
    )
}

pub async fn get_push_config(
    headers: HeaderMap,
    State(auth_state): State<topems_shared::AuthState>,
    State(pool): State<Pool<Postgres>>,
) -> impl IntoResponse {
    let _ = extract_user_id_from_token(&headers, &auth_state.jwt_secret);
    if let Err(e) = sqlx::query(PUSH_CONFIG_TABLE_SQL).execute(&pool).await {
        tracing::error!("初始化 push_config 表失败: {}", e);
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::<Value>::error(500, "初始化失败")),
        );
    }
    let row = sqlx::query(r#"SELECT channel_config FROM mobile.push_config LIMIT 1"#)
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
    (StatusCode::OK, Json(ApiResponse::success(v, "推送配置")))
}

pub async fn update_push_config(
    headers: HeaderMap,
    State(auth_state): State<topems_shared::AuthState>,
    State(pool): State<Pool<Postgres>>,
    Json(payload): Json<Value>,
) -> impl IntoResponse {
    let _ = extract_user_id_from_token(&headers, &auth_state.jwt_secret);
    if let Err(e) = sqlx::query(PUSH_CONFIG_TABLE_SQL).execute(&pool).await {
        tracing::error!("初始化 push_config 表失败: {}", e);
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse::<Value>::error(500, "初始化失败")),
        );
    }
    match sqlx::query(
        r#"INSERT INTO mobile.push_config (channel_config, updated_at)
           VALUES ($1, NOW())
           ON CONFLICT (tenant_id, user_id) DO UPDATE SET channel_config = EXCLUDED.channel_config, updated_at = NOW()"#,
    )
    .bind(&payload)
    .execute(&pool)
    .await
    {
        Ok(_) => (
            StatusCode::OK,
            Json(ApiResponse::success(payload, "推送配置已保存")),
        ),
        Err(e) => {
            tracing::error!("保存推送配置失败: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<Value>::error(500, "保存推送配置失败")),
            )
        }
    }
}

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
           WHERE id = $1
           RETURNING id, name, template_type, title_template, body_template, is_active, created_at"#,
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
                "templateType": row.get::<String, _>("template_type"),
                "titleTemplate": row.get::<String, _>("title_template"),
                "bodyTemplate": row.get::<String, _>("body_template"),
                "isActive": row.get::<bool, _>("is_active"),
                "createdAt": row.get::<chrono::NaiveDateTime, _>("created_at"),
            });
            (
                StatusCode::OK,
                Json(ApiResponse::success(v, "模板已更新")),
            )
        }
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(ApiResponse::<Value>::error(404, "模板不存在")),
        ),
        Err(e) => {
            tracing::error!("更新模板失败: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<Value>::error(500, "更新模板失败")),
            )
        }
    }
}
