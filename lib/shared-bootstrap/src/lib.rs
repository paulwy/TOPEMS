//! # TOPEMS Shared Bootstrap
//!
//! 服务启动框架，提供统一的微服务启动模板（V2 三段式），消除各服务 main.rs 中的重复代码。
//!
//! **V66.2 状态**：**28/28 服务 100% 覆盖**（样板 + Batch-1 到 Batch-5 全部完成）。
//!
//! 包含：服务启动配置、应用状态、健康检查路由、数据库连接池初始化、
//! 认证中间件、权限中心、事件订阅、遥测初始化等。
//!
//! ## V2 三段式模板
//!
//! ```rust,ignore
//! // Step 1: 声明 ServiceConfig（单一真相源）
//! let config = ServiceConfig {
//!     name: "topems-xxx",
//!     port: 80xx,
//!     port_env_var: Some("XXX_PORT"),
//!     max_db_connections: 20,
//!     enable_events: true,
//!     enable_rls: true,
//!     enable_request_context: true,
//!     api_prefix: "/api/core/xxx/v1",
//!     legacy_prefixes: &["/api/v1/xxx", "/api/xxx"],
//! };
//! // Step 2: 统一初始化 telemetry / DB / Auth / Events
//! let ctx = bootstrap_service(&config).await?;
//! // Step 3a: 标准服务（80% 场景）→ build_application 装配 auth/rls/rate-limit/CORS/Prometheus
//! let app = build_application(&ctx, &config, public_routes, protected_routes, Some(openapi_json));
//! run(app).await?;
//! ```
//!
//! ## 三种复杂度模式（覆盖全部服务）
//!
//! - **A. 标准模式（10 个服务）**：纯 PgPool + AuthState state，直接用 `build_application`
//!   （feedback / search / ticket / lowcode / communication / billing / master-data / hrm / finance / wms）
//! - **B. stateful + build_application（11 个服务）**：自定义 AppState（cache/tenant_middleware/6+服务客户端），
//!   先把自定义 state 注入 `protected_routes.with_state(app_state)`，再调用 `build_application`
//!   （qms / ehs / pdm / lims / erp / crm / srm / scm / mes / pm / rd）
//! - **C. Application 重建（7 个服务）**：有 WebSocket/GraphQL/Cookie/自定义全栈中间件/后台任务，
//!   跳过 `build_application`，用 `Application { router, port, name }` + `run(app)` 启动
//!   （analytics / unified-core / integration / gis / portal / ai / mobile）
//!
//! ## 公开 API 总览
//!
//! | API | 用途 |
//! |-----|------|
//! | `ServiceConfig` | 单一真相源：名称/端口/env/DB连接/开关/路由前缀 |
//! | `bootstrap_service(config)` | 统一初始化 telemetry + DB + AuthState + EventPublisher + Prometheus |
//! | `ServiceContext` | `bootstrap_service` 返回值：db/auth_state/event_publisher/metrics/permission_center/start_time |
//! | `build_application(ctx, config, public, protected, openapi)` | 自动装配 auth/rls/request-context/rate-limit/CORS/Prometheus/telemetry 中间件 |
//! | `Application { router, port, name }` | Pattern C 用：手动组装 router 后传入 |
//! | `resolve_port(config)` | 从环境变量解析端口，失败用 `config.port` 回退 |
//! | `run(app)` | 绑定 `0.0.0.0:{port}`，`axum::serve` 启动 |
//!
//! **警告**：V1 遗留的 `BootstrapConfig / AppState / ServiceBootstrap` 结构已被 Pattern B/C 取代，
//! 仅保留向后兼容引用。新项目请使用 `ServiceConfig → bootstrap_service → build_application → run` 三段式。

#![allow(
    unknown_lints,
    renamed_and_removed_lints,
    clippy::should_implement_trait,
    clippy::too_many_arguments,
    clippy::type_complexity,
    clippy::module_inception,
    clippy::manual_clamp,
    clippy::unwrap_or_default,
    clippy::doc_markdown,
    clippy::clone_on_copy,
    clippy::if_same_then_else,
    clippy::inconsistent_digit_grouping,
    clippy::is_digit_ascii_radix,
    clippy::single_range_in_vec_init,
    clippy::needless_range_loop,
    clippy::filter_map_next,
    clippy::unnecessary_lazy_evaluations,
    clippy::get_first,
    clippy::ptr_as_ptr,
    clippy::useless_asref,
    clippy::assigning_clones,
    clippy::write_literal,
    clippy::expect_fun_call,
    clippy::redundant_guards,
    clippy::match_like_matches_macro,
    clippy::redundant_pattern_matching,
    clippy::wildcard_enum_match_arm,
    clippy::same_functions_in_if_condition,
    clippy::unused_peekable,
    clippy::stable_sort_primitive,
    clippy::mut_mut,
    clippy::vec_init_then_push,
    clippy::format_push_string,
    clippy::unused_self,
    clippy::let_unit_value,
    clippy::zero_prefixed_literal,
    clippy::borrow_as_ptr,
    clippy::needless_borrow,
    clippy::needless_late_init,
    clippy::needless_update,
    clippy::needless_pass_by_value,
    clippy::implicit_hasher,
    clippy::missing_errors_doc,
    clippy::missing_panics_doc,
    clippy::must_use_candidate,
    clippy::return_self_not_must_use,
    clippy::used_underscore_binding,
    clippy::default_trait_access,
    clippy::equatable_if_let,
    clippy::large_enum_variant,
    clippy::from_over_into,
    clippy::let_and_return,
    clippy::match_bool,
    clippy::match_wild_err_arm,
    clippy::new_without_default,
    clippy::blocks_in_conditions,
    clippy::explicit_iter_loop,
    clippy::explicit_auto_deref,
    clippy::range_plus_one,
    clippy::single_char_add_str,
    clippy::string_add,
    clippy::string_add_assign,
    clippy::option_map_unit_fn,
    clippy::filter_next,
    clippy::iter_not_returning_iterator,
    clippy::from_str_radix_10,
    clippy::naive_bytecount,
    clippy::manual_string_new,
    clippy::flat_map_option,
    clippy::or_fun_call,
    clippy::identity_op,
    clippy::try_err,
    clippy::useless_conversion,
    clippy::uninlined_format_args,
    clippy::trivially_copy_pass_by_ref,
    clippy::nonminimal_bool,
    clippy::derive_partial_eq_without_eq,
    clippy::enum_variant_names,
    clippy::upper_case_acronyms,
    clippy::struct_field_names,
    clippy::needless_arbitrary_self_type,
    clippy::empty_line_after_doc_comments,
    clippy::empty_docs,
    clippy::manual_strip,
    clippy::match_same_arms,
    clippy::unnecessary_wraps,
    clippy::path_buf_push_overwrite,
    clippy::read_zero_byte_vec,
    clippy::redundant_locals,
    clippy::collapsible_match,
    clippy::verbose_file_reads,
    clippy::suboptimal_flops,
    clippy::cast_precision_loss,
    clippy::cast_possible_truncation,
    clippy::cast_possible_wrap,
    clippy::cast_sign_loss,
    clippy::as_conversions,
    dead_code,
    clippy::never_loop,
    clippy::no_effect_underscore_binding,
    clippy::mixed_case_hex_literals,
    clippy::needless_bitwise_bool,
    clippy::needless_continue,
    clippy::needless_for_each,
    clippy::non_canonical_clone_impl,
    clippy::non_canonical_partial_ord_impl,
    clippy::almost_swapped,
    clippy::cmp_owned,
    clippy::double_parens,
    clippy::float_cmp,
    clippy::float_cmp_const,
    clippy::float_equality_without_abs,
    clippy::inherent_to_string,
    clippy::manual_ok_or,
    clippy::map_entry,
    clippy::map_flatten,
    clippy::match_wildcard_for_single_variants,
    clippy::needless_bool,
    clippy::option_env_unwrap,
    clippy::significant_drop_in_scrutinee,
    clippy::unit_arg,
    clippy::ok_expect,
    clippy::option_option,
    clippy::question_mark,
    clippy::undocumented_unsafe_blocks,
    clippy::unsafe_removed_from_name,
    clippy::verbose_bit_mask,
    clippy::wildcard_imports,
    clippy::unreadable_literal,
    clippy::unseparated_literal_suffix,
    clippy::suspicious_arithmetic_impl,
    clippy::suspicious_op_assign_impl,
    clippy::suspicious_operation_groupings,
    clippy::suspicious_xor_used_as_pow,
    clippy::transmute_ptr_to_ref,
    clippy::too_long_first_doc_paragraph,
    clippy::unnecessary_fallible_conversions,
    clippy::unnecessary_join,
    clippy::unnecessary_struct_initialization,
    clippy::unwrap_used,
    clippy::expect_used,
    clippy::indexing_slicing,
    clippy::std_instead_of_alloc,
    clippy::std_instead_of_core,
    clippy::alloc_instead_of_core,
    clippy::str_to_string,
    clippy::debug_assert_with_mut_call,
    clippy::error_impl_error,
    clippy::partial_pub_fields,
    clippy::ref_patterns,
    clippy::manual_let_else,
    clippy::manual_find_map,
    clippy::mem_replace_with_default,
    clippy::mem_replace_option_with_none,
    clippy::semicolon_if_nothing_returned,
    clippy::search_is_some,
    clippy::box_collection,
    clippy::box_default,
    clippy::linkedlist,
    clippy::option_if_let_else,
    clippy::partialeq_ne_impl,
    clippy::redundant_clone,
    clippy::use_self,
    clippy::doc_lazy_continuation,
    clippy::checked_conversions,
    clippy::cognitive_complexity,
    clippy::absolute_paths,
    clippy::macro_use_imports,
    clippy::multiple_unsafe_ops_per_block,
    clippy::cloned_ref_to_slice_refs,
    clippy::const_is_empty,
    clippy::explicit_counter_loop,
    clippy::field_reassign_with_default,
    clippy::manual_checked_ops,
    clippy::manual_unwrap_or_default,
    clippy::unnecessary_filter_map,
    clippy::unnecessary_get_then_check,
    clippy::unnecessary_literal_unwrap,
    clippy::unnecessary_sort_by,
    clippy::unnecessary_unwrap,
    clippy::wildcard_in_or_patterns,
    clippy::doc_overindented_list_items,
    clippy::manual_unwrap_or,
    clippy::result_large_err,
    clippy::collapsible_if,
    clippy::manual_contains,
    clippy::unnecessary_cast,
    clippy::useless_format
)]
pub mod audit;

