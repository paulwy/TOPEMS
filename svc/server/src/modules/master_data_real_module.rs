//! 真实 MasterData 服务接入模块（MasterDataRealModule）—— advanced 组挂载
//!
//! 将真实 `topems-master-data` 服务（lib 形态）作为模块接入统一入口。
//! master-data 使用 `modules::create_routes() -> Router<AppState>`（AppState: db/auth/metrics/start_time）。
//!
//! 由 feature `module-advanced` 门控（挂载 master-data；analytics 后续同组接入）。

#![cfg(feature = "module-advanced")]

use crate::module::{Module, ModuleContext, ModuleGroup, ModuleHealth};
use crate::modules::dev_claims::inject_dev_claims;
use axum::Router;
use std::sync::Arc;
use topems_master_data::modules;
use topems_master_data::shared::AppState;
use topems_shared_auth::middleware::require_permission;
use topems_shared_bootstrap::{bootstrap_service, ServiceConfig};
use topems_shared_event::event::EventPublisher;

/// 真实 MasterData 模块：持有数据库连接池 + 完整业务路由
pub struct MasterDataRealModule {
    routes: Router,
    db: sqlx::PgPool,
    event_publisher: Option<Arc<EventPublisher>>,
}

impl MasterDataRealModule {
    /// 异步构建真实 MasterData 模块
    pub async fn build() -> anyhow::Result<Self> {
        // 与独立部署 main.rs 一致：search_path public
        std::env::set_var("SEARCH_PATH", "public");

        let config = ServiceConfig {
            name: "topems-master-data",
            port: 8090,
            port_env_var: Some("MASTER_DATA_PORT"),
            max_db_connections: 10,
            enable_events: true,
            enable_rls: true,
            enable_request_context: true,
            api_prefix: "/api/master-data",
            legacy_prefixes: &[],
            // 宿主进程统一初始化全局 telemetry
            init_telemetry: false,
        };

        // 1. 服务引导：数据库连接池 + 认证 + 事件发布器 + 指标
        let ctx = bootstrap_service(&config).await?;

        // 立即建立连接，固化本连接池的 search_path
        let _conn = ctx.db.acquire().await?;

        // 2. 构建业务 AppState（与独立部署 main.rs 一致）
        let app_state = AppState {
            db: ctx.db.clone(),
            auth_state: ctx.auth_state.clone(),
            metrics: ctx.metrics.clone(),
            start_time: ctx.start_time,
        };

        // 3. 业务路由（权限中间件 + 开发验证模拟认证）
        let protected_routes = modules::create_routes()
            .layer(axum::middleware::from_fn(require_permission(
                "master-data:admin",
            )))
            .with_state(app_state);

        let routes = axum::Router::new()
            .nest(config.api_prefix, protected_routes)
            .layer(axum::middleware::from_fn(inject_dev_claims));

        tracing::info!(
            "✅ 真实 master-data 模块已接入统一入口（db={}，prefix={}）",
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
impl Module for MasterDataRealModule {
    fn name(&self) -> &'static str {
        "master-data-real"
    }

    fn group(&self) -> ModuleGroup {
        ModuleGroup::Advanced
    }

    fn routes(&self, _state: ModuleContext) -> Router {
        self.routes.clone()
    }

    async fn health_check(&self) -> ModuleHealth {
        let mut health = ModuleHealth::healthy("master-data-real", ModuleGroup::Advanced);
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
