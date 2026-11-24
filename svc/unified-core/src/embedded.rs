//! Unified Core 模块化单体嵌入入口
//!
//! 将 `main.rs` 的启动组装链提取为可复用 `build_router`：
//! - 独立部署：`main.rs` 调用本函数
//! - 模块化单体：`topems-server` 的 `unified_core_real_module`（feature `module-core`）
//!   以同一入口嵌入
//!
//! 与独立部署共享同一份组装逻辑，避免双轨漂移。

use axum::Router;
use chrono::{DateTime, Utc};
use std::sync::Arc;
use topems_shared_bootstrap::ServiceConfig;
use topems_shared_event::event::EventPublisher;

use crate::shared::AppState;

/// 构建 Unified Core 业务路由
///
/// - `db`：public schema 连接池
/// - `event_publisher`：事件发布器
/// - `public_routes`：调用方提供的健康/指标等入口路由
pub async fn build_router(
    db: sqlx::PgPool,
    event_publisher: Option<Arc<EventPublisher>>,
    public_routes: Router<AppState>,
) -> anyhow::Result<Router> {
    build_router_inner(db, event_publisher, public_routes, false).await
}

/// 嵌入模式构建：core 业务路由挂根（由 server nest /api/core），跳过 public 冲突路由
pub async fn build_router_embedded(
    db: sqlx::PgPool,
    event_publisher: Option<Arc<EventPublisher>>,
    public_routes: Router<AppState>,
) -> anyhow::Result<Router> {
    build_router_inner(db, event_publisher, public_routes, true).await
}

