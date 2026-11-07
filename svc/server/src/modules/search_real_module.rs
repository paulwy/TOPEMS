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
use topems_shared_auth::middleware::{require_module_access, require_module_write};
use topems_shared_bootstrap::{bootstrap_service_shared, ServiceConfig};
use topems_shared_core::error::Result;
use topems_shared_db::scope::Db;

/// 真实 Search 模块：持有作用域化数据库句柄 + 完整搜索路由
pub struct SearchRealModule {
    routes: Router,
    db: Db,
}

impl SearchRealModule {
    /// 异步构建真实 Search 模块
    pub async fn build() -> Result<Self> {
        let config = ServiceConfig {
            name: "topems-search",
            port: 8092,
            port_env_var: Some("SEARCH_PORT"),
            max_db_connections: 10,
            enable_events: false,
            enable_rls: true,
            enable_request_context: false,
            api_prefix: "/api/search",
            legacy_prefixes: &[],
            init_telemetry: false,
        };

        let ctx = bootstrap_service_shared(&config).await?;
        // 连接治理 B：批次 2 并池收口——search 不再自建池，与批 1/批 2 其它模块共用
        // 进程级共享运行时池（预算权重计入 SHARED_POOL_MODULE_WEIGHT）。
        // 作用域沿用模块原有 SEARCH_PATH：public。
        let db = Db::new(ctx.db.clone(), "public");

        // 对齐独立进程 main.rs：自举投影表 + 启动事件订阅者 + 差距对账（best-effort，
        // 失败不阻塞——投影未就绪时搜索为空结果，待事件追平）。
        if let Err(e) = topems_search::projection::init_projection_table(&db).await {
            tracing::warn!("⚠️ search 投影表自举失败: {}", e);
        }
        if let Err(e) = topems_search::projection::start_projection_subscriber(db.clone()).await {
            tracing::warn!("⚠️ search 投影订阅者启动失败: {}", e);
        }
        topems_search::projection::backfill_projections(&db).await;

        // 公开路由（无状态）
        let public_routes =
            Router::new().route("/api/search/health", get(handlers::health_handler));

        // 受保护路由（模块 State 为 Db，无直接 PgPool）
        // 直接用全路径挂载而非 nest：同时挂 /api/search 与 /api/search/ 两种形态，
        // 兼容前端无尾斜杠与带尾斜杠调用（axum 0.8 route 严格匹配，不自动重定向）。
        let protected_routes = Router::new()
            .route("/api/search", get(handlers::search_handler))
            .route("/api/search/", get(handlers::search_handler))
            .route(
                "/api/search/suggestions",
                get(handlers::suggestions_handler),
            )
            .route("/api/search/recent", get(handlers::list_recent))
            .route(
                "/api/search/recent",
                axum::routing::delete(handlers::clear_recent),
            )
            // 与独立部署 :8082 同口径：DELETE /api/search/recent 仍要求 search:admin。
            .layer(axum::middleware::from_fn(require_module_write("search")))
            .layer(axum::middleware::from_fn(require_module_access("search")))
            .with_state(db.clone())
            .layer(axum::middleware::from_fn_with_state(
                ctx.db.clone(),
                topems_shared_auth::tenant_middleware(),
            ));

        let routes =
            public_routes
                .merge(protected_routes)
                .layer(axum::middleware::from_fn_with_state(
                    ctx.auth_state.clone(),
                    topems_shared_auth::auth::auth_middleware,
                ));

        Ok(Self { routes, db })
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
        let db_healthy = self.db.check_health().await.is_ok();

        if db_healthy {
            ModuleHealth::healthy(self.name(), self.group())
        } else {
            ModuleHealth::unhealthy(self.name(), self.group(), "database disconnected")
        }
    }
}
