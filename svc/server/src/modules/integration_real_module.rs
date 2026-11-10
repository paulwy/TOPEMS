//! 真实 Integration 服务接入模块（IntegrationRealModule）—— feature flag 控制
//!
//! 将真实 `topems-integration` 服务（lib 形态）作为模块接入统一入口。
//! integration 提供系统集成、数据同步、跨服务协调等能力。
//!
//! 由 feature `module-integration` 门控（core 组）。

#![cfg(feature = "module-integration")]

use crate::module::{Module, ModuleContext, ModuleGroup, ModuleHealth};
use axum::Router;
use std::sync::Arc;
use topems_integration::mes_erp_sync::MesErpSyncService;
use topems_integration::models::AppState as IntegrationAppState;
use topems_shared_bootstrap::{bootstrap_service_shared, ServiceConfig};
use topems_shared_core::error::Result;
use topems_shared_db::scope::Db;

/// 真实 Integration 模块：持有完整业务路由
pub struct IntegrationRealModule {
    routes: Router,
    db: Db,
}

impl IntegrationRealModule {
    /// 异步构建真实 Integration 模块
    pub async fn build() -> Result<Self> {
        // 与独立 integration 服务一致：search_path 由业务 Db 作用域显式设置，
        // 不再修改进程级 SEARCH_PATH（避免污染宿主其他模块的会话基线）。
        let config = ServiceConfig {
            name: "topems-integration",
            port: 8094,
            port_env_var: Some("INTEGRATION_PORT"),
            max_db_connections: 10,
            enable_events: false,
            enable_rls: true,
            enable_request_context: false,
            api_prefix: "/api/integration",
            legacy_prefixes: &[],
            init_telemetry: false,
        };

        let ctx = bootstrap_service_shared(&config).await?;
        topems_shared_db::database::probe_connection(&ctx.db).await?;
        let db = Db::new(ctx.db.clone(), "integration, public");

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
            db.clone(),
            mes_url.clone(),
            erp_url.clone(),
        ));

        // 构建完整 AppState
        let app_state = IntegrationAppState {
            db: db.clone(),
            lims_url,
            qms_url,
            mes_url,
            erp_url,
            wms_url,
            scm_url,
            auth_state: ctx.auth_state.clone(),
            mes_erp_sync_service,
        };

        // 注册完整路由：integration create_routes_embedded 内部已用 register_routes_with_legacy_alias
        // 自带 /api/integration 前缀（public /api/plugins/* + protected），merge 避免双重前缀
        // 且跳过 / 与 /health（与宿主根路由冲突）
        let routes = axum::Router::new()
            .merge(topems_integration::routes::create_routes_embedded(
                app_state,
                ctx.db.clone(),
            ))
            .layer(axum::middleware::from_fn_with_state(
                ctx.auth_state.clone(),
                topems_shared_auth::auth::auth_middleware,
            ));

        Ok(Self { routes, db })
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
        let db_healthy = self.db.check_health().await.is_ok();
        let stats = self.db.stats();
        tracing::debug!(
            pool_size = stats.size,
            pool_idle = stats.idle,
            pool_max = stats.max,
            "[integration] 健康检查连接池统计"
        );

        if db_healthy {
            ModuleHealth::healthy(self.name(), self.group())
        } else {
            ModuleHealth::unhealthy(self.name(), self.group(), "database disconnected")
        }
    }
}