use anyhow::Result;
use axum::{extract::State, routing::get, Router};
use axum_prometheus::PrometheusMetricLayer;
use prometheus::{Encoder as _, TextEncoder};
use sqlx::postgres::PgPoolOptions;
use std::env;
use std::sync::Arc;
use std::time::Instant;

use topems_shared_core::{
    api_version::{create_api_info_router, register_routes_with_legacy_alias},
    config::enhanced::DatabaseConfig,
    cors::create_cors_layer,
    health::{check_http_health, DependencyHealth, HealthStatus, ServiceHealth, SystemMetrics},
    logging::{init_logging, request_context_middleware},
    response::ApiResponse,
};

use topems_shared_db::database::create_database_pool;
use topems_shared_db::rls::rls_middleware;

use topems_shared_auth::auth::{auth_middleware, AuthState};
use topems_shared_auth::permission_center::PermissionCenterClient;
use topems_shared_auth::security::{rate_limit_middleware, RateLimitConfig, RateLimitMiddleware};

use topems_shared_observability::telemetry::{init_telemetry, telemetry_middleware};

use topems_shared_event::event::{EventPublisher, RabbitMqSubscriber};

/// 服务启动配置
#[derive(Debug, Clone)]
pub struct BootstrapConfig {
    /// 服务名称
    pub service_name: &'static str,

    /// 服务版本
    pub service_version: &'static str,

    /// 默认端口
    pub default_port: u16,

    /// 数据库配置
    pub database: DatabaseConfig,

    /// 是否启用认证
    pub enable_auth: bool,

    /// 是否启用 CORS
    pub enable_cors: bool,

    /// 是否启用健康检查
    pub enable_health_check: bool,

    /// 是否启用指标监控
    pub enable_metrics: bool,

    /// V21.0: 是否启用权限中心（默认启用）
    ///
    /// 启动时自动初始化权限元数据缓存，
    /// 并订阅 PermissionMetadataChangedEvent 实时更新。
    pub enable_permission_center: bool,

    /// V21.0: 是否启用事件订阅（默认启用）
    ///
    /// 启动时自动订阅：
    /// - 权限变更事件（PermissionMetadataChangedEvent）
    /// - 缓存失效广播（CacheInvalidatedEvent via Fanout Exchange）
    ///
    /// 需要 RabbitMQ 连接可用，失败不影响服务启动。
    pub enable_event_subscription: bool,
}

impl Default for BootstrapConfig {
    fn default() -> Self {
        Self {
            service_name: "unknown",
            service_version: "0.1.0",
            default_port: 8000,
            database: DatabaseConfig::default(),
            enable_auth: true,
            enable_cors: true,
            enable_health_check: true,
            enable_metrics: true,
            enable_permission_center: true,
            enable_event_subscription: true,
        }
    }
}

/// 应用状态
#[derive(Clone)]
pub struct AppState {
    /// 数据库连接池
    pub db: sqlx::PgPool,

    /// 认证状态
    pub auth_state: AuthState,

    /// 系统指标
    pub metrics: Arc<SystemMetrics>,

    /// 启动时间
    pub start_time: Instant,

    /// 服务配置
    pub config: BootstrapConfig,
}

impl AppState {
    pub fn new(
        db: sqlx::PgPool,
        auth_state: AuthState,
        metrics: Arc<SystemMetrics>,
        start_time: Instant,
        config: BootstrapConfig,
    ) -> Self {
        Self {
            db,
            auth_state,
            metrics,
            start_time,
            config,
        }
    }
}

/// 服务启动器
pub struct ServiceBootstrap {
    config: BootstrapConfig,
    custom_routes: Option<Router>,
    custom_health_checks: Option<Vec<HealthCheckFn>>,
}

/// 健康检查函数类型
pub type HealthCheckFn = fn() -> DependencyHealth;

impl ServiceBootstrap {
    /// 创建新的服务启动器
    pub fn new(config: BootstrapConfig) -> Self {
        Self {
            config,
            custom_routes: None,
            custom_health_checks: None,
        }
    }

    /// 添加自定义路由
    pub fn with_custom_routes(mut self, routes: Router) -> Self {
        self.custom_routes = Some(routes);
        self
    }

    /// 添加自定义健康检查
    pub fn with_custom_health_checks(mut self, checks: Vec<HealthCheckFn>) -> Self {
        self.custom_health_checks = Some(checks);
        self
    }

    /// 启动服务
    pub async fn bootstrap(self) -> Result<()> {
        dotenv::dotenv().ok();

        init_logging(self.config.service_name);

        tracing::info!("🚀 {} 服务启动中...", self.config.service_name);
        tracing::info!("📦 版本: {}", self.config.service_version);

        let db = self.create_database_pool().await?;
        tracing::info!("✅ 数据库连接成功");

        if self.config.enable_permission_center {
            let permission_client = PermissionCenterClient::new(self.config.service_name);
            if let Err(e) = permission_client.initialize().await {
                tracing::warn!("⚠️  权限元数据缓存初始化失败（不影响启动）: {:?}", e);
            } else {
                tracing::info!("✅ 权限元数据缓存已初始化");

                if self.config.enable_event_subscription {
                    match RabbitMqSubscriber::new(self.config.service_name).await {
                        Ok(subscriber) => {
                            if let Err(e) = permission_client
                                .start_event_subscription(&subscriber)
                                .await
                            {
                                tracing::warn!("⚠️  权限变更事件订阅启动失败: {:?}", e);
                            } else {
                                tracing::info!("✅ 权限变更事件订阅已启动");

                                if let Err(e) = subscriber
                                    .subscribe_cache_invalidation(|payload| {
                                        tracing::info!(
                                            "🔄 收到缓存失效广播: pattern={}, level={}",
                                            payload.cache_key_pattern,
                                            payload.invalidation_level
                                        );
                                        Ok(())
                                    })
                                    .await
                                {
                                    tracing::warn!("⚠️  缓存失效广播订阅失败: {:?}", e);
                                }
                            }
                        }
                        Err(e) => {
                            tracing::warn!("⚠️  RabbitMQ 连接失败，跳过事件订阅: {:?}", e);
                        }
                    }
                }
            }
        }

        let start_time = Instant::now();
        let metrics = Arc::new(SystemMetrics::new());
        let auth_state = AuthState::from_env();

        let app_state = AppState::new(
            db.clone(),
            auth_state,
            metrics.clone(),
            start_time,
            self.config.clone(),
        );

        let app = self.build_router(app_state.clone());

        let port = env::var("SERVER_PORT")
            .or_else(|_| env::var("PORT"))
            .unwrap_or_else(|_| self.config.default_port.to_string());
        let addr = format!("0.0.0.0:{}", port);

        tracing::info!("🌐 服务地址: {}", addr);
        tracing::info!(
            "🔒 认证保护: {}",
            if self.config.enable_auth {
                "已启用"
            } else {
                "未启用"
            }
        );

        let listener = tokio::net::TcpListener::bind(&addr).await?;
        axum::serve(listener, app).await?;

        Ok(())
    }

    /// 创建数据库连接池
    async fn create_database_pool(&self) -> Result<sqlx::PgPool> {
        let database_url =
            env::var("DATABASE_URL").unwrap_or_else(|_| self.config.database.url.clone());

        let svc_tag = derive_service_tag(self.config.service_name);
        let per_service_key = format_db_max_connections_key(&svc_tag);

        let max_connections = parse_max_connections(
            env::var(&per_service_key).ok(),
            env::var("DB_MAX_CONNECTIONS").ok(),
            self.config.database.max_connections,
        );

        let search_path = env::var("SEARCH_PATH").unwrap_or_else(|_| "rs, erp, public".to_string());

        let pool = PgPoolOptions::new()
            .max_connections(max_connections)
            .after_connect(move |conn, _meta| {
                let sp = search_path.clone();
                Box::pin(async move {
                    sqlx::query("SELECT set_config('search_path', $1, false)")
                        .bind(&sp)
                        .execute(conn)
                        .await?;
                    Ok(())
                })
            })
            .connect(&database_url)
            .await?;

        Ok(pool)
    }

    /// 构建路由
    fn build_router(&self, state: AppState) -> Router {
        let mut router = Router::new();

        if self.config.enable_health_check {
            let health_router = self.create_health_router(state.clone());
            router = router.merge(health_router);
        }

        router = router.merge(create_api_info_router(self.config.service_name));

        if let Some(custom_routes) = self.custom_routes.clone() {
            let mut stateful_router = Router::new().with_state(state.clone());
            stateful_router = stateful_router.merge(custom_routes);

            if self.config.enable_auth {
                let protected_routes = stateful_router.layer(axum::middleware::from_fn_with_state(
                    state.auth_state.clone(),
                    auth_middleware,
                ));
                router = router.merge(protected_routes);
            } else {
                router = router.merge(stateful_router);
            }
        }

        if self.config.enable_cors {
            router = router.layer(create_cors_layer());
        }

        router
    }

    /// 创建健康检查路由
    fn create_health_router(&self, state: AppState) -> Router {
        Router::new()
            .route("/health", get(health_check))
            .route("/api/health/detailed", get(health_check_detailed))
            .route("/api/metrics", get(get_metrics))
            .with_state(state)
    }
}

