//! Portal 用户偏好只读接口（服务间内部用）
//!
//! unified-core IAM 的 `get_preferences` 原直读 `portal.user_preferences`，
//! 为物理库拆分铺路（portal→business 库、unified-core→core 库）改走本接口：
//! 本接口以 **service token** 认证（`is_service_claims`），仅平台服务可调，
//! 按 `user_id` 返回该用户全部偏好（缺失 key 用默认值，与旧行为一致）。

use axum::{
    extract::{Extension, Query, State},
    Json,
};
use serde::Deserialize;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::service::is_service_claims;
use topems_shared_core::response::{api_error, ApiResponse};
use uuid::Uuid;

use crate::shared::AppState;

#[derive(Deserialize)]
pub struct PreferenceQuery {
    /// 被代理的用户 ID（unified-core 等服务调用时传）；不传则用 claims.sub
    pub user_id: Option<String>,
}

#[derive(sqlx::FromRow)]
struct PreferenceRow {
    preference_key: String,
    preference_value: serde_json::Value,
}

/// GET /api/portal/preferences?user_id=xxx
/// 仅服务身份（is_service_claims）可访问；返回 4 个偏好 key 的完整结构。
pub async fn get_user_preferences(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<PreferenceQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    // 仅服务身份可调——该接口不面向普通用户（用户偏好经 IAM 接口聚合）
    if !is_service_claims(&claims) {
        return Json(api_error(403, "仅服务身份可访问偏好接口"));
    }

    let user_id = query.user_id.as_deref().unwrap_or(&claims.sub);
    let Ok(user_uuid) = Uuid::parse_str(user_id) else {
        return Json(api_error(400, &format!("无效的 user_id: {}", user_id)));
    };

    // 默认值（与 unified-core get_preferences 旧行为保持一致）
    let mut notification_settings = serde_json::json!({
        "email_notifications": true,
        "push_notifications": true,
        "sms_notifications": false,
        "daily_digest": true
    });
    let mut shortcuts = serde_json::json!([
        {"id": "1", "title": "仪表盘", "icon": "Activity", "path": "/dashboard"},
        {"id": "2", "title": "文档中心", "icon": "FileText", "path": "/documents"}
    ]);
    let mut language = serde_json::Value::String("zh-CN".into());
    let mut timezone = serde_json::Value::String("Asia/Shanghai".into());

    let rows: Vec<PreferenceRow> = match sqlx::query_as(
        "SELECT preference_key, preference_value FROM portal.user_preferences \
         WHERE user_id = $1 AND deleted_at IS NULL",
    )
    .bind(user_id)
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            tracing::warn!("preferences query failed for {}: {}", user_id, e);
            return Json(api_error(500, "查询用户偏好失败"));
        }
    };

    for row in rows {
        match row.preference_key.as_str() {
            "notification_settings" => {
                if let Ok(v) = serde_json::from_value::<serde_json::Value>(row.preference_value) {
                    notification_settings = v;
                }
            }
            "shortcuts" => {
                if let Ok(v) = serde_json::from_value::<serde_json::Value>(row.preference_value) {
                    shortcuts = v;
                }
            }
            "language" => language = row.preference_value,
            "timezone" => timezone = row.preference_value,
            _ => {}
        }
    }

    Json(ApiResponse::success(
        serde_json::json!({
            "notification_settings": notification_settings,
            "shortcuts": shortcuts,
            "language": language,
            "timezone": timezone,
        }),
        "获取用户偏好设置成功",
    ))
}

/// PUT /api/portal/preferences?user_id=xxx
/// 仅服务身份可访问；批量 upsert 偏好（shortcuts/notification_settings/language/timezone）。
pub async fn update_user_preferences(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<PreferenceQuery>,
    Json(payload): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    if !is_service_claims(&claims) {
        return Json(api_error(403, "仅服务身份可访问偏好接口"));
    }

    let user_id = query.user_id.as_deref().unwrap_or(&claims.sub);
    let Ok(user_uuid) = Uuid::parse_str(user_id) else {
        return Json(api_error(400, &format!("无效的 user_id: {}", user_id)));
    };

    const KEYS: [&str; 4] = ["shortcuts", "notification_settings", "language", "timezone"];
    for key in KEYS {
        let Some(value) = payload.get(key) else { continue };
        let result = sqlx::query(
            "INSERT INTO portal.user_preferences (user_id, preference_key, preference_value, updated_at) \
             VALUES ($1, $2, $3, NOW()) \
             ON CONFLICT (user_id, preference_key) \
             DO UPDATE SET preference_value = $3, updated_at = NOW()",
        )
        .bind(&user_uuid)
        .bind(key)
        .bind(value)
        .execute(&state.pool)
        .await;

        if let Err(e) = result {
            tracing::warn!("save preference {} failed for {}: {}", key, user_id, e);
            return Json(api_error(500, &format!("保存偏好 {} 失败", key)));
        }
    }

    Json(ApiResponse::success(serde_json::json!({"ok": true}), "保存用户偏好成功"))
}
