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
use axum::Router;
use std::sync::Arc;
use std::time::Duration;
use topems_erp::modules::ApiState;
use topems_shared_auth::middleware::require_module_access;
use topems_shared_auth::tenant_middleware;
use topems_shared_bootstrap::{bootstrap_service_with_search_path, ServiceConfig};
use topems_shared_core::error::Result;
use topems_shared_core::l2_cache::L2CacheConfig;
use topems_shared_service_client::notification::NotificationServiceClient;
use topems_shared_service_client::service_client::{
    api::finance_api::FinanceApi, api::hrm_api::HrmApi, api::mes_api::MesApi, TypedServiceClient,
};

/// 进程内守卫：单体形态下 ERP 事件消费循环只启动一次。
///
/// 独立二进制 `svc/erp/src/main.rs` 与单体 `ErpRealModule::build()` 共用
/// `event_handlers::start_event_subscribers`；后者内部 pin 了消费组 `erp-group`。
/// 即便两个形态同时运行，Redis Streams 也只在组内分摊投递（一条消息只给一个消费者），
/// 不会重复消费；本守卫只防同进程内 build 被重复调用时重复 spawn。
static ERP_SUBSCRIBERS_STARTED: std::sync::atomic::AtomicBool =
    std::sync::atomic::AtomicBool::new(false);

/// 真实 ERP 模块：持有数据库连接池 + 完整业务路由
pub struct ErpRealModule {
    routes: Router,
    api_state: ApiState,
}

impl ErpRealModule {
    /// 异步构建真实 ERP 模块
    pub async fn build() -> Result<Self> {
        let config = ServiceConfig {
            name: "topems-erp",
            port: 8010,
            port_env_var: Some("ERP_PORT"),
            max_db_connections: 20,
            enable_events: true,
            api_prefix: "/api/erp",
            legacy_prefixes: &[],
            // 宿主进程统一初始化全局 telemetry
            init_telemetry: false,
            ..Default::default()
        };

        // 1. 服务引导：数据库连接池 + 认证 + 事件发布器
        //    search_path 优先 erp schema（显式传入，不依赖进程变量；.env 默认值会解析到错误 schema）
        let ctx = bootstrap_service_with_search_path(&config, "erp, public").await?;

        // 启动期连通性探测：SELECT 1 后立即归还连接（不跨 await 持有）
        topems_shared_db::database::probe_connection(&ctx.db).await?;

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
        let request_db = crate::modules::request_scope_db(&ctx, "erp, public, shared");
        let api_state = ApiState {
            db: request_db,
            // 审计落库与健康探针使用原始池（系统通道），不参与请求租户查询。
            system_pool: ctx.db.clone(),
            auth_state: ctx.auth_state.clone(),
            metrics: ctx.metrics.clone(),
            start_time: ctx.start_time,
            dict_cache: crate::modules::cache_init::build_l2_cache("erp:dict", l2_config).await,
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

        // 5. 事件订阅者：与独立部署 main.rs 同源，挂载消费循环
        //    （此前单体形态缺失，导致 PmProjectSettled 等事件在单机部署下永不被消费）
        if ERP_SUBSCRIBERS_STARTED
            .compare_exchange(
                false,
                true,
                std::sync::atomic::Ordering::SeqCst,
                std::sync::atomic::Ordering::SeqCst,
            )
            .is_ok()
        {
            if let Err(e) = topems_erp::event_handlers::start_event_subscribers(
                ctx.db.clone(),
                api_state.dict_cache.clone(),
            )
            .await
            {
                ERP_SUBSCRIBERS_STARTED.store(false, std::sync::atomic::Ordering::SeqCst);
                tracing::error!("⚠️ erp 事件订阅者启动失败: {}", e);
            } else {
                tracing::info!("✅ erp 事件订阅者已挂载（消费组 erp-group）");
            }
        } else {
            tracing::warn!("erp 事件订阅者已在当前进程启动，跳过重复启动");
        }

        // 6. 构建完整业务路由（应用 api_prefix + 租户事务中间件 + 权限中间件 + 开发验证模拟认证）
        let protected_routes = topems_erp::modules::create_routes()
            .layer(axum::middleware::from_fn_with_state(
                ctx.db.clone(),
                tenant_middleware(),
            ))
            .layer(axum::middleware::from_fn(require_module_access("erp")))
            .with_state(api_state.clone());
        let routes = axum::Router::new()
            .nest(config.api_prefix, protected_routes)
            .layer(axum::middleware::from_fn_with_state(
                ctx.auth_state.clone(),
                topems_shared_auth::auth::auth_middleware,
            ));

        tracing::info!(
            "✅ 真实 erp 模块已接入统一入口（db={}，prefix={}）",
            api_state.db.stats().size,
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
        let db_ok = self.api_state.db.stats().size > 0;
        health.dependencies.push(crate::module::DependencyHealth {
            name: "PostgreSQL",
            healthy: db_ok,
            detail: format!("连接池大小 {}", self.api_state.db.stats().size),
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
