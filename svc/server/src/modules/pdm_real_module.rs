//! 真实 PDM 服务接入模块（PdmRealModule）—— 统一入口
//!
//! 将真实 `topems-pdm` 服务（lib 形态）作为模块接入统一入口。
//! pdm 的 `modules::create_api_routes() -> Router<AppState>` + `shared::AppState`。
//!
//! 由 feature `module-pdm` 门控（默认启用，P2 更多模块业务 API）。

#![cfg(feature = "module-pdm")]

use crate::module::{Module, ModuleContext, ModuleGroup, ModuleHealth};
use axum::Router;
use std::sync::Arc;
use topems_pdm::modules;
use topems_pdm::shared::AppState;
use topems_shared_auth::middleware::require_permission;
use topems_shared_bootstrap::{bootstrap_service, ServiceConfig};
use topems_shared_core::health::SimpleHealthConfig;
use topems_shared_core::l2_cache::{AsyncL2Cache, L2CacheConfig};
use topems_shared_event::event::EventPublisher;

/// 真实 PDM 模块：持有数据库连接池 + 完整业务路由
pub struct PdmRealModule {
    routes: Router,
    db: sqlx::PgPool,
    event_publisher: Option<Arc<EventPublisher>>,
}

impl PdmRealModule {
    /// 异步构建真实 PDM 模块
    pub async fn build() -> anyhow::Result<Self> {
        // search_path 优先 pdm schema
        std::env::set_var("SEARCH_PATH", "pdm, public");

        let config = ServiceConfig {
            name: "topems-pdm",
            port: 8031,
            port_env_var: Some("PDM_PORT"),
            max_db_connections: 10,
            enable_events: true,
            enable_rls: true,
            enable_request_context: true,
            api_prefix: "/api/pdm",
            legacy_prefixes: &["/api/v1/pdm"],
            // 宿主进程统一初始化全局 telemetry
            init_telemetry: false,
        };

        // 1. 服务引导：数据库连接池 + 认证 + 事件发布器 + 指标
        let ctx = bootstrap_service(&config).await?;

        // 立即建立连接，固化本连接池的 search_path
        let _conn = ctx.db.acquire().await?;

        // 2. 构建业务 AppState（与独立部署 main.rs 一致）
        //    多级缓存初始化（L1: moka + L2: Redis，server 嵌入未配置 Redis 时降级纯 L1）
        let dict_cache = {
            let l2_config = L2CacheConfig::default().with_metrics("pdm", "dict");
            let redis_url = std::env::var("REDIS_URL").ok();
            match AsyncL2Cache::try_new(l2_config, redis_url.as_deref()).await {
                Ok(cache) => {
                    tracing::info!("💾 多级缓存初始化完成（PDM 嵌入模式）");
                    Arc::new(cache)
                }
                Err((cache, warn)) => {
                    tracing::warn!("💾 多级缓存初始化降级（PDM 嵌入模式）: {}", warn);
                    Arc::new(cache)
                }
            }
        };
        let state = AppState {
            auth_state: ctx.auth_state.clone(),
            pool: ctx.db.clone(),
            health_config: SimpleHealthConfig::new("topems-pdm").with_db(ctx.db.clone()),
            event_publisher: ctx.event_publisher.clone(),
            dict_cache,
        };

        // 3. 业务路由（tenant 中间件 + 权限中间件 + with_state）
        let protected_routes = modules::create_api_routes()
            .layer(axum::middleware::from_fn_with_state(
                ctx.db.clone(),
                topems_shared_auth::tenant_middleware(),
            ))
            .layer(axum::middleware::from_fn(require_permission("pdm:admin")))
            .with_state(state);

        // 4. 组装路由：api_prefix + 认证中间件
        let routes = axum::Router::new()
            .nest(config.api_prefix, protected_routes)
            .layer(axum::middleware::from_fn_with_state(
                ctx.auth_state.clone(),
                topems_shared_auth::auth::auth_middleware,
            ));

        tracing::info!(
            "✅ 真实 pdm 模块已接入统一入口（db={}，prefix={}）",
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
impl Module for PdmRealModule {
    fn name(&self) -> &'static str {
        "pdm-real"
    }

    fn group(&self) -> ModuleGroup {
        ModuleGroup::Wms
    }

    fn routes(&self, _state: ModuleContext) -> Router {
        self.routes.clone()
    }

    async fn health_check(&self) -> ModuleHealth {
        let mut health = ModuleHealth::healthy("pdm-real", ModuleGroup::Wms);
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
