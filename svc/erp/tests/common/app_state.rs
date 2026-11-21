//! ERP 集成测试工厂：`ApiState` 完整构造 + 租户 Claims。
//! 复用方式：`#[path = "common/app_state.rs"] mod app_state;`
//!
//! 与生产 `main.rs` 的 ApiState 字段一一对应；外部客户端均指向不可达地址，
//! 仅用于满足类型，测试路径不应触发真实 HTTP 调用。

#![allow(dead_code, clippy::unwrap_used, clippy::expect_used)]

use std::sync::Arc;
use std::time::Instant;

use sqlx::PgPool;
use uuid::Uuid;

use topems_erp::ApiState;
use topems_shared_auth::auth::{AuthState, Claims};
use topems_shared_auth::security::encryption::FieldEncryptionService;
use topems_shared_core::health::SystemMetrics;
use topems_shared_core::l2_cache::{AsyncL2Cache, L2CacheConfig};
use topems_shared_service_client::notification::NotificationServiceClient;
use topems_shared_service_client::service_client::{
    api::finance_api::FinanceApi, api::hrm_api::HrmApi, api::mes_api::MesApi, TypedServiceClient,
};

pub fn test_api_state(pool: PgPool) -> ApiState {
    ApiState {
        db: topems_shared_db::scope::Db::new(pool.clone(), "erp, public, shared"),
        system_pool: pool,
        auth_state: AuthState::new(
            "test-secret-0123456789abcdef0123456789abcdef".to_string(),
            "test-refresh-0123456789abcdef0123456789abcdef".to_string(),
            86400,
        ),
        metrics: Arc::new(SystemMetrics::new()),
        start_time: Instant::now(),
        dict_cache: Arc::new(AsyncL2Cache::<serde_json::Value>::new_l1_only(
            L2CacheConfig::default(),
        )),
        notification_client: Arc::new(NotificationServiceClient::with_base_url(
            "http://127.0.0.1:1".to_string(),
        )),
        hrm_client: Arc::new(TypedServiceClient::new(HrmApi, "http://127.0.0.1:1").unwrap()),
        encryption: Arc::new(
            FieldEncryptionService::from_base64_key("MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=")
                .unwrap(),
        ),
        event_publisher: None,
        finance_client: Arc::new(
            TypedServiceClient::new(FinanceApi, "http://127.0.0.1:1").unwrap(),
        ),
        mes_client: Arc::new(TypedServiceClient::new(MesApi, "http://127.0.0.1:1").unwrap()),
    }
}

/// 普通租户用户：claims 携带真实租户，供 `try_tenant_id_from_claims` 通过。
pub fn tenant_claims(tenant: Uuid) -> Claims {
    Claims {
        sub: Uuid::new_v4().to_string(),
        username: "test-tenant-user".to_string(),
        role: "tenant_admin".to_string(),
        roles: vec!["tenant_admin".to_string()],
        permissions: vec!["erp:master-data:write".to_string()],
        is_superuser: false,
        exp: 9_999_999_999,
        iat: 1_700_000_000,
        email: None,
        department: None,
        tenant_id: Some(tenant.to_string()),
        department_id: None,
        position_id: None,
        position_code: None,
        must_change_password: false,
    }
}
