//! 真实 QMS 服务接入模块（QmsRealModule）—— Phase B3 扩展
//!
//! 将真实 `topems-qms` 服务（lib 形态）作为模块接入统一入口。
//! 与 FinanceRealModule / ErpRealModule 相同模式：
//!   - 真实数据库（PgPool，经 bootstrap_service 创建）
//!   - 完整业务路由（create_routes().with_state(AppState)）
//!
//! 由 feature `module-qms` 门控。
//! 注：qms 的 home/health/detailed_health 等公共 handler 位于 main.rs（bin），
//! 接入时跳过；统一入口的 /api/server/health 已提供健康聚合。

#![cfg(feature = "module-qms")]

use crate::module::{Module, ModuleContext, ModuleGroup, ModuleHealth};
use axum::Router;
use std::sync::Arc;
use std::time::Duration;
use topems_qms::shared::AppState;
use topems_shared_auth::middleware::require_permission;
use topems_shared_auth::tenant_middleware;
use topems_shared_bootstrap::{bootstrap_service, ServiceConfig};
use topems_shared_core::health::SimpleHealthConfig;
use topems_shared_core::l2_cache::{AsyncL2Cache, L2CacheConfig};
use topems_shared_service_client::service_client::{TypedServiceClient, WorkflowApi};
use topems_unified_core::middleware::tier_gate::{tier_gate_middleware, TierGateConfig};
use topems_unified_core::modules::subscription::PlanTier;

/// 真实 QMS 模块：持有数据库连接池 + 完整业务路由
pub struct QmsRealModule {
    routes: Router,
    app_state: AppState,
}

impl QmsRealModule {
    /// 异步构建真实 QMS 模块
    pub async fn build() -> anyhow::Result<Self> {
        // search_path 优先 qms schema（.env 默认 iam,shared,public 会解析到错误 schema）
        std::env::set_var("SEARCH_PATH", "qms, public");

        let config = ServiceConfig {
            name: "topems-qms",
            port: 8050,
            port_env_var: Some("QMS_PORT"),
            max_db_connections: 10,
            enable_events: true,
            enable_rls: true,
            enable_request_context: true,
            api_prefix: "/api/qms",
            legacy_prefixes: &[],
            // 宿主进程统一初始化全局 telemetry
            init_telemetry: false,
        };

        // 1. 服务引导：数据库连接池 + 认证 + 事件发布器
        let ctx = bootstrap_service(&config).await?;

        // 立即建立连接，固化本连接池的 search_path（防止其他模块覆盖全局 SEARCH_PATH）
        let _conn = ctx.db.acquire().await?;

        // 2. QMS 数据库初始化（建表，失败不阻塞）
        if let Err(e) = topems_qms::modules::init_database(&ctx.db).await {
            tracing::warn!("QMS 数据库初始化警告（不阻塞）: {}", e);
        }

        // 3. 工作流服务客户端
        let jwt_secret = ctx.auth_state.jwt_secret.clone();
        let workflow_client = TypedServiceClient::<WorkflowApi>::from_env_default()
            .and_then(|c| c.with_service_token(&jwt_secret, "qms-module", &["workflow:read"]))
            .map_err(|e| anyhow::anyhow!("工作流服务客户端初始化失败: {}", e))?;

        // 4. 构建业务 AppState
        let l2_config = L2CacheConfig {
            instance_prefix: "qms_server".to_string(),
            l1_ttl: Duration::from_secs(60),
            l2_ttl: Duration::from_secs(600),
            l1_capacity: 10_000,
            ..Default::default()
        };
        let state = AppState {
            auth_state: ctx.auth_state.clone(),
            pool: ctx.db.clone(),
            health_config: SimpleHealthConfig::new("topems-qms").with_db(ctx.db.clone()),
            event_publisher: ctx.event_publisher.clone(),
            dict_cache: Arc::new(AsyncL2Cache::new_l1_only(l2_config)),
            workflow_client,
        };

        // 5. 构建完整业务路由（应用 api_prefix + 租户事务中间件 + 权限中间件 + 开发验证模拟认证）
        let tier_gate_config = Arc::new(TierGateConfig::new("qms", PlanTier::Basic));
        let protected_routes = topems_qms::modules::create_routes()
            .layer(axum::middleware::from_fn_with_state(
                state.pool.clone(),
                tenant_middleware(),
            ))
            .layer(axum::middleware::from_fn(require_permission("qms:admin")))
            .with_state(state.clone())
            // V1.3 tier 治理：QMS 模块要求 Basic 及以上订阅层级
            .layer(axum::middleware::from_fn_with_state(
                tier_gate_config.clone(),
                tier_gate_middleware,
            ))
            .with_state(tier_gate_config);
        let routes = axum::Router::new()
            .nest(config.api_prefix, protected_routes)
            .layer(axum::middleware::from_fn_with_state(
                ctx.auth_state.clone(),
                topems_shared_auth::auth::auth_middleware,
            ));

        tracing::info!(
            "✅ 真实 qms 模块已接入统一入口（db={}，prefix={}）",
            state.pool.size(),
            config.api_prefix
        );

        Ok(Self {
            routes,
            app_state: state,
        })
    }
}

#[async_trait::async_trait]
impl Module for QmsRealModule {
    fn name(&self) -> &'static str {
        "qms-real"
    }

    fn group(&self) -> ModuleGroup {
        // qms（质量/实验室/环境安全）归入"仓储制造"模块组
        ModuleGroup::Wms
    }

    fn routes(&self, _state: ModuleContext) -> Router {
        self.routes.clone()
    }

    async fn health_check(&self) -> ModuleHealth {
        let mut health = ModuleHealth::healthy("qms-real", ModuleGroup::Wms);
        let db_ok = self.app_state.pool.size() > 0;
        health.dependencies.push(crate::module::DependencyHealth {
            name: "PostgreSQL",
            healthy: db_ok,
            detail: format!("连接池大小 {}", self.app_state.pool.size()),
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
