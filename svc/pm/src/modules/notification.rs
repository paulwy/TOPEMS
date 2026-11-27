use axum::{
    extract::{Extension, Path, State},
    routing::{get, put},
    Json, Router,
};
use chrono::Utc;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::TenantContext;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;
use topems_shared_db::scope::Db;
use uuid::Uuid;

use crate::models::notification::{
    CreateNotificationRequest, CreateNotificationSettingRequest, Notification, NotificationSetting,
    NotificationType,
};
use crate::modules::effective_tenant_id;

use topems_shared_auth::middleware::tenant::RlsTxnCell;

pub fn create_routes(db: Db) -> Router {
    Router::new()
        .route(
            "/projects/{project_id}/notifications",
            get(get_project_notifications).post(create_notification),
        )
        .route(
            "/projects/{project_id}/notification-settings",
            get(get_project_settings).post(create_setting),
        )
        .route("/notification-settings/{id}", put(update_setting))
        .route("/notification-types", get(list_notification_types))
        .with_state(db)
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/projects/{project_id}/notifications",
    params(
("project_id" = String, Path, description = "project_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
async fn get_project_notifications(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(project_id): Path<Uuid>,
) -> ApiResponse<Vec<Notification>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let notifications = sqlx::query_as::<_, Notification>(
        only_own_schema_query!("pm", "SELECT id, project_id, recipient AS user_id, notification_type, title, content AS message, status, priority, metadata, due_date, sent_at AS delivered_at, NULL::timestamptz AS read_at, created_at, updated_at FROM pm.notifications WHERE project_id = $1 ORDER BY created_at DESC"),
    )
    .bind(project_id)
    .fetch_all(&mut scope)
    .await;

    match notifications {
        Ok(n) => ApiResponse::success(n, "获取通知列表成功"),
        Err(e) => {
            tracing::error!("获取通知失败: {}", e);
            ApiResponse::server_error("获取通知失败")
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/pm/projects/{project_id}/notifications",
    tag = "notification",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn create_notification(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateNotificationRequest>,
) -> ApiResponse<Notification> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let id = Uuid::new_v4();
    let now = Utc::now();

    let notification = sqlx::query_as::<_, Notification>(
        only_own_schema_query!("pm", "INSERT INTO pm.notifications (id, project_id, recipient, notification_type, title, content, status, priority, metadata, due_date, created_at, updated_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9, $10, $11, $12)
        RETURNING id, project_id, recipient AS user_id, notification_type, title, content AS message, status, priority, metadata, due_date, created_at, updated_at")
    )
    .bind(id)
    .bind(req.project_id)
    .bind(req.user_id)
    .bind(&req.notification_type)
    .bind(&req.title)
    .bind(&req.message)
    .bind(&req.priority)
    .bind(req.metadata)
    .bind(parse_date_opt(&req.due_date))
    .bind(effective_tenant_id(&ctx, &claims))
    .bind(now)
    .bind(effective_tenant_id(&ctx, &claims))
    .fetch_one(&mut scope)
    .await;

    match notification {
        Ok(n) => ApiResponse::success(n, "创建通知成功"),
        Err(e) => {
            tracing::error!("创建通知失败: {}", e);
            ApiResponse::server_error("创建通知失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/projects/{project_id}/notification-settings",
    params(
("project_id" = String, Path, description = "project_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
async fn get_project_settings(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(project_id): Path<Uuid>,
) -> ApiResponse<Vec<NotificationSetting>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let settings = sqlx::query_as::<_, NotificationSetting>(
        only_own_schema_query!("pm", "SELECT id, project_id, notification_type, enabled, notify_before_days, preferred_channel, created_at, updated_at FROM pm.notification_settings WHERE project_id = $1"),
    )
    .bind(project_id)
    .fetch_all(&mut scope)
    .await;

    match settings {
        Ok(s) => ApiResponse::success(s, "获取通知设置成功"),
        Err(e) => {
            tracing::error!("获取通知设置失败: {}", e);
            ApiResponse::server_error("获取通知设置失败")
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/pm/projects/{project_id}/notification-settings",
    tag = "notification",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn create_setting(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(project_id): Path<Uuid>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateNotificationSettingRequest>,
) -> ApiResponse<NotificationSetting> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let id = Uuid::new_v4();
    let now = Utc::now();

    let setting = sqlx::query_as::<_, NotificationSetting>(
        only_own_schema_query!("pm", "INSERT INTO pm.notification_settings (id, project_id, user_id, notification_type, enabled, notify_before_days, preferred_channel, created_at, updated_at, tenant_id)
        VALUES ($1, $2, '00000000-0000-0000-0000-000000000000'::uuid, $3, $4, $5, $6, $7, $8, $9) RETURNING *")
    )
    .bind(id)
    .bind(project_id)
    .bind(&req.notification_type)
    .bind(req.enabled)
    .bind(req.notify_before_days)
    .bind(req.preferred_channel)
    .bind(now)
    .bind(now)
    .bind(effective_tenant_id(&ctx, &claims))
    .fetch_one(&mut scope)
    .await;

    match setting {
        Ok(s) => ApiResponse::success(s, "创建通知设置成功"),
        Err(e) => {
            tracing::error!("创建通知设置失败: {}", e);
            ApiResponse::server_error("创建通知设置失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["pm:write"])),
    path = "/notification-settings/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
async fn update_setting(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
    Json(req): Json<CreateNotificationSettingRequest>,
) -> ApiResponse<NotificationSetting> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let setting = sqlx::query_as::<_, NotificationSetting>(only_own_schema_query!(
        "pm",
        "UPDATE pm.notification_settings SET
            enabled = COALESCE($1, enabled),
            notify_before_days = COALESCE($2, notify_before_days),
            preferred_channel = COALESCE($3, preferred_channel),
            updated_at = $4
        WHERE id = $5  RETURNING *"
    ))
    .bind(req.enabled)
    .bind(req.notify_before_days)
    .bind(req.preferred_channel)
    .bind(Utc::now())
    .bind(id)
    .fetch_one(&mut scope)
    .await;

    match setting {
        Ok(s) => ApiResponse::success(s, "更新通知设置成功"),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("通知设置不存在"),
        Err(e) => {
            tracing::error!("更新通知设置失败: {}", e);
            ApiResponse::server_error("更新通知设置失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/notification-types",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "notification"
)]
async fn list_notification_types() -> ApiResponse<Vec<NotificationType>> {
    let types = vec![
        NotificationType {
            code: "milestone_reminder".to_string(),
            name: "里程碑提醒".to_string(),
            description: "里程碑截止日期前的提醒通知".to_string(),
            default_enabled: true,
            default_priority: "medium".to_string(),
        },
        NotificationType {
            code: "task_due".to_string(),
            name: "任务到期提醒".to_string(),
            description: "任务截止日期提醒".to_string(),
            default_enabled: true,
            default_priority: "medium".to_string(),
        },
        NotificationType {
            code: "approval_request".to_string(),
            name: "审批请求".to_string(),
            description: "需要审批的请求通知".to_string(),
            default_enabled: true,
            default_priority: "high".to_string(),
        },
        NotificationType {
            code: "approval_completed".to_string(),
            name: "审批完成".to_string(),
            description: "审批流程完成通知".to_string(),
            default_enabled: true,
            default_priority: "low".to_string(),
        },
        NotificationType {
            code: "risk_alert".to_string(),
            name: "风险预警".to_string(),
            description: "风险等级达到阈值时的预警通知".to_string(),
            default_enabled: true,
            default_priority: "high".to_string(),
        },
        NotificationType {
            code: "defect_found".to_string(),
            name: "缺陷发现".to_string(),
            description: "发现新缺陷时的通知".to_string(),
            default_enabled: true,
            default_priority: "high".to_string(),
        },
        NotificationType {
            code: "project_update".to_string(),
            name: "项目更新".to_string(),
            description: "项目状态或进度更新通知".to_string(),
            default_enabled: true,
            default_priority: "low".to_string(),
        },
        NotificationType {
            code: "contract_update".to_string(),
            name: "合同更新".to_string(),
            description: "合同状态变更通知".to_string(),
            default_enabled: true,
            default_priority: "medium".to_string(),
        },
    ];

    ApiResponse::success(types, "获取通知类型列表成功")
}

fn parse_date_opt(date_str: &Option<String>) -> Option<chrono::DateTime<chrono::Utc>> {
    date_str
        .as_ref()
        .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
        .map(|d| d.with_timezone(&chrono::Utc))
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Datelike;
    use sqlx::postgres::PgConnectOptions;
    use sqlx::PgPool;
    use std::str::FromStr;

    fn make_pool() -> PgPool {
        let opts = PgConnectOptions::from_str("postgres://localhost/test").unwrap();
        sqlx::Pool::connect_lazy_with(opts)
    }

    #[tokio::test]
    async fn test_create_routes_returns_router() {
        let router = create_routes(Db::new(make_pool(), "pm, public, shared"));
        let _ = router;
    }

    #[test]
    fn test_parse_date_opt_none() {
        assert!(parse_date_opt(&None).is_none());
    }

    #[test]
    fn test_parse_date_opt_valid() {
        let s = Some("2024-07-15T09:30:00Z".to_string());
        let r = parse_date_opt(&s);
        assert!(r.is_some());
        let dt = r.unwrap();
        assert_eq!(dt.year(), 2024);
        assert_eq!(dt.month(), 7);
        assert_eq!(dt.day(), 15);
    }

    #[test]
    fn test_parse_date_opt_invalid() {
        assert!(parse_date_opt(&Some("nope".to_string())).is_none());
    }
}
