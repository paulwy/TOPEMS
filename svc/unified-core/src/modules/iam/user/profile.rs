use crate::AppState;
use axum::Extension;
use axum::{extract::State, Json};
use topems_shared_auth::auth::Claims;
use topems_shared_auth::service::issue_service_token;

use super::models::{UserResponse, UserRow};

pub async fn get_preferences(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM user get_preferences called for user: {}", claims.sub);

    // 拆分前置（database-split-plan §3 前置条件 2）：不再直读 portal.user_preferences，
    // 改走 portal 偏好接口（service token 认证）；portal 不可用时回退默认值。
    let (ok, data) = call_portal_preferences(&state, &claims.sub, "GET", None).await;

    // 默认值（与旧行为一致）
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

    if ok {
        if let Some(d) = data {
            if let Some(v) = d.get("notification_settings") {
                notification_settings = v.clone();
            }
            if let Some(v) = d.get("shortcuts") {
                shortcuts = v.clone();
            }
            if let Some(v) = d.get("language") {
                language = v.clone();
            }
            if let Some(v) = d.get("timezone") {
                timezone = v.clone();
            }
        }
    } else {
        tracing::warn!(
            "portal preferences unavailable for {}, fallback to defaults",
            claims.sub
        );
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

    // 拆分前置：不再直写 portal.user_preferences，改走 portal 偏好写接口（service token）。
    let (ok, _) = call_portal_preferences(&state, &claims.sub, "PUT", Some(&payload)).await;
    if !ok {
        tracing::error!(
            "save preferences failed: portal service unavailable for {}",
            claims.sub
        );
        return Json(topems_shared_core::response::error_value(
            500,
            "保存偏好失败：portal 服务不可用",
        ));
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
            return Json(topems_shared_core::response::error_value(
                400,
                "无效的用户ID",
            ));
        }
    };

    let user: Option<UserRow> = sqlx::query_as(
        "SELECT id, username, email, full_name, status, is_superuser, created_at FROM public.core_users WHERE id = $1",
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
                topems_shared_auth::auth::get_permissions()
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
            Json(topems_shared_core::response::error_value(404, "用户不存在"))
        }
    }
}

/// 调用 portal 偏好接口（service token 认证）。
///
/// 拆分前置（database-split-plan §3 前置条件 2）：unified-core IAM 聚合用户偏好
/// 改走 portal 服务 API（`/api/portal/preferences`），不再直读 `portal.user_preferences`。
/// 返回 `(ok, Option<data>)`——`ok=false` 表示 portal 不可用/失败（调用方回退默认值）。
async fn call_portal_preferences(
    state: &AppState,
    user_id: &str,
    method: &str,
    payload: Option<&serde_json::Value>,
) -> (bool, Option<serde_json::Value>) {
    let Ok(token) = issue_service_token(
        &state.auth_state.jwt_secret,
        "unified-core",
        &["portal:admin"],
        None,
    ) else {
        return (false, None);
    };

    let portal_url = std::env::var("PORTAL_SERVICE_URL")
        .unwrap_or_else(|_| "http://localhost:18050".to_string());
    let url = format!(
        "{}/api/portal/preferences?user_id={}",
        portal_url.trim_end_matches('/'),
        user_id
    );
    let client = reqwest::Client::new();

    let resp = if method == "GET" {
        client.get(&url).bearer_auth(&token).send().await
    } else {
        client
            .put(&url)
            .bearer_auth(&token)
            .json(payload.unwrap_or(&serde_json::Value::Null))
            .send()
            .await
    };

    match resp {
        Ok(r) if r.status().is_success() => match r.json::<serde_json::Value>().await {
            Ok(v) => (true, v.get("data").cloned()),
            Err(_) => (false, None),
        },
        _ => (false, None),
    }
}