/// 基础健康检查
async fn health_check(State(state): State<AppState>) -> axum::Json<ApiResponse<ServiceHealth>> {
    let db_health = check_database_health(&state.db).await;

    let status = if db_health.status == HealthStatus::Healthy {
        HealthStatus::Healthy
    } else {
        HealthStatus::Unhealthy
    };

    let health = ServiceHealth {
        service_name: state.config.service_name.to_string(),
        status,
        message: format!("{} 服务运行正常", state.config.service_name),
        timestamp: chrono::Utc::now().to_rfc3339(),
        uptime: Some(state.metrics.get_uptime()),
        dependencies: Some(vec![db_health]),
        response_time_ms: None,
        last_check: Some(chrono::Utc::now().to_rfc3339()),
    };

    axum::Json(ApiResponse::success(health, "服务运行正常"))
}

/// 详细健康检查
async fn health_check_detailed(
    State(state): State<AppState>,
) -> axum::Json<ApiResponse<ServiceHealth>> {
    let db_health = check_database_health(&state.db).await;

    let status = if db_health.status == HealthStatus::Healthy {
        HealthStatus::Healthy
    } else {
        HealthStatus::Unhealthy
    };

    let health = ServiceHealth {
        service_name: state.config.service_name.to_string(),
        status,
        message: "健康检查完成".to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
        uptime: Some(state.metrics.get_uptime()),
        dependencies: Some(vec![db_health]),
        response_time_ms: None,
        last_check: Some(chrono::Utc::now().to_rfc3339()),
    };

    axum::Json(ApiResponse::success(health, "健康检查完成"))
}

/// 获取系统指标
async fn get_metrics(State(state): State<AppState>) -> axum::Json<ApiResponse<MetricsResponse>> {
    let metrics = state.metrics.as_ref();
    let response = MetricsResponse {
        uptime: metrics.get_uptime(),
        request_count: metrics.get_request_count(),
        error_count: metrics.get_error_count(),
        active_connections: metrics.get_active_connections(),
    };
    axum::Json(ApiResponse::success(response, "系统指标"))
}

/// 指标响应结构
#[derive(Debug, Clone, serde::Serialize)]
struct MetricsResponse {
    pub uptime: String,
    pub request_count: u64,
    pub error_count: u64,
    pub active_connections: u64,
}

/// 检查数据库健康状态
pub async fn check_database_health(pool: &sqlx::PgPool) -> DependencyHealth {
    match sqlx::query("SELECT 1").execute(pool).await {
        Ok(_) => DependencyHealth {
            name: "database".to_string(),
            status: HealthStatus::Healthy,
            message: "数据库连接正常".to_string(),
        },
        Err(e) => {
            tracing::error!("数据库健康检查失败: {}", e);
            DependencyHealth {
                name: "database".to_string(),
                status: HealthStatus::Unhealthy,
                message: format!("数据库连接失败: {}", e),
            }
        }
    }
}

/// 快速启动服务（简化版本）
pub async fn quick_bootstrap(
    service_name: &'static str,
    default_port: u16,
    routes: Router,
) -> Result<()> {
    let config = BootstrapConfig {
        service_name,
        default_port,
        ..Default::default()
    };

    ServiceBootstrap::new(config)
        .with_custom_routes(routes)
        .bootstrap()
        .await
}

/// 快速启动服务（带数据库）
pub async fn quick_bootstrap_with_db(
    service_name: &'static str,
    default_port: u16,
    routes: Router,
    db_url: Option<&str>,
) -> Result<()> {
    let database_url = db_url.map(|s| s.to_string()).unwrap_or_else(|| {
        env::var("DATABASE_URL").expect("DATABASE_URL environment variable is required")
    });

    let config = BootstrapConfig {
        service_name,
        default_port,
        database: DatabaseConfig {
            url: database_url,
            max_connections: 10,
            min_connections: Some(3),
            connect_timeout: Some(30),
            idle_timeout: Some(300),
            max_lifetime: Some(1800),
            test_interval: Some(60),
            enable_connection_reuse: Some(true),
        },
        ..Default::default()
    };

    ServiceBootstrap::new(config)
        .with_custom_routes(routes)
        .bootstrap()
        .await
}

// =============================================================================
// V2: 统一微服务启动模板
// =============================================================================

/// 服务配置（V2 统一模板）
#[derive(Debug, Clone)]
pub struct ServiceConfig {
    /// 服务名称，如 "topems-erp"
    pub name: &'static str,
    /// 默认端口
    pub port: u16,
    /// 服务专属端口环境变量名，如 "ERP_PORT"
    pub port_env_var: Option<&'static str>,
    /// 数据库最大连接数
    pub max_db_connections: u32,
    /// 是否启用事件发布
    pub enable_events: bool,
    /// 是否启用 RLS 中间件
    pub enable_rls: bool,
    /// 是否启用 request_context 中间件
    pub enable_request_context: bool,
    /// API 前缀，如 "/api/erp"
    pub api_prefix: &'static str,
    /// 旧版 API 前缀列表，如 &["/api/v1/erp"]
    pub legacy_prefixes: &'static [&'static str],
}

impl Default for ServiceConfig {
    fn default() -> Self {
        Self {
            name: "unknown",
            port: 8000,
            port_env_var: None,
            max_db_connections: 20,
            enable_events: false,
            enable_rls: true,
            enable_request_context: true,
            api_prefix: "",
            legacy_prefixes: &[],
        }
    }
}

/// 服务启动后共享的通用资源
pub struct ServiceContext {
    /// 数据库连接池
    pub db: sqlx::PgPool,
    /// 认证状态
    pub auth_state: AuthState,
    /// 系统指标
    pub metrics: Arc<SystemMetrics>,
    /// 事件发布器（如果启用）
    pub event_publisher: Option<Arc<EventPublisher>>,
    /// 启动时间
    pub start_time: Instant,
}

/// 组装完毕、可运行的应用
pub struct Application {
    /// 最终路由
    pub router: Router,
    /// 监听端口
    pub port: u16,
    /// 服务名称
    pub name: &'static str,
}

/// 初始化通用资源：telemetry、数据库连接池、metrics、auth_state、event_publisher
pub async fn bootstrap_service(config: &ServiceConfig) -> Result<ServiceContext> {
    dotenv::dotenv().ok();

    let _telemetry_guard = init_telemetry(config.name);

    tracing::info!("🚀 {} 服务启动中...", config.name);

    let db_url = env::var("DATABASE_URL").map_err(|_| {
        tracing::error!("DATABASE_URL environment variable is required");
        anyhow::anyhow!("DATABASE_URL environment variable is required")
    })?;

    let db_config = DatabaseConfig {
        url: db_url,
        max_connections: config.max_db_connections,
        ..Default::default()
    };

    let db = create_database_pool(&db_config).await?;

    let metrics = Arc::new(SystemMetrics::new());
    let auth_state = AuthState::from_env();
    let start_time = Instant::now();

    let event_publisher = if config.enable_events {
        match EventPublisher::new(config.name) {
            Ok(publisher) => {
                tracing::info!("📢 事件发布服务初始化成功");
                Some(Arc::new(publisher))
            }
            Err(e) => {
                tracing::warn!("⚠️ 事件发布服务初始化失败（不阻塞启动）: {}", e);
                None
            }
        }
    } else {
        None
    };

    Ok(ServiceContext {
        db,
        auth_state,
        metrics,
        event_publisher,
        start_time,
    })
}

/// 默认的 init_db 实现：可选 master_data refs 表 + 服务特定 schema defense
///
/// 消除各服务 main.rs 中重复的 `async fn init_db(pool: &sqlx::PgPool) -> Result<()>`
/// 包装函数。调用者传入服务特定的 `schema_defense::run_schema_migration_and_verify`
/// 即可获得统一行为：
///   1. 可选 master_data_refs 表创建（模式 B：crm/erp/scm/pdm 为 true）
///   2. schema_defense 调用 + 失败仅日志记录（不阻塞启动）
///
/// # 参数
/// - `pool`: 数据库连接池
/// - `service_name`: 服务名（如 "wms"、"crm"），用于 master_data_refs 表名前缀和日志
/// - `with_master_data_refs`: 是否创建 `{service}_master_data_refs` 表（模式 B 为 true）
/// - `schema_defense_fn`: 服务特定的 schema_defense 函数（如
///   `schema_defense::run_schema_migration_and_verify`），返回 `Result<(), sqlx::Error>`
///
/// # 调用示例
/// ```ignore
/// // 模式 A（wms/tms/srm/aps/hrm）：纯 schema_defense
/// topems_shared_bootstrap::default_init_db(
///     &pool, "wms", false, schema_defense::run_schema_migration_and_verify,
/// ).await?;
/// // 模式 B（crm/erp/scm）：master_data_refs + schema_defense
/// topems_shared_bootstrap::default_init_db(
///     &pool, "erp", true, schema_defense::run_schema_migration_and_verify,
/// ).await?;
/// ```
pub async fn default_init_db<'a, F, Fut, E>(
    pool: &'a sqlx::PgPool,
    service_name: &str,
    with_master_data_refs: bool,
    schema_defense_fn: F,
) -> Result<()>
where
    F: FnOnce(&'a sqlx::PgPool) -> Fut + Send,
    Fut: std::future::Future<Output = Result<(), E>> + Send + 'a,
    E: std::fmt::Debug + Send + 'a,
{
    if with_master_data_refs {
        topems_shared_db::database::ensure_master_data_refs_table(pool, service_name).await?;
    }
    if let Err(e) = schema_defense_fn(pool).await {
        tracing::error!("[{}] Schema 防御检查失败: {:?}", service_name, e);
    }
    Ok(())
}

/// 组装最终的应用路由：rate_limit + auth + rls 中间件、CORS、Prometheus、telemetry 层
pub fn build_application(
    ctx: &ServiceContext,
    config: &ServiceConfig,
    public_routes: Router,
    protected_routes: Router,
    openapi_json: Option<String>,
) -> Application {
    let cors = create_cors_layer();
    let (prometheus_layer, _metric_handle) = PrometheusMetricLayer::pair();

    let rate_limit_config = RateLimitConfig::new(200, 60)
        .with_by_user_id(false)
        .with_by_ip(true);
    let rate_limiter = Arc::new(RateLimitMiddleware::new(rate_limit_config));
    let rate_limit_layer = axum::middleware::from_fn({
        let mw = rate_limiter.clone();
        move |req, next| {
            let mw = mw.clone();
            async move { rate_limit_middleware(mw, req, next).await }
        }
    });

    let mut protected = protected_routes.layer(axum::middleware::from_fn_with_state(
        ctx.auth_state.clone(),
        auth_middleware,
    ));

    if config.enable_rls {
        protected = protected.layer(axum::middleware::from_fn_with_state(
            ctx.db.clone(),
            rls_middleware,
        ));
    }

    protected = protected.layer(rate_limit_layer);

    let mut app = register_routes_with_legacy_alias(
        Router::new().merge(public_routes),
        config.api_prefix,
        config.legacy_prefixes,
        protected,
    )
    .merge(create_api_info_router(config.name));

    if let Some(json) = openapi_json {
        app = app.route("/api-docs/openapi.json", get(move || async move { json }));
    }

    if config.enable_request_context {
        app = app.layer(axum::middleware::from_fn(request_context_middleware));
    }

    app = app.layer(axum::middleware::from_fn(telemetry_middleware));

    app = app.layer(prometheus_layer).layer(cors);

    let port = resolve_port(config);

    Application {
        router: app,
        port,
        name: config.name,
    }
}

/// 启动 HTTP 服务
pub async fn run(app: Application) -> Result<()> {
    let addr = format!("0.0.0.0:{}", app.port);
    tracing::info!("🌐 {} 服务地址: {}", app.name, addr);
    tracing::info!("🔒 认证保护已启用");
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app.router).await?;
    Ok(())
}

