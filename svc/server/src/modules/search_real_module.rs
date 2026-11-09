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
    ///
    /// `server_port`：宿主单体实际监听端口。search 的投影回填需要访问 erp 的
    /// `/api/erp/internal/searchable-snapshot`，单体形态下 erp 与 search 同进程，
    /// 回环地址由宿主端口推导（不读 `ERP_URL`、不写死 8010——那会让请求打到
    /// 不存在的独立 erp 端口，只打 warn 静默失败）。
    pub async fn build(server_port: u16) -> Result<Self> {
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

        // 单体形态投影回填：erp 与本模块同进程，回环 + 自签服务令牌，
        // 不再依赖 ERP_URL / BACKFILL_TOKEN 环境变量（缺失时独立进程会 error 跳过）。
        // 模块 build 发生在 HTTP 监听 bind 之前，首次请求必然 connection refused：
        // 因此投递到后台任务，等待监听就绪并有限重试；最终失败打 error 而不是静默 warn。
        let erp_base = format!("http://127.0.0.1:{server_port}");
        match topems_shared_auth::service::issue_service_token(
            &ctx.auth_state.jwt_secret,
            "search-backfill-service",
            &["*"],
            Some(10 * 365 * 24 * 3600),
        ) {
            Ok(token) => {
                let backfill_db = db.clone();
                tokio::spawn(async move {
                    const MAX_ATTEMPTS: u32 = 6;
                    for attempt in 1..=MAX_ATTEMPTS {
                        // 首次等待监听 bind（2s），之后按 3s 退避
                        let delay = if attempt == 1 { 2 } else { 3 };
                        tokio::time::sleep(std::time::Duration::from_secs(delay)).await;
                        if topems_search::projection::backfill_projections_with(
                            &backfill_db,
                            &erp_base,
                            &token,
                        )
                        .await
                        {
                            tracing::info!(
                                "[search] 单体形态投影回填完成（endpoint={}，第 {} 次尝试）",
                                erp_base,
                                attempt
                            );
                            return;
                        }
                        tracing::warn!(
                            "[search] 单体形态投影回填第 {}/{} 次失败（endpoint={}），继续重试",
                            attempt,
                            MAX_ATTEMPTS,
                            erp_base
                        );
                    }
                    tracing::error!(
                        "[search] 单体形态投影回填 {} 次均失败（endpoint={}）：搜索投影仅靠事件增量，\
                         历史数据缺口无法补齐，请检查 erp 快照端点与 JWT_SECRET 一致性",
                        MAX_ATTEMPTS,
                        erp_base
                    );
                });
            }
            Err(e) => {
                tracing::error!(
                    "[search] 自签 backfill 服务令牌失败，跳过投影回填（历史数据不会被补全）: {}",
                    e
                );
            }
        }

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
