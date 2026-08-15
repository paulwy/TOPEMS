use axum::{
    extract::{Json, Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use super::auth_utils::extract_user_id_from_token;
use crate::db::repository::*;
use crate::models::{CreatePushDevice, CreatePushNotification, PushNotification};
use topems_shared_auth::auth::AuthState;
use topems_shared_core::response::ApiResponse;

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

pub async fn register_device(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Json(payload): Json<CreatePushDevice>,
) -> impl IntoResponse {
    let user_id_str = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(ApiResponse::error(400, "无效的用户ID")),
            );
        }
    };

    let valid_platforms = ["ios", "android"];
    if !valid_platforms.contains(&payload.platform.as_str()) {
        return (
            StatusCode::BAD_REQUEST,
            Json(ApiResponse::error(400, "无效的平台类型")),
        );
    }

    let tenant_id = Uuid::new_v4();
    let device = match db_register_push_device(&pool, tenant_id, user_id, payload).await {
        Ok(d) => d,
        Err(e) => {
            tracing::error!("注册设备失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "注册设备失败")),
            );
        }
    };

    (
        StatusCode::OK,
        Json(ApiResponse::success(device, "设备注册成功")),
    )
}

pub async fn get_devices(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
) -> impl IntoResponse {
    let user_id_str = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(ApiResponse::error(400, "无效的用户ID")),
            );
        }
    };

    let devices = match db_get_push_devices(&pool, Some(user_id)).await {
        Ok(d) => d,
        Err(e) => {
            tracing::error!("获取设备列表失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "获取设备列表失败")),
            );
        }
    };

    (
        StatusCode::OK,
        Json(ApiResponse::success(devices, "获取设备列表成功")),
    )
}