/// 从环境变量解析端口
pub fn resolve_port(config: &ServiceConfig) -> u16 {
    if let Some(var) = config.port_env_var {
        if let Ok(val) = env::var(var) {
            if let Ok(port) = val.parse::<u16>() {
                return port;
            }
        }
    }
    for var in &["SERVER_PORT", "PORT"] {
        if let Ok(val) = env::var(var) {
            if let Ok(port) = val.parse::<u16>() {
                return port;
            }
        }
    }
    config.port
}

// ==================== 健康检查辅助函数 ====================

/// 检查 IAM 服务健康状态
pub async fn check_iam_health() -> DependencyHealth {
    let iam_url =
        env::var("IAM_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8000".to_string());
    let health_url = format!("{}/health", iam_url);

    match check_http_health(&health_url).await {
        Ok(status) => {
            let message = match status {
                HealthStatus::Healthy => "IAM 服务正常",
                HealthStatus::Degraded => "IAM 服务响应异常",
                HealthStatus::Unhealthy => "IAM 服务不可用",
            };
            DependencyHealth {
                name: "iam-service".to_string(),
                status,
                message: message.to_string(),
            }
        }
        Err(e) => {
            tracing::warn!("IAM 服务健康检查失败: {}", e);
            DependencyHealth {
                name: "iam-service".to_string(),
                status: HealthStatus::Degraded,
                message: format!("IAM 服务连接异常: {}", e),
            }
        }
    }
}

/// Prometheus 指标导出端点
pub async fn prometheus_metrics_handler() -> String {
    let encoder = TextEncoder::new();
    let metrics = prometheus::gather();
    let mut buffer = Vec::new();
    match encoder.encode(&metrics, &mut buffer) {
        Ok(()) => String::from_utf8(buffer)
            .unwrap_or_else(|_| "Error: invalid UTF-8 in metrics".to_string()),
        Err(e) => format!("Error encoding metrics: {}", e),
    }
}

/// 标准服务指标响应
#[derive(Debug, Clone, serde::Serialize)]
pub struct ServiceMetricsResponse {
    pub service_name: String,
    pub uptime_seconds: u64,
    pub uptime_formatted: String,
    pub request_count: u64,
    pub error_count: u64,
    pub active_connections: u64,
    pub database_pool_size: u32,
    pub database_pool_idle: usize,
}

// ==================== 纯函数：服务标签与 DB 连接辅助 ====================

/// 从服务名推导 `SVC_TAG`，去掉 `topems-` 前缀后转 UPPER_SNAKE_CASE。
///
/// e.g. `"topems-unified-core"` → `"UNIFIED_CORE"`，`"plain-service"` → `"PLAIN_SERVICE"`
pub fn derive_service_tag(service_name: &str) -> String {
    service_name
        .strip_prefix("topems-")
        .unwrap_or(service_name)
        .to_uppercase()
        .replace('-', "_")
}

/// 按服务标签拼接每个服务专属的 DB 最大连接数环境变量名。
pub fn format_db_max_connections_key(svc_tag: &str) -> String {
    format!("{}_DB_MAX_CONNECTIONS", svc_tag)
}

/// 按优先级链解析 DB 最大连接数：per-service → DB_MAX_CONNECTIONS → default。
/// 非法数字字符串会回退到 default。
pub fn parse_max_connections(
    per_service_value: Option<String>,
    global_value: Option<String>,
    default: u32,
) -> u32 {
    per_service_value
        .or(global_value)
        .and_then(|s| s.parse::<u32>().ok())
        .unwrap_or(default)
}

// ==================== 纯函数：健康状态汇总 ====================

/// 基于依赖项的健康状态向量汇总出整体健康状态：
/// 全部 Healthy → Healthy，任一 Unhealthy → Unhealthy，否则 Degraded。
pub fn rollup_health_status(statuses: &[HealthStatus]) -> HealthStatus {
    if statuses.is_empty() {
        return HealthStatus::Healthy;
    }
    let all_healthy = statuses.iter().all(|s| *s == HealthStatus::Healthy);
    let any_unhealthy = statuses.contains(&HealthStatus::Unhealthy);
    if all_healthy {
        HealthStatus::Healthy
    } else if any_unhealthy {
        HealthStatus::Unhealthy
    } else {
        HealthStatus::Degraded
    }
}

/// 将 HealthStatus 映射为英文小写状态字符串（对外 API 友好）。
pub fn health_status_str(status: &HealthStatus) -> &'static str {
    match status {
        HealthStatus::Healthy => "healthy",
        HealthStatus::Degraded => "degraded",
        HealthStatus::Unhealthy => "unhealthy",
    }
}

/// 整体健康状态对应的中文描述信息。
pub fn overall_health_message(status: &HealthStatus) -> &'static str {
    match status {
        HealthStatus::Healthy => "所有服务运行正常",
        HealthStatus::Degraded => "部分服务存在问题",
        HealthStatus::Unhealthy => "存在关键服务故障",
    }
}

/// 构造简单健康检查响应（"healthy"/"degraded"/"unhealthy" 字符串，带 ApiResponse 包装）。
///
/// 等价于 RD/AI/GIS/Portal/Mobile 等服务中反复出现的内联 health_check 模板：
/// 1) 依次调用 check_database_health + check_iam_health；
/// 2) 用 rollup_health_status 汇总整体状态；
/// 3) 映射为英文状态字符串后包装成 ApiResponse。
pub async fn build_simple_status_response(pool: &sqlx::PgPool) -> axum::Json<ApiResponse<String>> {
    let database_health = check_database_health(pool).await;
    let iam_health = check_iam_health().await;
    let overall_status = rollup_health_status(&[database_health.status, iam_health.status]);
    let status_str = health_status_str(&overall_status).to_string();
    axum::Json(ApiResponse::success(status_str, "健康检查"))
}

/// 构造标准详细健康检查响应（带 ServiceHealth，默认包含 db + iam，可注入额外依赖）。
///
/// - `extra_dependencies`: 除 db/iam 外的附加依赖项（例如 AI 服务、插件服务、自定义检查）。
/// - `uptime`: 可选 uptime 字符串（从 metrics 或 start_time 计算，传 None 则省略 with_uptime）。
///
/// 返回 `Json<ApiResponse<ServiceHealth>>`，对应 RD/AI/GIS 的 health_check_detailed 模板。
pub async fn build_detailed_service_health(
    pool: &sqlx::PgPool,
    service_name: &str,
    uptime: Option<&str>,
    extra_dependencies: Vec<DependencyHealth>,
) -> axum::Json<ApiResponse<ServiceHealth>> {
    let mut dependencies = vec![check_database_health(pool).await, check_iam_health().await];
    dependencies.extend(extra_dependencies);

    let statuses: Vec<HealthStatus> = dependencies.iter().map(|d| d.status.clone()).collect();
    let overall_status = rollup_health_status(&statuses);
    let message = overall_health_message(&overall_status);

    let mut health =
        ServiceHealth::healthy_with_message(service_name, message).with_dependencies(dependencies);
    if let Some(up) = uptime {
        health = health.with_uptime(up);
    }

    axum::Json(ApiResponse::success(health, "详细健康检查"))
}

/// 构造 /health/detailed 端点的标准化 JSON 响应（消除多服务内联重复模板）。
///
/// 典型返回（`modules`、`version` 和自定义 `extra_fields` 按服务注入）：
/// ```json
/// {
///   "service": "<name>",
///   "status": "healthy|unhealthy",
///   "timestamp": "<ISO-8601>",
///   "modules": { "<mod>": "active", ... },
///   "dependencies": [{ "name": "postgresql", "status": "..." }],
///   "version": "<version>",
///   ...extra_fields
/// }
/// ```
pub async fn build_detailed_health_response(
    pool: &sqlx::PgPool,
    service: &str,
    modules: serde_json::Value,
    version: &str,
    extra_fields: serde_json::Value,
) -> serde_json::Value {
    let db_status = match sqlx::query("SELECT 1").fetch_one(pool).await {
        Ok(_) => "healthy",
        Err(_) => "unhealthy",
    };

    let mut response = serde_json::json!({
        "service": service,
        "status": db_status,
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "modules": modules,
        "dependencies": [
            { "name": "postgresql", "status": db_status }
        ],
        "version": version,
    });

    if let (serde_json::Value::Object(ref mut resp), serde_json::Value::Object(extra)) =
        (&mut response, extra_fields)
    {
        resp.extend(extra);
    }

    response
}

