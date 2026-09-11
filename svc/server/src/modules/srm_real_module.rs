//! 真实 SRM 服务接入模块（SrmRealModule）—— feature flag 控制
//!
//! 将真实 `topems-srm` 服务（lib 形态）作为模块接入统一入口。
//! srm 各业务模块 create_routes 自行管理内部状态（Router<()>），server 侧合并 + 认证。
//!
//! 由 feature `module-srm` 门控（默认启用，核心业务域）。

#![cfg(feature = "module-srm")]

use crate::module::{Module, ModuleContext, ModuleGroup, ModuleHealth};
use crate::modules::dev_claims::inject_dev_claims;
use axum::Router;
use std::sync::Arc;
use std::time::Duration;
use topems_shared_auth::middleware::require_permission;
use topems_shared_bootstrap::{bootstrap_service, default_init_db, ServiceConfig};
use topems_shared_core::l2_cache::{AsyncL2Cache, L2CacheConfig};
use topems_shared_event::event::EventPublisher;
use topems_shared_service_client::service_client::api::workflow_api::WorkflowApi;
use topems_shared_service_client::TypedServiceClient;
use topems_srm::modules;
use topems_srm::schema_defense;

/// 真实 SRM 模块：持有数据库连接池 + 完整业务路由
pub struct SrmRealModule {
    routes: Router,
    db: sqlx::PgPool,
    event_publisher: Option<Arc<EventPublisher>>,
}

impl SrmRealModule {
    /// 异步构建真实 SRM 模块
    pub async fn build() -> anyhow::Result<Self> {
        std::env::set_var("SEARCH_PATH", "srm, public, shared");

        let config = ServiceConfig {
            name: "topems-srm",
            port: 8042,
            port_env_var: Some("SRM_PORT"),
            max_db_connections: 10,
            enable_events: true,
            enable_rls: true,
            enable_request_context: true,
            api_prefix: "/api/srm",
            legacy_prefixes: &["/api/v1/srm"],
            init_telemetry: false,
        };

        let ctx = bootstrap_service(&config).await?;
        let _conn = ctx.db.acquire().await?;

        // DB 初始化（schema_defense 迁移验证，失败不阻塞）
        if let Err(e) = default_init_db(
            &ctx.db,
            "srm",
            false,
            schema_defense::run_schema_migration_and_verify,
        )
        .await
        {
            tracing::warn!("SRM 数据库初始化警告（不阻塞）: {}", e);
        }

        // 依赖构造（与独立部署 main.rs 一致）
        let l2_config = L2CacheConfig {
            instance_prefix: "srm_server".to_string(),
            l1_ttl: Duration::from_secs(60),
            l2_ttl: Duration::from_secs(300),
            l1_capacity: 10_000,
        };
        let supplier_cache: Arc<AsyncL2Cache<serde_json::Value>> =
            Arc::new(AsyncL2Cache::new_l1_only(l2_config));
        let jwt_secret = ctx.auth_state.jwt_secret.clone();
        let workflow_client = TypedServiceClient::<WorkflowApi>::from_env_default()
            .and_then(|c| c.with_service_token(&jwt_secret, "srm-module", &["workflow:read"]))
            .map_err(|e| anyhow::anyhow!("SRM 工作流客户端初始化失败: {e}"))?;

        let db = ctx.db.clone();
        let ep = ctx.event_publisher.clone();

        // 业务路由（各模块自管 State，merge 后叠加认证）
        let protected_routes = axum::Router::new()
            .merge(
                modules::create_supplier_routes(
                    db.clone(),
                    ep.clone(),
                    workflow_client,
                    supplier_cache,
                )
                .await?,
            )
            .merge(modules::create_category_routes(db.clone()).await?)
            .merge(modules::create_evaluation_routes(db.clone()).await?)
            .merge(modules::create_contract_routes(db.clone()).await?)
            .merge(modules::create_product_routes(db.clone()).await?)
            .merge(modules::create_purchase_order_routes(db.clone()).await?)
            .merge(modules::create_bid_price_routes(db.clone()).await?)
            .merge(modules::create_tender_routes(db.clone()).await?)
            .merge(modules::create_supplier_portal_routes(db.clone()).await?)
            .merge(modules::create_performance_routes(db.clone()).await?)
            .merge(modules::create_data_sync_routes(db.clone(), ep.clone()).await?)
            .merge(modules::create_scoring_dimension_routes(db.clone()).await?)
            .merge(modules::create_statistics_routes(db.clone()))
            .layer(axum::middleware::from_fn_with_state(
                db.clone(),
                topems_shared_auth::tenant_middleware(),
            ))
            .layer(axum::middleware::from_fn(require_permission("srm:admin")));

        let routes = axum::Router::new()
            .nest(config.api_prefix, protected_routes)
            .layer(axum::middleware::from_fn(inject_dev_claims));

        tracing::info!(
            "✅ 真实 srm 模块已接入统一入口（db={}，prefix={}）",
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
impl Module for SrmRealModule {
    fn name(&self) -> &'static str {
        "srm-real"
    }

    fn group(&self) -> ModuleGroup {
        ModuleGroup::Erp
    }

    fn routes(&self, _state: ModuleContext) -> Router {
        self.routes.clone()
    }

    async fn health_check(&self) -> ModuleHealth {
        let mut health = ModuleHealth::healthy("srm-real", ModuleGroup::Erp);
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
