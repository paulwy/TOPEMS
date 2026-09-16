//! 真实 Mobile 服务接入模块（MobileRealModule）—— feature flag 控制
//!
//! 将真实 `topems-mobile` 服务（lib 形态）作为模块接入统一入口。
//! mobile 提供移动端 API、离线同步、扫码、审批等能力。
//!
//! 由 feature `module-mobile` 门控（core 组）。
//!
//! 注意：当前为简化版，仅注册核心路由。完整路由接入需要构建完整的 AppState
//! （包含 6 个服务客户端：WmsApi/HrmApi/WorkflowApi/NotificationApi/MesApi/QmsApi）。

#![cfg(feature = "module-mobile")]

use crate::module::{Module, ModuleContext, ModuleGroup, ModuleHealth};
use axum::routing::get;
use axum::Router;
use serde_json::json;
use topems_shared_bootstrap::{bootstrap_service, ServiceConfig};

/// 真实 Mobile 模块：持有数据库连接池 + 核心移动端路由
pub struct MobileRealModule {
    routes: Router,
    pool: sqlx::PgPool,
}

impl MobileRealModule {
    /// 异步构建真实 Mobile 模块
    pub async fn build() -> anyhow::Result<Self> {
        let config = ServiceConfig {
            name: "topems-mobile",
            port: 8095,
            port_env_var: Some("MOBILE_PORT"),
            max_db_connections: 10,
            enable_events: false,
            enable_rls: false,
            enable_request_context: false,
            api_prefix: "/api/mobile",
            legacy_prefixes: &[],
            init_telemetry: false,
        };

        let ctx = bootstrap_service(&config).await?;
        let _conn = ctx.db.acquire().await?;

        // 核心路由（简化版：health + 基本信息 + workbench 摘要）
        let routes = Router::new()
            .route("/health", get(|| async { "Mobile Service OK" }))
            .route("/", get(|| async {
                axum::Json(json!({
                    "service": "topems-mobile",
                    "version": "1.0.0",
                    "capabilities": ["workbench", "task", "approval", "scan", "attendance", "patrol", "offline-sync", "push-notification"],
                    "status": "running"
                }))
            }))
            .route("/workbench/summary", get(|| async {
                axum::Json(json!({
                    "pending_tasks": 0,
                    "pending_approvals": 0,
                    "notifications": 0,
                    "today_attendance": "not_checked_in"
                }))
            }))
            .with_state(ctx.db.clone());

        Ok(Self {
            routes,
            pool: ctx.db,
        })
    }
}

#[async_trait::async_trait]
impl Module for MobileRealModule {
    fn name(&self) -> &'static str {
        "mobile"
    }

    fn group(&self) -> ModuleGroup {
        ModuleGroup::Core
    }

    fn routes(&self, _state: ModuleContext) -> Router {
        self.routes.clone()
    }

    async fn health_check(&self) -> ModuleHealth {
        let db_healthy = sqlx::query("SELECT 1").execute(&self.pool).await.is_ok();

        if db_healthy {
            ModuleHealth::healthy(self.name(), self.group())
        } else {
            ModuleHealth::unhealthy(self.name(), self.group(), "database disconnected")
        }
    }
}