async fn build_router_inner(
    _db: sqlx::PgPool,
    _event_publisher: Option<Arc<EventPublisher>>,
    _public_routes: Router<AppState>,
    embed_mode: bool,
) -> anyhow::Result<Router> {
    // 嵌入模式 search_path：flow 业务表（approvals/approval_records/core_workflow_*）为权威。
    // 模块内固化为显式参数（不写、不读外部 SEARCH_PATH）：server 各模块 build() 会互相覆盖全局 SEARCH_PATH
    // （如 ticket/master_data set "public"、portal set "public, portal"），若 flow 在它们之后
    // 建池会读到被污染的值，导致无前缀查询误命中 public 影子表（历史 500 根因）。

    // 预注册服务间调用/降级指标：避免懒注册导致无流量时 /metrics 缺失指标族
    topems_shared_auth::service::pre_register_service_metrics();

    let config = ServiceConfig {
        name: "topems-unified-core",
        port: 8000,
        port_env_var: Some("CORE_PORT"),
        max_db_connections: 20,
        enable_events: false,
        enable_rls: true,
        enable_request_context: false,
        api_prefix: "/api/core",
        legacy_prefixes: &[],
        init_telemetry: false, // 嵌入模式不初始化 telemetry（由 server 统一初始化）
    };

    let ctx = topems_shared_bootstrap::bootstrap_service_with_search_path(&config, "flow, public")
        .await?;

    tracing::info!(
        "📦 Contains: IAM + Flow + File + Communication + Tenant + Billing + Plugin + Sync"
    );

    let health_config = topems_shared_core::health::SimpleHealthConfig::new("topems-unified-core")
        .with_db(ctx.db.clone());
    let ws_state = std::sync::Arc::new(crate::modules::communication::ws::WsState::new(
        std::sync::Arc::new(ctx.auth_state.clone()),
    ));
    let http_client = topems_shared_core::shared_http_client();

    let rate_limit_config = crate::middleware::rate_limit::RateLimitConfig::default()
        .add_path_rule("/api/core/iam/auth/", 30, 60);
    let rate_limit_middleware = std::sync::Arc::new(
        crate::middleware::rate_limit::RateLimitMiddleware::new(rate_limit_config),
    );

    let version_config = crate::middleware::versioning::VersionConfig::default();
    let versioning_middleware = std::sync::Arc::new(
        crate::middleware::versioning::VersionMiddleware::new(version_config),
    );

    // 与独立部署一致：按 ENVIRONMENT 选择预设，避免嵌入模式在生产悄悄用 default()
    let security_headers_config = topems_shared_auth::security::SecurityHeadersConfig::from_env();
    let security_headers_layer = std::sync::Arc::new(
        topems_shared_auth::security::SecurityHeadersLayer::new(security_headers_config),
    );

    let compression_config = topems_shared_core::compression::CompressionConfig::default();
    let compression_middleware = std::sync::Arc::new(
        topems_shared_core::compression::CompressionMiddleware::new(compression_config),
    );

    let body_limit_config = topems_shared_auth::security::BodyLimitConfig::default();
    let body_limit_mw = std::sync::Arc::new(
        topems_shared_auth::security::BodyLimitMiddleware::new(body_limit_config),
    );

    let audit_logger_config = topems_shared_auth::security::AuditLoggerConfig::default()
        .add_skip_path("/api/core/health");
    let audit_logger_mw =
        std::sync::Arc::new(topems_shared_auth::security::AuditLoggerMiddleware::new(
            audit_logger_config,
            ctx.db.clone(),
        ));

    let input_validation_config =
        crate::middleware::input_validation::InputValidationConfig::default()
            .add_skip_path("/health")
            .add_skip_path("/api")
            .add_skip_path("/api/info")
            .add_skip_path("/api/core/health");

    let pool_for_heartbeat = ctx.db.clone();
    let metrics = std::sync::Arc::new(topems_shared_core::health::SystemMetrics::new());

    // 字段加密服务
    let encryption = init_field_encryption();

    // SSE session manager
    let sse_sessions = std::sync::Arc::new(crate::shared::SseSessionManager::new());

    // Business tool registry
    let service_registry =
        std::sync::Arc::new(crate::shared::service_client::ServiceRegistry::new());
    let business_tool_registry =
        crate::modules::business_tools::create_default_registry(service_registry.clone())
            .unwrap_or_else(|_| crate::modules::business_tools::BusinessToolRegistry::new());

    // Permission store
    let permission_store =
        crate::routes::business_tools::permission_store_factory::PermissionStoreFactory::from_env(
            Some(ctx.db.clone()),
        );

    // Audit log store
    let audit_logger: std::sync::Arc<
        dyn crate::routes::business_tools::permission_audit_log::AuditLogStore + Send + Sync,
    > = {
        let store_type =
            std::env::var("AUDIT_LOG_STORE_TYPE").unwrap_or_else(|_| "memory".to_string());
        match store_type.as_str() {
            "database" => {
                tracing::info!("Using database-backed audit log store");
                std::sync::Arc::new(crate::routes::business_tools::database_audit_log_store::DatabaseAuditLogStore::new(ctx.db.clone()))
            }
            _ => {
                tracing::info!("Using in-memory audit log store");
                std::sync::Arc::new(
                    crate::routes::business_tools::permission_audit_log::InMemoryAuditLogStore::new(
                    ),
                )
            }
        }
    };

    // Config store
    let config_store = {
        let store = crate::shared::config_store_simple::ConfigStoreService::new(ctx.db.clone());
        if let Err(e) = store.init().await {
            tracing::warn!("Failed to initialize config store: {}", e);
        }
        store
    };

    // Audit log retention policy
    let (audit_retention_policy, retention_manager) = {
        let policy = match config_store.store().get_audit_retention_policy().await {
            Ok(Some(policy)) => policy,
            Ok(None) => {
                let retention_days = std::env::var("AUDIT_RETENTION_DAYS")
                    .ok()
                    .and_then(|v| v.parse::<u32>().ok())
                    .unwrap_or(90);
                crate::routes::business_tools::audit_retention::RetentionPolicy::new(retention_days)
            }
            Err(_) => crate::routes::business_tools::audit_retention::RetentionPolicy::default(),
        };

        let policy_mutex = std::sync::Arc::new(tokio::sync::Mutex::new(policy.clone()));
        let retention_manager = std::sync::Arc::new(
            crate::routes::business_tools::audit_retention::RetentionManager::new(
                policy,
                audit_logger.clone(),
            ),
        );

        (policy_mutex, retention_manager)
    };

    let state = AppState {
        auth_state: ctx.auth_state.clone(),
        db: topems_shared_db::scope::Db::new(ctx.db.clone(), "public, shared")
            .deny_request_own_txn()
            .deny_request_tenant_scope(),
        pool: ctx.db.clone(),
        health_config,
        ws_state: ws_state.clone(),
        http_client,
        rate_limit_middleware,
        anti_replay_state: std::sync::Arc::new(
            crate::middleware::anti_replay::AntiReplayState::new(),
        ),
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
        business_tool_registry,
        permission_store,
        audit_logger,
        audit_retention_policy,
        retention_manager,
        config_store,
        menu_cache: std::sync::Arc::new(crate::modules::menu::cache::MenuCache::new()),
        permission_notifier: std::sync::Arc::new(
            crate::routes::business_tools::permission_store::PermissionChangeNotifier::new(),
        ),
    };

    // Spawn background tasks
    spawn_background_tasks(&state, pool_for_heartbeat).await;

    // Build the full application router
    let cors = topems_shared::create_cors_layer();

    let app = crate::routes::create_routes(&state, String::new, embed_mode)
        .layer(axum::middleware::from_fn(
            topems_shared_core::logging::request_context_middleware,
        ))
        .layer(cors)
        .with_state(state);

    Ok(app)
}

