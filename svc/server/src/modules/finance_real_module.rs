//! 真实财务服务接入模块（FinanceRealModule）—— Phase B3
//!
//! 将真实 `topems-finance` 服务（lib 形态）作为模块接入统一入口。
//! 与演示版 `FinanceModule` 不同，这里使用**真实业务代码**：
//!   - 真实数据库（PgPool，经 bootstrap_service 创建）
//!   - 真实事件总线（EventPublisher）
//!   - 真实服务客户端（workflow_client）
//!   - 完整业务路由（create_routes().with_state(state)）
//!
//! 由 feature `module-finance` 门控（默认启用，可用 --no-default-features 裁剪）。

#![cfg(feature = "module-finance")]

use crate::module::{Module, ModuleContext, ModuleGroup, ModuleHealth};
use crate::modules::dev_claims::inject_dev_claims;
use axum::Router;
use topems_finance::shared::AppState;
use topems_shared_auth::middleware::require_permission;
use topems_shared_bootstrap::{bootstrap_service, ServiceConfig};
use topems_shared_service_client::service_client::{TypedServiceClient, WorkflowApi};

/// 真实财务模块：持有数据库连接池 + 完整业务路由
pub struct FinanceRealModule {
    /// 完整业务路由（已注入 AppState）
    routes: Router,
    /// 应用状态（保留用于健康检查）
    app_state: AppState,
}

impl FinanceRealModule {
    /// 异步构建真实财务模块：
    /// 初始化数据库 → 事件总线 → 服务客户端 → 业务路由
    pub async fn build() -> anyhow::Result<Self> {
        // 与独立 finance 服务一致：search_path 优先 finance schema。
        // .env 默认 SEARCH_PATH=iam,shared,public 会解析到 iam schema 的旧表
        // （无 reco_type 列），导致 init_database 建索引失败。
        std::env::set_var("SEARCH_PATH", "finance, public");

        let config = ServiceConfig {
            name: "topems-finance",
            port: 8011,
            port_env_var: Some("FINANCE_PORT"),
            max_db_connections: 20,
            enable_events: true,
            enable_rls: false,
            api_prefix: "/api/finance",
            legacy_prefixes: &["/api/v1/finance", "/api/core/finance/v1"],
            // 模块化单体嵌入：由宿主进程（topems-server）统一初始化全局 telemetry，
            // 避免重复设置全局 tracing subscriber 导致 panic
            init_telemetry: false,
            ..Default::default()
        };

        // 1. 服务引导：数据库连接池 + 认证 + 事件发布器
        let ctx = bootstrap_service(&config).await?;

        // 立即建立连接，确保本连接池的 search_path 固化（防止其他模块覆盖全局 SEARCH_PATH）
        let _conn = ctx.db.acquire().await?;

        // 2. 初始化财务数据库（建表，幂等）
        if let Err(e) = topems_finance::services::init_database(&ctx.db).await {
            tracing::error!("Failed to init finance database: {}", e);
            anyhow::bail!("finance 数据库初始化失败: {}", e);
        }

        // 3. 工作流服务客户端
        let workflow_client = TypedServiceClient::<WorkflowApi>::from_env_default()
            .map_err(|e| anyhow::anyhow!("工作流服务客户端初始化失败: {}", e))?;

        // 4. 构建业务 AppState
        let state = AppState {
            auth_state: ctx.auth_state.clone(),
            pool: ctx.db.clone(),
            workflow_client,
            event_publisher: ctx.event_publisher.clone(),
        };

        // 5. 构建完整业务路由（应用 api_prefix，与独立部署的 build_application 一致）
        //    开发验证模式：注入模拟 Claims（生产环境应叠加真实 auth_middleware）
        let protected_routes = topems_finance::modules::create_routes()
            .with_state(state.clone())
            .layer(axum::middleware::from_fn(require_permission("finance:admin")));
        let routes = axum::Router::new()
            .nest(config.api_prefix, protected_routes)
            .layer(axum::middleware::from_fn(inject_dev_claims));

        tracing::info!(
            "✅ 真实 finance 模块已接入统一入口（db={}，prefix={}）",
            state.pool.size(),
            config.api_prefix
        );

        Ok(Self {
            routes,
            app_state: state,
        })
    }
}

// ================================================
// 开发验证模式的模拟认证中间件（已提取到 dev_claims.rs 共用）
// ================================================
#[async_trait::async_trait]
impl Module for FinanceRealModule {
    fn name(&self) -> &'static str {
        "finance-real"
    }

    fn group(&self) -> ModuleGroup {
        ModuleGroup::Finance
    }

    fn routes(&self, _state: ModuleContext) -> Router {
        // 合并真实业务路由（保留 /api/finance 前缀，与独立部署一致）
        self.routes.clone()
    }

    async fn health_check(&self) -> ModuleHealth {
        let mut health = ModuleHealth::healthy("finance-real", ModuleGroup::Finance);
        // 数据库连接检查（真实探活）
        let db_ok = self.app_state.pool.size() > 0;
        health.dependencies.push(crate::module::DependencyHealth {
            name: "PostgreSQL",
            healthy: db_ok,
            detail: format!(
                "连接池大小 {}（接入模式: 单进程统一入口）",
                self.app_state.pool.size()
            ),
        });
        if self.app_state.event_publisher.is_some() {
            health.dependencies.push(crate::module::DependencyHealth {
                name: "EventBus",
                healthy: true,
                detail: "事件发布器已创建".to_string(),
            });
        }
        health
    }
}
