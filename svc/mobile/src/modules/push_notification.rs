use axum::{
    extract::{Extension, Json, Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};
use topems_shared_boundary::only_own_schema_query;
use topems_shared_db::scope::Db;
use uuid::Uuid;

use super::auth_utils::{extract_bearer_token, extract_user_id_from_token};
use super::push_status::PushNotificationStatus;
use crate::db::repository::*;
use crate::models::{CreatePushDevice, CreatePushNotification, PushNotification};
use topems_shared_auth::auth::{verify_jwt_token, AuthState, Claims};
use topems_shared_auth::middleware::tenant::RlsTxnCell;
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PushStats {
    pub total_sent: i64,
    pub delivered_count: i64,
    pub clicked_count: i64,
    pub delivery_rate: f64,
    pub click_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SendNotificationRequest {
    pub title: String,
    pub body: String,
    pub notification_type: String,
    pub data: Option<serde_json::Value>,
    pub target_type: String,
    pub target_ids: Vec<String>,
    pub template_id: Option<Uuid>,
    pub template_params: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SendNotificationResponse {
    pub notification_id: Uuid,
    pub status: String,
    pub sent_count: i32,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PushNotificationListResponse {
    pub items: Vec<PushNotification>,
    pub total: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePushTemplateRequest {
    pub name: String,
    pub title_template: String,
    pub body_template: String,
    pub notification_type: String,
    pub description: Option<String>,
}

#[utoipa::path(
    post,
    path = "/api/mobile/push/devices/register",
    tag = "mobile",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
pub async fn register_device(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Json(payload): Json<CreatePushDevice>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let user_id_str = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                ApiResponse::bad_request("无效的用户ID"),
            );
        }
    };

    let valid_platforms = ["ios", "android"];
    if !valid_platforms.contains(&payload.platform.as_str()) {
        return (
            StatusCode::BAD_REQUEST,
            ApiResponse::bad_request("无效的平台类型"),
        );
    }

    // 租户绑定复制 middleware 超管豁免语义（同 offline_sync）：
    // 超管绑 None（SQL NULL，命中 tenant_isolation_* 的 `tenant_id IS NULL` 分支），
    // 普通用户绑 claims.tenant_id 解析值；随机/nil uuid 在 nil 上下文会被 RLS 拒绝。
    let tenant_id: Option<Uuid> = extract_bearer_token(&headers)
        .and_then(|t| verify_jwt_token(&t, &auth_state.jwt_secret).ok())
        .and_then(|c| {
            if c.is_superuser {
                None
            } else {
                c.tenant_id.and_then(|t| Uuid::parse_str(&t).ok())
            }
        });
    let device = match db_register_push_device(&mut scope, tenant_id, user_id, payload).await {
        Ok(d) => d,
        Err(e) => {
            tracing::error!("注册设备失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("注册设备失败"),
            );
        }
    };

    let __mobile_response =
        { (StatusCode::OK, ApiResponse::success(device, "设备注册成功")) };
    let _ = scope.commit().await;
    __mobile_response
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:push:read"])),
    path = "/push/devices",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "push"
)]
pub async fn get_devices(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let user_id_str = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                ApiResponse::bad_request("无效的用户ID"),
            );
        }
    };

    let __mobile_response = {
        let devices = match db_get_push_devices(&mut scope, Some(user_id)).await {
            Ok(d) => d,
            Err(e) => {
                tracing::error!("获取设备列表失败: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    ApiResponse::server_error("获取设备列表失败"),
                );
            }
        };

        (
            StatusCode::OK,
            ApiResponse::success(devices, "获取设备列表成功"),
        )
    };
    let _ = scope.commit().await;
    __mobile_response
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mobile:push:write"])),
    path = "/push/notifications",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "push"
)]
#[allow(
    clippy::as_conversions,
    clippy::cast_possible_truncation,
    clippy::cast_possible_wrap
)]
pub async fn send_notification(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Json(payload): Json<SendNotificationRequest>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let _ = extract_user_id_from_token(&headers, &auth_state.jwt_secret);

    let mut title = payload.title.clone();
    let mut body = payload.body.clone();

    if let Some(template_id) = payload.template_id {
        let templates = match db_get_push_templates(&mut scope).await {
            Ok(t) => t,
            Err(e) => {
                tracing::error!("获取模板失败: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    ApiResponse::server_error("获取模板失败"),
                );
            }
        };

        if let Some(template) = templates.into_iter().find(|t| t.id == template_id) {
            if let Some(params) = &payload.template_params {
                title = render_template(&template.title_template, params);
                body = render_template(&template.body_template, params);
            } else {
                title = template.title_template;
                body = template.body_template;
            }
        }
    }

    let create_data = CreatePushNotification {
        title,
        body,
        notification_type: payload.notification_type,
        data: payload.data,
        target_type: payload.target_type,
        target_ids: payload.target_ids.clone(),
    };

    let tenant_id: Option<Uuid> = extract_bearer_token(&headers)
        .and_then(|t| verify_jwt_token(&t, &auth_state.jwt_secret).ok())
        .and_then(|c| {
            if c.is_superuser {
                None
            } else {
                c.tenant_id.and_then(|t| Uuid::parse_str(&t).ok())
            }
        });
    let notification = match db_create_push_notification(&mut scope, tenant_id, create_data).await {
        Ok(n) => n,
        Err(e) => {
            tracing::error!("创建推送通知失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("创建推送通知失败"),
            );
        }
    };

    let target_count = payload.target_ids.len() as i32;

    if let Err(e) =
        db_update_push_notification_stats(&mut scope, notification.id, target_count, 0, 0).await
    {
        tracing::error!("更新推送统计失败: {}", e);
    }

    let __mobile_response = {
        let response = SendNotificationResponse {
            notification_id: notification.id,
            status: "sent".to_string(),
            sent_count: target_count,
            message: "推送通知已发送".to_string(),
        };

        (
            StatusCode::OK,
            ApiResponse::success(response, "推送通知已发送"),
        )
    };
    let _ = scope.commit().await;
    __mobile_response
}

