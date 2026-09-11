pub mod aps_fsm;
pub mod aps_util;
pub mod permission;
pub mod tenant;
#[cfg(test)]
pub mod tenant_test;

use axum::extract::FromRef;
use sqlx::PgPool;
use std::sync::Arc;
use topems_shared::LocalInMemoryCache;
use topems_shared_auth::auth::AuthState;
use topems_shared_core::health::SimpleHealthConfig;
use topems_shared_event::event::EventPublisher;
use topems_shared_service_client::service_client::{api::erp_api::ErpApi, TypedServiceClient};

#[derive(Clone)]
pub struct AppState {
    pub auth_state: AuthState,
    pub pool: PgPool,
    pub health_config: SimpleHealthConfig,
    pub event_publisher: Option<Arc<EventPublisher>>,
    // 生产执行闭环：ERP 服务客户端（报工后回传生产进度，Option 优雅降级）
    pub erp_client: Option<Arc<TypedServiceClient<ErpApi>>>,
    // 字典数据缓存（工艺路线、工作中心、物料分类等不常变化的数据，TTL 10 分钟）
    pub dict_cache: Arc<LocalInMemoryCache<serde_json::Value>>,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}
