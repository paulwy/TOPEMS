//! 真实 Unified Core 服务接入模块（UnifiedCoreRealModule）—— feature flag 控制
//!
//! 将真实 `topems-unified-core` 服务（lib 形态）作为模块接入统一入口。
//! unified-core 的全部业务组装链（IAM / Flow / File / Communication / Tenant / Billing）
//! 由 `topems_unified_core::embedded::build_router` 提供，与独立部署 main.rs 共用同一实现。
//!
//! 由 feature `module-core` 门控（默认启用，平台核心域）。

#![cfg(feature = "module-core")]

use crate::module::{Module, ModuleContext, ModuleGroup, ModuleHealth};
use axum::Router;
use std::sync::Arc;
use topems_unified_core::embedded::build_router;

/// 真实 Unified Core 模块：持有数据库连接池 + 完整业务路由
pub struct UnifiedCoreRealModule {
    routes: Router,
    db: sqlx::PgPool,
}

impl UnifiedCoreRealModule {
    /// 异步构建真实 Unified Core 模块
    pub async fn build() -> anyhow::Result<Self> {
        std::env::set_var("SEARCH_PATH", "public");

        let config = topems_shared_bootstrap::ServiceConfig {
            name: "topems-unified-core",
            port: 8000,
            port_env_var: Some("CORE_PORT"),
            max_db_connections: 20,
            enable_events: false,
            enable_rls: false,
            enable_request_context: false,
            api_prefix: "/api/core",
            legacy_prefixes: &[],
            init_telemetry: false,
        };

        let ctx = topems_shared_bootstrap::bootstrap_service(&config).await?;
        let _conn = ctx.db.acquire().await?;

        // 嵌入模式（build_router_embedded）：core 业务路由挂根（/iam/* /flow/* 等），
        // 由本模块 nest /api/core 提供统一前缀；跳过 public 冲突路由（/、/health、/api、/metrics）
        // 与 wms/mes/scm（server 已有真实模块），避免双重 /api/core 前缀与 Overlapping route。
        let routes = axum::Router::new()
            .nest(
                config.api_prefix,
                topems_unified_core::embedded::build_router_embedded(
                    ctx.db.clone(),
                    None,
                    Router::new(),
                )
                .await?,
            )
            .layer(axum::middleware::from_fn_with_state(
                ctx.auth_state.clone(),
                topems_shared_auth::auth::auth_middleware,
            ));

        Ok(Self { routes, db: ctx.db })
    }
}

#[async_trait::async_trait]
impl Module for UnifiedCoreRealModule {
    fn name(&self) -> &'static str {
        "unified-core"
    }

    fn group(&self) -> ModuleGroup {
        ModuleGroup::Core
    }

    fn routes(&self, _state: ModuleContext) -> Router {
        self.routes.clone()
    }

    async fn health_check(&self) -> ModuleHealth {
        let db_healthy = sqlx::query("SELECT 1").execute(&self.db).await.is_ok();

        if db_healthy {
            ModuleHealth::healthy(self.name(), self.group())
        } else {
            ModuleHealth::unhealthy(self.name(), self.group(), "database disconnected")
        }
    }
}
