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
use axum::routing::get;
use axum::Router;
use topems_shared_auth::middleware::require_permission;
use topems_shared_bootstrap::{bootstrap_service, ServiceConfig};

/// 真实 Mobile 模块：持有数据库连接池 + 移动端完整业务路由
pub struct MobileRealModule {
    routes: Router,
    pool: sqlx::PgPool,
}

impl MobileRealModule {
    /// 异步构建真实 Mobile 模块（复用 svc/mobile 的 AppState 与完整 protected 路由）
    pub async fn build() -> anyhow::Result<Self> {
        let config = ServiceConfig {
            name: "topems-mobile",
            port: 8095,
            port_env_var: Some("MOBILE_PORT"),
            max_db_connections: 10,
            enable_events: false,
            enable_rls: false,
            enable_request_context: false,
            api_prefix: "/api/mobile",
            legacy_prefixes: &[],
            init_telemetry: false,
        };

        let ctx = bootstrap_service(&config).await?;
        let _conn = ctx.db.acquire().await?;

        // 1. 6 个服务客户端统一初始化（与独立部署一致的 service token）
        let (wms_client, hrm_client, workflow_client, notification_client, mes_api_client, qms_api_client) =
            topems_mobile::shared::build_service_clients(&ctx.auth_state.jwt_secret).await;

        // 2. 构造 mobile AppState（复用 svc/mobile 类型）
        let state = topems_mobile::shared::AppState {
            auth_state: ctx.auth_state.clone(),
            pool: ctx.db.clone(),
            event_publisher: ctx.event_publisher.clone(),
            wms_client,
            hrm_client,
            workflow_client,
            notification_client,
            mes_api_client,
            qms_api_client,
        };

        // 3. 完整 protected 业务路由（approvals/oa/media/scan/patrol/offline 等 99 条）
        let protected_routes = topems_mobile::shared::build_protected_routes(state.clone())
            .layer(axum::middleware::from_fn(require_permission("mobile:admin")))
            .with_state(state);

        // 4. 组装：api_prefix + 统一 JWT 认证（与独立部署一致）
        let routes = axum::Router::new()
            .route("/api/mobile/health", get(|| async { "Mobile Service OK" }))
            .nest(config.api_prefix, protected_routes)
            .layer(axum::middleware::from_fn_with_state(
                ctx.auth_state.clone(),
                topems_shared_auth::auth::auth_middleware,
            ));

        tracing::info!(
            "✅ 真实 mobile 模块已接入统一入口（db={}，prefix={}，业务路由 99 条）",
            ctx.db.size(),
            config.api_prefix
        );

        Ok(Self {
            routes,
            pool: ctx.db,
        })
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
        let db_healthy = sqlx::query("SELECT 1").execute(&self.pool).await.is_ok();

        if db_healthy {
            ModuleHealth::healthy(self.name(), self.group())
        } else {
            ModuleHealth::unhealthy(self.name(), self.group(), "database disconnected")
        }
    }
}
