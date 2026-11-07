mod event_handlers;

mod db;
mod models;
mod modules;
mod schema_defense;
mod services;
mod shared;

use anyhow::Result;
use axum::response::IntoResponse;
use axum::{extract::State, Json, Router};
use axum_prometheus::PrometheusMetricLayer;
use serde_json::json;
use std::sync::Arc;
use utoipa::OpenApi;

use topems_shared_auth::auth::auth_middleware;
use topems_shared_auth::middleware::require_module_access;
use topems_shared_auth::security::{rate_limit_middleware, RateLimitConfig, RateLimitMiddleware};
use topems_shared_auth::Claims;
use topems_shared_bootstrap::{
    bootstrap_service_shared, resolve_port, run, Application, ServiceConfig,
};
use topems_shared_core::api_version::{create_api_info_router, register_routes_with_legacy_alias};
use topems_shared_core::cors::create_cors_layer;
use topems_shared_core::logging::request_context_middleware;
use topems_shared_core::response::ApiResponse;
use topems_shared_db::scope::Db;
use topems_shared_observability::telemetry::telemetry_middleware;

use db::repository::*;

use modules::mobile_plugin::create_routes;
use shared::AppState;

#[tokio::main]
async fn main() -> Result<()> {
    let config = ServiceConfig {
        name: "topems-mobile",
        port: 8070,
        port_env_var: Some("MOBILE_PORT"),
        max_db_connections: 20,
        enable_events: true,
        enable_rls: true,
        enable_request_context: true,
        api_prefix: "/api/mobile",
        legacy_prefixes: &["/api/core/mobile/v1"],
        init_telemetry: true,
    };
    let ctx = bootstrap_service_shared(&config).await?;

    // Mobile 专属初始化：Schema 防御（C-1：自建 DDL 已移除，迁移权威唯一仲裁）
    if let Err(e) = crate::schema_defense::run_schema_migration_and_verify(
        ctx.migrate_pool.as_ref().unwrap_or(&ctx.db),
    )
    .await
    {
        tracing::error!("[mobile] Schema 防御检查失败: {:?}", e);
    }

    if let Err(e) = event_handlers::start_event_subscribers(
        Db::new(ctx.db.clone(), "mobile, public, shared"),
        ctx.event_publisher.clone(),
    )
    .await
    {
        tracing::warn!("⚠️ MOBILE 事件订阅者启动失败: {}", e);
    }

    // 6 个服务客户端初始化（统一服务间认证：service token，最小权限 + 短时效）
    let jwt_secret = ctx.auth_state.jwt_secret.clone();
    let (
        wms_client,
        hrm_client,
        workflow_client,
        notification_client,
        mes_api_client,
        qms_api_client,
        crm_client,
    ) = crate::shared::build_service_clients(&jwt_secret).await;
    let app_state = AppState {
        auth_state: ctx.auth_state.clone(),
        pool: Db::new(ctx.db.clone(), "mobile, public, shared"),
        event_publisher: ctx.event_publisher.clone(),
        wms_client,
        hrm_client,
        workflow_client,
        notification_client,
        mes_api_client,
        qms_api_client,
        crm_client,
    };

    // Public routes (no auth)
    let public_routes = Router::new()
        .route("/health", axum::routing::get(health_check))
        .merge(create_routes());

    // Protected routes
    let protected_routes = crate::shared::build_protected_routes(app_state.clone());
    let openapi_json = serde_json::to_string_pretty(&services::openapi::MobileApiDoc::openapi())
        .unwrap_or_else(|e| {
            tracing::error!("Failed to serialize OpenAPI spec: {}", e);
            "{}".to_string()
        });
    let openapi_json_for_route = openapi_json.clone();
    let openapi_routes = Router::new()
        .route(
            "/api-docs/openapi.json",
            axum::routing::get(move || async move { openapi_json_for_route.clone() }),
        )
        .with_state(app_state.clone());

    // Protected 中间件链（axum 后挂先执行 → 实际顺序）：
    // auth（验 token 注入 Claims）→ require_mobile_write → require_module_access → tenant → rls → request_context
    let protected_routes = protected_routes
        .layer(axum::middleware::from_fn(request_context_middleware))
        .layer(axum::middleware::from_fn_with_state(
            ctx.db.clone(),
            topems_shared_auth::tenant_middleware(),
        ))
        .layer(axum::middleware::from_fn(require_module_access("mobile")))
        // 写操作独立权限点：模块门放宽到只读码后，非只读方法仍需 mobile:admin，
        // 保持改门前「无 mobile:admin 不能写」的实际效果，避免 mobile:read 角色
        // 经放宽后的模块门直达审批/设备控制/数据写入端点。
        .layer(axum::middleware::from_fn(require_mobile_write))
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ));

    let rate_limit_config = RateLimitConfig::new(200, 60)
        .with_by_user_id(false)
        .with_by_ip(true);
    let rate_limiter = Arc::new(RateLimitMiddleware::new(rate_limit_config));
    let protected_routes = protected_routes
        .layer(axum::middleware::from_fn({
            let mw = rate_limiter.clone();
            move |req, next| {
                let mw = mw.clone();
                async move { rate_limit_middleware(mw, req, next).await }
            }
        }))
        .with_state(app_state.clone());

    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();
    let metrics_route = Router::new()
        .route(
            "/metrics",
            axum::routing::get(move || async move { metric_handle.render() }),
        )
        .with_state(app_state.clone());

    let cors = create_cors_layer();

    let app = register_routes_with_legacy_alias(
        Router::new()
            .merge(public_routes)
            .merge(openapi_routes)
            .merge(metrics_route),
        config.api_prefix,
        config.legacy_prefixes,
        protected_routes,
    )
    .merge(create_api_info_router("topems-mobile"))
    .with_state(app_state.clone())
    .layer(axum::middleware::from_fn(telemetry_middleware))
    .layer(prometheus_layer)
    .layer(cors)
    // mobile 不走 build_application，手动补 /metrics 鉴权层（最外层）。
    .layer(topems_shared_bootstrap::metrics_auth_layer());

    // 启动时自动注册到统一核心
    let core_url = std::env::var("CORE_URL").ok();
    tokio::spawn(async move {
        modules::mobile_plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    let app = Application {
        router: app,
        port: resolve_port(&config),
        name: config.name,
    };
    run(app).await?;
    Ok(())
}

use topems_shared_core::health::{build_health_response, ServiceHealth};

async fn health_check() -> ServiceHealth {
    build_health_response("topems-mobile", true)
}

#[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
async fn list_mobile_tasks(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    let mut scope = match state.pool.scope_read().await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("获取移动任务失败: {}", e);
            return Json(ApiResponse::success(
                json!({ "items": Vec::<serde_json::Value>::new(), "total": 0 }),
                "获取移动任务成功",
            ));
        }
    };
    let records = match db_get_mobile_tasks(&mut scope, None).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("获取移动任务失败: {}", e);
            vec![]
        }
    };
    let _ = scope.commit().await;
    let total = records.len() as i64;
    Json(ApiResponse::success(
        json!({ "items": records, "total": total }),
        "获取移动任务成功",
    ))
}

