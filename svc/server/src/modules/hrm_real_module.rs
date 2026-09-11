//! 真实 HRM 服务接入模块（HrmRealModule）—— Phase B3 扩展
//!
//! 将真实 `topems-hrm` 服务（lib 形态）作为模块接入统一入口。
//! 与 FinanceRealModule / ErpRealModule / QmsRealModule / CrmRealModule 相同模式：
//!   - 真实数据库（PgPool，经 bootstrap_service 创建）
//!   - 完整业务路由（create_routes().with_state(ApiState)）
//!   - 字段加密服务 + 内存缓存
//!
//! 由 feature `module-hrm` 门控。

#![cfg(feature = "module-hrm")]

use crate::module::{Module, ModuleContext, ModuleGroup, ModuleHealth};
use crate::modules::dev_claims::inject_dev_claims;
use axum::Router;
use std::sync::Arc;
use std::time::Duration;
use topems_hrm::modules::{hrm_plugin, ApiState};
use topems_shared::init_encryption_from_env;
use topems_shared_auth::middleware::require_permission;
use topems_shared_bootstrap::{bootstrap_service, default_init_db, ServiceConfig};
use topems_shared_core::config::CacheConfig;
use topems_shared_core::l2_cache::{AsyncL2Cache, L2CacheConfig};
use topems_shared_event::cache::InMemoryCache as EventInMemoryCache;
use topems_shared_event::redis::CacheService;

/// 真实 HRM 模块：持有数据库连接池 + 完整业务路由 + 加密/缓存
pub struct HrmRealModule {
    routes: Router,
    api_state: ApiState,
}

impl HrmRealModule {
    /// 异步构建真实 HRM 模块
    pub async fn build() -> anyhow::Result<Self> {
        // search_path 优先 hrm schema
        std::env::set_var("SEARCH_PATH", "hrm, public, shared");

        let config = ServiceConfig {
            name: "topems-hrm",
            port: 8020,
            port_env_var: Some("HRM_PORT"),
            max_db_connections: 10,
            enable_events: true,
            enable_rls: true,
            enable_request_context: true,
            api_prefix: "/api/hrm",
            legacy_prefixes: &["/api/v1/hrm"],
            // 宿主进程统一初始化全局 telemetry
            init_telemetry: false,
        };

        // 1. 服务引导：数据库连接池 + 认证 + 事件发布器 + 指标
        let ctx = bootstrap_service(&config).await?;

        // 立即建立连接，固化本连接池的 search_path
        let _conn = ctx.db.acquire().await?;

        // 2. HRM 数据库初始化（schema_defense 迁移验证，失败不阻塞）
        if let Err(e) = default_init_db(
            &ctx.db,
            "hrm",
            true,
            topems_hrm::schema_defense::run_schema_migration_and_verify,
        )
        .await
        {
            tracing::warn!("HRM 数据库初始化警告（不阻塞）: {}", e);
        }

        // 3. 字段加密服务
        let encryption = init_encryption_from_env();

        // 4. 缓存服务（内存实现，失败不阻塞；生产可换 Redis）
        let cache: Arc<dyn CacheService + Send + Sync> =
            Arc::new(EventInMemoryCache::new(CacheConfig::default()));

        // 5. 构建业务 ApiState（与独立部署 main.rs 一致）
        let l2_config = L2CacheConfig {
            instance_prefix: "hrm_server".to_string(),
            l1_ttl: Duration::from_secs(60),
            l2_ttl: Duration::from_secs(3600),
            l1_capacity: 10_000,
        };
        let state = ApiState {
            db: ctx.db.clone(),
            auth_state: ctx.auth_state.clone(),
            metrics: ctx.metrics.clone(),
            start_time: ctx.start_time,
            cache,
            encryption: Arc::new(encryption),
            event_publisher: ctx.event_publisher.clone(),
            employee_cache: Arc::new(AsyncL2Cache::new_l1_only(l2_config)),
        };

        // 6. 插件路由（lib 内 handler）
        let plugin_routes = Router::new()
            .route(
                "/plugins/info",
                axum::routing::get(hrm_plugin::get_plugin_info),
            )
            .route(
                "/plugins/health",
                axum::routing::get(hrm_plugin::plugin_health_check),
            )
            .with_state(state.clone());

        // 7. 业务路由（tenant 中间件 + 权限中间件 + with_state）
        let protected_routes = topems_hrm::modules::create_routes()
            .layer(axum::middleware::from_fn_with_state(
                ctx.db.clone(),
                topems_shared_auth::tenant_middleware(),
            ))
            .layer(axum::middleware::from_fn(require_permission("hrm:admin")))
            .with_state(state.clone());

        // 8. 组装路由：api_prefix + 插件路由 + 开发验证模拟认证
        let routes = axum::Router::new()
            .nest(config.api_prefix, protected_routes.merge(plugin_routes))
            .layer(axum::middleware::from_fn(inject_dev_claims));

        tracing::info!(
            "✅ 真实 hrm 模块已接入统一入口（db={}，prefix={}）",
            state.db.size(),
            config.api_prefix
        );

        Ok(Self {
            routes,
            api_state: state,
        })
    }
}

#[async_trait::async_trait]
impl Module for HrmRealModule {
    fn name(&self) -> &'static str {
        "hrm-real"
    }

    fn group(&self) -> ModuleGroup {
        ModuleGroup::Core
    }

    fn routes(&self, _state: ModuleContext) -> Router {
        self.routes.clone()
    }

    async fn health_check(&self) -> ModuleHealth {
        let mut health = ModuleHealth::healthy("hrm-real", ModuleGroup::Core);
        let db_ok = self.api_state.db.size() > 0;
        health.dependencies.push(crate::module::DependencyHealth {
            name: "PostgreSQL",
            healthy: db_ok,
            detail: format!("连接池大小 {}", self.api_state.db.size()),
        });
        if self.api_state.event_publisher.is_some() {
            health.dependencies.push(crate::module::DependencyHealth {
                name: "EventBus",
                healthy: true,
                detail: "事件发布器已创建".to_string(),
            });
        }
        health
    }
}
