//! Route registration for the unified-core service.
//!
//! Organized by business domain into sub-modules. The single public function
//! `create_routes` builds the full application router (public + protected routes
//! with all permission middleware layers applied) and returns a `Router<AppState>`
//! that the caller finalises with telemetry, CORS, prometheus and state.

/// V66.1：Automation 编排虚拟服务（planned 阶段，全部 501 Not Implemented 占位）
mod automation;
mod doc;
pub mod feature_flag;
mod file;
mod flow;
// V68.1 A2.4.2: help 路由已迁移至 svc/portal（/api/portal/help/*），Portal BFF 统一承载用户服务域
mod iam;
mod master;
mod migration;
mod rate_limit_config;
// V68.1 A2.1: routes/monitor.rs 旧适配层依赖 modules::monitor（已拆到 svc/monitor），这里不再载入
// V68.1 A2.2: routes/plugin.rs 适配层依赖 modules::plugin（已拆到 svc/plugin-registry 8096），这里不再载入
// 2026-10-24: contract_stubs 末 2 条 copilot 501 stub（DELETE sessions/{id} + GET modules/{id}/faq）
// 已随 svc/ai 实现、前端改指 apiClient.ai 后清零删除，模块整体移除。
mod mdm_dlq;
mod settings;
mod subscription;
mod system;
// V430: SSE (Server-Sent Events) 端点 - 公共路由, 支持实时通信
mod sse;
// V436: Business Tools 路由 - 统一业务工具API接口
pub mod business_tools;
// V440: OpenAPI 文档路由 - 提供 API 文档 JSON 和交互式查看器
mod openapi;
// U1-b2（D1 §5 选项C）：24 个业务投影路由模块已删除（wms/mes/scm/finance/erp/crm/hrm/qms/
// pdm/ehs/analytics/pm/lims/srm/gis/tms/master_data/communication/ticket/rd/integration/portal/
// mobile/ai_routes）。其 .merge() 挂载已在 U1-b1 停挂，本批删除 route 文件与 mod 声明。

// ===== V289: R4/R6 stub 路由已删除 =====
// V289 前：32 个纯空壳路由（admin/aps/asset/bi/crm/ehs/erp/finance/gis/hrm/im/integration/lims/
// lowcode/mes/mobile/monitor/notification/oa/pdm/pm/qms/rd/registry/report/scm/shared/srm/
// ticket/tms/wms），每个仅注册 {mod}:dashboard:read require_permission + async "ok"。
// V289 审计结论（check-group2-services.cjs + grep 前端流量）：
//  1. 前端 0 业务 fetch /internal/stubs 路径
//  2. 权限初始化仅在 iam/mod.rs 声明 {mod}:read/write/delete/admin 4 种粒度，
//     {mod}:dashboard:read 从未写入 core_permissions（删除前 verify_permission 始终
//     找不到该 permission code）
//  3. 模块级权限声明由 svc/*/plugin.yaml 的 permissions: 段承担（GROUP2 真实验收来源）
// 如有需要未来 dashboard:read 权限请改在 plugin.yaml 或 iam/mod.rs init_permissions vec 中
// 直接声明，不要走 "挂空壳路由触发 require_permission 中间件运行时注册" 模式。

use axum::routing::{any, get, post};
use axum::Router;

use topems_shared_auth::auth::auth_middleware;
use topems_shared_core::api_version::get_api_info_handler;
use topems_shared_core::api_version::register_routes_with_legacy_alias;

use crate::handlers;
use crate::middleware;
use crate::middleware::tenant_rls::tenant_rls_middleware;
use crate::modules;
use crate::AppState;

