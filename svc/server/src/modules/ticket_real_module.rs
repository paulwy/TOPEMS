//! 真实 Ticket 服务接入模块（TicketRealModule）—— 模块化单体剩余服务接入
//!
//! 将真实 `topems-ticket` 服务（lib 形态）作为模块接入统一入口。
//! ticket 使用 `handlers::ticket_routes() -> Router<Db>`（无 ApiState，简化模式），
//! 含 feedback 兼容路由（feedback 已合并至 ticket）。
//!
//! 由 feature `module-ticket` 门控（默认不启用，按客户需求裁剪）。

#![cfg(feature = "module-ticket")]

use crate::module::{Module, ModuleContext, ModuleGroup, ModuleHealth};
use axum::Router;
use std::sync::Arc;
use topems_shared_auth::middleware::require_permission;
use topems_shared_bootstrap::{bootstrap_service_shared, ServiceConfig};
use topems_shared_core::error::Result;
use topems_shared_db::scope::Db;
use topems_shared_event::event::EventPublisher;
use topems_ticket::feedback_compat;
use topems_ticket::handlers;
use topems_ticket::ticket_ext;
use topems_unified_core::middleware::tier_gate::{tier_gate_middleware, TierGateConfig};
use topems_unified_core::modules::subscription::PlanTier;

/// 真实 Ticket 模块：持有数据库作用域句柄 + 完整业务路由（ticket + feedback 兼容）
pub struct TicketRealModule {
    routes: Router,
    db: Db,
    event_publisher: Option<Arc<EventPublisher>>,
}

impl TicketRealModule {
    /// 异步构建真实 Ticket 模块
    pub async fn build() -> Result<Self> {
        let config = ServiceConfig {
            name: "topems-ticket",
            port: 8086,
            port_env_var: Some("TICKET_PORT"),
            max_db_connections: 10,
            enable_events: false,
            enable_rls: true,
            enable_request_context: true,
            api_prefix: "/api/ticket",
            legacy_prefixes: &[],
            // 宿主进程统一初始化全局 telemetry
            init_telemetry: false,
        };

        // 1. 服务引导：数据库连接池 + 认证 + 事件发布器 + 指标
        let ctx = bootstrap_service_shared(&config).await?;
        // 连接治理 B：共享池之上固化本模块 search_path（显式传值，不依赖 .env）
        let db = Db::new(ctx.db.clone(), "ticket, public");

        // 启动期连通性探测：SELECT 1 后立即归还连接（不跨 await 持有）
        topems_shared_db::database::probe_connection(&ctx.db).await?;
        db.check_health().await?;

        // 2. Ticket 数据库初始化（C-1：自建 DDL 已移除，迁移权威唯一仲裁；
        //    与独立部署 main.rs 一致，Schema 防御由宿主统一路径保障）
        // 3. 业务路由（权限中间件 + tier 治理 + 开发验证模拟认证）
        let tier_gate_config = Arc::new(TierGateConfig::new("ticket", PlanTier::Free));
        let protected_routes = handlers::ticket_routes()
            .merge(feedback_compat::feedback_compat_routes())
            .merge(ticket_ext::ticket_ext_routes())
            .layer(axum::middleware::from_fn(require_permission(
                "ticket:admin",
            )))
            .with_state(db.clone())
            // V1.3 tier 治理：ticket 为 Free 层模块（对照组，永不裁剪）
            .layer(axum::middleware::from_fn_with_state(
                tier_gate_config.clone(),
                tier_gate_middleware,
            ))
            .with_state(tier_gate_config);
        let routes = axum::Router::new()
            .nest(config.api_prefix, protected_routes)
            .layer(axum::middleware::from_fn_with_state(
                ctx.auth_state.clone(),
                topems_shared_auth::auth::auth_middleware,
            ));

        tracing::info!(
            "✅ 真实 ticket 模块已接入统一入口（db={}，prefix={}）",
            ctx.db.size(),
            config.api_prefix
        );

        Ok(Self {
            routes,
            db,
            event_publisher: ctx.event_publisher.clone(),
        })
    }
}

#[async_trait::async_trait]
impl Module for TicketRealModule {
    fn name(&self) -> &'static str {
        "ticket-real"
    }

    fn group(&self) -> ModuleGroup {
        ModuleGroup::Core
    }

    fn routes(&self, _state: ModuleContext) -> Router {
        self.routes.clone()
    }

    async fn health_check(&self) -> ModuleHealth {
        let mut health = ModuleHealth::healthy("ticket-real", ModuleGroup::Core);
        let stats = self.db.stats();
        let db_ok = stats.size > 0 && self.db.check_health().await.is_ok();
        health.dependencies.push(crate::module::DependencyHealth {
            name: "PostgreSQL",
            healthy: db_ok,
            detail: format!("连接池大小 {}", stats.size),
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
