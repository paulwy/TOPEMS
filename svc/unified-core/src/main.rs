//! TOPEMS Unified Core Platform
//!
//! Unified service for: IAM + Flow + File + Communication + Tenant + Billing + Plugin + Sync
//!
//! This is the core platform that must be included in any TOPEMS product.

mod handlers;
mod routes;
mod schema_defense;
mod shared;

pub mod middleware;
pub mod modules;

use axum_prometheus::PrometheusMetricLayer;
use reqwest::Client;

use topems_shared::create_cors_layer;
use topems_shared_auth::security::{
    AuditLoggerConfig, AuditLoggerMiddleware, BodyLimitConfig, BodyLimitMiddleware,
    FieldEncryptionService, KeyManager, SecurityHeadersConfig, SecurityHeadersLayer,
};
use topems_shared_bootstrap::{bootstrap_service, resolve_port, run, Application, ServiceConfig};
use topems_shared_core::logging::request_context_middleware;
use topems_shared_core::{
    compression::{CompressionConfig, CompressionMiddleware},
    health::{SimpleHealthConfig, SystemMetrics},
};
use topems_shared_observability::telemetry::TelemetryExt;
use utoipa::{Modify, OpenApi};

use modules::flow::approval::{ApprovalTask, ApprovalTaskListResponse};
use modules::flow::models::{
    CreateInstanceRequest, CreateWorkflowRequest, MonthlyData, StatisticsResponse,
    TaskActionRequest, TaskBatchRequest, TaskBatchResult, TaskFailure, TaskStats,
    UpdateWorkflowRequest, Workflow, WorkflowInstance, WorkflowStat, WorkflowTask,
};

pub use shared::*;

