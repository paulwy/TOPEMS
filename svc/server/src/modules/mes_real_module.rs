//! 真实 MES 服务接入模块（MesRealModule）—— Phase B3 扩展
//!
//! 将真实 `topems-mes` 服务（lib 形态，AppState 直传模式）作为模块接入统一入口。
//! mes 的 `modules::create_routes() -> Router<AppState>` 无参（与 pm 不同），
//! AppState 由 `topems_mes::shared::AppState` 构建（auth_state + pool + health + event_publisher）。
//!
//! 由 feature `module-mes` 门控。

#![cfg(feature = "module-mes")]

use crate::module::{Module, ModuleContext, ModuleGroup, ModuleHealth};
use crate::modules::dev_claims::inject_dev_claims;
use axum::Router;
use std::sync::Arc;
use topems_mes::{modules, AppState};
use topems_shared_auth::middleware::require_permission;
use topems_shared_bootstrap::{bootstrap_service, ServiceConfig};
use topems_shared_core::health::SimpleHealthConfig;
use topems_shared_event::event::EventPublisher;
use topems_shared_service_client::service_client::{api::erp_api::ErpApi, TypedServiceClient};

/// 真实 MES 模块：持有数据库连接池 + 完整业务路由
pub struct MesRealModule {
    routes: Router,
    db: sqlx::PgPool,
    event_publisher: Option<Arc<EventPublisher>>,
}

impl MesRealModule {
    /// 异步构建真实 MES 模块
    pub async fn build() -> anyhow::Result<Self> {
        // search_path 优先 mes schema
        std::env::set_var("SEARCH_PATH", "mes, public");

        let config = ServiceConfig {
            name: "topems-mes",
            port: 8030,
            port_env_var: Some("MES_PORT"),
            max_db_connections: 10,
            enable_events: true,
            enable_request_context: true,
            api_prefix: "/api/mes",
            legacy_prefixes: &["/api/v1/mes"],
            // 宿主进程统一初始化全局 telemetry
            ..Default::default()
        };

        // 1. 服务引导：数据库连接池 + 认证 + 事件发布器 + 指标
        let ctx = bootstrap_service(&config).await?;

        // 立即建立连接，固化本连接池的 search_path
        let _conn = ctx.db.acquire().await?;

        // 2. MES 数据库初始化（增量迁移，失败不阻塞）
        if let Err(e) = modules::init_database(&ctx.db).await {
            tracing::warn!("MES 数据库初始化警告（不阻塞）: {}", e);
        }

        // 3. Schema 防御：增量迁移 + 一致性自检（失败不阻塞）
        if let Err(e) = topems_shared_db::schema::run_schema_defense(
            &ctx.db,
            topems_mes::models::schema_defense::SERVICE_SCHEMA,
            topems_mes::models::schema_defense::TABLE_DEFS,
            "mes",
        )
        .await
        {
            tracing::warn!("[mes schema 防御] 非阻塞警告: {}", e);
        }

        // 4. 健康检查配置
        let health_config = SimpleHealthConfig::new("topems-mes").with_db(ctx.db.clone());

        // 5. 构建业务 AppState（与独立部署 main.rs 一致）
        let state = AppState {
            auth_state: ctx.auth_state.clone(),
            pool: ctx.db.clone(),
            health_config,
            event_publisher: ctx.event_publisher.clone(),
            // 生产执行闭环：ERP 服务客户端（报工后回传生产进度，service token erp:admin；失败优雅降级）
            erp_client: TypedServiceClient::<ErpApi>::from_env_default()
                .and_then(|c| {
                    c.with_service_token(&ctx.auth_state.jwt_secret, "mes-module", &["erp:admin"])
                })
                .map(Arc::new)
                .ok(),
        };

        // 6. 业务路由（权限中间件 + 开发验证模拟认证）
        let protected_routes = modules::create_routes()
            .layer(axum::middleware::from_fn(require_permission("mes:admin")))
            .with_state(state);

        let routes = axum::Router::new()
            .nest(config.api_prefix, protected_routes)
            .layer(axum::middleware::from_fn(inject_dev_claims));

        tracing::info!(
            "✅ 真实 mes 模块已接入统一入口（db={}，prefix={}）",
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
impl Module for MesRealModule {
    fn name(&self) -> &'static str {
        "mes-real"
    }

    fn group(&self) -> ModuleGroup {
        ModuleGroup::Wms
    }

    fn routes(&self, _state: ModuleContext) -> Router {
        self.routes.clone()
    }

    async fn health_check(&self) -> ModuleHealth {
        let mut health = ModuleHealth::healthy("mes-real", ModuleGroup::Wms);
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
