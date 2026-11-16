//! 真实 Mobile 服务接入模块（MobileRealModule）—— feature flag 控制
//!
//! 将真实 `topems-mobile` 服务（lib 形态）作为模块接入统一入口。
//! mobile 提供移动端 API、离线同步、扫码、审批等能力。
//!
//! 由 feature `module-mobile` 门控（core 组）。
//!
//! 注意：当前为简化版，仅注册核心路由。完整路由接入需要构建完整的 AppState
//! （包含 6 个服务客户端：WmsApi/HrmApi/WorkflowApi/NotificationApi/MesApi/QmsApi）。

#![cfg(feature = "module-mobile")]

use crate::module::{Module, ModuleContext, ModuleGroup, ModuleHealth};
use axum::response::IntoResponse;
use axum::routing::get;
use axum::Router;
use topems_shared_auth::middleware::require_module_access;
use topems_shared_auth::Claims;
use topems_shared_bootstrap::{bootstrap_service_shared, ServiceConfig};
use topems_shared_core::error::Result;
use topems_shared_db::scope::Db;

/// 真实 Mobile 模块：持有数据库连接池 + 移动端完整业务路由
pub struct MobileRealModule {
    routes: Router,
    db: Db,
}

impl MobileRealModule {
    /// 异步构建真实 Mobile 模块（复用 svc/mobile 的 AppState 与完整 protected 路由）
    pub async fn build() -> Result<Self> {
        let config = ServiceConfig {
            name: "topems-mobile",
            port: 8095,
            port_env_var: Some("MOBILE_PORT"),
            max_db_connections: 10,
            enable_events: false,
            enable_rls: true,
            enable_request_context: false,
            api_prefix: "/api/mobile",
            legacy_prefixes: &[],
            init_telemetry: false,
        };

        let ctx = bootstrap_service_shared(&config).await?;
        topems_shared_db::database::probe_connection(&ctx.db).await?;
        // mobile 模块固化的 schema 作用域（不再继承 .env 的 SEARCH_PATH）。
        let db = Db::new(ctx.db.clone(), "mobile, public, shared");
        db.check_health().await?;

        // 1. 7 个服务客户端统一初始化（与独立部署一致的 service token）
        let (
            wms_client,
            hrm_client,
            workflow_client,
            notification_client,
            mes_api_client,
            qms_api_client,
            crm_client,
        ) = topems_mobile::shared::build_service_clients(&ctx.auth_state.jwt_secret).await;

        // 2. 构造 mobile AppState（复用 svc/mobile 类型）
        let state = topems_mobile::shared::AppState {
            auth_state: ctx.auth_state.clone(),
            pool: db.clone(),
            event_publisher: ctx.event_publisher.clone(),
            wms_client,
            hrm_client,
            workflow_client,
            notification_client,
            mes_api_client,
            qms_api_client,
            crm_client,
        };

        // 3. 完整 protected 业务路由（approvals/oa/media/scan/patrol/offline 等 99 条）
        // 3b. 前端契约兜底路由：smoke 探测发现的约 165 个前端已调用但暂无业务实现的
        //     端点（AI 助手 / CRM / GIS / 报表 / 工作流 等），轻量占位防裸 404，
        //     待上游支持后替换为真实 handler。与 build_protected_routes 同层 merge。
        let protected_routes = topems_mobile::shared::build_protected_routes(state.clone())
            .merge(topems_mobile::modules::contract_fallback::routes())
            // M-1：请求事务由 tenant_middleware 注入（对齐独立部署 svc/mobile main.rs）。
            // handler 复用请求事务（`Extension<RlsTxnCell>`），缺这层整片路由 500。
            .layer(axum::middleware::from_fn_with_state(
                ctx.db.clone(),
                topems_shared_auth::tenant_middleware(),
            ))
            .layer(axum::middleware::from_fn(require_module_access("mobile")))
            // 写操作独立权限点：与独立部署 :8070 的 `require_mobile_write` 同口径，
            // 非只读方法仍需 mobile:admin，防止 mobile:read 角色从 BFF 侧绕过动作门。
            .layer(axum::middleware::from_fn(require_mobile_write))
            .with_state(state);

        // 4. 组装：api_prefix + 统一 JWT 认证（与独立部署一致）
        let routes = axum::Router::new()
            .route("/api/mobile/health", get(|| async { "Mobile Service OK" }))
            .nest(config.api_prefix, protected_routes)
            .layer(axum::middleware::from_fn_with_state(
                ctx.auth_state.clone(),
                topems_shared_auth::auth::auth_middleware,
            ));

        // 事件订阅者：独立部署时由 svc/mobile/src/main.rs 启动；单体拓扑里只有本进程，
        // 必须在此挂载，否则 mobile-group 无人消费、事件堆积在 Redis Stream。
        // build() 在 main.rs 中每个进程仅调用一次，消费组 `mobile-group` 只会有一个 consumer。
        if let Err(e) = topems_mobile::event_handlers::start_event_subscribers(
            db.clone(),
            ctx.event_publisher.clone(),
        )
        .await
        {
            tracing::error!("⚠️ mobile 事件订阅者启动失败: {}", e);
        } else {
            tracing::info!("✅ mobile 事件订阅者已挂载");
        }

        tracing::info!(
            "✅ 真实 mobile 模块已接入统一入口（db={}，prefix={}，业务路由 99 条）",
            db.stats().size,
            config.api_prefix
        );

        Ok(Self { routes, db })
    }
}

#[async_trait::async_trait]
impl Module for MobileRealModule {
    fn name(&self) -> &'static str {
        "mobile"
    }

    fn group(&self) -> ModuleGroup {
        ModuleGroup::Core
    }

    fn routes(&self, _state: ModuleContext) -> Router {
        self.routes.clone()
    }

    async fn health_check(&self) -> ModuleHealth {
        let stats = self.db.stats();
        let db_healthy = self.db.check_health().await.is_ok() && stats.size > 0;

        if db_healthy {
            ModuleHealth::healthy(self.name(), self.group())
        } else {
            ModuleHealth::unhealthy(self.name(), self.group(), "database disconnected")
        }
    }
}

/// 移动端写操作的独立权限点：模块门只负责「能进移动端」，读接口持有任一
/// `mobile:` 前缀码即可；非只读方法仍要求 `mobile:admin`（审批、设备控制、
/// 媒体上传、离线同步等敏感动作）。与独立部署 `svc/mobile/src/main.rs` 同口径。
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
