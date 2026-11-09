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
use axum::response::IntoResponse;
use axum::Router;
use topems_finance::shared::AppState;
use topems_shared_auth::middleware::require_module_access;
use topems_shared_auth::tenant_middleware;
use topems_shared_auth::Claims;
use topems_shared_bootstrap::{bootstrap_service_with_search_path, ServiceConfig};
use topems_shared_core::error::{Result, TopemsError};
use topems_shared_service_client::service_client::{TypedServiceClient, WorkflowApi};

/// 进程内守卫：单体形态下 Finance 事件消费循环只启动一次。
///
/// 独立二进制 `svc/finance/src/main.rs` 与单体 `FinanceRealModule::build()` 共用
/// `event_handlers::start_event_subscribers`，后者内部 pin 了消费组 `finance-group`；
/// 两形态同跑时 Streams 组内分摊投递，不会重复消费。本守卫只防同进程重复 spawn。
static FINANCE_SUBSCRIBERS_STARTED: std::sync::atomic::AtomicBool =
    std::sync::atomic::AtomicBool::new(false);

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
    pub async fn build() -> Result<Self> {
        let config = ServiceConfig {
            name: "topems-finance",
            port: 8011,
            port_env_var: Some("FINANCE_PORT"),
            max_db_connections: 20,
            enable_events: true,
            enable_rls: true,
            api_prefix: "/api/finance",
            legacy_prefixes: &["/api/core/finance/v1"],
            // 模块化单体嵌入：由宿主进程（topems-server）统一初始化全局 telemetry，
            // 避免重复设置全局 tracing subscriber 导致 panic
            init_telemetry: false,
            ..Default::default()
        };

        // 1. 服务引导：数据库连接池 + 认证 + 事件发布器
        //    与独立 finance 服务一致：search_path 优先 finance schema（显式传入，不依赖进程变量）。
        //    .env 默认 SEARCH_PATH=iam,shared,public 会解析到 iam schema 的旧表
        //    （无 reco_type 列），导致 init_database 建索引失败。
        let ctx = bootstrap_service_with_search_path(&config, "finance, public").await?;

        // 启动期连通性探测：SELECT 1 后立即归还连接（不跨 await 持有）
        topems_shared_db::database::probe_connection(&ctx.db).await?;

        // 2. 运行时 schema 一致性自检（建表 DDL 已收敛至迁移链，D7）
        if let Err(e) = topems_finance::services::run_schema_defense(&ctx.db).await {
            tracing::error!("Failed to run finance schema defense: {}", e);
            return Err(TopemsError::internal("finance schema 防御检查失败", e));
        }

        // 2c. 事件订阅者：与独立部署 main.rs 同源
        //     （此前单体形态缺失，导致 SettlementApproved / PmProjectSettled 等
        //      自动应收、自动凭证链路在单机部署下从未运行）
        if FINANCE_SUBSCRIBERS_STARTED
            .compare_exchange(
                false,
                true,
                std::sync::atomic::Ordering::SeqCst,
                std::sync::atomic::Ordering::SeqCst,
            )
            .is_ok()
        {
            if let Err(e) = topems_finance::event_handlers::start_event_subscribers(
                ctx.db.clone(),
                ctx.event_publisher.clone(),
            )
            .await
            {
                FINANCE_SUBSCRIBERS_STARTED.store(false, std::sync::atomic::Ordering::SeqCst);
                tracing::error!("⚠️ finance 事件订阅者启动失败: {}", e);
            } else {
                tracing::info!("✅ finance 事件订阅者已挂载（消费组 finance-group）");
            }
        } else {
            tracing::warn!("finance 事件订阅者已在当前进程启动，跳过重复启动");
        }

        // 2d. 初始化 CQRS PostgreSQL 事件存储与异步投影器（对齐独立 finance 部署 main.rs）
        let pg_cqrs_ctx = topems_finance::domain::cqrs::init_pg_cqrs_context(ctx.db.clone());
        pg_cqrs_ctx.start_async_projection().await;
        tracing::info!("✅ [embedded] CQRS 事件存储与异步投影器已启动");

        // 3. 工作流服务客户端
        let jwt_secret = ctx.auth_state.jwt_secret.clone();
        let workflow_client = TypedServiceClient::<WorkflowApi>::from_env_default()
            .and_then(|c| c.with_service_token(&jwt_secret, "finance-module", &["workflow:read"]))
            .map_err(|e| TopemsError::internal("工作流服务客户端初始化失败", e))?;

        // 4. 构建业务 AppState
        let state = AppState {
            auth_state: ctx.auth_state.clone(),
            pool: ctx.db.clone(),
            workflow_client,
            event_publisher: ctx.event_publisher.clone(),
        };

        // 5. 构建完整业务路由（应用 api_prefix + 租户事务中间件 + 权限中间件，与独立部署一致）
        let protected_routes = topems_finance::modules::create_routes()
            .layer(axum::middleware::from_fn_with_state(
                state.pool.clone(),
                tenant_middleware(),
            ))
            // 模块门只回答「能否进入财务模块」：持有任一 `finance:` 前缀码即可；
            // 审批/执行/配置等敏感动作仍由内层 `finance:admin` / `finance:settlement:*`
            // 独立校验（见 svc/finance/src/modules/mod.rs 的 5 个 has_permission 点）。
            .layer(axum::middleware::from_fn(require_module_access("finance")))
            // 写操作独立权限点：模块门放宽到「只读码」后，非只读方法仍需 finance:admin，
            // 避免 finance:read 角色经模块门直达财务写端点（改门前所有写操作本就要求 admin）。
            .layer(axum::middleware::from_fn(require_finance_write))
            .with_state(state.clone());
        let routes = axum::Router::new()
            .nest(config.api_prefix, protected_routes)
            .layer(axum::middleware::from_fn_with_state(
                ctx.auth_state.clone(),
                topems_shared_auth::auth::auth_middleware,
            ));

        let db_stats =
            topems_shared_db::scope::Db::new(state.pool.clone(), "public, shared").stats();
        tracing::info!(
            "✅ 真实 finance 模块已接入统一入口（db={}，prefix={}）",
            db_stats.size,
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

/// 财务写操作的独立权限点：模块门（`require_module_access("finance")`）只负责
/// 「能进财务模块」，读接口持有任一 `finance:` 前缀码即可；非只读方法（POST/PUT/
/// PATCH/DELETE）仍要求 `finance:admin`。这保持了改门前「无 finance:admin 不能写」
/// 的实际效果，避免 `finance:read` 角色经放宽后的模块门直达写端点。
/// 内层已声明 admin-only 的审批配置 5 个 handler 会再做一次校验（纵深防御）。
async fn require_finance_write(
    req: axum::extract::Request,
    next: axum::middleware::Next,
) -> axum::response::Response {
    use axum::http::Method;
    if matches!(*req.method(), Method::GET | Method::HEAD | Method::OPTIONS) {
        return next.run(req).await;
    }
    let allowed = req
        .extensions()
        .get::<Claims>()
        .map(|c| c.has_permission("finance:admin"))
        .unwrap_or(false);
    if allowed {
        return next.run(req).await;
    }
    (
        axum::http::StatusCode::FORBIDDEN,
        [(axum::http::header::CONTENT_TYPE, "application/json")],
        r#"{"success":false,"message":"权限不足：需要财务管理员权限（finance:admin）","code":403}"#,
    )
        .into_response()
}

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
