pub mod aps_fsm;
pub mod aps_util;
pub mod permission;

use axum::extract::FromRef;
use sqlx::PgPool;
use std::sync::Arc;
use topems_shared_auth::auth::AuthState;
use topems_shared_core::health::SimpleHealthConfig;
use topems_shared_core::l2_cache::AsyncL2Cache;
use topems_shared_db::scope::Db;
use topems_shared_event::event::EventPublisher;
use topems_shared_service_client::service_client::{api::erp_api::ErpApi, TypedServiceClient};

#[derive(Clone)]
pub struct AppState {
    pub auth_state: AuthState,
    pub pool: PgPool,
    /// 作用域数据库句柄：`Db::scope*` 在每个事务上落 `search_path` 与请求租户 GUC。
    /// 受 RLS（ENABLE+FORCE）保护的 `mes.*` 表必须经此访问，裸 `pool` 无 GUC 会返回 0 行。
    pub db: Db,
    pub health_config: SimpleHealthConfig,
    pub event_publisher: Option<Arc<EventPublisher>>,
    // 生产执行闭环：ERP 服务客户端（报工后回传生产进度，Option 优雅降级）
    pub erp_client: Option<Arc<TypedServiceClient<ErpApi>>>,
    // 多级缓存（L1: moka 进程内缓存 + L2: Redis 分布式缓存），TTL 10 分钟
    pub dict_cache: Arc<AsyncL2Cache<serde_json::Value>>,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}
