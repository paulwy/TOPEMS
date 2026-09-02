//! 真实 APS 服务接入模块（ApsRealModule）—— Phase B3 扩展
//!
//! 将真实 `topems-aps` 服务（lib 形态）作为模块接入统一入口。
//! 与 WmsRealModule / ScmRealModule 相同模式：真实数据库 + 完整业务路由。
//!
//! 由 feature `module-aps` 门控。

#![cfg(feature = "module-aps")]

use crate::module::{Module, ModuleContext, ModuleGroup, ModuleHealth};
use crate::modules::dev_claims::inject_dev_claims;
use axum::Router;
use topems_aps::shared::AppState;
use topems_shared_auth::middleware::require_permission;
use topems_shared_bootstrap::{bootstrap_service, default_init_db, ServiceConfig};

/// 真实 APS 模块：持有数据库连接池 + 完整业务路由
pub struct ApsRealModule {
    routes: Router,
    api_state: AppState,
}

impl ApsRealModule {
    /// 异步构建真实 APS 模块
    pub async fn build() -> anyhow::Result<Self> {
        // search_path 优先 aps schema
        std::env::set_var("SEARCH_PATH", "aps, public, shared");

        let config = ServiceConfig {
            name: "topems-aps",
            port: 8074,
            port_env_var: Some("APS_PORT"),
            max_db_connections: 10,
            enable_events: true,
            enable_rls: true,
            enable_request_context: true,
            api_prefix: "/api/aps",
            legacy_prefixes: &["/api/v1/aps"],
            // 宿主进程统一初始化全局 telemetry
            init_telemetry: false,
            ..Default::default()
        };

        // 1. 服务引导：数据库连接池 + 认证 + 事件发布器 + 指标
        let ctx = bootstrap_service(&config).await?;

        // 立即建立连接，固化本连接池的 search_path
        let _conn = ctx.db.acquire().await?;

        // 2. APS 数据库初始化（schema_defense 迁移验证，失败不阻塞）
        if let Err(e) = default_init_db(
            &ctx.db,
            "aps",
            true,
            topems_aps::schema_defense::run_schema_migration_and_verify,
        )
        .await
        {
            tracing::warn!("APS 数据库初始化警告（不阻塞）: {}", e);
        }

        // 3. 构建业务 AppState（与独立部署 main.rs 一致）
        let state = AppState {
            db: ctx.db.clone(),
            auth_state: ctx.auth_state.clone(),
            metrics: ctx.metrics.clone(),
            start_time: ctx.start_time,
            event_publisher: ctx.event_publisher.clone(),
        };

        // 4. 业务路由（权限中间件 + with_state）
        let protected_routes = topems_aps::modules::create_routes()
            .layer(axum::middleware::from_fn(require_permission("aps:admin")))
            .with_state(state.clone());

        // 5. 组装路由：api_prefix + 开发验证模拟认证
        let routes = axum::Router::new()
            .nest(config.api_prefix, protected_routes)
            .layer(axum::middleware::from_fn(inject_dev_claims));

        tracing::info!(
            "✅ 真实 aps 模块已接入统一入口（db={}，prefix={}）",
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
impl Module for ApsRealModule {
    fn name(&self) -> &'static str {
        "aps-real"
    }

    fn group(&self) -> ModuleGroup {
        ModuleGroup::Wms
    }

    fn routes(&self, _state: ModuleContext) -> Router {
        self.routes.clone()
    }

    async fn health_check(&self) -> ModuleHealth {
        let mut health = ModuleHealth::healthy("aps-real", ModuleGroup::Wms);
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
