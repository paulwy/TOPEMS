//! 真实 RD 服务接入模块（RdRealModule）—— feature flag 控制
//!
//! 将真实 `topems-rd` 服务（lib 形态）作为模块接入统一入口。
//! rd 路由使用自定义 `modules::ApiState`（db/auth_state/config/metrics/start_time/event_publisher）。
//!
//! 由 feature `module-rd` 门控（默认启用，核心业务域）。

#![cfg(feature = "module-rd")]

use crate::module::{Module, ModuleContext, ModuleGroup, ModuleHealth};
use crate::modules::dev_claims::inject_dev_claims;
use axum::Router;
use std::sync::Arc;
use topems_rd::modules::{create_routes, ApiState};
use topems_shared_auth::middleware::require_permission;
use topems_shared_bootstrap::{bootstrap_service, ServiceConfig};
use topems_shared_event::event::EventPublisher;

/// 真实 RD 模块：持有数据库连接池 + 完整业务路由
pub struct RdRealModule {
    routes: Router,
    db: sqlx::PgPool,
    event_publisher: Option<Arc<EventPublisher>>,
}

impl RdRealModule {
    /// 异步构建真实 RD 模块
    pub async fn build() -> anyhow::Result<Self> {
        // rd 业务表位于 rs schema
        std::env::set_var("SEARCH_PATH", "rs, public");

        let config = ServiceConfig {
            name: "topems-rd",
            port: 8053,
            port_env_var: Some("RD_PORT"),
            max_db_connections: 10,
            enable_events: true,
            enable_rls: true,
            enable_request_context: true,
            api_prefix: "/api/rd",
            legacy_prefixes: &["/api/v1/rd", "/api/core/rd/v1"],
            // 宿主进程统一初始化全局 telemetry
            init_telemetry: false,
        };

        // 1. 服务引导：数据库连接池 + 认证 + 事件发布器 + 指标
        let ctx = bootstrap_service(&config).await?;

        // 立即建立连接，固化本连接池的 search_path
        let _conn = ctx.db.acquire().await?;

        // 2. RD 数据库初始化（schema_defense 迁移验证，失败不阻塞）
        if let Err(e) = topems_rd::schema_defense::run_schema_migration_and_verify(&ctx.db).await {
            tracing::warn!("RD 数据库初始化警告（不阻塞）: {}", e);
        }

        // 3. 构建业务 ApiState（与独立部署 main.rs 一致）
        let config_app = topems_shared_core::config::Config::load()
            .await
            .map_err(|e| anyhow::anyhow!("RD 配置加载失败: {}", e))?;
        let api_state = ApiState {
            db: ctx.db.clone(),
            auth_state: ctx.auth_state.clone(),
            config: config_app,
            metrics: ctx.metrics.clone(),
            start_time: ctx.start_time,
            event_publisher: ctx.event_publisher.clone(),
        };

        // 4. 业务路由（权限中间件 + 开发验证模拟认证）
        let protected_routes = create_routes()
            .layer(axum::middleware::from_fn_with_state(
                ctx.db.clone(),
                topems_shared_auth::tenant_middleware(),
            ))
            .layer(axum::middleware::from_fn(require_permission("rd:admin")))
            .with_state(api_state);

        let routes = axum::Router::new()
            .nest(config.api_prefix, protected_routes)
            .layer(axum::middleware::from_fn(inject_dev_claims));

        tracing::info!(
            "✅ 真实 rd 模块已接入统一入口（db={}，prefix={}）",
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
impl Module for RdRealModule {
    fn name(&self) -> &'static str {
        "rd-real"
    }

    fn group(&self) -> ModuleGroup {
        ModuleGroup::Wms
    }

    fn routes(&self, _state: ModuleContext) -> Router {
        self.routes.clone()
    }

    async fn health_check(&self) -> ModuleHealth {
        let mut health = ModuleHealth::healthy("rd-real", ModuleGroup::Wms);
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
