use axum::extract::FromRef;
use sqlx::PgPool;
use std::sync::Arc;
use topems_shared_auth::auth::AuthState;
use topems_shared_core::health::SimpleHealthConfig;
use topems_shared_core::l2_cache::AsyncL2Cache;
use topems_shared_event::event::EventPublisher;
pub mod cache;
use crate::modules::test_method::TestMethod;

#[derive(Clone)]
pub struct AppState {
    pub auth_state: AuthState,
    pub pool: PgPool,
    pub health_config: SimpleHealthConfig,
    pub event_publisher: Option<Arc<EventPublisher>>,
    /// 样品详情/列表缓存（L1 moka + L2 Redis）
    pub sample_cache: Arc<AsyncL2Cache<serde_json::Value>>,
    /// 检测任务详情/列表缓存
    pub task_cache: Arc<AsyncL2Cache<serde_json::Value>>,
    /// 字典缓存
    pub dict_cache: Arc<AsyncL2Cache<String>>,
    /// 检测方法详情缓存（升级为多级缓存）
    pub test_method_cache: Arc<AsyncL2Cache<TestMethod>>,
    /// 仪器缓存（升级为多级缓存）
    pub instrument_cache: Arc<AsyncL2Cache<serde_json::Value>>,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

impl FromRef<AppState> for PgPool {
    fn from_ref(state: &AppState) -> Self {
        state.pool.clone()
    }
}
