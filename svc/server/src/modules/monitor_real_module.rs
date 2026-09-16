//! 真实 Monitor 服务接入模块（MonitorRealModule）—— feature flag 控制
//!
//! 将真实 `topems-monitor` 服务（lib 形态）作为模块接入统一入口。
//! monitor 提供系统监控、指标采集、告警管理、SLO 等能力。
//!
//! 由 feature `module-monitor` 门控（core 组）。

#![cfg(feature = "module-monitor")]

use crate::module::{Module, ModuleContext, ModuleGroup, ModuleHealth};
use axum::Router;
use std::time::Instant;
use topems_monitor::shared::AppState as MonitorAppState;
use topems_shared_bootstrap::{bootstrap_service, ServiceConfig};

/// 真实 Monitor 模块：持有完整业务路由
pub struct MonitorRealModule {
    routes: Router,
    pool: sqlx::PgPool,
}

impl MonitorRealModule {
    /// 异步构建真实 Monitor 模块
    pub async fn build() -> anyhow::Result<Self> {
        let config = ServiceConfig {
            name: "topems-monitor",
            port: 8090,
            port_env_var: Some("MONITOR_PORT"),
            max_db_connections: 10,
            enable_events: false,
            enable_rls: false,
            enable_request_context: false,
            api_prefix: "/api/monitor",
            legacy_prefixes: &[],
            init_telemetry: false,
        };

        let ctx = bootstrap_service(&config).await?;
        let _conn = ctx.db.acquire().await?;

        // 构建完整 AppState
        let app_state = MonitorAppState {
            pool: ctx.db.clone(),
            auth_state: ctx.auth_state.clone(),
            metrics: ctx.metrics.clone(),
            start_time: Instant::now(),
        };

        // 注册完整路由
        let routes = axum::Router::new()
            .nest(config.api_prefix, topems_monitor::modules::create_routes().with_state(app_state))
            .layer(axum::middleware::from_fn_with_state(
                ctx.auth_state.clone(),
                topems_shared_auth::auth::auth_middleware,
            ));

        Ok(Self {
            routes,
            pool: ctx.db,
        })
    }
}

#[async_trait::async_trait]
impl Module for MonitorRealModule {
    fn name(&self) -> &'static str {
        "monitor"
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