#[derive(OpenApi)]
#[openapi(
    tags(
        (name = "IAM", description = "身份与访问管理 - 用户、角色、权限管理"),
        (name = "IAM-Auth", description = "认证接口 - 登录、注册、Token刷新"),
        (name = "IAM-Role", description = "角色管理 - 角色CRUD"),
        (name = "IAM-Permission", description = "权限管理 - 权限验证、权限查询"),
        (name = "IAM-Position", description = "岗位管理 - 岗位CRUD、用户岗位关联"),
        (name = "Flow", description = "工作流 - 流程定义、实例、任务管理"),
        (name = "Flow-Task", description = "任务管理 - 任务查询、认领、审批"),
        (name = "Flow-Workflow", description = "流程管理 - 流程定义CRUD"),
        (name = "Flow-Instance", description = "实例管理 - 流程实例CRUD"),
        (name = "Flow-Approval", description = "审批管理 - 审批任务处理"),
        (name = "Flow-Template", description = "模板管理 - 流程模板CRUD"),
        (name = "Flow-History", description = "历史记录 - 流程历史查询"),
        (name = "Flow-Monitor", description = "流程监控 - 运行监控、统计分析"),
        (name = "File", description = "文件管理 - 文件上传、下载、共享"),
        (name = "File-Folder", description = "文件夹管理 - 文件夹CRUD"),
        (name = "Doc", description = "文档管理 - 文档、模板、文件夹CRUD"),
        (name = "Communication", description = "通讯服务 - 邮件、通知"),
        (name = "IM", description = "即时消息 - WebSocket实时消息"),
        (name = "Notification", description = "通知服务 - 通知管理"),
        (name = "Master", description = "主数据 - 基础数据管理"),
        (name = "Migration", description = "数据迁移 - 数据同步"),
        (name = "Plugin", description = "插件管理 - 插件注册、运行时管理"),
        (name = "Search", description = "搜索服务 - 全文搜索"),
        (name = "Health", description = "健康检查 - 服务健康状态"),
        (name = "Monitor", description = "监控服务 - 指标、告警"),
        (name = "Tenant", description = "租户管理 - 租户CRUD"),
        (name = "FeatureFlag", description = "特性开关 - Feature Flag 管理接口"),
    ),
    info(
        title = "TOPEMS-unified-core API",
        version = "1.0.0",
        description = "TOPEMS 统一核心服务 API 文档\n\n包含以下核心模块:\n- **IAM**: 用户管理、角色管理、权限验证、认证授权、岗位管理\n- **Flow**: 工作流引擎、任务管理、审批流程、流程监控\n- **File**: 文件上传下载、文件夹管理、权限控制\n- **Doc**: 文档管理、文档模板、文件夹服务\n- **Communication**: 邮件发送、通知服务（已外迁独立服务 8084，此处保留兼容模块）\n- **IM**: 即时消息、WebSocket实时通信（已外迁独立服务 8084，此处保留兼容模块）\n- **Notification**: 通知管理（已外迁独立服务 8084，此处保留兼容模块）\n- **Master**: 主数据管理\n- **Migration**: 数据迁移、数据同步\n- **Plugin**: 插件系统管理\n- **Search**: 全文搜索（已外迁独立服务 8082，此处保留兼容模块）\n- **Monitor**: 监控指标、健康检查、告警\n- **Tenant**: 多租户管理\n\n所有接口路径前缀: `/api/core`\n认证方式: Bearer Token (JWT)",
    ),
    servers(
        (url = "http://localhost:8000", description = "本地开发环境"),
        (url = "https://api.topems.local", description = "测试环境"),
    ),
    security(
        ("BearerAuth" = [])
    ),
    components(
        schemas(
            Workflow,
            CreateWorkflowRequest,
            UpdateWorkflowRequest,
            WorkflowInstance,
            CreateInstanceRequest,
            WorkflowTask,
            TaskActionRequest,
            TaskBatchRequest,
            TaskBatchResult,
            TaskFailure,
            TaskStats,
            StatisticsResponse,
            WorkflowStat,
            MonthlyData,
            ApprovalTask,
            ApprovalTaskListResponse,
        ),
    ),
    paths(
        // ===== Flow module - task =====
        crate::modules::flow::task::list_tasks,
        crate::modules::flow::task::get_task,
        crate::modules::flow::task::claim_task,
        crate::modules::flow::task::unclaim_task,
        crate::modules::flow::task::approve_task,
        crate::modules::flow::task::reject_task,
        crate::modules::flow::task::complete_task,
        crate::modules::flow::task::delegate_task,
        crate::modules::flow::task::batch_approve,
        crate::modules::flow::task::batch_complete,
        crate::modules::flow::task::batch_delegate,
        crate::modules::flow::task::my_tasks,
        crate::modules::flow::task::my_pending_tasks,
        crate::modules::flow::task::my_completed_tasks,
        crate::modules::flow::task::candidate_tasks,
        crate::modules::flow::task::get_task_count,
        crate::modules::flow::task::get_task_stats,
        crate::modules::flow::task::high_priority_tasks,
        crate::modules::flow::task::overdue_tasks,
        // ===== Flow module - workflow =====
        crate::modules::flow::workflow::list_workflows,
        crate::modules::flow::workflow::get_workflow,
        crate::modules::flow::workflow::create_workflow,
        crate::modules::flow::workflow::update_workflow,
        crate::modules::flow::workflow::delete_workflow,
        crate::modules::flow::workflow::publish_workflow,
        crate::modules::flow::workflow::unpublish_workflow,
        crate::modules::flow::workflow::activate_workflow,
        crate::modules::flow::workflow::deactivate_workflow,
        crate::modules::flow::workflow::deploy_workflow,
        crate::modules::flow::workflow::rollback_workflow,
        // ===== Flow module - instance =====
        crate::modules::flow::instance::list_instances,
        crate::modules::flow::instance::get_instance,
        crate::modules::flow::instance::create_instance,
        crate::modules::flow::instance::start_instance,
        crate::modules::flow::instance::approve_instance,
        crate::modules::flow::instance::reject_instance,
        crate::modules::flow::instance::cancel_instance,
        crate::modules::flow::instance::resume_instance,
        crate::modules::flow::instance::suspend_instance,
        crate::modules::flow::instance::get_instance_details,
        // ===== Flow module - approval =====
        crate::modules::flow::approval::list_approval_tasks,
        crate::modules::flow::approval::get_approval_task,
        crate::modules::flow::approval::list_pending_approvals,
        crate::modules::flow::approval::approve_task,
        crate::modules::flow::approval::reject_task,
        crate::modules::flow::approval::claim_task,
        crate::modules::flow::approval::unclaim_task,
        crate::modules::flow::approval::delegate_task,
        crate::modules::flow::approval::reassign_task,
        crate::modules::flow::approval::list_approvals,
        crate::modules::flow::approval::get_approval,
        crate::modules::flow::approval::create_approval,
        crate::modules::flow::approval::process_approval,
        // ===== Flow module - template =====
        crate::modules::flow::template::list_templates,
        crate::modules::flow::template::create_template,
        crate::modules::flow::template::get_template,
        crate::modules::flow::template::update_template,
        crate::modules::flow::template::delete_template,
        crate::modules::flow::template::copy_template,
        crate::modules::flow::template::import_template,
        crate::modules::flow::template::export_template,
        // ===== Flow module - history =====
        crate::modules::flow::history::list_history,
        crate::modules::flow::history::get_history,
        crate::modules::flow::history::get_instance_history,
        crate::modules::flow::history::get_workflow_history,
        // ===== Flow module - record =====
        crate::modules::flow::record::list_records,
        crate::modules::flow::record::get_record,
        // ===== Flow module - setting/statistics =====
        crate::modules::flow::setting::list_settings,
        crate::modules::flow::setting::get_setting,
        crate::modules::flow::setting::get_setting_by_key,
        crate::modules::flow::setting::update_setting,
        crate::modules::flow::setting::reset_setting,
        crate::modules::flow::setting::batch_update_settings,
        crate::modules::flow::statistics::get_statistics,
        // ===== Doc module =====
        crate::modules::doc::handlers::list_documents,
        crate::modules::doc::handlers::get_document,
        crate::modules::doc::handlers::create_document,
        crate::modules::doc::handlers::update_document,
        crate::modules::doc::handlers::delete_document,
        crate::modules::doc::handlers::list_templates,
        crate::modules::doc::handlers::list_template_categories,
        crate::modules::doc::handlers::get_template,
        crate::modules::doc::handlers::create_template,
        crate::modules::doc::handlers::update_template,
        crate::modules::doc::handlers::delete_template,
        crate::modules::doc::handlers::list_folders,
        crate::modules::doc::handlers::get_folder,
        crate::modules::doc::handlers::create_folder,
        crate::modules::doc::handlers::update_folder,
        crate::modules::doc::handlers::delete_folder,
        crate::modules::doc::handlers::get_dashboard_handler,
        // ===== File module - download =====
        crate::modules::file::download::download_file,
        crate::modules::file::download::preview_file,
        crate::modules::file::download::get_thumbnail,
        // ===== File module - manage =====
        crate::modules::file::manage::list_files,
        crate::modules::file::manage::get_file,
        crate::modules::file::manage::update_file,
        crate::modules::file::manage::delete_file,
        crate::modules::file::manage::move_file,
        crate::modules::file::manage::copy_file,
        crate::modules::file::manage::set_file_permission,
        crate::modules::file::manage::share_file,
        crate::modules::file::manage::get_file_shares,
        crate::modules::file::manage::delete_share,
        crate::modules::file::manage::set_file_permissions,
        crate::modules::file::manage::get_file_permissions,
        crate::modules::file::manage::get_shared_files,
        crate::modules::file::manage::get_received_files,
        crate::modules::file::manage::get_file_stats,
        crate::modules::file::manage::star_file,
        crate::modules::file::manage::unstar_file,
        crate::modules::file::manage::list_starred_files,
        crate::modules::file::manage::export_files,
        crate::modules::file::manage::search_files,
        // ===== File module - upload =====
        crate::modules::file::upload::upload_file,
        crate::modules::file::upload::upload_multiple,
        // ===== Feature Flag management =====
        crate::routes::feature_flag::list_feature_flags,
        crate::routes::feature_flag::get_feature_flag,
        crate::routes::feature_flag::update_feature_flag,
        crate::routes::feature_flag::refresh_feature_flag,
    )
)]
pub struct ApiDoc;

