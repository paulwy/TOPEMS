//! 真实 Search 服务接入模块（SearchRealModule）—— feature flag 控制
//!
//! 将真实 `topems-search` 服务（lib 形态）作为模块接入统一入口。
//! search 提供全文搜索、搜索建议、搜索评分等能力。
//!
//! 由 feature `module-search` 门控（core 组）。

#![cfg(feature = "module-search")]

use crate::module::{Module, ModuleContext, ModuleGroup, ModuleHealth};
use axum::routing::get;
use axum::Router;
use topems_search::handlers;
use topems_shared_bootstrap::{bootstrap_service, ServiceConfig};
use topems_shared_auth::middleware::require_permission;

/// 真实 Search 模块：持有数据库连接池 + 完整搜索路由
pub struct SearchRealModule {
    routes: Router,
    pool: sqlx::PgPool,
}

impl SearchRealModule {
    /// 异步构建真实 Search 模块
    pub async fn build() -> anyhow::Result<Self> {
        let config = ServiceConfig {
            name: "topems-search",
            port: 8092,
            port_env_var: Some("SEARCH_PORT"),
            max_db_connections: 10,
            enable_events: false,
            enable_rls: false,
            enable_request_context: false,
            api_prefix: "/api/search",
            legacy_prefixes: &["/api/v1/search"],
            init_telemetry: false,
        };

        let ctx = bootstrap_service(&config).await?;
        let _conn = ctx.db.acquire().await?;

        // 公开路由（无状态）
        let public_routes = Router::new()
            .route("/health", get(handlers::health_handler));

        // 受保护路由（需要 State<PgPool>）
        let protected_routes = Router::new()
            .route("/", get(handlers::search_handler))
            .route("/suggestions", get(handlers::suggestions_handler))
            .layer(axum::middleware::from_fn(require_permission(
                "search:admin",
            )))
            .with_state(ctx.db.clone())
            .layer(axum::middleware::from_fn_with_state(
                ctx.db.clone(),
                topems_shared_auth::tenant_middleware(),
            ));

        let routes = public_routes.merge(protected_routes);

        Ok(Self {
            routes,
            pool: ctx.db,
        })
    }
}

#[async_trait::async_trait]
impl Module for SearchRealModule {
    fn name(&self) -> &'static str {
        "search"
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
