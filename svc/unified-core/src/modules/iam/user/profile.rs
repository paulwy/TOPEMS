use crate::AppState;
use axum::Extension;
use axum::{extract::State, Json};
use topems_shared::Claims;

use super::models::{PreferenceRow, UserResponse, UserRow};

pub async fn get_preferences(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM user get_preferences called for user: {}", claims.sub);

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
    let mut language = "zh-CN".to_string();
    let mut timezone = "Asia/Shanghai".to_string();

    let notification_row: Option<PreferenceRow> = sqlx::query_as(
        "SELECT preference_value FROM portal.user_preferences WHERE user_id = $1 AND preference_key = 'notification_settings'"
    )
    .bind(&claims.sub)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or_else(|e| {
        tracing::warn!("Failed to query notification_settings: {}", e);
        None
    });

    if let Some(row) = notification_row {
        if let Ok(value) = serde_json::from_value::<serde_json::Value>(row.preference_value) {
            notification_settings = value;
        }
    }

    let shortcuts_row: Option<PreferenceRow> = sqlx::query_as(
        "SELECT preference_value FROM portal.user_preferences WHERE user_id = $1 AND preference_key = 'shortcuts'"
    )
    .bind(&claims.sub)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or_else(|e| {
        tracing::warn!("Failed to query shortcuts: {}", e);
        None
    });

    if let Some(row) = shortcuts_row {
        if let Ok(value) = serde_json::from_value::<serde_json::Value>(row.preference_value) {
            shortcuts = value;
        }
    }

    let language_row: Option<PreferenceRow> = sqlx::query_as(
        "SELECT preference_value FROM portal.user_preferences WHERE user_id = $1 AND preference_key = 'language'"
    )
    .bind(&claims.sub)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or_else(|e| {
        tracing::warn!("Failed to query language: {}", e);
        None
    });

    if let Some(row) = language_row {
        if let Ok(value) = serde_json::from_value::<String>(row.preference_value) {
            language = value;
        }
    }

    let timezone_row: Option<PreferenceRow> = sqlx::query_as(
        "SELECT preference_value FROM portal.user_preferences WHERE user_id = $1 AND preference_key = 'timezone'"
    )
    .bind(&claims.sub)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or_else(|e| {
        tracing::warn!("Failed to query timezone: {}", e);
        None
    });

    if let Some(row) = timezone_row {
        if let Ok(value) = serde_json::from_value::<String>(row.preference_value) {
            timezone = value;
        }
    }

    Json(serde_json::json!({
        "success": true,
        "message": "获取用户偏好设置成功",
        "data": {
            "notification_settings": notification_settings,
            "shortcuts": shortcuts,
            "language": language,
            "timezone": timezone
        },
        "code": 200
    }))
}