/// Build the full application router.
///
/// The returned `Router<AppState>` still needs the outermost layers
/// (telemetry, CORS, prometheus) and the final `.with_state(state)` call,
/// which are applied by `main.rs`.
///
/// `metrics_render` is a closure that renders the prometheus metrics as a
/// `String`. It is captured by the `/metrics` route handler. Using a closure
/// here avoids naming the private `PrometheusHandle` type from
/// `axum_prometheus`.
pub fn create_routes(
    state: &AppState,
    metrics_render: impl Fn() -> String + Clone + Send + Sync + 'static,
    embed_mode: bool,
) -> Router<AppState> {
    // ===== Public routes (no auth required, outside of /api/core/ dual-rail) =====
    let public_routes = Router::new()
        .route("/", get(handlers::home))
        .route("/health", get(handlers::health))
        .route("/api", get(|| get_api_info_handler("topems-unified-core")))
        .route(
            "/api/info",
            get(|| get_api_info_handler("topems-unified-core")),
        )
        // V68.1 A2.2: 插件 info 路由已迁移至 svc/plugin-registry:8096，后续通过代理转发
        // .route(
        //     "/api/plugins/info",
        //     get(modules::plugin::handlers::list_plugins_with_status),
        // )
        .route("/api/plugins/health", get(handlers::plugin_health_check))
        // Monitor public health endpoint (no auth required)
        .route("/api/monitor/health", get(handlers::detailed_health))
        .route("/metrics", get(move || async move { metrics_render() }))
        // WebSocket endpoints (auth handled via token query param or subscribe message)
        // Unified WebSocket routes with module prefix
        .route(
            "/ws/core/notifications",
            get(modules::communication::ws::websocket_handler),
        )
        .route(
            "/ws/core/im",
            get(modules::communication::ws::websocket_handler),
        )
        // U1-b1（D1 §5 选项C）：/ws/mes/dashboard 业务投影 WebSocket 随 mes 镜像模块下架移除。
        // 生产由独立 svc/mes（dashboard_ws.rs）提供；:8000 无入向流量。
        // V430: SSE (Server-Sent Events) 端点 - 公共路由, 支持实时通信
        .route("/api/sse/connect", get(sse::sse_connect_handler))
        .route(
            "/api/sse/session/{session_id}",
            post(sse::sse_session_handler),
        )
        // [2026-10-24] V436 Business Tools（含 /business-tools/permissions/* 写路由）已从 public_routes
        // 移至 core_protected_routes（auth_middleware 层内）：standalone 下此前无 auth 层裸奔；
        // 嵌入模式此前因 public_routes 不入 base_router 而整体丢弃。两形态现均「挂载 + auth」对齐。
        // V440: OpenAPI 文档端点 - 提供 API 文档 JSON 和交互式查看器
        .merge(openapi::openapi_routes());
    // V68.1 A2.2: 插件 proxy 路由（原 handlers::plugin_proxy）暂时下线，后续迁移到 plugin-registry
    // .route(
    //     "/api/plugins/{plugin_code}/{*path}",
    //     get(handlers::plugin_proxy),
    // );

    // ===== Core API public routes (dual-rail: /api/core/ + /api/v1/core/) =====
    let core_public_routes = Router::new()
        // V68.1 A2.2: navigation-config / register / status / unregister 路由迁移到 svc/plugin-registry
        // .route(
        //     "/plugin/navigation-config",
        //     get(modules::plugin::handlers::get_navigation_config),
        // )
        // IAM permission metadata (public - for service startup auto-sync)
        .route(
            "/iam/permissions/metadata",
            get(modules::iam::permission_metadata::get_permission_metadata),
        )
        // Auth endpoints (no auth required for login)
        .route("/iam/auth/login", post(modules::iam::auth::login))
        .route("/iam/auth/register", post(modules::iam::auth::register))
        .route("/iam/auth/refresh", post(modules::iam::auth::refresh_token))
        .route("/iam/auth/logout", post(modules::iam::auth::logout))
        .route(
            "/iam/auth/forgot-password",
            post(modules::iam::auth::forgot_password),
        )
        .route(
            "/iam/auth/reset-password",
            post(modules::iam::auth::reset_password),
        );
    // V68.1 A2.2: Plugin auto-registration routes 迁移至 svc/plugin-registry (8096)
    // .route(
    //     "/plugin/dev/plugins/{code}/register",
    //     post(modules::plugin::handlers::register_plugin),
    // )
    // .route(
    //     "/plugin/dev/plugins/{code}/status",
    //     put(modules::plugin::handlers::update_plugin_status),
    // )
    // .route(
    //     "/plugin/dev/plugins/{code}/unregister",
    //     post(modules::plugin::handlers::unregister_plugin),
    // );

    // ===== Core API protected routes (dual-rail: /api/core/ + /api/v1/core/) =====
    let core_protected_routes = iam::iam_routes(state)
        // VXX: JWT 校验端点（API 网关 Traefik jwt-auth forwardAuth 目标，任意方法）
        .route("/iam/auth/verify", any(modules::iam::auth::verify_token))
        .nest("/flow", flow::flow_routes(state))
        // V-file-contract：file 模块此前 .merge() 挂在 core 根（/api/core/upload、/api/core/files/*），
        // 与前端契约（services.file=/api/core/file）及内部调用方（shared-ai/file_client、
        // service_client/file_api、集成测试）约定的 /api/core/file/* 前缀错位，导致 50 个端点裸 404。
        // 现统一 nest 到 /file 之下，与 utoipa path 注解（/api/core/file/*）对齐。
        .nest("/file", file::file_routes(state))
        .merge(master::master_routes(state))
        .merge(feature_flag::feature_flag_routes(state))
        .merge(subscription::subscription_routes(state))
        // 限流/非重放配置管理（前端 admin RateLimitConfigPage 契约 /api/core/iam/v1/rate-limit/config[/anti-replay]）
        .nest(
            "/iam/v1",
            rate_limit_config::rate_limit_config_routes(state),
        )
        // V514-2: migration 路由此前定义未挂载（migration_routes 未进 merge 链），前端 /api/core/migration/migrations/* 404。
        // 实际路径 = /api/core + /api/migrations/*（register_routes_with_legacy_alias 双轨 /api/core + /api/v1/core）。
        .merge(migration::migration_routes(state))
        // V68.1 A2.2: plugin 路由已迁移至 svc/plugin-registry（端口 8096），后续用服务发现/代理
        // .merge(plugin::plugin_routes(state))
        // V68.1 A2.4.2: help 路由已迁移至 svc/portal（/api/portal/help/*）
        // .merge(help::help_routes(state))
        // V68.1 A2.1: monitor 已拆到 svc/monitor（端口 8095）；后续通过服务发现/代理转发 /api/monitor/* → 8095
        // .merge(monitor::monitor_routes(state))
        .merge(system::system_routes(state))
        // P36-5: SMTP 配置 + API Key 保险库 CRUD（此前 settings_routes 已实现但未挂载，
        // 导致 GET/PUT /system/settings/smtp、GET/POST/DELETE /system/api-keys 404）。
        .merge(settings::settings_routes(state))
        // 2026-10-24: web 契约兜底 contract_stubs 已清零删除（copilot 末 2 条随 svc/ai 实现改指）。
        // A4: MDM 主数据死信队列管理 API（list=system:read / replay=system:write）
        .merge(mdm_dlq::mdm_dlq_routes(state))
        .merge(doc::doc_routes(state))
        // V66.1：Automation 编排虚拟服务（planned 阶段，501 Not Implemented）
        .merge(automation::automation_routes(state))
        // V68.1 A2.4.1: login_log 路由已合并到 audit::create_routes（统一 require_permission 层）
        .merge(modules::audit::create_routes(state.clone()))
        // [2026-10-24] V436 Business Tools 端点（/business-tools + permissions/audit 写路由）：
        // 由 public_routes（无 auth）迁入 auth 层保护集；嵌入模式随之挂载（此前整体丢弃）。
        .merge(business_tools::business_tools_routes())
        .layer(axum::middleware::from_fn_with_state(
            state.auth_state.clone(),
            auth_middleware,
        ));

    // ===== Combine core public + protected routes =====
    let core_routes = core_public_routes.merge(core_protected_routes);

    // ===== Apply dual-rail registration (new: /api/core/, legacy: /api/v1/core/) =====
    // embed_mode（模块化单体嵌入）：core 业务路由挂根（/iam/* /flow/* 等），由 server 的
    // unified_core_real_module nest /api/core 提供统一前缀；跳过 public 冲突路由（/、/health、
    // /api、/metrics）与 wms/mes/scm 业务（server 已有真实模块），避免 Overlapping method route。
    let core_router = if embed_mode {
        core_routes
    } else {
        register_routes_with_legacy_alias(
            Router::new(),
            "/api/core",
            &["/api/v1/core"],
            core_routes,
        )
    };

    // ===== V289: R4/R6 32 stub 路由删除 =====
    // 原 stubs 段：/internal/stubs/{mod} × 32 纯空壳（{mod}:dashboard:read + 异步 "ok"）。
    // 审计删除原因见本文件顶部 V289 注释。
    // 后续若需新增业务模块路由，请在 core_protected_routes 中 merge 真实路由，不要复用
    // 「空壳路由 + require_permission 中间件占位」模式。

    let base_router = if embed_mode {
        // 嵌入模式：仅 core 业务路由（public 冲突路由与 wms/mes/scm 由 server 统一提供）
        Router::new()
            .merge(core_router)
            .merge(openapi::openapi_routes())
    } else {
        // U1-b1（D1 §5 选项C 灰度下架）：独立模式（embed_mode=false）不再挂载 24 个业务投影路由。
        // 依据：生产 nginx topems.conf:122-128 已把 /api/{erp,finance,crm,mes,ai,hrm,pm,...}
        // 全部转发到对应独立服务，unified-core(:8000) 仅 /api/(core|doc|monitor)+/health+/metrics，
        // 业务投影零入向流量。业务能力唯一入口 = 各独立服务 / svc/server:8099 聚合。
        // （原 24 条业务 merge：wms/mes/scm/finance/erp/crm/hrm/qms/pdm/ehs/analytics/pm/lims/
        //   srm/gis/tms/master_data/communication/ticket/rd/integration/portal/mobile/ai）
        Router::new().merge(public_routes).merge(core_router)
    };
    base_router
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            middleware::input_validation::input_validation_middleware,
        ))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            handlers::audit_logger_middleware_fn,
        ))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            handlers::body_limit_middleware_fn,
        ))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            tenant_rls_middleware,
        ))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            handlers::security_headers_middleware_fn,
        ))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            handlers::compression_middleware_fn,
        ))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            handlers::rate_limit_middleware_fn,
        ))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            middleware::anti_replay::anti_replay_middleware,
        ))
}