/// 移动端写操作的独立权限点：模块门（`require_module_access("mobile")`）只负责
/// 「能进移动端」，读接口持有任一 `mobile:` 前缀码即可；非只读方法（POST/PUT/
/// PATCH/DELETE）仍要求 `mobile:admin`，覆盖审批（approve/reject/delegate）、
/// 设备注册与推送控制、媒体上传、离线同步等敏感动作。与 BFF 侧
/// `mobile_real_module` 的 `require_mobile_write` 保持同一口径，避免从 :8099
/// 绕过 :8070 的动作门。
async fn require_mobile_write(
    req: axum::extract::Request,
    next: axum::middleware::Next,
) -> axum::response::Response {
    use axum::http::Method;
    if matches!(*req.method(), Method::GET | Method::HEAD | Method::OPTIONS) {
        return next.run(req).await;
    }
    let allowed = req
        .extensions()
        .get::<Claims>()
        .map(|c| c.has_permission("mobile:admin"))
        .unwrap_or(false);
    if allowed {
        return next.run(req).await;
    }
    (
        axum::http::StatusCode::FORBIDDEN,
        [(axum::http::header::CONTENT_TYPE, "application/json")],
        r#"{"success":false,"message":"权限不足：需要移动端管理员权限（mobile:admin）","code":403}"#,
    )
        .into_response()
}
