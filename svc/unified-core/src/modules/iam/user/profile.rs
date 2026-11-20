use crate::AppState;
use axum::Extension;
use axum::{extract::State, Json};
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;

use super::models::{resolve_user_grants, UserResponse, UserRow};

/// D2 U2 环3（决策 C）：用户偏好主数据本地化到 unified-core IAM 域（`core.user_preferences`）。
///
/// 原实现 `call_portal_preferences()` 回调 portal 的 `/api/portal/preferences`，使 unified-core
/// 的偏好读写依赖 portal 在线，与 portal→unified-core 的 IAM 聚合构成双向 HTTP 环。
/// 本地化后：偏好读写直读本库，**停掉 portal 不影响偏好接口**（无任何对 portal 的运行时调用）；
/// portal 侧偏好接口改为只读代理本服务（见 svc/portal/src/modules/preferences.rs）。
/// 表结构由迁移链权威创建（C-1 已移除运行时自建表，迁移权威唯一仲裁）。
pub async fn get_preferences(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
) -> Json<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return Json(topems_shared_core::response::error_value(
            500,
            "数据库事务上下文缺失",
        ));
    };
    let mut rls_scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("打开 IAM 用户作用域失败: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("查询用户失败: {}", e),
            ));
        }
    };

    tracing::info!("IAM user get_preferences called for user: {}", claims.sub);

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

    if let Ok(user_id) = uuid::Uuid::parse_str(&claims.sub) {
        let rows: Vec<(String, serde_json::Value)> = sqlx::query_as(
            "SELECT preference_key, preference_value FROM core.user_preferences \
             WHERE user_id = $1 AND deleted_at IS NULL",
        )
        .bind(user_id)
        .fetch_all(&mut rls_scope)
        .await
        .unwrap_or_else(|e| {
            tracing::warn!("read local preferences failed for {}: {}", claims.sub, e);
            Vec::new()
        });

        for (key, value) in rows {
            match key.as_str() {
                "notification_settings" => notification_settings = value,
                "shortcuts" => shortcuts = value,
                "language" => language = value,
                "timezone" => timezone = value,
                _ => {}
            }
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "IAM user update_preferences called for user: {} with payload: {:?}",
        claims.sub,
        payload
    );

    let user_id = match uuid::Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return Json(topems_shared_core::response::error_value(
                400,
                "无效的用户ID",
            ));
        }
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return Json(topems_shared_core::response::error_value(
            500,
            "数据库事务上下文缺失",
        ));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("初始化偏好保存事务作用域失败: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                "初始化偏好保存事务作用域失败",
            ));
        }
    };

    const KEYS: [&str; 4] = ["shortcuts", "notification_settings", "language", "timezone"];
    for key in KEYS {
        let Some(value) = payload.get(key) else {
            continue;
        };
        let result = sqlx::query(
            "INSERT INTO core.user_preferences (user_id, preference_key, preference_value, updated_at, tenant_id) \
             VALUES ($1, $2, $3, NOW(), $4) \
             ON CONFLICT (user_id, preference_key) \
             DO UPDATE SET preference_value = $3, updated_at = NOW()",
        )
        .bind(user_id)
        .bind(key)
        .bind(value)
        .bind(claims.tenant_id.as_deref().and_then(|s| uuid::Uuid::parse_str(s).ok()))
        .execute(&mut scope)
        .await;

        if let Err(e) = result {
            tracing::error!("save preference {} failed for {}: {}", key, claims.sub, e);
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("保存偏好 {} 失败", key),
            ));
        }
    }

    // 偏好变更事件（IamUserPreferencesUpdated）：供 portal 只读代理/缓存失效订阅。
    // unified-core 的 Redis EventPublisher 注入属后续接线项；此处先落库 + 日志，事件登记见 event-driven.md。
    tracing::info!(
        "User preferences updated locally for {} (keys: {:?})",
        claims.sub,
        KEYS
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
) -> Json<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return Json(topems_shared_core::response::error_value(
            500,
            "数据库事务上下文缺失",
        ));
    };
    let mut rls_scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("打开 IAM 用户作用域失败: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("查询用户失败: {}", e),
            ));
        }
    };

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
        "SELECT id, username, email, CASE WHEN $2 = 'en' THEN COALESCE(full_name_en, full_name) ELSE full_name END AS full_name, status, is_superuser, created_at FROM iam.users WHERE id = $1",
    )
    .bind(user_id)
    .bind(topems_shared_core::locale::Locale::from_headers(&headers).as_sql())
    .fetch_optional(&mut rls_scope)
    .await
    .unwrap_or_else(|e| {
        tracing::error!("Database query failed: {}", e);
        None
    });

    match user {
        Some(u) => {
            // P0-4：超管返回全量目录（保持原行为）；非超管改为实时 JOIN 规范化授权表，
            // 不再硬编码 7 个 C 方言码。
            let (roles, permissions) = if u.is_superuser {
                (
                    vec!["admin".to_string(), "user".to_string()],
                    topems_shared_auth::auth::get_permissions()
                        .iter()
                        .map(|p| p.id.clone())
                        .collect(),
                )
            } else {
                resolve_user_grants(&state.db, u.id).await
            };

            let user_response = UserResponse {
                id: u.id.to_string(),
                username: u.username,
                email: u.email,
                full_name: u.full_name,
                role: if u.is_superuser {
                    "admin".to_string()
                } else {
                    roles.first().cloned().unwrap_or_default()
                },
                roles,
                permissions,
                is_active: u.status == "active",
                is_superuser: u.is_superuser,
                created_at: u.created_at,
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