fn render_template(template: &str, params: &serde_json::Value) -> String {
    let mut result = template.to_string();
    if let serde_json::Value::Object(obj) = params {
        for (key, value) in obj {
            let placeholder = format!("{{{{{}}}}}", key);
            let value_str = value.as_str().unwrap_or("");
            result = result.replace(&placeholder, value_str);
        }
    }
    result
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mobile:push:write"])),
    path = "/push/notifications/broadcast",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "push"
)]
#[allow(
    clippy::as_conversions,
    clippy::cast_possible_truncation,
    clippy::cast_possible_wrap
)]
pub async fn send_broadcast(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Json(payload): Json<SendNotificationRequest>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let _ = extract_user_id_from_token(&headers, &auth_state.jwt_secret);

    let devices = match db_get_push_devices(&mut scope, None).await {
        Ok(d) => d,
        Err(e) => {
            tracing::error!("获取所有设备失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("获取设备列表失败"),
            );
        }
    };

    let target_ids: Vec<String> = devices.iter().map(|d| d.device_token.clone()).collect();

    let mut title = payload.title.clone();
    let mut body = payload.body.clone();

    if let Some(template_id) = payload.template_id {
        let templates = match db_get_push_templates(&mut scope).await {
            Ok(t) => t,
            Err(e) => {
                tracing::error!("获取模板失败: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    ApiResponse::server_error("获取模板失败"),
                );
            }
        };

        if let Some(template) = templates.into_iter().find(|t| t.id == template_id) {
            if let Some(params) = &payload.template_params {
                title = render_template(&template.title_template, params);
                body = render_template(&template.body_template, params);
            } else {
                title = template.title_template;
                body = template.body_template;
            }
        }
    }

    let create_data = CreatePushNotification {
        title,
        body,
        notification_type: payload.notification_type,
        data: payload.data,
        target_type: "broadcast".to_string(),
        target_ids: target_ids.clone(),
    };

    let tenant_id: Option<Uuid> = extract_bearer_token(&headers)
        .and_then(|t| verify_jwt_token(&t, &auth_state.jwt_secret).ok())
        .and_then(|c| {
            if c.is_superuser {
                None
            } else {
                c.tenant_id.and_then(|t| Uuid::parse_str(&t).ok())
            }
        });
    let notification = match db_create_push_notification(&mut scope, tenant_id, create_data).await {
        Ok(n) => n,
        Err(e) => {
            tracing::error!("创建推送通知失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("创建推送通知失败"),
            );
        }
    };

    let target_count = target_ids.len() as i32;

    if let Err(e) =
        db_update_push_notification_stats(&mut scope, notification.id, target_count, 0, 0).await
    {
        tracing::error!("更新推送统计失败: {}", e);
    }

    let __mobile_response = {
        let response = SendNotificationResponse {
            notification_id: notification.id,
            status: "sent".to_string(),
            sent_count: target_count,
            message: "广播推送已发送".to_string(),
        };

        (
            StatusCode::OK,
            ApiResponse::success(response, "广播推送已发送"),
        )
    };
    let _ = scope.commit().await;
    __mobile_response
}

