//! wms 测试公共基建：ApiState 工厂 + 超管 Claims + 空分页参数。
//! 复用方式：#[path = "common/api_state.rs"] mod api_state;

use std::sync::Arc;
use std::time::Instant;
use topems_shared_auth::auth::{AuthState, Claims};
use topems_shared_core::health::SystemMetrics;
use topems_shared_core::l2_cache::{AsyncL2Cache, L2CacheConfig};
use topems_shared_core::response::PaginationParams;
use topems_wms::modules::ApiState;

pub fn api_state(pool: sqlx::PgPool) -> ApiState {
    ApiState {
        db: topems_shared_auth::ScopedPool::new(pool),
        auth_state: AuthState::new(
            "topems-test-jwt-secret-key-0123456789abcdef-0123456789".to_string(),
            "topems-test-refresh-secret-0123456789abcdef-0123456789".to_string(),
            24,
        ),
        metrics: Arc::new(SystemMetrics::new()),
        start_time: Instant::now(),
        event_publisher: None,
        warehouse_cache: Arc::new(AsyncL2Cache::new_l1_only(L2CacheConfig::default())),
        inventory_cache: Arc::new(AsyncL2Cache::new_l1_only(L2CacheConfig::default())),
        dict_cache: Arc::new(AsyncL2Cache::new_l1_only(L2CacheConfig::default())),
    }
}

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

pub fn empty_params() -> PaginationParams {
    PaginationParams {
        page: None,
        page_size: None,
        search: None,
        status: None,
    }
}
