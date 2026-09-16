//! 真实 Portal 服务接入模块（PortalRealModule）—— feature flag 控制
//!
//! 将真实 `topems-portal` 服务（lib 形态）作为模块接入统一入口。
//! portal 的全部业务组装链（事件订阅者 / AppState / 帮助中心 / schema 防御 /
//! GraphQL 聚合 / 业务路由 / 遗留别名 / CORS / Cookie）由
//! `topems_portal::embedded::build_router` 提供，与独立部署 main.rs 共用同一实现，
//! 避免双轨漂移。
//!
//! 由 feature `module-portal` 门控（默认启用，平台核心域）。

#![cfg(feature = "module-portal")]

use crate::module::{Module, ModuleContext, ModuleGroup, ModuleHealth};
use axum::Router;
use std::sync::Arc;
use topems_portal::shared::AppState;
use topems_shared_bootstrap::{bootstrap_service, ServiceConfig};
use topems_shared_event::event::EventPublisher;

/// 真实 Portal 模块：持有数据库连接池 + 完整业务路由（含 GraphQL 聚合层）
pub struct PortalRealModule {
    routes: Router,
    db: sqlx::PgPool,
    event_publisher: Option<Arc<EventPublisher>>,
}

impl PortalRealModule {
    /// 异步构建真实 Portal 模块
    pub async fn build() -> anyhow::Result<Self> {
        std::env::set_var("SEARCH_PATH", "portal, public");

        let config = ServiceConfig {
            name: "topems-portal",
            port: 8063,
            port_env_var: Some("PORTAL_PORT"),
            max_db_connections: 20,
            enable_events: true,
            enable_rls: true,
            enable_request_context: true,
            api_prefix: "/api/portal",
            legacy_prefixes: &["/api/v1/portal", "/api/core/portal/v1"],
            init_telemetry: false,
        };

        let ctx = bootstrap_service(&config).await?;
        let _conn = ctx.db.acquire().await?;

        // 嵌入模式无独立 public 入口（server 统一提供 /health /metrics 与 dev 声明注入），
        // 传空 Router<AppState> 作为 public 路由占位
        let public_routes = Router::<AppState>::new();

        let routes = topems_portal::embedded::build_router(
            ctx.db.clone(),
            ctx.migrate_pool.clone().unwrap_or_else(|| ctx.db.clone()),
            ctx.event_publisher.clone(),
            public_routes,
        )
        .await?;

        tracing::info!(
            "✅ 真实 portal 模块已接入统一入口（db={}，prefix={}）",
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
impl Module for PortalRealModule {
    fn name(&self) -> &'static str {
        "portal-real"
    }

    fn group(&self) -> ModuleGroup {
        ModuleGroup::Core
    }

    fn routes(&self, _state: ModuleContext) -> Router {
        self.routes.clone()
    }

    async fn health_check(&self) -> ModuleHealth {
        let mut health = ModuleHealth::healthy("portal-real", ModuleGroup::Core);
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