/// 从 ServiceContext 创建 AppState（用于标准健康检查路由）
pub fn create_health_state(ctx: &ServiceContext, config: &ServiceConfig) -> AppState {
    AppState::new(
        ctx.db.clone(),
        ctx.auth_state.clone(),
        ctx.metrics.clone(),
        ctx.start_time,
        BootstrapConfig {
            service_name: config.name,
            default_port: config.port,
            ..Default::default()
        },
    )
}

/// 创建标准健康检查路由（使用 AppState）
pub fn create_standard_health_routes(state: AppState) -> Router {
    Router::new()
        .route("/health", get(standard_health_check))
        .route("/api/health/detailed", get(standard_health_check_detailed))
        .route("/api/metrics", get(standard_get_metrics))
        .route("/metrics", get(prometheus_metrics_handler))
        .with_state(state)
}

/// 标准健康检查（返回简短状态字符串）
pub async fn standard_health_check(
    State(state): State<AppState>,
) -> axum::Json<ApiResponse<String>> {
    let database_health = check_database_health(&state.db).await;
    let iam_health = check_iam_health().await;

    let overall_status = rollup_health_status(&[database_health.status, iam_health.status]);
    let status_str = health_status_str(&overall_status).to_string();

    axum::Json(ApiResponse::success(status_str, "健康检查"))
}

/// 标准详细健康检查
pub async fn standard_health_check_detailed(
    State(state): State<AppState>,
) -> axum::Json<ApiResponse<ServiceHealth>> {
    let dependencies = vec![
        check_database_health(&state.db).await,
        check_iam_health().await,
    ];

    let overall_status = rollup_health_status(
        &dependencies
            .iter()
            .map(|d| d.status.clone())
            .collect::<Vec<_>>(),
    );

    let message = overall_health_message(&overall_status);

    let health = ServiceHealth::healthy_with_message(state.config.service_name, message)
        .with_uptime(&state.metrics.get_uptime())
        .with_dependencies(dependencies);

    axum::Json(ApiResponse::success(health, "详细健康检查"))
}

/// 标准服务指标
pub async fn standard_get_metrics(
    State(state): State<AppState>,
) -> axum::Json<ApiResponse<ServiceMetricsResponse>> {
    let metrics = ServiceMetricsResponse {
        service_name: state.config.service_name.to_string(),
        uptime_seconds: state.metrics.get_uptime_seconds(),
        uptime_formatted: state.metrics.get_uptime(),
        request_count: state.metrics.get_request_count(),
        error_count: state.metrics.get_error_count(),
        active_connections: state.metrics.get_active_connections(),
        database_pool_size: state.db.size(),
        database_pool_idle: state.db.num_idle(),
    };

    axum::Json(ApiResponse::success(metrics, "服务指标"))
}

// =============================================================================
// P1-R1 治理：默认 home/health/detailed_health 处理函数
// 各 svc main.rs 中这三个函数几乎完全相同，仅字符串不同，统一在此提供默认实现。
// =============================================================================

/// 生成默认 home 文本（P1-R1 治理）
///
/// 各 svc main.rs 中 `home()` 函数仅返回一段静态字符串，统一在此构造，
/// 避免每个 svc 复制粘贴相同的 `async fn home() -> &'static str` 样板。
///
/// 返回的字符串已 `Box::leak` 为 `&'static str`，可直接用于 `get(handler)`。
///
/// # 用法
/// ```ignore
/// // svc main.rs
/// static HOME_TEXT: &str = default_home_text("TOPEMS PDM", "Product Data Management");
/// async fn home() -> &'static str { HOME_TEXT }
/// ```
pub fn default_home_text(service_title: &str, service_desc: &str) -> &'static str {
    Box::leak(
        format!(
            "{} Service API\n\n{}\n\n- /health - Health check",
            service_title, service_desc
        )
        .into_boxed_str(),
    )
}