/// 启动后台任务
async fn spawn_background_tasks(state: &AppState, pool: sqlx::PgPool) {
    // WebSocket cleanup
    let ws_state_cleanup = state.ws_state.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(60));
        loop {
            interval.tick().await;
            let removed = ws_state_cleanup.cleanup_timeout_connections(90).await;
            if removed > 0 {
                tracing::info!("WebSocket cleanup: removed {} timeout connections", removed);
            }
        }
    });

    // W7 P0：全局无租户广播通道已移除（曾用于超频合并帧），不再需要 flush task。

    // Audit log retention cleanup
    let retention_manager = state.retention_manager.clone();
    tokio::spawn(async move {
        use crate::routes::business_tools::audit_retention_task::RetentionCleanupTask;
        let mut task = RetentionCleanupTask::from_retention_manager(retention_manager);
        task.start();
        std::future::pending::<()>().await;
    });

    // Plugin heartbeat offline detection（CORE-03 / U11）
    // 嵌入模式原为空循环死代码；对齐 standalone `main.rs:666-717` 与 overview.md
    // 「插件注册安全流程」：每 30s 扫描，心跳 >90s 或注册 >2min 无心跳 → runtime_status='offline'。
    // 注意：心跳上报端（POST /api/plugin/runtime/{code}/status 写 last_heartbeat=NOW()）在
    // svc/plugin-registry，与本任务同库 core.core_plugin_instances，评估侧无需改动上报路径。
    {
        let heartbeat_pool = pool.clone();
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(
                HEARTBEAT_SCAN_INTERVAL_SECS,
            ));
            loop {
                interval.tick().await;
                // 错误容忍：扫描失败仅记日志，下一 tick 重试，绝不 panic
                match evaluate_stale_plugin_heartbeats(&heartbeat_pool).await {
                    Ok(marked) if marked > 0 => tracing::warn!(
                        "[Plugin-Heartbeat] Marked {} plugin(s) as offline (stale heartbeat)",
                        marked
                    ),
                    Ok(_) => {}
                    Err(e) => tracing::warn!(
                        "[Plugin-Heartbeat] scan failed, will retry next tick: {}",
                        e
                    ),
                }
            }
        });
    }

    // SSE cleanup
    let sse_sessions_cleanup = state.sse_sessions.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(60));
        loop {
            interval.tick().await;
            let removed = sse_sessions_cleanup
                .cleanup_expired(tokio::time::Duration::from_secs(1800))
                .await;
            if removed > 0 {
                tracing::info!("SSE cleanup: removed {} expired sessions", removed);
            }
        }
    });
}

/// 初始化字段加密服务
///
/// [2026-10-24] 与 standalone `main.rs::init_field_encryption` 对齐：嵌入（monolith）模式
/// 同样按环境变量初始化 AES-256-GCM 字段加密，避免 settings 模块敏感字段
/// （SMTP 密码 / API key）在嵌入形态下明文落库。
fn init_field_encryption(
) -> Option<std::sync::Arc<topems_shared_auth::security::FieldEncryptionService>> {
    use topems_shared_auth::security::KeyManager;

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
            Some(std::sync::Arc::new(
                topems_shared_auth::security::FieldEncryptionService::new(km),
            ))
        }
        Err(e) => {
            tracing::warn!("字段加密密钥无效，敏感字段将以明文存储: {}", e);
            None
        }
    }
}

// ============================================================================
// 插件心跳离线评估（CORE-03 / U11）
// ============================================================================

/// 扫描周期：每 30s 评估一次（对齐 overview.md「每 30 秒检测」）。
const HEARTBEAT_SCAN_INTERVAL_SECS: u64 = 30;

/// 心跳离线阈值：`last_heartbeat` 距今超过 90s 的 running 实例 → offline。
const HEARTBEAT_OFFLINE_SECS: i64 = 90;

/// 注册后无心跳宽限期：`last_heartbeat IS NULL` 且创建超过 120s（2 分钟）→ offline。
const HEARTBEAT_NO_BEAT_GRACE_SECS: i64 = 120;

