//! 真实 GIS 服务接入模块（GisRealModule）—— P3 feature flag 控制
//!
//! 将真实 `topems-gis` 服务（lib 形态）作为模块接入统一入口。
//! 业务路由由 `topems_gis::embedded::build_business_router` 统一组装，
//! 与独立部署 main.rs 共用同一实现，杜绝嵌入时路由缺失/分叉。
//!
//! 由 feature `module-gis` 门控（默认不启用，按客户需求裁剪）。

#![cfg(feature = "module-gis")]

use crate::module::{Module, ModuleContext, ModuleGroup, ModuleHealth};
use axum::Router;
use std::sync::Arc;
use topems_gis::embedded::{self, AppState};
use topems_gis::modules::websocket::{WebSocketConfig, WebSocketManager};
use topems_shared_bootstrap::{bootstrap_service, ServiceConfig};

/// 真实 GIS 模块：持有数据库连接池 + 完整业务路由
pub struct GisRealModule {
    routes: Router,
    db: sqlx::PgPool,
}

impl GisRealModule {
    /// 异步构建真实 GIS 模块
    pub async fn build() -> anyhow::Result<Self> {
        // search_path 优先 gis schema
        std::env::set_var("SEARCH_PATH", "gis, public");

        let config = ServiceConfig {
            name: "topems-gis",
            port: 8071,
            port_env_var: Some("GIS_PORT"),
            max_db_connections: 20,
            enable_events: false,
            enable_rls: false,
            enable_request_context: false,
            api_prefix: "/api/gis",
            legacy_prefixes: &["/api/v1/gis", "/api/core/gis/v1"],
            // 宿主进程统一初始化全局 telemetry
            init_telemetry: false,
        };

        // 1. 服务引导：数据库连接池 + 认证 + 指标
        let ctx = bootstrap_service(&config).await?;

        // 立即建立连接，固化本连接池的 search_path
        let _conn = ctx.db.acquire().await?;

        // 2. GIS 建表 + schema 防御（失败不阻塞嵌入，独立部署行为一致）
        if let Err(e) = topems_gis::db::schema::init_tables(&ctx.db).await {
            tracing::warn!("GIS 建表初始化警告（不阻塞）: {}", e);
        }
        if let Err(e) = topems_gis::schema_defense::run(&ctx.db).await {
            tracing::warn!("GIS schema defense 失败（不阻塞）: {}", e);
        }

        // 3. 构建业务 AppState（与独立部署 main.rs 一致）
        let ws_config = WebSocketConfig::from_env();
        let state = AppState {
            pool: ctx.db.clone(),
            auth_state: ctx.auth_state.clone(),
            ws_manager: Arc::new(WebSocketManager::new(ws_config)),
        };

        // 4. 业务路由（公开 + 受保护，鉴权/限流中间件已在 embedded 内挂载）
        let business_routes = embedded::build_business_router(&state);

        let routes = Router::new()
            .nest(config.api_prefix, business_routes)
            .with_state(state);

        tracing::info!(
            "✅ 真实 gis 模块已接入统一入口（db={}，prefix={}）",
            ctx.db.size(),
            config.api_prefix
        );

        Ok(Self {
            routes,
            db: ctx.db.clone(),
        })
    }
}

#[async_trait::async_trait]
impl Module for GisRealModule {
    fn name(&self) -> &'static str {
        "gis-real"
    }

    fn group(&self) -> ModuleGroup {
        ModuleGroup::Core
    }

    fn routes(&self, _state: ModuleContext) -> Router {
        self.routes.clone()
    }

    async fn health_check(&self) -> ModuleHealth {
        let mut health = ModuleHealth::healthy("gis-real", ModuleGroup::Core);
        let db_ok = self.db.size() > 0;
        health.dependencies.push(crate::module::DependencyHealth {
            name: "PostgreSQL",
            healthy: db_ok,
            detail: format!("连接池大小 {}", self.db.size()),
        });
        health
    }
}
