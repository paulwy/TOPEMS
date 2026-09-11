//! 真实 ERP 服务接入模块（ErpRealModule）—— Phase B3 扩展
//!
//! 将真实 `topems-erp` 服务（lib 形态）作为模块接入统一入口。
//! 与 FinanceRealModule 相同模式：
//!   - 真实数据库（PgPool，经 bootstrap_service 创建）
//!   - 真实服务客户端（notification / hrm / finance）
//!   - 完整业务路由（create_routes().with_state(ApiState)）
//!
//! 由 feature `module-erp` 门控。

#![cfg(feature = "module-erp")]

use crate::module::{Module, ModuleContext, ModuleGroup, ModuleHealth};
use crate::modules::dev_claims::inject_dev_claims;
use axum::Router;
use std::sync::Arc;
use std::time::Duration;
use topems_erp::modules::ApiState;
use topems_shared_auth::middleware::require_permission;
use topems_shared_bootstrap::{bootstrap_service, default_init_db, ServiceConfig};
use topems_shared_core::l2_cache::{AsyncL2Cache, L2CacheConfig};
use topems_shared_service_client::notification::NotificationServiceClient;
use topems_shared_service_client::service_client::{
    api::finance_api::FinanceApi, api::hrm_api::HrmApi, api::mes_api::MesApi, TypedServiceClient,
};

/// 真实 ERP 模块：持有数据库连接池 + 完整业务路由
pub struct ErpRealModule {
    routes: Router,
    api_state: ApiState,
}

impl ErpRealModule {
    /// 异步构建真实 ERP 模块
    pub async fn build() -> anyhow::Result<Self> {
        // search_path 优先 erp schema（.env 默认 iam,shared,public 会解析到错误 schema）
        std::env::set_var("SEARCH_PATH", "erp, public");

        let config = ServiceConfig {
            name: "topems-erp",
            port: 8010,
            port_env_var: Some("ERP_PORT"),
            max_db_connections: 20,
            enable_events: true,
            api_prefix: "/api/erp",
            legacy_prefixes: &["/api/v1/erp"],
            // 宿主进程统一初始化全局 telemetry
            init_telemetry: false,
            ..Default::default()
        };

        // 1. 服务引导：数据库连接池 + 认证 + 事件发布器
        let ctx = bootstrap_service(&config).await?;

        // 立即建立连接，确保本连接池的 search_path 在当前 set_var 生效时固化
        // （避免后续模块覆盖全局 SEARCH_PATH 影响本连接池）
        let _conn = ctx.db.acquire().await?;

        // 2. 数据库初始化（建表 + schema 防御，失败不阻塞）
        if let Err(e) = default_init_db(
            &ctx.db,
            "erp",
            true,
            topems_erp::schema_defense::run_schema_migration_and_verify,
        )
        .await
        {
            tracing::warn!("ERP 数据库初始化警告（不阻塞）: {}", e);
        }

        // 3. 服务客户端（与独立部署一致；指向外部服务地址，模块化单体阶段保留 HTTP）
        let encryption_service = topems_shared::init_encryption_from_env();

        let notification_service_url = std::env::var("NOTIFICATION_SERVICE_URL")
            .unwrap_or_else(|_| "http://localhost:8000".to_string());
        let notification_client = Arc::new(NotificationServiceClient::with_base_url(
            notification_service_url,
        ));

        let jwt_secret = ctx.auth_state.jwt_secret.clone();
        let hrm_client = TypedServiceClient::<HrmApi>::from_env_default()
            .and_then(|c| c.with_service_token(&jwt_secret, "erp-module", &["hrm:admin"]))
            .map(Arc::new)
            .unwrap_or_else(|e| {
                tracing::warn!("HRM服务客户端初始化失败: {}, 将使用mock模式", e);
                Arc::new(
                    TypedServiceClient::new(HrmApi, "http://localhost:8020".to_string())
                        .unwrap_or_else(|e| {
                            tracing::error!("默认HRM客户端创建失败: {}", e);
                            panic!("HRM客户端创建失败，请检查HRM服务配置")
                        }),
                )
            });

        let finance_client = TypedServiceClient::<FinanceApi>::from_env_default()
            .and_then(|c| c.with_service_token(&jwt_secret, "erp-module", &["finance:read"]))
            .map(Arc::new)
            .unwrap_or_else(|e| {
                tracing::warn!("Finance服务客户端初始化失败: {}, 将使用mock模式", e);
                Arc::new(
                    TypedServiceClient::new(FinanceApi, "http://localhost:8011".to_string())
                        .unwrap_or_else(|e| {
                            tracing::error!("默认Finance客户端创建失败: {}", e);
                            panic!("Finance客户端创建失败，请检查Finance服务配置")
                        }),
                )
            });

        // 4. 构建业务 ApiState
        let l2_config = L2CacheConfig {
            instance_prefix: "erp_server".to_string(),
            l1_ttl: Duration::from_secs(60),
            l2_ttl: Duration::from_secs(600),
            l1_capacity: 10_000,
            ..Default::default()
        };
        let api_state = ApiState {
            db: ctx.db.clone(),
            auth_state: ctx.auth_state.clone(),
            metrics: ctx.metrics.clone(),
            start_time: ctx.start_time,
            dict_cache: Arc::new(AsyncL2Cache::new_l1_only(l2_config)),
            notification_client,
            hrm_client,
            encryption: Arc::new(encryption_service),
            event_publisher: ctx.event_publisher.clone(),
            finance_client,
            // 生产执行闭环：MES 服务客户端（erp 审核通过后下达生产工单，service token mes:admin）
            mes_client: TypedServiceClient::<MesApi>::from_env_default()
                .and_then(|c| c.with_service_token(&jwt_secret, "erp-module", &["mes:admin"]))
                .map(Arc::new)
                .unwrap_or_else(|e| {
                    tracing::warn!("MES服务客户端初始化失败: {}, 将使用mock模式", e);
                    Arc::new(
                        TypedServiceClient::new(MesApi, "http://localhost:8030".to_string())
                            .unwrap_or_else(|e| {
                                tracing::error!("默认MES客户端创建失败: {}", e);
                                panic!("MES客户端创建失败，请检查MES服务配置")
                            }),
                    )
                }),
        };

        // 5. 构建完整业务路由（应用 api_prefix + 权限中间件 + 开发验证模拟认证）
        let protected_routes = topems_erp::modules::create_routes()
            .layer(axum::middleware::from_fn(require_permission("erp:admin")))
            .with_state(api_state.clone());
        let routes = axum::Router::new()
            .nest(config.api_prefix, protected_routes)
            .layer(axum::middleware::from_fn(inject_dev_claims));

        tracing::info!(
            "✅ 真实 erp 模块已接入统一入口（db={}，prefix={}）",
            api_state.db.size(),
            config.api_prefix
        );

        Ok(Self { routes, api_state })
    }
}

#[async_trait::async_trait]
impl Module for ErpRealModule {
    fn name(&self) -> &'static str {
        "erp-real"
    }

    fn group(&self) -> ModuleGroup {
        ModuleGroup::Erp
    }

    fn routes(&self, _state: ModuleContext) -> Router {
        self.routes.clone()
    }

    async fn health_check(&self) -> ModuleHealth {
        let mut health = ModuleHealth::healthy("erp-real", ModuleGroup::Erp);
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
