//! 真实 PM 服务接入模块（PmRealModule）—— Phase B3 扩展
//!
//! 将真实 `topems-pm` 服务（lib 形态，pool 直传模式）作为模块接入统一入口。
//! 与 Aps/Wms 不同：pm 的 create_routes 直接接收 (pool, event_publisher, workflow_client)。
//!
//! 由 feature `module-pm` 门控。

#![cfg(feature = "module-pm")]

use crate::module::{Module, ModuleContext, ModuleGroup, ModuleHealth};
use crate::modules::dev_claims::inject_dev_claims;
use axum::Router;
use std::sync::Arc;
use topems_pm::modules;
use topems_shared_auth::middleware::require_permission;
use topems_shared_bootstrap::{bootstrap_service, default_init_db, ServiceConfig};
use topems_shared_event::event::EventPublisher;
use topems_shared_service_client::service_client::api::workflow_api::WorkflowApi;
use topems_shared_service_client::TypedServiceClient;

/// 真实 PM 模块：持有数据库连接池 + 完整业务路由
pub struct PmRealModule {
    routes: Router,
    db: sqlx::PgPool,
    event_publisher: Option<Arc<EventPublisher>>,
}

impl PmRealModule {
    /// 异步构建真实 PM 模块
    pub async fn build() -> anyhow::Result<Self> {
        // search_path 优先 pm schema
        std::env::set_var("SEARCH_PATH", "pm, public, shared");

        let config = ServiceConfig {
            name: "topems-pm",
            port: 8023,
            port_env_var: Some("PM_PORT"),
            max_db_connections: 10,
            enable_events: true,
            enable_rls: true,
            enable_request_context: true,
            api_prefix: "/api/pm",
            legacy_prefixes: &["/api/v1/pm"],
            // 宿主进程统一初始化全局 telemetry
            init_telemetry: false,
            ..Default::default()
        };

        // 1. 服务引导：数据库连接池 + 认证 + 事件发布器 + 指标
        let ctx = bootstrap_service(&config).await?;

        // 立即建立连接，固化本连接池的 search_path
        let _conn = ctx.db.acquire().await?;

        // 2. PM 数据库初始化（schema_defense 迁移验证，失败不阻塞）
        if let Err(e) = default_init_db(
            &ctx.db,
            "pm",
            true,
            topems_pm::schema_defense::run_schema_migration_and_verify,
        )
        .await
        {
            tracing::warn!("PM 数据库初始化警告（不阻塞）: {}", e);
        }

        // 3. 工作流服务客户端（构造失败则 pm 模块降级跳过）
        let jwt_secret = ctx.auth_state.jwt_secret.clone();
        let workflow_client = match TypedServiceClient::<WorkflowApi>::from_env_default()
            .and_then(|c| c.with_service_token(&jwt_secret, "pm-module", &["workflow:read"]))
        {
            Ok(c) => c,
            Err(e) => {
                tracing::warn!("⚠️ 工作流服务客户端初始化失败，PM 模块本次不注册: {e}");
                return Err(anyhow::anyhow!("workflow client init failed: {e}"));
            }
        };

        // 4. 业务路由（pool 直传 + 权限中间件）
        let protected_routes =
            modules::create_routes(ctx.db.clone(), ctx.event_publisher.clone(), workflow_client)
                .layer(axum::middleware::from_fn(require_permission("pm:admin")));

        // 5. 组装路由：api_prefix + 开发验证模拟认证
        let routes = axum::Router::new()
            .nest(config.api_prefix, protected_routes)
            .layer(axum::middleware::from_fn(inject_dev_claims));

        tracing::info!(
            "✅ 真实 pm 模块已接入统一入口（db={}，prefix={}）",
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
impl Module for PmRealModule {
    fn name(&self) -> &'static str {
        "pm-real"
    }

    fn group(&self) -> ModuleGroup {
        ModuleGroup::Wms
    }

    fn routes(&self, _state: ModuleContext) -> Router {
        self.routes.clone()
    }

    async fn health_check(&self) -> ModuleHealth {
        let mut health = ModuleHealth::healthy("pm-real", ModuleGroup::Wms);
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