pub async fn send_notification(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Json(payload): Json<SendNotificationRequest>,
) -> impl IntoResponse {
    let _ = extract_user_id_from_token(&headers, &auth_state.jwt_secret);

    let mut title = payload.title.clone();
    let mut body = payload.body.clone();

    if let Some(template_id) = payload.template_id {
        let templates = match db_get_push_templates(&pool).await {
            Ok(t) => t,
            Err(e) => {
                tracing::error!("获取模板失败: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ApiResponse::error(500, "获取模板失败")),
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

    let tenant_id = Uuid::new_v4();
    let notification = match db_create_push_notification(&pool, tenant_id, create_data).await {
        Ok(n) => n,
        Err(e) => {
            tracing::error!("创建推送通知失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "创建推送通知失败")),
            );
        }
    };

    let target_count = payload.target_ids.len() as i32;

    if let Err(e) =
        db_update_push_notification_stats(&pool, notification.id, target_count, 0, 0).await
    {
        tracing::error!("更新推送统计失败: {}", e);
    }

    let response = SendNotificationResponse {
        notification_id: notification.id,
        status: "sent".to_string(),
        sent_count: target_count,
        message: "推送通知已发送".to_string(),
    };

    (
        StatusCode::OK,
        Json(ApiResponse::success(response, "推送通知已发送")),
    )
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

pub async fn send_broadcast(
    headers: HeaderMap,
    State(_auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Json(payload): Json<SendNotificationRequest>,
) -> impl IntoResponse {
    let _ = extract_user_id_from_token(&headers, &_auth_state.jwt_secret);

    let devices = match db_get_push_devices(&pool, None).await {
        Ok(d) => d,
        Err(e) => {
            tracing::error!("获取所有设备失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "获取设备列表失败")),
            );
        }
    };

    let target_ids: Vec<String> = devices.iter().map(|d| d.device_token.clone()).collect();

    let mut title = payload.title.clone();
    let mut body = payload.body.clone();

    if let Some(template_id) = payload.template_id {
        let templates = match db_get_push_templates(&pool).await {
            Ok(t) => t,
            Err(e) => {
                tracing::error!("获取模板失败: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ApiResponse::error(500, "获取模板失败")),
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

    let tenant_id = Uuid::new_v4();
    let notification = match db_create_push_notification(&pool, tenant_id, create_data).await {
        Ok(n) => n,
        Err(e) => {
            tracing::error!("创建推送通知失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "创建推送通知失败")),
            );
        }
    };

    let target_count = target_ids.len() as i32;

    if let Err(e) =
        db_update_push_notification_stats(&pool, notification.id, target_count, 0, 0).await
    {
        tracing::error!("更新推送统计失败: {}", e);
    }

    let response = SendNotificationResponse {
        notification_id: notification.id,
        status: "sent".to_string(),
        sent_count: target_count,
        message: "广播推送已发送".to_string(),
    };

    (
        StatusCode::OK,
        Json(ApiResponse::success(response, "广播推送已发送")),
    )
}

pub async fn get_notification_list(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Query(params): Query<NotificationListQuery>,
) -> impl IntoResponse {
    let _ = extract_user_id_from_token(&headers, &auth_state.jwt_secret);

    let page = params.page.unwrap_or(1);
    let size = params.size.unwrap_or(20);
    let offset = (page - 1) * size;

    let query =
        sqlx::query("SELECT id, user_id, title, body, notification_type, read_at, created_at FROM push_notifications ORDER BY created_at DESC LIMIT $1 OFFSET $2")
            .bind(size)
            .bind(offset);

    let items = match query.fetch_all(&pool).await {
        Ok(rows) => rows
            .into_iter()
            .filter_map(|row| PushNotification::from_row(&row).ok())
            .collect(),
        Err(e) => {
            tracing::error!("查询推送列表失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "查询推送列表失败")),
            );
        }
    };

    let total = match sqlx::query_scalar("SELECT COUNT(*) FROM push_notifications")
        .fetch_one(&pool)
        .await
    {
        Ok(c) => c,
        Err(_) => 0,
    };

    let response = PushNotificationListResponse { items, total };

    (
        StatusCode::OK,
        Json(ApiResponse::success(response, "获取推送列表成功")),
    )
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationListQuery {
    pub page: Option<i64>,
    pub size: Option<i64>,
}

pub async fn get_notification_stats(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
) -> impl IntoResponse {
    let _ = extract_user_id_from_token(&headers, &auth_state.jwt_secret);

    let total_sent: i64 = match sqlx::query_scalar(
        "SELECT COALESCE(SUM(sent_count), 0) FROM push_notifications WHERE status = 'sent'",
    )
    .fetch_one(&pool)
    .await
    {
        Ok(c) => c,
        Err(_) => 0,
    };

    let delivered_count: i64 = match sqlx::query_scalar(
        "SELECT COALESCE(SUM(delivered_count), 0) FROM push_notifications WHERE status = 'sent'",
    )
    .fetch_one(&pool)
    .await
    {
        Ok(c) => c,
        Err(_) => 0,
    };

    let clicked_count: i64 = match sqlx::query_scalar(
        "SELECT COALESCE(SUM(clicked_count), 0) FROM push_notifications WHERE status = 'sent'",
    )
    .fetch_one(&pool)
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

    let stats = PushStats {
        total_sent,
        delivered_count,
        clicked_count,
        delivery_rate,
        click_rate,
    };

    (
        StatusCode::OK,
        Json(ApiResponse::success(stats, "获取推送统计成功")),
    )
}

pub async fn get_templates(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
) -> impl IntoResponse {
    let _ = extract_user_id_from_token(&headers, &auth_state.jwt_secret);

    let templates = match db_get_push_templates(&pool).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("获取模板列表失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "获取模板列表失败")),
            );
        }
    };

    (
        StatusCode::OK,
        Json(ApiResponse::success(templates, "获取模板列表成功")),
    )
}

pub async fn create_template(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Json(payload): Json<CreatePushTemplateRequest>,
) -> impl IntoResponse {
    let _ = extract_user_id_from_token(&headers, &auth_state.jwt_secret);

    let tenant_id = Uuid::new_v4();
    let template = match db_create_push_template(
        &pool,
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
                Json(ApiResponse::error(500, "创建模板失败")),
            );
        }
    };

    (
        StatusCode::OK,
        Json(ApiResponse::success(template, "创建模板成功")),
    )
}

pub async fn get_notification_by_id(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let _ = extract_user_id_from_token(&headers, &auth_state.jwt_secret);

    let row = match sqlx::query("SELECT id, user_id, title, body, notification_type, read_at, created_at FROM push_notifications WHERE id = $1")
        .bind(id)
        .fetch_optional(&pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("查询推送通知失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "查询推送通知失败")),
            );
        }
    };

    if let Some(row) = row {
        let notification = match PushNotification::from_row(&row) {
            Ok(n) => n,
            Err(e) => {
                tracing::error!("解析推送通知失败: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ApiResponse::error(500, "解析推送通知失败")),
                );
            }
        };
        (
            StatusCode::OK,
            Json(ApiResponse::success(notification, "获取推送通知成功")),
        )
    } else {
        (
            StatusCode::NOT_FOUND,
            Json(ApiResponse::error(404, "推送通知不存在")),
        )
    }
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