#[utoipa::path(
    get,
    path = "/api/mobile/push/notifications",
    tag = "mobile",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
pub async fn get_notification_list(
    headers: HeaderMap,
    Extension(_claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Query(params): Query<NotificationListQuery>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let _ = extract_user_id_from_token(&headers, &auth_state.jwt_secret);

    let page = params.page.unwrap_or(1);
    let size = params.size.unwrap_or(20);
    let offset = (page - 1) * size;

    let query =
        sqlx::query(only_own_schema_query!("mobile", "SELECT id, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid) AS tenant_id, title, body, notification_type, data, target_type, target_ids, CASE WHEN status = 'active' THEN 'pending' ELSE status END AS status, sent_count, delivered_count, clicked_count, created_at, sent_at FROM mobile.push_notifications WHERE status IN ('pending','sent','failed','active') ORDER BY created_at DESC LIMIT $1 OFFSET $2"))
            .bind(size)
            .bind(offset);

    let items = match query.fetch_all(&mut scope).await {
        Ok(rows) => rows
            .into_iter()
            .filter_map(|row| PushNotification::from_row(&row).ok())
            .collect(),
        Err(e) => {
            tracing::error!("查询推送列表失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("查询推送列表失败"),
            );
        }
    };

    let total = match sqlx::query_scalar(only_own_schema_query!(
        "mobile",
        "SELECT COUNT(*) FROM mobile.push_notifications WHERE status IN ('pending','sent','failed','active')"
    ))
    .fetch_one(&mut scope)
    .await
    {
        Ok(c) => c,
        Err(_) => 0,
    };

    let response = PushNotificationListResponse { items, total };

    (
        StatusCode::OK,
        ApiResponse::success(response, "获取推送列表成功"),
    )
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationListQuery {
    pub page: Option<i64>,
    pub size: Option<i64>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:push:read"])),
    path = "/push/notifications/stats",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "push"
)]
#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
pub async fn get_notification_stats(
    headers: HeaderMap,
    Extension(_claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let _ = extract_user_id_from_token(&headers, &auth_state.jwt_secret);

    let sent_states: Vec<String> = vec![PushNotificationStatus::Sent.as_db_str().to_string()];
    let total_sent: i64 = match sqlx::query_scalar(only_own_schema_query!(
        "mobile",
        "SELECT COALESCE(SUM(sent_count), 0) FROM mobile.push_notifications WHERE status = ANY($1::text[])"
    ))
    .bind(&sent_states)
    .fetch_one(&mut scope)
    .await
    {
        Ok(c) => c,
        Err(_) => 0,
    };

    let delivered_count: i64 = match sqlx::query_scalar(
        only_own_schema_query!("mobile", "SELECT COALESCE(SUM(delivered_count), 0) FROM mobile.push_notifications WHERE status = ANY($1::text[])"),
    )
    .bind(&sent_states)
    .fetch_one(&mut scope)
    .await
    {
        Ok(c) => c,
        Err(_) => 0,
    };

    let clicked_count: i64 = match sqlx::query_scalar(
        only_own_schema_query!("mobile", "SELECT COALESCE(SUM(clicked_count), 0) FROM mobile.push_notifications WHERE status = ANY($1::text[])"),
    )
    .bind(&sent_states)
    .fetch_one(&mut scope)
    .await
    {
        Ok(c) => c,
        Err(_) => 0,
    };

    let delivery_rate = if total_sent > 0 {
        (delivered_count as f64 / total_sent as f64) * 100.0
    } else {
        0.0
    };

    let click_rate = if delivered_count > 0 {
        (clicked_count as f64 / delivered_count as f64) * 100.0
    } else {
        0.0
    };

    let __mobile_response = {
        let stats = PushStats {
            total_sent,
            delivered_count,
            clicked_count,
            delivery_rate,
            click_rate,
        };

        (
            StatusCode::OK,
            ApiResponse::success(stats, "获取推送统计成功"),
        )
    };
    let _ = scope.commit().await;
    __mobile_response
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:push:read"])),
    path = "/push/templates",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "push"
)]
pub async fn get_templates(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let _ = extract_user_id_from_token(&headers, &auth_state.jwt_secret);

    let __mobile_response = {
        let templates = match db_get_push_templates(&mut scope).await {
            Ok(t) => t,
            Err(e) => {
                tracing::error!("获取模板列表失败: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    ApiResponse::server_error("获取模板列表失败"),
                );
            }
        };

        (
            StatusCode::OK,
            ApiResponse::success(templates, "获取模板列表成功"),
        )
    };
    let _ = scope.commit().await;
    __mobile_response
}

#[utoipa::path(
    post,
    path = "/api/mobile/push/templates",
    tag = "mobile",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
pub async fn create_template(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Json(payload): Json<CreatePushTemplateRequest>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let _ = extract_user_id_from_token(&headers, &auth_state.jwt_secret);

    let tenant_id: Option<Uuid> = extract_bearer_token(&headers)
        .and_then(|t| verify_jwt_token(&t, &auth_state.jwt_secret).ok())
        .and_then(|c| {
            if c.is_superuser {
                None
            } else {
                c.tenant_id.and_then(|t| Uuid::parse_str(&t).ok())
            }
        });
    let __mobile_response = {
        let template = match db_create_push_template(
            &mut scope,
            tenant_id,
            &payload.name,
            &payload.title_template,
            &payload.body_template,
            &payload.notification_type,
            payload.description.as_deref(),
        )
        .await
        {
            Ok(t) => t,
            Err(e) => {
                tracing::error!("创建模板失败: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    ApiResponse::server_error("创建模板失败"),
                );
            }
        };

        (
            StatusCode::OK,
            ApiResponse::success(template, "创建模板成功"),
        )
    };
    let _ = scope.commit().await;
    __mobile_response
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:push:read"])),
    path = "/push/notifications/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "push"
)]
pub async fn get_notification_by_id(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let _ = extract_user_id_from_token(&headers, &auth_state.jwt_secret);

    let row = match sqlx::query(only_own_schema_query!("mobile", "SELECT id, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid) AS tenant_id, title, body, notification_type, data, target_type, target_ids, CASE WHEN status = 'active' THEN 'pending' ELSE status END AS status, sent_count, delivered_count, clicked_count, created_at, sent_at FROM mobile.push_notifications WHERE id = $1 AND status IN ('pending','sent','failed','active')"))
        .bind(id)
        .fetch_optional(&mut scope)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("查询推送通知失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("查询推送通知失败"),
            );
        }
    };

    let __mobile_response = {
        if let Some(row) = row {
            let notification = match PushNotification::from_row(&row) {
                Ok(n) => n,
                Err(e) => {
                    tracing::error!("解析推送通知失败: {}", e);
                    return (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        ApiResponse::server_error("解析推送通知失败"),
                    );
                }
            };
            (
                StatusCode::OK,
                ApiResponse::success(notification, "获取推送通知成功"),
            )
        } else {
            // 数据不存在语义：HTTP 200 + 内层 code 404。
            (StatusCode::OK, ApiResponse::not_found("推送通知不存在"))
        }
    };
    let _ = scope.commit().await;
    __mobile_response
}

