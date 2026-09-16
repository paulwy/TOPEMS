//! 真实 Integration 服务接入模块（IntegrationRealModule）—— feature flag 控制
//!
//! 将真实 `topems-integration` 服务（lib 形态）作为模块接入统一入口。
//! integration 提供系统集成、数据同步、跨服务协调等能力。
//!
//! 由 feature `module-integration` 门控（core 组）。

#![cfg(feature = "module-integration")]

use crate::module::{Module, ModuleContext, ModuleGroup, ModuleHealth};
use axum::routing::get;
use axum::Router;
use std::sync::Arc;
use topems_integration::mes_erp_sync::MesErpSyncService;
use topems_integration::models::AppState as IntegrationAppState;
use topems_shared_bootstrap::{bootstrap_service, ServiceConfig};

/// 真实 Integration 模块：持有完整业务路由
pub struct IntegrationRealModule {
    routes: Router,
    pool: sqlx::PgPool,
}

impl IntegrationRealModule {
    /// 异步构建真实 Integration 模块
    pub async fn build() -> anyhow::Result<Self> {
        let config = ServiceConfig {
            name: "topems-integration",
            port: 8094,
            port_env_var: Some("INTEGRATION_PORT"),
            max_db_connections: 10,
            enable_events: false,
            enable_rls: false,
            enable_request_context: false,
            api_prefix: "/api/integration",
            legacy_prefixes: &[],
            init_telemetry: false,
        };

        let ctx = bootstrap_service(&config).await?;
        let _conn = ctx.db.acquire().await?;

        // 从环境变量获取服务 URL
        let lims_url = std::env::var("LIMS_SERVICE_URL")
            .unwrap_or_else(|_| "http://localhost:8040".to_string());
        let qms_url = std::env::var("QMS_SERVICE_URL")
            .unwrap_or_else(|_| "http://localhost:8030".to_string());
        let mes_url = std::env::var("MES_SERVICE_URL")
            .unwrap_or_else(|_| "http://localhost:8030".to_string());
        let erp_url = std::env::var("ERP_SERVICE_URL")
            .unwrap_or_else(|_| "http://localhost:8010".to_string());
        let wms_url = std::env::var("WMS_SERVICE_URL")
            .unwrap_or_else(|_| "http://localhost:8020".to_string());
        let scm_url = std::env::var("SCM_SERVICE_URL")
            .unwrap_or_else(|_| "http://localhost:8050".to_string());

        // 构建 MesErpSyncService
        let mes_erp_sync_service = Arc::new(MesErpSyncService::new(
            ctx.db.clone(),
            mes_url.clone(),
            erp_url.clone(),
        ));

        // 构建完整 AppState
        let app_state = IntegrationAppState {
            pool: ctx.db.clone(),
            lims_url,
            qms_url,
            mes_url,
            erp_url,
            wms_url,
            scm_url,
            auth_state: ctx.auth_state.clone(),
            mes_erp_sync_service,
        };

        // 注册完整路由
        let routes = axum::Router::new()
            .nest(config.api_prefix, topems_integration::routes::create_routes(app_state))
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
impl Module for IntegrationRealModule {
    fn name(&self) -> &'static str {
        "integration"
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
