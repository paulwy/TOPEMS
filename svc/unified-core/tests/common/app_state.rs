//! AppState 测试工厂（P1 基建，2026-10-07）
//!
//! 构造 unified-core 完整 AppState（24 字段），dyn trait 用仓库自带的
//! InMemory 实现（InMemoryPermissionStore / InMemoryAuditLogStore）。
//! 供 audit/doc/automation handler 集成测试复用。
//! 导入方式：`#[path = "common/app_state.rs"] mod app_state;`
//!           `use app_state::{test_app_state, super_claims, tenant_claims};`

use std::sync::Arc;
use tokio::sync::Mutex as TokioMutex;

use reqwest::Client as ReqwestClient;
use topems_shared_auth::auth::{AuthState, Claims};
use topems_shared_auth::security::{
    AuditLoggerConfig, AuditLoggerMiddleware, BodyLimitConfig, BodyLimitMiddleware,
    SecurityHeadersConfig, SecurityHeadersLayer,
};
use topems_shared_core::feature_flag::FeatureFlagService;
use topems_shared_core::health::{SimpleHealthConfig, SystemMetrics};
use topems_shared_core::{CompressionConfig, CompressionMiddleware};
use topems_unified_core::middleware::anti_replay::AntiReplayState;
use topems_unified_core::middleware::input_validation::InputValidationConfig;
use topems_unified_core::middleware::rate_limit::{RateLimitConfig, RateLimitMiddleware};
use topems_unified_core::middleware::versioning::{VersionConfig, VersionMiddleware};
use topems_unified_core::modules::business_tools::BusinessToolRegistry;
use topems_unified_core::modules::communication::ws::WsState;
use topems_unified_core::routes::business_tools::audit_retention::{
    RetentionManager, RetentionPolicy,
};
use topems_unified_core::routes::business_tools::permission_audit_log::{
    AuditLogStore, InMemoryAuditLogStore,
};
use topems_unified_core::routes::business_tools::permission_store::{
    InMemoryPermissionStore, PermissionChangeNotifier,
};
use topems_unified_core::shared::config_store_simple::ConfigStoreService;
use topems_unified_core::shared::{AppState, SseSessionManager};

fn jwt_secret() -> String {
    "topems-test-jwt-secret-key-0123456789abcdef-0123456789".to_string()
}

/// 构造完整 AppState（dyn trait 用 InMemory 实现，encryption 置 None）。
pub fn test_app_state(pool: sqlx::PgPool) -> AppState {
    let auth_state = AuthState::new(jwt_secret(), jwt_secret(), 24);
    let audit_logger: Arc<dyn AuditLogStore> = Arc::new(InMemoryAuditLogStore::new());
    let retention_policy = RetentionPolicy::new(90);

    AppState {
        auth_state: auth_state.clone(),
        pool: pool.clone(),
        health_config: SimpleHealthConfig::new("test-unified-core"),
        ws_state: Arc::new(WsState::new(Arc::new(auth_state))),
        http_client: ReqwestClient::new(),
        rate_limit_middleware: Arc::new(RateLimitMiddleware::new(RateLimitConfig::default())),
        anti_replay_state: Arc::new(AntiReplayState::new()),
        versioning_middleware: Arc::new(VersionMiddleware::new(VersionConfig::default())),
        security_headers_layer: Arc::new(SecurityHeadersLayer::new(
            SecurityHeadersConfig::default(),
        )),
        compression_middleware: Arc::new(CompressionMiddleware::new(CompressionConfig::default())),
        body_limit_middleware: Arc::new(BodyLimitMiddleware::new(BodyLimitConfig::default())),
        audit_logger_middleware: Arc::new(AuditLoggerMiddleware::new(
            AuditLoggerConfig::default(),
            pool.clone(),
        )),
        input_validation_config: InputValidationConfig::new(),
        metrics: Arc::new(SystemMetrics::new()),
        encryption: None,
        feature_flag_service: Arc::new(FeatureFlagService::new()),
        sse_sessions: Arc::new(SseSessionManager::new()),
        business_tool_registry: BusinessToolRegistry::new(),
        permission_store: Arc::new(InMemoryPermissionStore::new()),
        audit_logger: audit_logger.clone(),
        audit_retention_policy: Arc::new(TokioMutex::new(retention_policy.clone())),
        retention_manager: Arc::new(RetentionManager::new(retention_policy, audit_logger)),
        config_store: ConfigStoreService::new(pool),
        permission_notifier: Arc::new(PermissionChangeNotifier::new()),
    }
}

/// 超管 Claims（handler 读全量数据）。
pub fn super_claims() -> Claims {
    Claims {
        sub: "00000000-0000-0000-0000-000000000001".to_string(),
        username: "admin".to_string(),
        role: "super_admin".to_string(),
        roles: vec!["super_admin".to_string()],
        permissions: vec![],
        is_superuser: true,
        exp: 0,
        iat: 0,
        email: None,
        department: None,
        tenant_id: None,
        department_id: None,
        position_id: None,
        position_code: None,
        must_change_password: false,
    }
}

/// 普通租户 Claims（handler 按 Uuid::nil() 过滤）。
pub fn tenant_claims() -> Claims {
    Claims {
        sub: "00000000-0000-0000-0000-000000000002".to_string(),
        username: "tenant_user".to_string(),
        role: "user".to_string(),
        roles: vec!["user".to_string()],
        permissions: vec![],
        is_superuser: false,
        exp: 0,
        iat: 0,
        email: None,
        department: None,
        tenant_id: Some("00000000-0000-0000-0000-000000000009".to_string()),
        department_id: None,
        position_id: None,
        position_code: None,
        must_change_password: false,
    }
}