#[cfg(test)]
mod tests {
    use super::*;

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        // roundtrip verified by JSON comparison
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn push_stats_roundtrip() {
        roundtrip(&PushStats {
            total_sent: 100,
            delivered_count: 90,
            clicked_count: 10,
            delivery_rate: 90.0,
            click_rate: 11.1,
        });
    }

    #[test]
    fn send_notification_request_roundtrip() {
        roundtrip(&SendNotificationRequest {
            title: "t".into(),
            body: "b".into(),
            notification_type: "alert".into(),
            data: None,
            target_type: "user".into(),
            target_ids: vec!["u1".into()],
            template_id: None,
            template_params: None,
        });
    }

    #[test]
    fn send_notification_response_roundtrip() {
        roundtrip(&SendNotificationResponse {
            notification_id: Uuid::new_v4(),
            status: "sent".into(),
            sent_count: 1,
            message: "ok".into(),
        });
    }

    #[test]
    fn push_notification_list_response_roundtrip() {
        roundtrip(&PushNotificationListResponse {
            items: vec![],
            total: 0,
        });
    }

    #[test]
    fn create_push_template_request_roundtrip() {
        roundtrip(&CreatePushTemplateRequest {
            name: "n".into(),
            title_template: "{{name}}".into(),
            body_template: "hello".into(),
            notification_type: "alert".into(),
            description: None,
        });
    }

    #[test]
    fn notification_list_query_roundtrip() {
        roundtrip(&NotificationListQuery {
            page: Some(1),
            size: Some(20),
        });
    }
}
