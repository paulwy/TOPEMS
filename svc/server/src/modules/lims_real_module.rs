//! 真实 LIMS 服务接入模块（LimsRealModule）—— Phase B3 扩展
//!
//! 将真实 `topems-lims` 服务（lib 形态，AppState 直传模式）作为模块接入统一入口。
//! lims 的 `modules::create_api_routes() -> Router<AppState>` 无参，
//! AppState 由 `topems_lims::shared::AppState` 构建（auth_state + pool + health + event + 2 caches）。
//!
//! 由 feature `module-lims` 门控。

#![cfg(feature = "module-lims")]

use crate::module::{Module, ModuleContext, ModuleGroup, ModuleHealth};
use crate::modules::dev_claims::inject_dev_claims;
use axum::Router;
use std::sync::Arc;
use std::time::Duration;
use topems_lims::modules;
use topems_lims::shared::AppState;
use topems_shared_auth::middleware::require_permission;
use topems_shared_bootstrap::{bootstrap_service, ServiceConfig};
use topems_shared_core::health::SimpleHealthConfig;
use topems_shared_core::l2_cache::{AsyncL2Cache, L2CacheConfig};
use topems_shared_event::event::EventPublisher;

/// 真实 LIMS 模块：持有数据库连接池 + 完整业务路由
pub struct LimsRealModule {
    routes: Router,
    db: sqlx::PgPool,
    event_publisher: Option<Arc<EventPublisher>>,
}

impl LimsRealModule {
    /// 异步构建真实 LIMS 模块
    pub async fn build() -> anyhow::Result<Self> {
        // search_path 优先 lims schema
        std::env::set_var("SEARCH_PATH", "lims, public");

        let config = ServiceConfig {
            name: "topems-lims",
            port: 8051,
            port_env_var: Some("LIMS_PORT"),
            max_db_connections: 20,
            enable_events: true,
            enable_rls: true,
            enable_request_context: true,
            api_prefix: "/api/lims",
            legacy_prefixes: &[],
            // 宿主进程统一初始化全局 telemetry
            init_telemetry: false,
        };

        // 1. 服务引导：数据库连接池 + 认证 + 事件发布器 + 指标
        let ctx = bootstrap_service(&config).await?;

        // 立即建立连接，固化本连接池的 search_path
        let _conn = ctx.db.acquire().await?;

        // 2. LIMS 数据库初始化（含 schema_defense 迁移验证，失败不阻塞）
        if let Err(e) = topems_lims::models::init_database(&ctx.db).await {
            tracing::warn!("LIMS 数据库初始化警告（不阻塞）: {}", e);
        }

        // 3. 事件订阅者：lims 的 event_handlers 为 bin-only（main.rs 内 mod），lib 不暴露，跳过
        //    （独立部署时由 main.rs 启动，此处不重复）

        // 4. 健康检查配置
        let health_config = SimpleHealthConfig::new("topems-lims").with_db(ctx.db.clone());

        // 5. 构建业务 AppState（与独立部署 main.rs 一致）
        fn lims_l2_config(entity: &str) -> L2CacheConfig {
            L2CacheConfig {
                instance_prefix: "lims".to_string(),
                l1_ttl: Duration::from_secs(60),
                l2_ttl: Duration::from_secs(600),
                l1_capacity: 10_000,
                ..Default::default()
            }
            .with_metrics("lims", entity)
        }
        let sample_cache = Arc::new(AsyncL2Cache::new_l1_only(lims_l2_config("sample")));
        let task_cache = Arc::new(AsyncL2Cache::new_l1_only(lims_l2_config("task")));
        let dict_cache = Arc::new(AsyncL2Cache::<String>::new_l1_only(lims_l2_config("dict")));
        let test_method_cache =
            Arc::new(AsyncL2Cache::new_l1_only(lims_l2_config("test_method")));
        let instrument_cache =
            Arc::new(AsyncL2Cache::new_l1_only(lims_l2_config("instrument")));
        let state = AppState {
            auth_state: ctx.auth_state.clone(),
            pool: ctx.db.clone(),
            health_config,
            event_publisher: ctx.event_publisher.clone(),
            sample_cache,
            task_cache,
            dict_cache,
            test_method_cache,
            instrument_cache,
        };

        // 6. 业务路由（权限中间件 + 开发验证模拟认证）
        let protected_routes = modules::create_api_routes()
            .layer(axum::middleware::from_fn_with_state(
                ctx.db.clone(),
                topems_shared_auth::tenant_middleware(),
            ))
            .layer(axum::middleware::from_fn(require_permission("lims:admin")))
            .with_state(state);

        let routes = axum::Router::new()
            .nest(config.api_prefix, protected_routes)
            .layer(axum::middleware::from_fn(inject_dev_claims));

        tracing::info!(
            "✅ 真实 lims 模块已接入统一入口（db={}，prefix={}）",
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
impl Module for LimsRealModule {
    fn name(&self) -> &'static str {
        "lims-real"
    }

    fn group(&self) -> ModuleGroup {
        ModuleGroup::Wms
    }

    fn routes(&self, _state: ModuleContext) -> Router {
        self.routes.clone()
    }

    async fn health_check(&self) -> ModuleHealth {
        let mut health = ModuleHealth::healthy("lims-real", ModuleGroup::Wms);
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
