//! 真实 EHS 服务接入模块（EhsRealModule）—— Phase B3 扩展
//!
//! 将真实 `topems-ehs` 服务（lib 形态，AppState 直传模式）作为模块接入统一入口。
//! ehs 的 `modules::create_api_routes() -> Router<AppState>` 无参，
//! AppState 由 `topems_ehs::shared::AppState` 构建（auth + pool + health + event + workflow_client + 3 caches）。
//!
//! 由 feature `module-ehs` 门控。

#![cfg(feature = "module-ehs")]

use crate::module::{Module, ModuleContext, ModuleGroup, ModuleHealth};
use axum::Router;
use std::sync::Arc;
use std::time::Duration;
use topems_ehs::modules;
use topems_ehs::shared::AppState;
use topems_shared_auth::middleware::require_permission;
use topems_shared_bootstrap::{bootstrap_service, ServiceConfig};
use topems_shared_core::health::SimpleHealthConfig;
use topems_shared_core::l2_cache::{AsyncL2Cache, L2CacheConfig};
use topems_shared_event::event::EventPublisher;
use topems_shared_service_client::service_client::api::workflow_api::WorkflowApi;
use topems_shared_service_client::TypedServiceClient;

/// 真实 EHS 模块：持有数据库连接池 + 完整业务路由
pub struct EhsRealModule {
    routes: Router,
    db: sqlx::PgPool,
    event_publisher: Option<Arc<EventPublisher>>,
}

impl EhsRealModule {
    /// 异步构建真实 EHS 模块
    pub async fn build() -> anyhow::Result<Self> {
        // search_path 优先 ehs schema
        std::env::set_var("SEARCH_PATH", "ehs, public");

        let config = ServiceConfig {
            name: "topems-ehs",
            port: 8052,
            port_env_var: Some("EHS_PORT"),
            max_db_connections: 10,
            enable_events: true,
            enable_rls: true,
            enable_request_context: true,
            api_prefix: "/api/ehs",
            legacy_prefixes: &["/api/v1/ehs"],
            // 宿主进程统一初始化全局 telemetry
            init_telemetry: false,
        };

        // 1. 服务引导：数据库连接池 + 认证 + 事件发布器 + 指标
        let ctx = bootstrap_service(&config).await?;

        // 立即建立连接，固化本连接池的 search_path
        let _conn = ctx.db.acquire().await?;

        // 2. EHS 数据库初始化（失败不阻塞）
        if let Err(e) = topems_ehs::models::init_database(&ctx.db).await {
            tracing::warn!("EHS 数据库初始化警告（不阻塞）: {}", e);
        }

        // 3. 事件订阅者：ehs 的 event_handlers 为 bin-only（main.rs 内 mod），lib 不暴露，跳过

        // 4. 工作流服务客户端（构造失败则 ehs 模块本次不注册，降级跳过）
        let jwt_secret = ctx.auth_state.jwt_secret.clone();
        let workflow_client = match TypedServiceClient::<WorkflowApi>::from_env_default()
            .and_then(|c| c.with_service_token(&jwt_secret, "ehs-module", &["workflow:read"]))
        {
            Ok(c) => c,
            Err(e) => {
                tracing::warn!("⚠️ 工作流服务客户端初始化失败，EHS 模块本次不注册: {e}");
                return Err(anyhow::anyhow!("workflow client init failed: {e}"));
            }
        };

        // 5. 多级缓存（与独立部署 main.rs 一致，L1-only 模式）
        fn ehs_l2_config(entity: &str) -> L2CacheConfig {
            L2CacheConfig {
                instance_prefix: "ehs".to_string(),
                l1_ttl: Duration::from_secs(60),
                l2_ttl: Duration::from_secs(600),
                l1_capacity: 10_000,
                ..Default::default()
            }
            .with_metrics("ehs", entity)
        }
        let hazard_cache = Arc::new(AsyncL2Cache::new_l1_only(ehs_l2_config("hazard")));
        let training_cache = Arc::new(AsyncL2Cache::new_l1_only(ehs_l2_config("training")));
        let dict_cache = Arc::new(AsyncL2Cache::<String>::new_l1_only(ehs_l2_config("dict")));

        // 6. 健康检查配置
        let health_config = SimpleHealthConfig::new("topems-ehs").with_db(ctx.db.clone());

        // 7. 构建业务 AppState（与独立部署 main.rs 一致）
        let state = AppState {
            auth_state: ctx.auth_state.clone(),
            pool: ctx.db.clone(),
            health_config,
            event_publisher: ctx.event_publisher.clone(),
            workflow_client,
            hazard_cache,
            training_cache,
            dict_cache,
        };

        // 8. 业务路由（权限中间件 + 开发验证模拟认证）
        let protected_routes = modules::create_api_routes()
            .layer(axum::middleware::from_fn_with_state(
                ctx.db.clone(),
                topems_shared_auth::tenant_middleware(),
            ))
            .layer(axum::middleware::from_fn(require_permission("ehs:admin")))
            .with_state(state);
        let routes = axum::Router::new()
            .nest(config.api_prefix, protected_routes)
            .layer(axum::middleware::from_fn_with_state(
                ctx.auth_state.clone(),
                topems_shared_auth::auth::auth_middleware,
            ));

        tracing::info!(
            "✅ 真实 ehs 模块已接入统一入口（db={}，prefix={}）",
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
impl Module for EhsRealModule {
    fn name(&self) -> &'static str {
        "ehs-real"
    }

    fn group(&self) -> ModuleGroup {
        ModuleGroup::Wms
    }

    fn routes(&self, _state: ModuleContext) -> Router {
        self.routes.clone()
    }

    async fn health_check(&self) -> ModuleHealth {
        let mut health = ModuleHealth::healthy("ehs-real", ModuleGroup::Wms);
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
