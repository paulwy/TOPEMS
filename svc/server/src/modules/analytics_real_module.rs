//! 真实 Analytics 服务接入模块（AnalyticsRealModule）—— advanced 组挂载
//!
//! 将真实 `topems-analytics` 服务（lib 形态）作为模块接入统一入口。
//! analytics 使用 `routes::create_protected_routes() -> Router`（内部已含
//! `require_permission("analytics:admin")` + `with_state(AppState)`）。
//!
//! 由 feature `module-advanced` 门控（master-data 同组挂载）。

#![cfg(feature = "module-advanced")]

use crate::module::{Module, ModuleContext, ModuleGroup, ModuleHealth};
use crate::modules::dev_claims::inject_dev_claims;
use axum::Router;
use std::sync::Arc;
use topems_analytics::{modules, routes, shared::AppState};
use topems_shared_bootstrap::{bootstrap_service, ServiceConfig};
use topems_shared_core::health::SimpleHealthConfig;
use topems_shared_event::event::EventPublisher;

/// 真实 Analytics 模块：持有数据库连接池 + 完整 BI/Report 业务路由
pub struct AnalyticsRealModule {
    routes: Router,
    db: sqlx::PgPool,
    event_publisher: Option<Arc<EventPublisher>>,
}

impl AnalyticsRealModule {
    /// 异步构建真实 Analytics 模块
    pub async fn build() -> anyhow::Result<Self> {
        // 与独立部署 main.rs 一致：search_path bi, public
        std::env::set_var("SEARCH_PATH", "bi, public");

        let config = ServiceConfig {
            name: "topems-analytics",
            port: 8060,
            port_env_var: Some("BI_PORT"),
            max_db_connections: 10,
            enable_events: false,
            enable_rls: true,
            enable_request_context: true,
            api_prefix: "/api/bi",
            legacy_prefixes: &[],
            // 宿主进程统一初始化全局 telemetry
            init_telemetry: false,
        };

        // 1. 服务引导：数据库连接池 + 认证 + 事件发布器 + 指标
        let ctx = bootstrap_service(&config).await?;

        // 立即建立连接，固化本连接池的 search_path
        let _conn = ctx.db.acquire().await?;

        // 2. 模块级数据库初始化（与独立部署 main.rs 一致）
        if let Err(e) = modules::bi::init_database(&ctx.db).await {
            tracing::warn!("BI module database init warning: {}", e);
        }
        if let Err(e) = modules::report::init_database(&ctx.db).await {
            tracing::warn!("Report module database init warning: {}", e);
        }

        // 3. Report Scheduler（后台定时任务，start() 内部 spawn 不阻塞）
        let scheduler = modules::report::ReportScheduler::new(ctx.db.clone());
        if let Err(e) = scheduler.start().await {
            tracing::warn!("Failed to start report scheduler: {}", e);
        }

        // 4. 构建业务 AppState（与独立部署 main.rs 一致）
        let health_config = SimpleHealthConfig::new("topems-analytics").with_db(ctx.db.clone());
        let app_state = AppState {
            auth_state: ctx.auth_state.clone(),
            pool: ctx.db.clone(),
            health_config,
        };

        // 5. 业务路由（create_protected_routes 已含 require_permission + with_state）
        let protected_routes = routes::create_protected_routes(app_state);

        let routes = axum::Router::new()
            .nest(config.api_prefix, protected_routes)
            .layer(axum::middleware::from_fn(inject_dev_claims));

        tracing::info!(
            "✅ 真实 analytics 模块已接入统一入口（db={}，prefix={}）",
            ctx.db.size(),
            config.api_prefix
        );

        Ok(Self {
            routes,
            db: ctx.db.clone(),
            event_publisher: ctx.event_publisher.clone(),
        })
    }
}

#[async_trait::async_trait]
impl Module for AnalyticsRealModule {
    fn name(&self) -> &'static str {
        "analytics-real"
    }

    fn group(&self) -> ModuleGroup {
        ModuleGroup::Advanced
    }

    fn routes(&self, _state: ModuleContext) -> Router {
        self.routes.clone()
    }

    async fn health_check(&self) -> ModuleHealth {
        let mut health = ModuleHealth::healthy("analytics-real", ModuleGroup::Advanced);
        let db_ok = self.db.size() > 0;
        health.dependencies.push(crate::module::DependencyHealth {
            name: "PostgreSQL",
            healthy: db_ok,
            detail: format!("连接池大小 {}", self.db.size()),
        });
        if self.event_publisher.is_some() {
            health.dependencies.push(crate::module::DependencyHealth {
                name: "EventBus",
                healthy: true,
                detail: "事件发布器已创建".to_string(),
            });
        }
        health
    }
}
