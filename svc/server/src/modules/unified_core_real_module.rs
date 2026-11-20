//! 真实 Unified Core 服务接入模块（UnifiedCoreRealModule）—— feature flag 控制
//!
//! 将真实 `topems-unified-core` 服务（lib 形态）作为模块接入统一入口。
//! unified-core 的全部业务组装链（IAM / Flow / File / Communication / Tenant / Billing）
//! 由 `topems_unified_core::embedded::build_router` 提供，与独立部署 main.rs 共用同一实现。
//!
//! 由 feature `module-core` 门控（默认启用，平台核心域）。

#![cfg(feature = "module-core")]

use crate::module::{Module, ModuleContext, ModuleGroup, ModuleHealth};
use axum::Router;
use topems_shared_core::api_version::register_routes_with_legacy_alias;
use topems_shared_core::error::Result;

/// 真实 Unified Core 模块：持有数据库连接池 + 完整业务路由
pub struct UnifiedCoreRealModule {
    routes: Router,
    db: sqlx::PgPool,
}

impl UnifiedCoreRealModule {
    /// 异步构建真实 Unified Core 模块
    pub async fn build() -> Result<Self> {
        let config = topems_shared_bootstrap::ServiceConfig {
            name: "topems-unified-core",
            port: 8000,
            port_env_var: Some("CORE_PORT"),
            max_db_connections: 20,
            enable_events: false,
            enable_rls: true,
            enable_request_context: false,
            api_prefix: "/api/core",
            legacy_prefixes: &[],
            init_telemetry: false,
        };

        // unified-core 权威表统一 public（flow 业务表已收敛），显式传入不依赖进程变量。
        let ctx =
            topems_shared_bootstrap::bootstrap_service_with_search_path(&config, "public").await?;
        topems_shared_db::database::probe_connection(&ctx.db).await?;

        // F1：`tenant_id IS NULL` 全局行监控。独立部署由 unified-core 的 main.rs 启动；
        // 单体（topems-server）走本模块嵌入，必须在这里启动，否则生产没有该指标。
        topems_unified_core::modules::iam::global_row_metrics::spawn_global_row_monitor(
            topems_shared_db::scope::Db::new(ctx.db.clone(), "public, shared"),
        );

        // P0 迷你试点（2026-10-29）：/ws/healthz + /ws/{module}/{feature}（对齐 P32-6 websocket-path-mapping）。
        // 复用 unified-core 的 WsState/handle_socket；独立 Router<Arc<WsState>> with_state 固化后 merge 进顶层，
        // 规避 Module 契约 routes() -> Router<()> 的 E0308 限制（同 mes_real_module WS 接线模式）。
        let ws_state = std::sync::Arc::new(
            topems_unified_core::modules::communication::ws::WsState::new(std::sync::Arc::new(
                ctx.auth_state.clone(),
            )),
        );
        let ws_routes = axum::Router::new()
            // W7 P0：通知入口显式挂载（前端默认连接 /ws/core/notifications）
            .route(
                "/ws/core/notifications",
                axum::routing::get(
                    topems_unified_core::modules::communication::ws::websocket_handler,
                ),
            )
            .route(
                "/ws/healthz",
                axum::routing::get(
                    topems_unified_core::modules::communication::ws::healthz_handler,
                ),
            )
            .route(
                "/ws/{module}/{feature}",
                axum::routing::get(
                    topems_unified_core::modules::communication::ws::websocket_handler_path,
                ),
            )
            .with_state(ws_state.clone());

        // W7 P0：单体启动 Redis→WebSocket 事件桥接（独立部署由 main.rs 启动；
        // 单体此前未启动，导致通知/告警事件永远到不了前端连接）。
        let _bridge =
            topems_unified_core::modules::communication::ws_event_bridge::spawn_event_bridge(
                ws_state,
                topems_unified_core::modules::communication::ws_event_bridge::WsEventBridgeConfig::default()
                    .with_consumer_group("topems-server-ws-bridge"),
            );
        tracing::info!("WebSocket 事件桥接已启动（topems-server 单体模式）");

        // 嵌入模式（build_router_embedded）：core 业务路由挂根（/iam/* /flow/* 等），
        // 由本模块注册提供统一前缀 /api/core（
        // 语义与独立模式 register_routes_with_legacy_alias 一致；v1 legacy 别名已随
        // 批 4 p13 退役）；跳过 public 冲突路由（/、/health、/api、/metrics）
        // 与 wms/mes/scm（server 已有真实模块），避免双重 /api/core 前缀与 Overlapping route。
        let core_embedded = topems_unified_core::embedded::build_router_embedded(
            ctx.db.clone(),
            None,
            Router::new(),
        )
        .await?;

        let routes = axum::Router::new()
            .merge(register_routes_with_legacy_alias(
                Router::new(),
                config.api_prefix,
                config.legacy_prefixes,
                core_embedded,
            ))
            .layer(axum::middleware::from_fn_with_state(
                ctx.auth_state.clone(),
                topems_shared_auth::auth::auth_middleware,
            ))
            // P0：/ws/* 路由放 auth layer 之后 merge——healthz 公开（规范 §7 自测），
            // WS 升级鉴权由 handle_socket 内 verify_jwt_token 自验（同 mes_real_module WS 接线）。
            .merge(ws_routes);

        Ok(Self { routes, db: ctx.db })
    }
}

#[async_trait::async_trait]
impl Module for UnifiedCoreRealModule {
    fn name(&self) -> &'static str {
        "unified-core"
    }

    fn group(&self) -> ModuleGroup {
        ModuleGroup::Core
    }

    fn routes(&self, _state: ModuleContext) -> Router {
        self.routes.clone()
    }

    async fn health_check(&self) -> ModuleHealth {
        let db_healthy = sqlx::query("SELECT 1").execute(&self.db).await.is_ok();

        if db_healthy {
            ModuleHealth::healthy(self.name(), self.group())
        } else {
            ModuleHealth::unhealthy(self.name(), self.group(), "database disconnected")
        }
    }
}
