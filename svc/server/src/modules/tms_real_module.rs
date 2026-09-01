//! 真实 TMS 服务接入模块（TmsRealModule）—— P3 feature flag 控制
//!
//! 将真实 `topems-tms` 服务（lib 形态）作为模块接入统一入口。
//! tms 的 `modules::create_routes::<AppState>()` 泛型路由 + `shared::AppState`。
//!
//! 由 feature `module-tms` 门控（默认不启用，按客户需求裁剪）。

#![cfg(feature = "module-tms")]

use crate::module::{Module, ModuleContext, ModuleGroup, ModuleHealth};
use crate::modules::dev_claims::inject_dev_claims;
use axum::Router;
use std::sync::Arc;
use topems_shared_auth::middleware::require_permission;
use topems_shared_bootstrap::{bootstrap_service, ServiceConfig};
use topems_shared_event::event::EventPublisher;
use topems_tms::modules;
use topems_tms::shared::AppState;

/// 真实 TMS 模块：持有数据库连接池 + 完整业务路由
pub struct TmsRealModule {
    routes: Router,
    db: sqlx::PgPool,
    event_publisher: Option<Arc<EventPublisher>>,
}

impl TmsRealModule {
    /// 异步构建真实 TMS 模块
    pub async fn build() -> anyhow::Result<Self> {
        // search_path 优先 tms schema
        std::env::set_var("SEARCH_PATH", "tms, public");

        let config = ServiceConfig {
            name: "topems-tms",
            port: 8073,
            port_env_var: Some("TMS_PORT"),
            max_db_connections: 10,
            enable_events: true,
            enable_rls: true,
            enable_request_context: true,
            api_prefix: "/api/tms",
            legacy_prefixes: &["/api/v1/tms"],
            // 宿主进程统一初始化全局 telemetry
            init_telemetry: false,
        };

        // 1. 服务引导：数据库连接池 + 认证 + 事件发布器 + 指标
        let ctx = bootstrap_service(&config).await?;

        // 立即建立连接，固化本连接池的 search_path
        let _conn = ctx.db.acquire().await?;

        // 2. TMS 数据库初始化（含 schema_defense 迁移验证，失败不阻塞）
        if let Err(e) = topems_tms::schema_defense::run_schema_migration_and_verify(&ctx.db).await {
            tracing::warn!("TMS 数据库初始化警告（不阻塞）: {}", e);
        }

        // 3. 构建业务 AppState（与独立部署 main.rs 一致）
        let state = AppState {
            db: ctx.db.clone(),
            auth_state: ctx.auth_state.clone(),
            metrics: ctx.metrics.clone(),
            start_time: ctx.start_time,
            event_publisher: ctx.event_publisher.clone(),
        };

        // 4. 业务路由（权限中间件 + 开发验证模拟认证）
        let protected_routes = modules::create_routes::<AppState>()
            .layer(axum::middleware::from_fn_with_state(
                ctx.db.clone(),
                topems_shared_auth::tenant_middleware(),
            ))
            .layer(axum::middleware::from_fn(require_permission("tms:admin")))
            .with_state(state);

        let routes = axum::Router::new()
            .nest(config.api_prefix, protected_routes)
            .layer(axum::middleware::from_fn(inject_dev_claims));

        tracing::info!(
            "✅ 真实 tms 模块已接入统一入口（db={}，prefix={}）",
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
impl Module for TmsRealModule {
    fn name(&self) -> &'static str {
        "tms-real"
    }

    fn group(&self) -> ModuleGroup {
        ModuleGroup::Wms
    }

    fn routes(&self, _state: ModuleContext) -> Router {
        self.routes.clone()
    }

    async fn health_check(&self) -> ModuleHealth {
        let mut health = ModuleHealth::healthy("tms-real", ModuleGroup::Wms);
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