pub async fn update_preferences(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "IAM user update_preferences called for user: {} with payload: {:?}",
        claims.sub,
        payload
    );

    if let Some(shortcuts) = payload.get("shortcuts") {
        let result = sqlx::query(
            r#"
            INSERT INTO portal.user_preferences (user_id, preference_key, preference_value, updated_at)
            VALUES ($1, 'shortcuts', $2, NOW())
            ON CONFLICT (user_id, preference_key)
            DO UPDATE SET preference_value = $2, updated_at = NOW()
            "#
        )
        .bind(&claims.sub)
        .bind(shortcuts)
        .execute(&state.pool)
        .await;

        if let Err(e) = result {
            tracing::error!("Failed to save shortcuts: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": format!("保存快捷方式失败: {}", e),
                "data": null,
                "code": 500
            }));
        }
    }

    if let Some(notification_settings) = payload.get("notification_settings") {
        let result = sqlx::query(
            r#"
            INSERT INTO portal.user_preferences (user_id, preference_key, preference_value, updated_at)
            VALUES ($1, 'notification_settings', $2, NOW())
            ON CONFLICT (user_id, preference_key)
            DO UPDATE SET preference_value = $2, updated_at = NOW()
            "#
        )
        .bind(&claims.sub)
        .bind(notification_settings)
        .execute(&state.pool)
        .await;

        if let Err(e) = result {
            tracing::error!("Failed to save notification_settings: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": format!("保存通知设置失败: {}", e),
                "data": null,
                "code": 500
            }));
        }
    }

    if let Some(language) = payload.get("language") {
        let result = sqlx::query(
            r#"
            INSERT INTO portal.user_preferences (user_id, preference_key, preference_value, updated_at)
            VALUES ($1, 'language', $2, NOW())
            ON CONFLICT (user_id, preference_key)
            DO UPDATE SET preference_value = $2, updated_at = NOW()
            "#
        )
        .bind(&claims.sub)
        .bind(language)
        .execute(&state.pool)
        .await;

        if let Err(e) = result {
            tracing::error!("Failed to save language: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": format!("保存语言设置失败: {}", e),
                "data": null,
                "code": 500
            }));
        }
    }

    if let Some(timezone) = payload.get("timezone") {
        let result = sqlx::query(
            r#"
            INSERT INTO portal.user_preferences (user_id, preference_key, preference_value, updated_at)
            VALUES ($1, 'timezone', $2, NOW())
            ON CONFLICT (user_id, preference_key)
            DO UPDATE SET preference_value = $2, updated_at = NOW()
            "#
        )
        .bind(&claims.sub)
        .bind(timezone)
        .execute(&state.pool)
        .await;

        if let Err(e) = result {
            tracing::error!("Failed to save timezone: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": format!("保存时区设置失败: {}", e),
                "data": null,
                "code": 500
            }));
        }
    }

    tracing::info!(
        "User preferences updated successfully for user: {}",
        claims.sub
    );
    Json(serde_json::json!({
        "success": true,
        "message": "保存用户偏好设置成功",
        "data": payload,
        "code": 200
    }))
}

pub async fn get_current_user(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM user get_current_user called for user: {}", claims.sub);

    let user_id = match sqlx::types::Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("Invalid user ID format: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "无效的用户ID",
                "data": null,
                "code": 400
            }));
        }
    };

    let user: Option<UserRow> = sqlx::query_as(
        "SELECT id, username, email, full_name, status, is_superuser, created_at FROM core_users WHERE id = $1",
    )
    .bind(user_id)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or_else(|e| {
        tracing::error!("Database query failed: {}", e);
        None
    });

    match user {
        Some(u) => {
            let roles = if u.is_superuser {
                vec!["admin".to_string(), "user".to_string()]
            } else {
                vec!["user".to_string()]
            };

            let permissions = if u.is_superuser {
                topems_shared::auth::get_permissions()
                    .iter()
                    .map(|p| p.id.clone())
                    .collect()
            } else {
                vec![
                    "iam:users_read".to_string(),
                    "iam:roles_read".to_string(),
                    "iam:permissions_read".to_string(),
                    "iam:audit_read".to_string(),
                    "iam:system_read".to_string(),
                    "iam:dictionaries_read".to_string(),
                    "iam:plugins_read".to_string(),
                ]
            };

            let user_response = UserResponse {
                id: u.id.to_string(),
                username: u.username,
                email: u.email,
                full_name: u.full_name,
                role: if u.is_superuser {
                    "admin".to_string()
                } else {
                    "user".to_string()
                },
                roles,
                permissions,
                is_active: u.status == "active",
                is_superuser: u.is_superuser,
                created_at: u.created_at.map(|t| t.to_string()),
            };

            Json(serde_json::json!({
                "success": true,
                "message": "获取当前用户成功",
                "data": user_response,
                "code": 200
            }))
        }
        None => {
            tracing::warn!("User not found: {}", claims.sub);
            Json(serde_json::json!({
                "success": false,
                "message": "用户不存在",
                "data": null,
                "code": 404
            }))
        }
    }
}
