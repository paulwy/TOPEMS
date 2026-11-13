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
use topems_shared_auth::middleware::{require_module_access, require_module_write};
use topems_shared_bootstrap::{bootstrap_service_shared, ServiceConfig};
use topems_shared_core::error::Result;
use topems_shared_db::scope::Db;

/// 真实 Monitor 模块：持有完整业务路由
pub struct MonitorRealModule {
    routes: Router,
    db: Db,
}

impl MonitorRealModule {
    /// 异步构建真实 Monitor 模块
    pub async fn build() -> Result<Self> {
        let config = ServiceConfig {
            name: "topems-monitor",
            port: 8090,
            port_env_var: Some("MONITOR_PORT"),
            max_db_connections: 10,
            enable_events: false,
            enable_rls: true,
            enable_request_context: false,
            api_prefix: "/api/monitor",
            legacy_prefixes: &[],
            init_telemetry: false,
        };

        let ctx = bootstrap_service_shared(&config).await?;
        // 沿用模块原有 SEARCH_PATH：public。
        let db = Db::new(ctx.db.clone(), "public");
        db.check_health().await?;

        // 构建完整 AppState
        let app_state = MonitorAppState {
            db: db.clone(),
            auth_state: ctx.auth_state.clone(),
            metrics: ctx.metrics.clone(),
            start_time: Instant::now(),
            bff_url: std::env::var("MONITOR_BFF_URL")
                .unwrap_or_else(|_| "http://127.0.0.1:8099".to_string()),
        };

        // 注册完整路由
        let routes = axum::Router::new()
            .nest(
                config.api_prefix,
                topems_monitor::modules::create_routes().with_state(app_state),
            )
            // 与独立部署 :8095 同口径：模块门（monitor: 前缀任一码）+ 写动作门
            // （告警确认、规则增删等非只读方法仍要求 monitor:admin）。
            .layer(axum::middleware::from_fn(require_module_write("monitor")))
            .layer(axum::middleware::from_fn(require_module_access("monitor")))
            .layer(axum::middleware::from_fn_with_state(
                ctx.auth_state.clone(),
                topems_shared_auth::auth::auth_middleware,
            ));

        Ok(Self { routes, db })
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
        let db_healthy = self.db.check_health().await.is_ok();

        if db_healthy {
            ModuleHealth::healthy(self.name(), self.group())
        } else {
            ModuleHealth::unhealthy(self.name(), self.group(), "database disconnected")
        }
    }
}