impl Modify for ApiDoc {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        let components = openapi.components.get_or_insert_with(Default::default);
        components.security_schemes.insert(
            "BearerAuth".to_string(),
            utoipa::openapi::security::SecurityScheme::Http(
                utoipa::openapi::security::HttpBuilder::new()
                    .scheme(utoipa::openapi::security::HttpAuthScheme::Bearer)
                    .bearer_format("JWT")
                    .build(),
            ),
        );
    }
}

// ==================== 主入口 ====================

/// Initialize the optional field-encryption service for sensitive settings.
fn init_field_encryption() -> Option<std::sync::Arc<FieldEncryptionService>> {
    let raw_key = [
        "TOPEMS_FIELD_ENCRYPTION_KEY",
        "SETTINGS_ENCRYPTION_KEY",
        "ENCRYPTION_KEY",
    ]
    .iter()
    .map(|name| std::env::var(name).ok())
    .find_map(|v| v.filter(|s| !s.is_empty()));

    let raw_key = match raw_key {
        Some(k) => k,
        None => {
            tracing::warn!(
                "未配置字段加密密钥（TOPEMS_FIELD_ENCRYPTION_KEY / SETTINGS_ENCRYPTION_KEY / ENCRYPTION_KEY），settings 模块敏感字段将以明文存储"
            );
            return None;
        }
    };

    let key_b64 = if let Some(stripped) = raw_key.strip_prefix("base64:") {
        stripped.to_string()
    } else {
        use sha2::{Digest, Sha256};
        let mut hasher = Sha256::new();
        hasher.update(raw_key.as_bytes());
        base64::Engine::encode(
            &base64::engine::general_purpose::STANDARD,
            hasher.finalize(),
        )
    };

    match KeyManager::from_base64_key(&key_b64) {
        Ok(km) => {
            tracing::info!("🔐 字段加密服务已启用（AES-256-GCM），settings 模块敏感字段将加密存储");
            Some(std::sync::Arc::new(FieldEncryptionService::new(km)))
        }
        Err(e) => {
            tracing::warn!("字段加密密钥无效，敏感字段将以明文存储: {}", e);
            None
        }
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // 确保 core 服务使用 public schema 来访问 core_* 表
    std::env::set_var("SEARCH_PATH", "public");

    let config = ServiceConfig {
        name: "topems-unified-core",
        port: 8000,
        port_env_var: Some("CORE_PORT"),
        max_db_connections: 20,
        enable_events: false,
        enable_rls: false,
        enable_request_context: false,
        api_prefix: "/api/core",
        legacy_prefixes: &[],
    };

    let ctx = bootstrap_service(&config).await?;

    tracing::info!(
        "📦 Contains: IAM + Flow + File + Communication + Tenant + Billing + Plugin + Sync"
    );

    // Initialize databases for all modules
    async fn try_init<F, Fut>(name: &str, f: F)
    where
        F: FnOnce() -> Fut,
        Fut: std::future::Future<Output = Result<(), sqlx::Error>>,
    {
        match f().await {
            Ok(()) => tracing::info!("init_database {}: ok", name),
            Err(e) => tracing::warn!(
                "init_database {}: skipped due to error (database may already be initialized): {}",
                name,
                e
            ),
        }
    }

    try_init("iam", || modules::iam::init_database(&ctx.db)).await;
    try_init("flow", || modules::flow::init_database(&ctx.db)).await;
    try_init("file", || modules::file::init_database(&ctx.db)).await;
    try_init("tenant", || modules::tenant::init_database(&ctx.db)).await;
    // V68.1 A2.2: plugin init 迁移到 svc/plugin-registry main.rs（后续在其 bootstrap 后调用）
    // try_init("plugin", || modules::plugin::init_database(&ctx.db)).await;
    try_init("migration", || modules::migration::init_database(&ctx.db)).await;
    // V68.1 A2.3: dict init/seed 迁移到 svc/master-data（主数据域）
    // try_init("dict", || modules::dict::init_database(&ctx.db)).await;
    try_init("master", || {
        modules::master::handlers::init_mdm_tables(&ctx.db)
    })
    .await;
    try_init("menu", || modules::menu::init_database(&ctx.db)).await;
    // V68.1 A2.4.2: help 模块已迁移至 svc/portal/src/modules/help/（Portal BFF，8063 端口启动）
    // V68.1 A2.4.1: login_log init 已合并到 audit::init_database（统一建表）
    try_init("audit", || modules::audit::init_database(&ctx.db)).await;
    try_init("doc", || modules::doc::services::init_database(&ctx.db)).await;

    // V69.3 Schema 防御：增量迁移 + 一致性自检（29 表）
    if let Err(e) = crate::schema_defense::run_schema_migration_and_verify(&ctx.db).await {
        tracing::error!("[unified-core] Schema 防御检查失败: {:?}", e);
    }

    // V68.1 A2.3: dict seed 合并到 svc/master-data 启动流程
    // if let Err(e) = modules::dict::seed::seed_dict_data(&ctx.db).await {
    //     tracing::warn!("seed_dict_data skipped: {}", e);
    // }

    let health_config = SimpleHealthConfig::new("topems-unified-core").with_db(ctx.db.clone());
    let ws_state = std::sync::Arc::new(modules::communication::ws::WsState::new(
        std::sync::Arc::new(ctx.auth_state.clone()),
    ));
    let http_client = Client::new();

    let rate_limit_config = middleware::rate_limit::RateLimitConfig::default()
        .add_path_rule("/api/core/iam/auth/", 30, 60)
        .add_path_rule("/api/v1/core/iam/auth/", 30, 60);
    let rate_limit_middleware = std::sync::Arc::new(
        middleware::rate_limit::RateLimitMiddleware::new(rate_limit_config),
    );

    let version_config = middleware::versioning::VersionConfig::default();
    let versioning_middleware = std::sync::Arc::new(
        middleware::versioning::VersionMiddleware::new(version_config),
    );

    let security_headers_config = SecurityHeadersConfig::default();
    let security_headers_layer =
        std::sync::Arc::new(SecurityHeadersLayer::new(security_headers_config));

    let compression_config = CompressionConfig::default();
    let compression_middleware =
        std::sync::Arc::new(CompressionMiddleware::new(compression_config));

    let body_limit_config = BodyLimitConfig::default();
    let body_limit_mw = std::sync::Arc::new(BodyLimitMiddleware::new(body_limit_config));

    let audit_logger_config = AuditLoggerConfig::default().add_skip_path("/api/core/health");
    let audit_logger_mw = std::sync::Arc::new(AuditLoggerMiddleware::new(
        audit_logger_config,
        ctx.db.clone(),
    ));

    let input_validation_config = middleware::input_validation::InputValidationConfig::default()
        .add_skip_path("/health")
        .add_skip_path("/api")
        .add_skip_path("/api/info")
        .add_skip_path("/api/core/health");

    let pool_for_heartbeat = ctx.db.clone();
    let metrics = std::sync::Arc::new(SystemMetrics::new());
    let encryption = init_field_encryption();
    // V430: SSE session manager for real-time communication endpoints
    let sse_sessions = std::sync::Arc::new(crate::shared::SseSessionManager::new());

    let state = AppState {
        auth_state: ctx.auth_state.clone(),
        pool: ctx.db.clone(),
        health_config,
        ws_state: ws_state.clone(),
        http_client,
        rate_limit_middleware,
        versioning_middleware,
        security_headers_layer,
        compression_middleware,
        body_limit_middleware: body_limit_mw,
        audit_logger_middleware: audit_logger_mw,
        input_validation_config,
        metrics,
        encryption,
        feature_flag_service: std::sync::Arc::new(topems_shared_core::FeatureFlagService::new()),
        sse_sessions,
    };

    // Spawn background task to cleanup timeout WebSocket connections
    let ws_state_cleanup = state.ws_state.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(60));
        loop {
            interval.tick().await;
            let removed = ws_state_cleanup.cleanup_timeout_connections(90).await;
            if !removed.is_empty() {
                tracing::info!(
                    "WebSocket cleanup: removed {} timeout connections",
                    removed.len()
                );
            }
        }
    });

    // Spawn WebSocket event bridge (Redis -> WebSocket)
    let ws_state_bridge = state.ws_state.clone();
    tokio::spawn(async move {
        let bridge_config = modules::communication::ws_event_bridge::WsEventBridgeConfig::default();
        modules::communication::ws_event_bridge::spawn_event_bridge(ws_state_bridge, bridge_config);
    });

    // V431: Spawn background task to cleanup expired SSE sessions
    let sse_sessions_cleanup = state.sse_sessions.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(60));
        loop {
            interval.tick().await;
            // Cleanup sessions inactive for more than 30 minutes
            let removed = sse_sessions_cleanup
                .cleanup_expired(tokio::time::Duration::from_secs(1800))
                .await;
            if removed > 0 {
                tracing::info!(
                    "SSE cleanup: removed {} expired sessions",
                    removed
                );
            }
        }
    });

    // Spawn background task to detect stale plugin heartbeats
    {
        let pool_clone = pool_for_heartbeat.clone();
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(30));
            loop {
                interval.tick().await;

                let result = sqlx::query(
                    r#"
                    UPDATE core.core_plugin_instances
                    SET runtime_status = 'offline'
                    WHERE runtime_status = 'running'
                      AND last_heartbeat IS NOT NULL
                      AND last_heartbeat < NOW() - INTERVAL '90 seconds'
                    "#,
                )
                .execute(&pool_clone)
                .await;

                if let Ok(result) = result {
                    if result.rows_affected() > 0 {
                        tracing::warn!(
                            "[Plugin-Heartbeat] Marked {} plugin(s) as offline due to stale heartbeat",
                            result.rows_affected()
                        );
                    }
                }

                let result = sqlx::query(
                    r#"
                    UPDATE core.core_plugin_instances
                    SET runtime_status = 'offline'
                    WHERE runtime_status = 'running'
                      AND last_heartbeat IS NULL
                      AND created_at < NOW() - INTERVAL '2 minutes'
                    "#,
                )
                .execute(&pool_clone)
                .await;

                if let Ok(result) = result {
                    if result.rows_affected() > 0 {
                        tracing::warn!(
                            "[Plugin-Heartbeat] Marked {} plugin(s) as offline (no heartbeat received)",
                            result.rows_affected()
                        );
                    }
                }
            }
        });
    }

    // Build the full application router (routes::create_routes 保留自定义中间件全栈)
    let cors = create_cors_layer();
    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();

    let app = routes::create_routes(&state, move || metric_handle.render())
        .layer(axum::middleware::from_fn(request_context_middleware))
        .with_telemetry()
        .route(
            "/api-docs/openapi.json",
            axum::routing::get(|| async {
                serde_json::to_string_pretty(&ApiDoc::openapi()).unwrap_or_else(|e| {
                    tracing::error!("Failed to serialize OpenAPI spec: {}", e);
                    "{}".to_string()
                })
            }),
        )
        .layer(cors)
        .layer(prometheus_layer)
        .with_state(state);

    let app = Application {
        router: app,
        port: resolve_port(&config),
        name: config.name,
    };

    tracing::info!("📋 API prefix: /api/core/*");

    run(app).await?;
    Ok(())
}
