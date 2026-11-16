//! MES 测试工厂：AppState 6 字段完整构造 + 超管 Claims。
//! 复用方式：`#[path = "common/app_state.rs"] mod app_state;`

use std::sync::Arc;
use topems_mes::shared::AppState;
use topems_shared_auth::auth::{AuthState, Claims};
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_core::health::SimpleHealthConfig;
use topems_shared_core::l2_cache::{AsyncL2Cache, L2CacheConfig};

/// 直调 handler 的集成测试用：构造一个已开启的请求事务单元。
/// 生产环境由 `tenant_middleware` 注入，这里手动补上，避免 handler 走 `scope_with` 时拿不到事务。
pub async fn request_txn_cell(pool: &sqlx::PgPool) -> RlsTxnCell {
    let txn = pool.begin().await.expect("开启测试请求事务失败");
    Arc::new(tokio::sync::Mutex::new(Some(txn)))
}

pub fn test_app_state(pool: sqlx::PgPool) -> AppState {
    AppState {
        auth_state: AuthState::new(
            "test-secret-0123456789abcdef0123456789abcdef".to_string(),
            "test-refresh-secret-0123456789abcdef0123456789abcdef".to_string(),
            86400,
        ),
        pool: pool.clone(),
        db: topems_shared_db::scope::Db::new(pool, "mes, public, shared"),
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
        must_change_password: false,
    }
}
