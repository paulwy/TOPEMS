//! 真实 CRM 服务接入模块（CrmRealModule）—— Phase B3 扩展
//!
//! 将真实 `topems-crm` 服务（lib 形态）作为模块接入统一入口。
//! 与 FinanceRealModule / ErpRealModule / QmsRealModule 相同模式：
//!   - 真实数据库（PgPool，经 bootstrap_service 创建）
//!   - 完整业务路由（create_routes().with_state(ApiState)）
//!   - 字段加密服务 + ERP/WMS/Workflow 服务客户端 + 内存缓存
//!
//! 由 feature `module-crm` 门控。
//! crm 的 ApiState 定义在 lib 的 modules 中，字段含加密/客户端/缓存，
//! 构造方式与独立部署 main.rs 保持一致。

#![cfg(feature = "module-crm")]

use crate::module::{Module, ModuleContext, ModuleGroup, ModuleHealth};
use crate::modules::dev_claims::inject_dev_claims;
use axum::Router;
use std::sync::Arc;
use std::time::Duration;
use topems_crm::modules::{crm_plugin, ApiState};
use topems_crm::shared::InMemoryCache;
use topems_shared_auth::middleware::require_permission;
use topems_shared_bootstrap::{bootstrap_service, default_init_db, ServiceConfig};
use topems_shared_service_client::service_client::{
    ErpApi, TypedServiceClient, WmsApi, WorkflowApi,
};

/// 真实 CRM 模块：持有数据库连接池 + 完整业务路由 + 加密/客户端/缓存
pub struct CrmRealModule {
    routes: Router,
    api_state: ApiState,
}

impl CrmRealModule {
    /// 异步构建真实 CRM 模块
    pub async fn build() -> anyhow::Result<Self> {
        // search_path 优先 crm schema
        std::env::set_var("SEARCH_PATH", "crm, public, shared");

        let config = ServiceConfig {
            name: "topems-crm",
            port: 8029,
            port_env_var: Some("CRM_PORT"),
            max_db_connections: 10,
            enable_events: true,
            enable_rls: true,
            enable_request_context: true,
            api_prefix: "/api/crm",
            legacy_prefixes: &["/api/v1/crm"],
            // 宿主进程统一初始化全局 telemetry
            init_telemetry: false,
        };

        // 1. 服务引导：数据库连接池 + 认证 + 事件发布器 + 指标
        let ctx = bootstrap_service(&config).await?;

        // 立即建立连接，固化本连接池的 search_path
        let _conn = ctx.db.acquire().await?;

        // 2. CRM 数据库初始化（schema_defense 迁移验证，失败不阻塞）
        if let Err(e) = default_init_db(
            &ctx.db,
            "crm",
            true,
            topems_crm::schema_defense::run_schema_migration_and_verify,
        )
        .await
        {
            tracing::warn!("CRM 数据库初始化警告（不阻塞）: {}", e);
        }

        // 2.1 事件订阅者（消费业务事件写 interactions 等，失败不阻塞）
        if let Err(e) = topems_crm::event_handlers::start_event_subscribers(ctx.db.clone()).await {
            tracing::warn!("CRM 事件订阅者启动失败（不阻塞）: {}", e);
        }

        // 3. 字段加密服务
        let encryption_service = topems_shared::init_encryption_from_env();

        // 4. ERP / WMS / Workflow 服务客户端（ERP/WMS 失败不阻塞，联动功能优雅降级）
        let jwt_secret = ctx.auth_state.jwt_secret.clone();
        let erp_client = TypedServiceClient::<ErpApi>::from_env_default().and_then(|c| c.with_service_token(&jwt_secret, "crm-module", &["erp:admin"]))
            .ok()
            .map(Arc::new);
        let wms_client = TypedServiceClient::<WmsApi>::from_env_default().and_then(|c| c.with_service_token(&jwt_secret, "crm-module", &["wms:admin"]))
            .ok()
            .map(Arc::new);
        let workflow_client = TypedServiceClient::<WorkflowApi>::from_env_default().and_then(|c| c.with_service_token(&jwt_secret, "crm-module", &["workflow:read"]))
            .map_err(|e| anyhow::anyhow!("工作流服务客户端初始化失败: {}", e))?;

        // 5. 构建业务 ApiState（与独立部署 main.rs 一致）
        let state = ApiState {
            db: ctx.db.clone(),
            auth_state: ctx.auth_state.clone(),
            metrics: ctx.metrics.clone(),
            start_time: ctx.start_time,
            encryption: Arc::new(encryption_service),
            event_publisher: ctx.event_publisher.clone(),
            erp_client,
            wms_client,
            workflow_client,
            customer_cache: Arc::new(InMemoryCache::new(Duration::from_secs(3600))),
            dashboard_cache: Arc::new(InMemoryCache::new(Duration::from_secs(300))),
        };

        // 6. 插件路由（lib 内 handler）
        let plugin_routes = Router::new()
            .route(
                "/plugins/info",
                axum::routing::get(crm_plugin::get_plugin_info),
            )
            .route(
                "/plugins/health",
                axum::routing::get(crm_plugin::plugin_health_check),
            )
            .with_state(state.clone());

        // 7. 业务路由（tenant 中间件 + 权限中间件 + with_state）
        let protected_routes = topems_crm::modules::create_routes()
            .layer(axum::middleware::from_fn_with_state(
                ctx.db.clone(),
                topems_shared_auth::tenant_middleware(),
            ))
            .layer(axum::middleware::from_fn(require_permission("crm:admin")))
            .with_state(state.clone());

        // 8. 组装路由：api_prefix + 插件路由 + 开发验证模拟认证
        let routes = axum::Router::new()
            .nest(config.api_prefix, protected_routes.merge(plugin_routes))
            .layer(axum::middleware::from_fn(inject_dev_claims));

        tracing::info!(
            "✅ 真实 crm 模块已接入统一入口（db={}，prefix={}）",
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
impl Module for CrmRealModule {
    fn name(&self) -> &'static str {
        "crm-real"
    }

    fn group(&self) -> ModuleGroup {
        ModuleGroup::Crm
    }

    fn routes(&self, _state: ModuleContext) -> Router {
        self.routes.clone()
    }

    async fn health_check(&self) -> ModuleHealth {
        let mut health = ModuleHealth::healthy("crm-real", ModuleGroup::Crm);
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
