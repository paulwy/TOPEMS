//! 真实 Plugin Registry 服务接入模块（PluginRegistryRealModule）—— feature flag 控制
//!
//! 将真实 `topems-plugin-registry` 服务（lib 形态）作为模块接入统一入口。
//! plugin-registry 提供插件管理、插件生命周期、插件市场等能力。
//!
//! 由 feature `module-plugin-registry` 门控（core 组）。

#![cfg(feature = "module-plugin-registry")]

use crate::module::{Module, ModuleContext, ModuleGroup, ModuleHealth};
use axum::Router;
use std::time::Instant;
use topems_plugin_registry::shared::AppState as PluginRegistryAppState;
use topems_shared_bootstrap::{bootstrap_service, ServiceConfig};

/// 真实 Plugin Registry 模块：持有完整业务路由
pub struct PluginRegistryRealModule {
    routes: Router,
    pool: sqlx::PgPool,
}

impl PluginRegistryRealModule {
    /// 异步构建真实 Plugin Registry 模块
    pub async fn build() -> anyhow::Result<Self> {
        let config = ServiceConfig {
            name: "topems-plugin-registry",
            port: 8091,
            port_env_var: Some("PLUGIN_REGISTRY_PORT"),
            max_db_connections: 10,
            enable_events: false,
            enable_rls: false,
            enable_request_context: false,
            api_prefix: "/api/plugins",
            legacy_prefixes: &[],
            init_telemetry: false,
        };

        let ctx = bootstrap_service(&config).await?;
        let _conn = ctx.db.acquire().await?;

        // 构建完整 AppState
        let app_state = PluginRegistryAppState {
            pool: ctx.db.clone(),
            auth_state: ctx.auth_state.clone(),
            metrics: ctx.metrics.clone(),
            start_time: Instant::now(),
        };

        // 注册完整路由
        let routes = topems_plugin_registry::modules::plugin::create_routes().with_state(app_state);

        Ok(Self {
            routes,
            pool: ctx.db,
        })
    }
}

#[async_trait::async_trait]
impl Module for PluginRegistryRealModule {
    fn name(&self) -> &'static str {
        "plugin-registry"
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