/// 执行一次心跳离线扫描（嵌入模式后台任务每 30s 调用）。
///
/// 采用集合式 UPDATE（与 standalone `main.rs:674-714` 同语义），单次往返、原子降级：
/// - 规则 1：`running` 且 `last_heartbeat` 非空、早于 `NOW() - 90s` → `offline`
/// - 规则 2：`running` 且 `last_heartbeat` 为空、`created_at` 早于 `NOW() - 2min` → `offline`
///
/// 仅降级 `running`；`stopped`（显式注销）/ `offline`（已降级）等终态不触碰。
/// 返回本次被标记为 offline 的实例数；DB 错误向上传播由调用方记日志重试（不 panic）。
async fn evaluate_stale_plugin_heartbeats(pool: &sqlx::PgPool) -> Result<u64, sqlx::Error> {
    // 规则 1：心跳超时
    let stale = sqlx::query(
        r#"
        UPDATE core.core_plugin_instances
        SET runtime_status = 'offline'
        WHERE runtime_status = 'running'
          AND last_heartbeat IS NOT NULL
          AND last_heartbeat < NOW() - INTERVAL '90 seconds'
        "#,
    )
    .execute(pool)
    .await?;

    // 规则 2：注册后从未上报心跳，超过宽限期
    let no_beat = sqlx::query(
        r#"
        UPDATE core.core_plugin_instances
        SET runtime_status = 'offline'
        WHERE runtime_status = 'running'
          AND last_heartbeat IS NULL
          AND created_at < NOW() - INTERVAL '2 minutes'
        "#,
    )
    .execute(pool)
    .await?;

    Ok(stale.rows_affected() + no_beat.rows_affected())
}

/// 心跳离线判定纯函数（可注入 `now` 与阈值，单测无需真等 90s）。
///
/// 与上面两条集合式 UPDATE 的 WHERE 条件保持一一对应；改动任一侧须同步另一侧。
/// 返回 `Some("offline")` 表示本次应降级，`None` 表示保持现状。
fn plugin_target_status(
    current_status: &str,
    last_heartbeat: Option<DateTime<Utc>>,
    created_at: DateTime<Utc>,
    now: DateTime<Utc>,
    offline_threshold: chrono::Duration,
    no_heartbeat_grace: chrono::Duration,
) -> Option<&'static str> {
    // 仅对 running 实例做自动降级；显式 stopped / 已 offline 不触碰
    if current_status != "running" {
        return None;
    }
    match last_heartbeat {
        // 规则 1：心跳距今超过离线阈值
        Some(hb) if now - hb > offline_threshold => Some("offline"),
        // 规则 2：从未心跳且创建超过宽限期
        None if now - created_at > no_heartbeat_grace => Some("offline"),
        _ => None,
    }
}

#[cfg(test)]
mod heartbeat_tests {
    use super::*;
    use chrono::Duration;

    fn thresholds() -> (Duration, Duration) {
        (
            Duration::seconds(HEARTBEAT_OFFLINE_SECS),
            Duration::seconds(HEARTBEAT_NO_BEAT_GRACE_SECS),
        )
    }

    #[test]
    fn fresh_heartbeat_stays_running() {
        let now = Utc::now();
        let hb = now - Duration::seconds(10); // 10s 前还在跳
        let (off, grace) = thresholds();
        assert_eq!(
            plugin_target_status("running", Some(hb), now, now, off, grace),
            None
        );
    }

    #[test]
    fn stale_heartbeat_becomes_offline() {
        let now = Utc::now();
        let hb = now - Duration::seconds(95); // 95s 未心跳 > 90s
        let (off, grace) = thresholds();
        assert_eq!(
            plugin_target_status("running", Some(hb), now, now, off, grace),
            Some("offline")
        );
    }

    #[test]
    fn boundary_at_90s_stays_running() {
        // 恰好 90s：条件是 `> 90s`，边界不降级
        let now = Utc::now();
        let hb = now - Duration::seconds(HEARTBEAT_OFFLINE_SECS);
        let (off, grace) = thresholds();
        assert_eq!(
            plugin_target_status("running", Some(hb), now, now, off, grace),
            None
        );
    }

    #[test]
    fn no_heartbeat_within_grace_stays_running() {
        let now = Utc::now();
        let created = now - Duration::seconds(60); // 注册 60s，宽限 120s 内
        let (off, grace) = thresholds();
        assert_eq!(
            plugin_target_status("running", None, created, now, off, grace),
            None
        );
    }

    #[test]
    fn no_heartbeat_beyond_grace_becomes_offline() {
        let now = Utc::now();
        let created = now - Duration::seconds(150); // 注册 150s > 120s 宽限
        let (off, grace) = thresholds();
        assert_eq!(
            plugin_target_status("running", None, created, now, off, grace),
            Some("offline")
        );
    }

    #[test]
    fn stopped_instance_is_never_touched() {
        let now = Utc::now();
        let hb = now - Duration::seconds(3600); // 极陈旧
        let (off, grace) = thresholds();
        assert_eq!(
            plugin_target_status("stopped", Some(hb), now, now, off, grace),
            None
        );
        assert_eq!(
            plugin_target_status("offline", Some(hb), now, now, off, grace),
            None
        );
    }
}
