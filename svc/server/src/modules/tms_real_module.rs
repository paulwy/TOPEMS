//! 真实 TMS 服务接入模块（TmsRealModule）—— P3 feature flag 控制
//!
//! 将真实 `topems-tms` 服务（lib 形态）作为模块接入统一入口。
//! tms 的 `modules::create_routes::<AppState>()` 泛型路由 + `shared::AppState`。
//!
//! 由 feature `module-tms` 门控（默认不启用，按客户需求裁剪）。

#![cfg(feature = "module-tms")]

use crate::module::{Module, ModuleContext, ModuleGroup, ModuleHealth};
use axum::Router;
use std::sync::Arc;
use topems_shared_auth::middleware::require_module_access;
use topems_shared_bootstrap::{bootstrap_service_shared, ServiceConfig};
use topems_shared_core::error::Result;
use topems_shared_core::l2_cache::{AsyncL2Cache, L2CacheConfig};
use topems_shared_db::scope::Db;
use topems_shared_event::event::EventPublisher;
use topems_tms::modules;
use topems_tms::shared::AppState;

/// 真实 TMS 模块：持有数据库作用域句柄 + 完整业务路由
pub struct TmsRealModule {
    routes: Router,
    db: Db,
    event_publisher: Option<Arc<EventPublisher>>,
}

impl TmsRealModule {
    /// 异步构建真实 TMS 模块
    pub async fn build() -> Result<Self> {
        let config = ServiceConfig {
            name: "topems-tms",
            port: 8073,
            port_env_var: Some("TMS_PORT"),
            max_db_connections: 10,
            enable_events: true,
            enable_rls: true,
            enable_request_context: true,
            api_prefix: "/api/tms",
            legacy_prefixes: &[],
            // 宿主进程统一初始化全局 telemetry
            init_telemetry: false,
        };

        // 1. 服务引导：数据库连接池 + 认证 + 事件发布器 + 指标
        let ctx = bootstrap_service_shared(&config).await?;
        // 连接治理 B：共享池之上固化本模块 search_path（显式传值，不依赖 .env）
        let db = Db::new(ctx.db.clone(), "tms, public");

        // 启动期连通性探测：SELECT 1 后立即归还连接（不跨 await 持有）
        topems_shared_db::database::probe_connection(&ctx.db).await?;

        // 2. TMS 数据库初始化（含 schema_defense 迁移验证，失败不阻塞）
        if let Err(e) = topems_tms::schema_defense::run_schema_migration_and_verify(&ctx.db).await {
            tracing::warn!("TMS 数据库初始化警告（不阻塞）: {}", e);
        }

        // 3. 构建业务 AppState（与独立部署 main.rs 一致）
        //    多级缓存初始化（L1: moka + L2: Redis，server 嵌入未配置 Redis 时降级纯 L1）
        let dict_cache = {
            let l2_config = L2CacheConfig::default().with_metrics("tms", "dict");
            let redis_url = std::env::var("REDIS_URL").ok();
            match AsyncL2Cache::try_new(l2_config, redis_url.as_deref()).await {
                Ok(cache) => {
                    tracing::info!("💾 多级缓存初始化完成（TMS 嵌入模式）");
                    Arc::new(cache)
                }
                Err((cache, warn)) => {
                    tracing::warn!("💾 多级缓存初始化降级（TMS 嵌入模式）: {}", warn);
                    Arc::new(cache)
                }
            }
        };
        let state = AppState {
            db: db.clone(),
            auth_state: ctx.auth_state.clone(),
            metrics: ctx.metrics.clone(),
            start_time: ctx.start_time,
            event_publisher: ctx.event_publisher.clone(),
            dict_cache,
        };

        // 4. 业务路由（权限中间件 + 开发验证模拟认证）
        let protected_routes = modules::create_routes::<AppState>()
            .layer(axum::middleware::from_fn_with_state(
                ctx.db.clone(),
                topems_shared_auth::tenant_middleware(),
            ))
            .layer(axum::middleware::from_fn(require_module_access("tms")))
            .with_state(state);
        let routes = axum::Router::new()
            .nest(config.api_prefix, protected_routes)
            .layer(axum::middleware::from_fn_with_state(
                ctx.auth_state.clone(),
                topems_shared_auth::auth::auth_middleware,
            ));

        tracing::info!(
            "✅ 真实 tms 模块已接入统一入口（db={}，prefix={}）",
            ctx.db.size(),
            config.api_prefix
        );

        Ok(Self {
            routes,
            db,
            event_publisher: ctx.event_publisher.clone(),
        })
    }
}

#[async_trait::async_trait]
impl Module for TmsRealModule {
    fn name(&self) -> &'static str {
        "tms-real"
    }

    fn group(&self) -> ModuleGroup {
        ModuleGroup::Wms
    }

    fn routes(&self, _state: ModuleContext) -> Router {
        self.routes.clone()
    }

    async fn health_check(&self) -> ModuleHealth {
        let mut health = ModuleHealth::healthy("tms-real", ModuleGroup::Wms);
        let stats = self.db.stats();
        let db_ok = stats.size > 0;
        health.dependencies.push(crate::module::DependencyHealth {
            name: "PostgreSQL",
            healthy: db_ok,
            detail: format!("连接池大小 {}", stats.size),
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
