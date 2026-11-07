//! 真实 MES 服务接入模块（MesRealModule）—— Phase B3 扩展
//!
//! 将真实 `topems-mes` 服务（lib 形态，AppState 直传模式）作为模块接入统一入口。
//! mes 的 `modules::create_routes() -> Router<AppState>` 无参（与 pm 不同），
//! AppState 由 `topems_mes::shared::AppState` 构建（auth_state + pool + health + event_publisher）。
//!
//! 由 feature `module-mes` 门控。

#![cfg(feature = "module-mes")]

use crate::module::{Module, ModuleContext, ModuleGroup, ModuleHealth};
use axum::Router;
use std::sync::Arc;
use std::time::Duration;
use topems_mes::{modules, AppState};
use topems_shared_auth::middleware::require_module_access;
use topems_shared_bootstrap::{bootstrap_service_with_search_path, ServiceConfig};
use topems_shared_core::error::Result;
use topems_shared_core::health::SimpleHealthConfig;
use topems_shared_core::l2_cache::{AsyncL2Cache, L2CacheConfig};
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
    pub async fn build() -> Result<Self> {
        let config = ServiceConfig {
            name: "topems-mes",
            port: 8030,
            port_env_var: Some("MES_PORT"),
            max_db_connections: 10,
            enable_events: true,
            enable_request_context: true,
            api_prefix: "/api/mes",
            legacy_prefixes: &[],
            // 宿主进程统一初始化全局 telemetry
            init_telemetry: false,
            ..Default::default()
        };

        // 1. 服务引导：数据库连接池 + 认证 + 事件发布器 + 指标
        //    search_path 优先 mes schema（显式传入，不依赖进程变量）
        let ctx = bootstrap_service_with_search_path(&config, "mes, public").await?;

        // 启动期连通性探测：SELECT 1 后立即归还连接（不跨 await 持有）
        topems_shared_db::database::probe_connection(&ctx.db).await?;

        // 2. MES 建表 DDL 已收敛至迁移链（D7）；Schema 防御见下（增量迁移 + 一致性自检）

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
        let l2_config = L2CacheConfig {
            instance_prefix: "mes_server".to_string(),
            l1_ttl: Duration::from_secs(60),
            l2_ttl: Duration::from_secs(600),
            l1_capacity: 10_000,
            ..Default::default()
        };
        let state = AppState {
            auth_state: ctx.auth_state.clone(),
            pool: ctx.db.clone(),
            db: topems_shared_db::scope::Db::new(ctx.db.clone(), "mes, public, shared"),
            health_config,
            event_publisher: ctx.event_publisher.clone(),
            dict_cache: Arc::new(AsyncL2Cache::new_l1_only(l2_config)),
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
            .layer(axum::middleware::from_fn(require_module_access("mes")))
            .layer(axum::middleware::from_fn_with_state(
                ctx.db.clone(),
                topems_shared_auth::tenant_middleware(),
            ))
            .with_state(state.clone());

        // v1.110 BFF WS 接线：/ws/mes/dashboard（对齐独立 svc/mes main.rs:260）。
        // dashboard_websocket 需 State<AuthState>（AppState: FromRef<AuthState>），
        // 以独立 Router<AppState> 构造后 with_state 固化，再 merge 进顶层 Router<()>
        // ——规避 Module 契约 routes() -> Router<()> 的 E0308 限制。
        // 认证由 URL token 自验；auth_middleware 按 is_websocket_path 豁免 /ws/*。
        let ws_routes = axum::Router::new()
            .route(
                "/ws/mes/dashboard",
                axum::routing::get(modules::dashboard_ws::dashboard_websocket),
            )
            .with_state(state.clone());

        let routes = axum::Router::new()
            .nest(config.api_prefix, protected_routes)
            .merge(ws_routes)
            .layer(axum::middleware::from_fn_with_state(
                ctx.auth_state.clone(),
                topems_shared_auth::auth::auth_middleware,
            ));

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