/// 生成默认 detailed_health 处理函数
///
/// # 参数
/// - `pool`: 数据库连接池（从 AppState 取）
/// - `service_tag`: 服务标签，如 "pdm-service"
/// - `modules_json`: 模块状态 JSON，如 `json!({"pdm": "active"})`
/// - `version`: 服务版本
pub async fn default_detailed_health_handler(
    pool: sqlx::PgPool,
    service_tag: &'static str,
    modules_json: serde_json::Value,
    version: &'static str,
) -> axum::Json<topems_shared_core::response::ApiResponse<serde_json::Value>> {
    use topems_shared_core::response::ApiResponse;
    let resp = build_detailed_health_response(
        &pool,
        service_tag,
        modules_json,
        version,
        serde_json::json!({}),
    )
    .await;
    axum::Json(ApiResponse::success(resp, "Detailed health check"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serial_test::serial;
    use std::sync::Mutex;
    use topems_shared_core::health::HealthStatus;

    static ENV_LOCK: Mutex<()> = Mutex::new(());

    #[test]
    fn test_bootstrap_config_default() {
        let config = BootstrapConfig::default();
        assert_eq!(config.service_name, "unknown");
        assert_eq!(config.default_port, 8000);
        assert!(config.enable_auth);
    }

    #[test]
    fn test_bootstrap_config_custom() {
        let config = BootstrapConfig {
            service_name: "test-service",
            default_port: 9000,
            ..Default::default()
        };
        assert_eq!(config.service_name, "test-service");
        assert_eq!(config.default_port, 9000);
    }

    #[test]
    fn test_derive_service_tag_with_prefix() {
        assert_eq!(derive_service_tag("topems-unified-core"), "UNIFIED_CORE");
        assert_eq!(derive_service_tag("topems-hrm"), "HRM");
    }

    #[test]
    fn test_derive_service_tag_without_prefix() {
        assert_eq!(derive_service_tag("plain-service"), "PLAIN_SERVICE");
        assert_eq!(derive_service_tag("crm"), "CRM");
    }

    #[test]
    fn test_format_db_max_connections_key() {
        assert_eq!(
            format_db_max_connections_key("UNIFIED_CORE"),
            "UNIFIED_CORE_DB_MAX_CONNECTIONS"
        );
        assert_eq!(
            format_db_max_connections_key("HRM"),
            "HRM_DB_MAX_CONNECTIONS"
        );
    }

    #[test]
    fn test_parse_max_connections_per_service_wins() {
        assert_eq!(
            parse_max_connections(Some("32".into()), Some("20".into()), 10),
            32
        );
    }

    #[test]
    fn test_parse_max_connections_global_fallback() {
        assert_eq!(parse_max_connections(None, Some("20".into()), 10), 20);
    }

    #[test]
    fn test_parse_max_connections_default_when_missing() {
        assert_eq!(parse_max_connections(None, None, 10), 10);
    }

    #[test]
    fn test_parse_max_connections_invalid_string_fallback() {
        assert_eq!(
            parse_max_connections(Some("abc".into()), Some("-1".into()), 10),
            10
        );
    }

    #[test]
    fn test_rollup_all_healthy() {
        assert_eq!(
            rollup_health_status(&[HealthStatus::Healthy, HealthStatus::Healthy]),
            HealthStatus::Healthy
        );
    }

    #[test]
    fn test_rollup_any_unhealthy_wins() {
        assert_eq!(
            rollup_health_status(&[HealthStatus::Healthy, HealthStatus::Unhealthy]),
            HealthStatus::Unhealthy
        );
        assert_eq!(
            rollup_health_status(&[HealthStatus::Degraded, HealthStatus::Unhealthy]),
            HealthStatus::Unhealthy
        );
    }

    #[test]
    fn test_rollup_degraded_mixture() {
        assert_eq!(
            rollup_health_status(&[HealthStatus::Healthy, HealthStatus::Degraded]),
            HealthStatus::Degraded
        );
        assert_eq!(
            rollup_health_status(&[HealthStatus::Degraded, HealthStatus::Degraded]),
            HealthStatus::Degraded
        );
    }

    #[test]
    fn test_rollup_empty_is_healthy() {
        assert_eq!(rollup_health_status(&[]), HealthStatus::Healthy);
    }

    #[test]
    fn test_health_status_str() {
        assert_eq!(health_status_str(&HealthStatus::Healthy), "healthy");
        assert_eq!(health_status_str(&HealthStatus::Degraded), "degraded");
        assert_eq!(health_status_str(&HealthStatus::Unhealthy), "unhealthy");
    }

    #[test]
    fn test_overall_health_message() {
        assert_eq!(
            overall_health_message(&HealthStatus::Healthy),
            "所有服务运行正常"
        );
        assert_eq!(
            overall_health_message(&HealthStatus::Degraded),
            "部分服务存在问题"
        );
        assert_eq!(
            overall_health_message(&HealthStatus::Unhealthy),
            "存在关键服务故障"
        );
    }

    #[test]
    fn test_service_config_default() {
        let cfg = ServiceConfig::default();
        assert_eq!(cfg.name, "unknown");
        assert_eq!(cfg.port, 8000);
        assert_eq!(cfg.port_env_var, None);
        assert_eq!(cfg.max_db_connections, 20);
    }

    #[serial]
    #[test]
    fn test_resolve_port_default_fallback() {
        let _lock = ENV_LOCK.lock().unwrap();
        std::env::remove_var("SERVER_PORT");
        std::env::remove_var("PORT");
        std::env::remove_var("ERP_PORT");
        let cfg = ServiceConfig {
            name: "topems-erp",
            port: 8010,
            port_env_var: Some("ERP_PORT"),
            ..Default::default()
        };
        assert_eq!(resolve_port(&cfg), 8010);
    }

    #[serial]
    #[test]
    fn test_resolve_port_custom_env_var() {
        let _lock = ENV_LOCK.lock().unwrap();
        std::env::remove_var("SERVER_PORT");
        std::env::remove_var("PORT");
        std::env::set_var("ERP_PORT", "19000");
        let cfg = ServiceConfig {
            name: "topems-erp",
            port: 8010,
            port_env_var: Some("ERP_PORT"),
            ..Default::default()
        };
        assert_eq!(resolve_port(&cfg), 19000);
        std::env::remove_var("ERP_PORT");
    }

    #[serial]
    #[test]
    fn test_resolve_port_server_port_fallback() {
        let _lock = ENV_LOCK.lock().unwrap();
        std::env::remove_var("ERP_PORT");
        std::env::remove_var("PORT");
        std::env::set_var("SERVER_PORT", "28000");
        let cfg = ServiceConfig {
            name: "topems-erp",
            port: 8010,
            port_env_var: Some("ERP_PORT"),
            ..Default::default()
        };
        assert_eq!(resolve_port(&cfg), 28000);
        std::env::remove_var("SERVER_PORT");
    }

    #[serial]
    #[test]
    fn test_resolve_port_invalid_env_ignored() {
        let _lock = ENV_LOCK.lock().unwrap();
        std::env::remove_var("SERVER_PORT");
        std::env::remove_var("PORT");
        std::env::set_var("ERP_PORT", "not-a-number");
        std::env::set_var("PORT", "also-invalid");
        let cfg = ServiceConfig {
            name: "topems-erp",
            port: 8010,
            port_env_var: Some("ERP_PORT"),
            ..Default::default()
        };
        assert_eq!(resolve_port(&cfg), 8010);
        std::env::remove_var("ERP_PORT");
        std::env::remove_var("PORT");
    }

    // ===== derive_service_tag edge cases =====
    // 注：用户描述 "topems-analytics -> analytics" 是错误的，
    // 代码实际上做了 `.to_uppercase().replace('-', "_")`，所以返回 "ANALYTICS"。
    #[test]
    fn test_derive_service_tag_analytics_is_uppercase() {
        assert_eq!(derive_service_tag("topems-analytics"), "ANALYTICS");
        assert_eq!(derive_service_tag("topems-unified-core"), "UNIFIED_CORE");
    }

    #[test]
    fn test_derive_service_tag_empty_and_prefix_only() {
        assert_eq!(derive_service_tag(""), "");
        assert_eq!(derive_service_tag("topems"), "TOPEMS");
    }

    #[test]
    fn test_derive_service_tag_with_numbers() {
        assert_eq!(derive_service_tag("topems-api-v1"), "API_V1");
        assert_eq!(derive_service_tag("v1-gateway"), "V1_GATEWAY");
    }

    // ===== format_db_max_connections_key =====
    #[test]
    fn test_format_db_max_connections_key_empty() {
        assert_eq!(format_db_max_connections_key(""), "_DB_MAX_CONNECTIONS");
    }

    // ===== parse_max_connections edge cases =====
    #[test]
    fn test_parse_max_connections_overflow_falls_back() {
        // u32::MAX = 4294967295; 更大的数 parse 失败 -> 回退 default
        assert_eq!(
            parse_max_connections(Some("9999999999".into()), None, 10),
            10
        );
        assert_eq!(
            parse_max_connections(Some(format!("{}0", u32::MAX)), None, 10),
            10
        );
    }

    #[test]
    fn test_parse_max_connections_zero_is_valid() {
        assert_eq!(
            parse_max_connections(Some("0".into()), Some("20".into()), 10),
            0
        );
    }

    // ===== BootstrapConfig 完整字段断言 =====

    #[test]
    fn test_bootstrap_config_default_all_fields() {
        let config = BootstrapConfig::default();
        assert_eq!(config.service_name, "unknown");
        assert_eq!(config.service_version, "0.1.0");
        assert_eq!(config.default_port, 8000);
        assert!(config.enable_auth);
        assert!(config.enable_cors);
        assert!(config.enable_health_check);
        assert!(config.enable_metrics);
        assert!(config.enable_permission_center);
        assert!(config.enable_event_subscription);
    }

    #[test]
    fn test_bootstrap_config_custom_all_booleans_false() {
        let config = BootstrapConfig {
            service_name: "minimal",
            service_version: "2.0.0",
            default_port: 3000,
            database: DatabaseConfig::default(),
            enable_auth: false,
            enable_cors: false,
            enable_health_check: false,
            enable_metrics: false,
            enable_permission_center: false,
            enable_event_subscription: false,
        };
        assert_eq!(config.service_name, "minimal");
        assert_eq!(config.service_version, "2.0.0");
        assert_eq!(config.default_port, 3000);
        assert!(!config.enable_auth);
        assert!(!config.enable_cors);
        assert!(!config.enable_health_check);
        assert!(!config.enable_metrics);
        assert!(!config.enable_permission_center);
        assert!(!config.enable_event_subscription);
    }

    #[test]
    fn test_bootstrap_config_clone_and_debug_derive() {
        let config = BootstrapConfig {
            service_name: "clone-test",
            default_port: 7777,
            ..Default::default()
        };
        let cloned = config.clone();
        assert_eq!(cloned.service_name, "clone-test");
        assert_eq!(cloned.default_port, 7777);
        let debug_str = format!("{:?}", config);
        assert!(debug_str.contains("clone-test"));
        assert!(debug_str.contains("7777"));
    }

    // ===== ServiceConfig 完整字段断言 =====

    #[test]
    fn test_service_config_default_all_fields() {
        let cfg = ServiceConfig::default();
        assert_eq!(cfg.name, "unknown");
        assert_eq!(cfg.port, 8000);
        assert_eq!(cfg.port_env_var, None);
        assert_eq!(cfg.max_db_connections, 20);
        assert!(!cfg.enable_events);
        assert!(cfg.enable_rls);
        assert!(cfg.enable_request_context);
        assert_eq!(cfg.api_prefix, "");
        assert!(cfg.legacy_prefixes.is_empty());
    }

    #[test]
    fn test_service_config_custom_all_fields() {
        let cfg = ServiceConfig {
            name: "topems-qms",
            port: 8090,
            port_env_var: Some("QMS_PORT"),
            max_db_connections: 50,
            enable_events: true,
            enable_rls: false,
            enable_request_context: false,
            api_prefix: "/api/core/qms/v1",
            legacy_prefixes: &["/api/v1/qms", "/api/qms"],
        };
        assert_eq!(cfg.name, "topems-qms");
        assert_eq!(cfg.port, 8090);
        assert_eq!(cfg.port_env_var, Some("QMS_PORT"));
        assert_eq!(cfg.max_db_connections, 50);
        assert!(cfg.enable_events);
        assert!(!cfg.enable_rls);
        assert!(!cfg.enable_request_context);
        assert_eq!(cfg.api_prefix, "/api/core/qms/v1");
        assert_eq!(cfg.legacy_prefixes, &["/api/v1/qms", "/api/qms"]);
    }

    #[test]
    fn test_service_config_clone_and_debug_derive() {
        let cfg = ServiceConfig {
            name: "topems-crm",
            port: 8020,
            port_env_var: Some("CRM_PORT"),
            max_db_connections: 30,
            enable_events: true,
            enable_rls: true,
            enable_request_context: true,
            api_prefix: "/api/crm",
            legacy_prefixes: &["/api/v1/crm"],
        };
        let cloned = cfg.clone();
        assert_eq!(cloned.name, "topems-crm");
        assert_eq!(cloned.port, 8020);
        assert_eq!(cloned.legacy_prefixes, cfg.legacy_prefixes);
        let debug_str = format!("{:?}", cfg);
        assert!(debug_str.contains("topems-crm"));
        assert!(debug_str.contains("CRM_PORT"));
    }

    // ===== ServiceBootstrap 构建器（纯构造，不启动异步）=====

    #[test]
    fn test_service_bootstrap_new_constructs() {
        let config = BootstrapConfig::default();
        let bootstrap = ServiceBootstrap::new(config);
        assert!(bootstrap.custom_routes.is_none());
        assert!(bootstrap.custom_health_checks.is_none());
    }

    #[test]
    fn test_service_bootstrap_with_custom_routes() {
        let config = BootstrapConfig::default();
        let router: Router = Router::new();
        let bootstrap = ServiceBootstrap::new(config).with_custom_routes(router);
        assert!(bootstrap.custom_routes.is_some());
    }

    #[test]
    fn test_service_bootstrap_with_custom_health_checks() {
        let config = BootstrapConfig::default();
        fn dummy_check() -> DependencyHealth {
            DependencyHealth {
                name: "dummy".to_string(),
                status: HealthStatus::Healthy,
                message: "ok".to_string(),
            }
        }
        let checks: Vec<HealthCheckFn> = vec![dummy_check];
        let bootstrap = ServiceBootstrap::new(config).with_custom_health_checks(checks);
        assert!(bootstrap.custom_health_checks.is_some());
        let stored = bootstrap.custom_health_checks.unwrap();
        assert_eq!(stored.len(), 1);
        let dep = stored[0]();
        assert_eq!(dep.name, "dummy");
        assert_eq!(dep.status, HealthStatus::Healthy);
    }

    #[test]
    fn test_service_bootstrap_full_chain_builders() {
        let config = BootstrapConfig {
            service_name: "chain-test",
            default_port: 5000,
            ..Default::default()
        };
        fn check_a() -> DependencyHealth {
            DependencyHealth {
                name: "a".into(),
                status: HealthStatus::Degraded,
                message: "".into(),
            }
        }
        fn check_b() -> DependencyHealth {
            DependencyHealth {
                name: "b".into(),
                status: HealthStatus::Healthy,
                message: "ok".into(),
            }
        }
        let bootstrap = ServiceBootstrap::new(config)
            .with_custom_routes(Router::new())
            .with_custom_health_checks(vec![check_a, check_b]);
        assert!(bootstrap.custom_routes.is_some());
        let checks = bootstrap.custom_health_checks.unwrap();
        assert_eq!(checks.len(), 2);
        assert_eq!(checks[0]().name, "a");
        assert_eq!(checks[1]().status, HealthStatus::Healthy);
    }

    // ===== HealthCheckFn 类型别名覆盖 =====

    #[test]
    fn test_health_check_fn_returns_unhealthy() {
        fn broken() -> DependencyHealth {
            DependencyHealth {
                name: "redis".to_string(),
                status: HealthStatus::Unhealthy,
                message: "connection refused".to_string(),
            }
        }
        let f: HealthCheckFn = broken;
        let dep = f();
        assert_eq!(dep.name, "redis");
        assert_eq!(dep.status, HealthStatus::Unhealthy);
        assert_eq!(dep.message, "connection refused");
    }

    // ===== MetricsResponse: 构造 + 序列化 + Clone + Debug =====

    #[test]
    fn test_metrics_response_construction_and_serialize() {
        let response = MetricsResponse {
            uptime: "1h 2m 3s".to_string(),
            request_count: 1024,
            error_count: 7,
            active_connections: 42,
        };
        let json = serde_json::to_value(&response).unwrap();
        assert_eq!(json["uptime"], "1h 2m 3s");
        assert_eq!(json["request_count"], 1024);
        assert_eq!(json["error_count"], 7);
        assert_eq!(json["active_connections"], 42);
    }

    #[test]
    fn test_metrics_response_clone_and_debug() {
        let response = MetricsResponse {
            uptime: "0s".to_string(),
            request_count: 0,
            error_count: 0,
            active_connections: 0,
        };
        let cloned = response.clone();
        assert_eq!(cloned.uptime, response.uptime);
        assert_eq!(cloned.request_count, 0);
        let debug_str = format!("{:?}", response);
        assert!(debug_str.contains("MetricsResponse"));
        assert!(debug_str.contains("request_count: 0"));
    }

    #[test]
    fn test_metrics_response_all_zeros_serialization() {
        let response = MetricsResponse {
            uptime: "0s".to_string(),
            request_count: 0,
            error_count: 0,
            active_connections: 0,
        };
        let serialized = serde_json::to_string(&response).unwrap();
        assert!(serialized.contains("\"uptime\":\"0s\""));
        assert!(serialized.contains("\"request_count\":0"));
        assert!(serialized.contains("\"error_count\":0"));
        assert!(serialized.contains("\"active_connections\":0"));
    }

    // ===== ServiceMetricsResponse: 构造 + 序列化 + Clone + Debug =====

    #[test]
    fn test_service_metrics_response_construction_and_serialize() {
        let metrics = ServiceMetricsResponse {
            service_name: "topems-hrm".to_string(),
            uptime_seconds: 3661,
            uptime_formatted: "1h 1m 1s".to_string(),
            request_count: 50000,
            error_count: 123,
            active_connections: 99,
            database_pool_size: 20,
            database_pool_idle: 8,
        };
        let json = serde_json::to_value(&metrics).unwrap();
        assert_eq!(json["service_name"], "topems-hrm");
        assert_eq!(json["uptime_seconds"], 3661);
        assert_eq!(json["uptime_formatted"], "1h 1m 1s");
        assert_eq!(json["request_count"], 50000);
        assert_eq!(json["error_count"], 123);
        assert_eq!(json["active_connections"], 99);
        assert_eq!(json["database_pool_size"], 20);
        assert_eq!(json["database_pool_idle"], 8);
    }

    #[test]
    fn test_service_metrics_response_clone_and_debug() {
        let metrics = ServiceMetricsResponse {
            service_name: "svc".to_string(),
            uptime_seconds: 0,
            uptime_formatted: "0s".to_string(),
            request_count: 0,
            error_count: 0,
            active_connections: 0,
            database_pool_size: 0,
            database_pool_idle: 0,
        };
        let cloned = metrics.clone();
        assert_eq!(cloned.service_name, "svc");
        assert_eq!(cloned.uptime_seconds, 0);
        let debug_str = format!("{:?}", metrics);
        assert!(debug_str.contains("ServiceMetricsResponse"));
        assert!(debug_str.contains("\"svc\""));
    }

    // ===== Application 结构纯构造 =====

    #[test]
    fn test_application_struct_construction() {
        let router: Router = Router::new();
        let app = Application {
            router,
            port: 8080,
            name: "test-app",
        };
        assert_eq!(app.port, 8080);
        assert_eq!(app.name, "test-app");
    }

    // ===== resolve_port PORT 环境变量分支 =====

    #[serial]
    #[test]
    fn test_resolve_port_port_env_var() {
        let _lock = ENV_LOCK.lock().unwrap();
        std::env::remove_var("ERP_PORT");
        std::env::remove_var("SERVER_PORT");
        std::env::set_var("PORT", "38000");
        let cfg = ServiceConfig {
            name: "topems-erp",
            port: 8010,
            port_env_var: Some("ERP_PORT"),
            ..Default::default()
        };
        assert_eq!(resolve_port(&cfg), 38000);
        std::env::remove_var("PORT");
    }

    #[serial]
    #[test]
    fn test_resolve_port_priority_order_custom_server_port() {
        let _lock = ENV_LOCK.lock().unwrap();
        std::env::set_var("CUSTOM_PORT", "1111");
        std::env::set_var("SERVER_PORT", "2222");
        std::env::set_var("PORT", "3333");
        let cfg = ServiceConfig {
            name: "svc",
            port: 4444,
            port_env_var: Some("CUSTOM_PORT"),
            ..Default::default()
        };
        assert_eq!(resolve_port(&cfg), 1111);
        std::env::remove_var("CUSTOM_PORT");
        std::env::remove_var("SERVER_PORT");
        std::env::remove_var("PORT");
    }

    // ===== BootstrapConfig struct update syntax =====

    #[test]
    fn test_bootstrap_config_update_syntax_preserves_rest() {
        let base = BootstrapConfig::default();
        let custom = BootstrapConfig {
            service_name: "special",
            default_port: 9999,
            ..base
        };
        assert_eq!(custom.service_name, "special");
        assert_eq!(custom.default_port, 9999);
        assert_eq!(custom.service_version, "0.1.0");
        assert!(custom.enable_auth);
        assert!(custom.enable_cors);
    }

    // ===== rollup_health_status 三态混合 =====

    #[test]
    fn test_rollup_three_healthy_one_degraded() {
        assert_eq!(
            rollup_health_status(&[
                HealthStatus::Healthy,
                HealthStatus::Healthy,
                HealthStatus::Healthy,
                HealthStatus::Degraded,
            ]),
            HealthStatus::Degraded
        );
    }

    #[test]
    fn test_rollup_three_degraded_one_unhealthy() {
        assert_eq!(
            rollup_health_status(&[
                HealthStatus::Degraded,
                HealthStatus::Degraded,
                HealthStatus::Degraded,
                HealthStatus::Unhealthy,
            ]),
            HealthStatus::Unhealthy
        );
    }

    #[test]
    fn test_rollup_only_unhealthy() {
        assert_eq!(
            rollup_health_status(&[HealthStatus::Unhealthy]),
            HealthStatus::Unhealthy
        );
    }

    #[test]
    fn test_rollup_only_degraded() {
        assert_eq!(
            rollup_health_status(&[HealthStatus::Degraded]),
            HealthStatus::Degraded
        );
    }

    #[test]
    fn test_rollup_only_healthy() {
        assert_eq!(
            rollup_health_status(&[HealthStatus::Healthy]),
            HealthStatus::Healthy
        );
    }

    // ===== DatabaseConfig 默认值检查（通过 BootstrapConfig 访问）=====

    #[test]
    fn test_database_config_default_via_bootstrap_config() {
        let cfg = BootstrapConfig::default();
        assert!(!cfg.database.url.is_empty());
        assert!(cfg.database.max_connections > 0);
    }

    // ===== prometheus_metrics_handler 异步纯函数 =====

    #[tokio::test]
    async fn test_prometheus_metrics_handler_returns_string_no_panic() {
        let result = prometheus_metrics_handler().await;
        assert!(String::from_utf8(result.as_bytes().to_vec()).is_ok());
    }

    #[tokio::test]
    async fn test_prometheus_metrics_handler_multiple_calls_return_same_type() {
        let a = prometheus_metrics_handler().await;
        let b = prometheus_metrics_handler().await;
        assert_eq!(a.is_empty(), b.is_empty());
    }

    // ===== AppState 纯构造（lazy pool，不实际连接 DB）=====

    fn make_test_pg_pool() -> sqlx::PgPool {
        sqlx::postgres::PgPoolOptions::new()
            .acquire_timeout(std::time::Duration::from_millis(50))
            .connect_lazy("postgres://u:p@127.0.0.1:1/nonexistent")
            .expect("lazy pool build should not fail")
    }

    fn make_test_auth_state() -> topems_shared_auth::auth::AuthState {
        topems_shared_auth::auth::AuthState::new(
            "test-jwt-secret-key-must-be-at-least-32-characters-long".to_string(),
            "test-refresh-secret-key-must-be-32-characters".to_string(),
            24,
        )
    }

    #[tokio::test]
    async fn test_app_state_new_constructs_with_lazy_pool() {
        let db = make_test_pg_pool();
        let auth_state = make_test_auth_state();
        let metrics = Arc::new(SystemMetrics::new());
        let start_time = Instant::now();
        let config = BootstrapConfig::default();
        let state = AppState::new(
            db.clone(),
            auth_state.clone(),
            metrics.clone(),
            start_time,
            config.clone(),
        );
        assert_eq!(state.config.service_name, config.service_name);
        assert_eq!(state.config.default_port, config.default_port);
    }

    #[tokio::test]
    async fn test_app_state_clone_smoke() {
        let db = make_test_pg_pool();
        let auth_state = make_test_auth_state();
        let metrics = Arc::new(SystemMetrics::new());
        let start_time = Instant::now();
        let config = BootstrapConfig::default();
        let state = AppState::new(
            db.clone(),
            auth_state.clone(),
            metrics.clone(),
            start_time,
            config.clone(),
        );
        let cloned = state.clone();
        assert_eq!(cloned.config.service_name, "unknown");
        assert_eq!(cloned.config.default_port, 8000);
    }

    #[tokio::test]
    async fn test_create_standard_health_routes_compiles_and_returns_router() {
        let db = make_test_pg_pool();
        let auth_state = make_test_auth_state();
        let metrics = Arc::new(SystemMetrics::new());
        let start_time = Instant::now();
        let config = BootstrapConfig::default();
        let state = AppState::new(
            db.clone(),
            auth_state.clone(),
            metrics.clone(),
            start_time,
            config.clone(),
        );
        let _router: Router = create_standard_health_routes(state);
    }

    #[tokio::test]
    async fn test_create_health_state_pure_construction() {
        let db = make_test_pg_pool();
        let auth_state = make_test_auth_state();
        let metrics = Arc::new(SystemMetrics::new());
        let start_time = Instant::now();
        let ctx = ServiceContext {
            db: db.clone(),
            auth_state: auth_state.clone(),
            metrics: metrics.clone(),
            event_publisher: None,
            start_time,
        };
        let svc_cfg = ServiceConfig {
            name: "topems-test-svc",
            port: 8999,
            ..Default::default()
        };
        let state = create_health_state(&ctx, &svc_cfg);
        assert_eq!(state.config.service_name, "topems-test-svc");
        assert_eq!(state.config.default_port, 8999);
    }

    // ===== ServiceContext 结构纯构造 =====

    #[tokio::test]
    async fn test_service_context_manual_construction_with_event_publisher_none() {
        let db = make_test_pg_pool();
        let auth_state = make_test_auth_state();
        let metrics = Arc::new(SystemMetrics::new());
        let start_time = Instant::now();
        let ctx = ServiceContext {
            db: db.clone(),
            auth_state: auth_state.clone(),
            metrics: metrics.clone(),
            event_publisher: None,
            start_time,
        };
        assert!(ctx.event_publisher.is_none());
    }

    // ===== BootstrapConfig 剩余字段变异覆盖 =====

    #[test]
    fn test_bootstrap_config_mutate_all_fields_individually() {
        let cfg = BootstrapConfig {
            service_name: "mutated-svc",
            service_version: "9.9.9",
            default_port: 1234,
            enable_auth: false,
            enable_cors: false,
            enable_health_check: false,
            enable_metrics: false,
            enable_permission_center: false,
            enable_event_subscription: false,
            ..Default::default()
        };
        assert_eq!(cfg.service_name, "mutated-svc");
        assert_eq!(cfg.service_version, "9.9.9");
        assert_eq!(cfg.default_port, 1234);
        assert!(!cfg.enable_auth);
        assert!(!cfg.enable_cors);
        assert!(!cfg.enable_health_check);
        assert!(!cfg.enable_metrics);
        assert!(!cfg.enable_permission_center);
        assert!(!cfg.enable_event_subscription);
    }

    // ===== ServiceConfig 字段变异覆盖 =====

    #[test]
    fn test_service_config_mutate_all_fields() {
        let cfg = ServiceConfig {
            name: "mutated",
            port: 7000,
            port_env_var: Some("MUT_PORT"),
            max_db_connections: 99,
            enable_events: true,
            enable_rls: false,
            enable_request_context: false,
            api_prefix: "/api/mut",
            legacy_prefixes: &["/legacy"],
        };
        assert_eq!(cfg.name, "mutated");
        assert_eq!(cfg.port, 7000);
        assert_eq!(cfg.port_env_var, Some("MUT_PORT"));
        assert_eq!(cfg.max_db_connections, 99);
        assert!(cfg.enable_events);
        assert!(!cfg.enable_rls);
        assert!(!cfg.enable_request_context);
        assert_eq!(cfg.api_prefix, "/api/mut");
        assert_eq!(cfg.legacy_prefixes, &["/legacy"]);
    }

    // ===== resolve_port 无 port_env_var + 直接走 PORT/SERVER_PORT =====

    #[serial]
    #[test]
    fn test_resolve_port_without_port_env_var_uses_server_port() {
        let _lock = ENV_LOCK.lock().unwrap();
        std::env::remove_var("SERVER_PORT");
        std::env::remove_var("PORT");
        std::env::set_var("SERVER_PORT", "17000");
        let cfg = ServiceConfig {
            port_env_var: None,
            port: 80,
            ..Default::default()
        };
        assert_eq!(resolve_port(&cfg), 17000);
        std::env::remove_var("SERVER_PORT");
    }

    #[serial]
    #[test]
    fn test_resolve_port_invalid_server_port_falls_through_to_default() {
        let _lock = ENV_LOCK.lock().unwrap();
        std::env::remove_var("PORT");
        std::env::set_var("SERVER_PORT", "NaN");
        let cfg = ServiceConfig {
            port_env_var: None,
            port: 8888,
            ..Default::default()
        };
        assert_eq!(resolve_port(&cfg), 8888);
        std::env::remove_var("SERVER_PORT");
    }

    // ===== DatabaseConfig: 通过 quick_bootstrap_with_db 内部构造方式 =====

    #[test]
    fn test_database_config_explicit_construction() {
        let database_url = "postgres://test".to_string();
        let db_cfg = DatabaseConfig {
            url: database_url,
            max_connections: 10,
            min_connections: Some(3),
            connect_timeout: Some(30),
            idle_timeout: Some(300),
            max_lifetime: Some(1800),
            test_interval: Some(60),
            enable_connection_reuse: Some(true),
        };
        assert_eq!(db_cfg.url, "postgres://test");
        assert_eq!(db_cfg.max_connections, 10);
        assert_eq!(db_cfg.min_connections, Some(3));
        assert_eq!(db_cfg.connect_timeout, Some(30));
        assert_eq!(db_cfg.idle_timeout, Some(300));
        assert_eq!(db_cfg.max_lifetime, Some(1800));
        assert_eq!(db_cfg.test_interval, Some(60));
        assert_eq!(db_cfg.enable_connection_reuse, Some(true));
    }

    // ===== parse_max_connections: 每服务 None 时全局 Some =====

    #[test]
    fn test_parse_max_connections_global_wins_when_per_service_none() {
        assert_eq!(parse_max_connections(None, Some("55".into()), 10), 55);
    }

    // ===== resolve_port: 自定义 port_env_var 为无效数字时回退到 SERVER_PORT =====

    #[serial]
    #[test]
    fn test_resolve_port_bad_custom_env_then_server_port() {
        let _lock = ENV_LOCK.lock().unwrap();
        std::env::remove_var("PORT");
        std::env::set_var("BAD_CUSTOM", "notport");
        std::env::set_var("SERVER_PORT", "4567");
        let cfg = ServiceConfig {
            port_env_var: Some("BAD_CUSTOM"),
            port: 9999,
            ..Default::default()
        };
        assert_eq!(resolve_port(&cfg), 4567);
        std::env::remove_var("BAD_CUSTOM");
        std::env::remove_var("SERVER_PORT");
    }

    // ===== resolve_port: 全部环境变量无效时使用 config.port =====

    #[serial]
    #[test]
    fn test_resolve_port_all_env_invalid_uses_default() {
        let _lock = ENV_LOCK.lock().unwrap();
        std::env::set_var("MY_PORT", "xyz");
        std::env::set_var("SERVER_PORT", "abc");
        std::env::set_var("PORT", "not-a-u16");
        let cfg = ServiceConfig {
            port_env_var: Some("MY_PORT"),
            port: 7654,
            ..Default::default()
        };
        assert_eq!(resolve_port(&cfg), 7654);
        std::env::remove_var("MY_PORT");
        std::env::remove_var("SERVER_PORT");
        std::env::remove_var("PORT");
    }

    // ===== Application 结构字段变异 =====

    #[test]
    fn test_application_struct_field_mutation() {
        let router: Router = Router::new();
        let mut app = Application {
            router,
            port: 1111,
            name: "before",
        };
        app.port = 2222;
        app.name = "after";
        assert_eq!(app.port, 2222);
        assert_eq!(app.name, "after");
    }

    // ===== MetricsResponse 字段变异 =====

    #[test]
    fn test_metrics_response_field_mutation() {
        let mut mr = MetricsResponse {
            uptime: "a".to_string(),
            request_count: 1,
            error_count: 2,
            active_connections: 3,
        };
        mr.uptime = "b".to_string();
        mr.request_count = 10;
        mr.error_count = 20;
        mr.active_connections = 30;
        assert_eq!(mr.uptime, "b");
        assert_eq!(mr.request_count, 10);
        assert_eq!(mr.error_count, 20);
        assert_eq!(mr.active_connections, 30);
    }

    // ===== ServiceMetricsResponse 字段变异 =====

    #[test]
    fn test_service_metrics_response_field_mutation() {
        let mut smr = ServiceMetricsResponse {
            service_name: "a".to_string(),
            uptime_seconds: 1,
            uptime_formatted: "b".to_string(),
            request_count: 2,
            error_count: 3,
            active_connections: 4,
            database_pool_size: 5,
            database_pool_idle: 6,
        };
        smr.service_name = "x".to_string();
        smr.uptime_seconds = 100;
        smr.uptime_formatted = "y".to_string();
        smr.request_count = 200;
        smr.error_count = 300;
        smr.active_connections = 400;
        smr.database_pool_size = 500;
        smr.database_pool_idle = 600;
        assert_eq!(smr.service_name, "x");
        assert_eq!(smr.uptime_seconds, 100);
        assert_eq!(smr.uptime_formatted, "y");
        assert_eq!(smr.request_count, 200);
        assert_eq!(smr.error_count, 300);
        assert_eq!(smr.active_connections, 400);
        assert_eq!(smr.database_pool_size, 500);
        assert_eq!(smr.database_pool_idle, 600);
    }
}
