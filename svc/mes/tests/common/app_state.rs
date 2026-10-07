//! MES 测试工厂：AppState 6 字段完整构造 + 超管 Claims。
//! 复用方式：`#[path = "common/app_state.rs"] mod app_state;`

use std::sync::Arc;
use topems_mes::shared::AppState;
use topems_shared_auth::auth::{AuthState, Claims};
use topems_shared_core::l2_cache::{AsyncL2Cache, L2CacheConfig};
use topems_shared_core::health::SimpleHealthConfig;

pub fn test_app_state(pool: sqlx::PgPool) -> AppState {
    AppState {
        auth_state: AuthState::new("test-secret-0123456789abcdef0123456789abcdef".to_string(), "test-refresh-secret-0123456789abcdef0123456789abcdef".to_string(), 86400),
        pool,
        health_config: SimpleHealthConfig::new("test-mes"),
        event_publisher: None,
        erp_client: None,
        dict_cache: Arc::new(AsyncL2Cache::new_l1_only(L2CacheConfig::default())),
    }
}

pub fn super_claims() -> Claims {
    Claims {
        sub: "test-super".to_string(),
        username: "test-super".to_string(),
        role: "super_admin".to_string(),
        roles: vec!["super_admin".to_string()],
        permissions: vec!["*".to_string()],
        is_superuser: true,
        exp: 9999999999,
        iat: 1700000000,
        email: None,
        department: None,
        tenant_id: None,
        department_id: None,
        position_id: None,
        position_code: None,
    }
}
