use crate::shared::cache::InMemoryCache;
use axum::{extract::FromRef, Router};
use sqlx::postgres::PgPool;
use std::sync::Arc;
use std::time::Instant;
use topems_shared_auth::auth::AuthState;
use topems_shared_core::health::SystemMetrics;
use topems_shared_event::event::EventPublisher;

pub mod audit;
pub mod batch;
pub mod discrepancy_logic;
pub mod replenishment_logic;
// V514-2: 恢复此前被注释的已实现模块（InventoryCyclePage 前端真实消费 /cycle-counts）
pub mod cycle_count;
// V514-2: 新增 slotting 模块（LocationRulePage 前端真实消费 /slotting/rules，此前后端无实现）
pub mod slotting;
// V514-3: 恢复 discrepancy 模块（修复存量 E0308×3 + SQL 列名错误后启用）
pub mod discrepancy;
pub mod data_sync;
pub mod inbound_order;
pub mod inventory;
pub mod inventory_alert;
pub mod inventory_movement;
pub mod location;
pub mod openapi;
pub mod outbound_order;
pub mod serial_number;
pub mod smart_replenishment;
pub mod stock_take;
pub mod transfer_order;
pub mod warehouse;
pub mod wave_pick;
pub mod wms_plugin;

#[derive(Clone)]
pub struct ApiState {
    pub db: PgPool,
    pub auth_state: AuthState,
    pub metrics: Arc<SystemMetrics>,
    pub start_time: Instant,
    pub event_publisher: Option<Arc<EventPublisher>>,
    pub warehouse_cache: Arc<InMemoryCache<serde_json::Value>>,
    pub inventory_cache: Arc<InMemoryCache<serde_json::Value>>,
    pub dict_cache: Arc<InMemoryCache<String>>,
}

impl FromRef<ApiState> for AuthState {
    fn from_ref(state: &ApiState) -> Self {
        state.auth_state.clone()
    }
}

impl FromRef<ApiState> for PgPool {
    fn from_ref(state: &ApiState) -> Self {
        state.db.clone()
    }
}

pub fn create_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    ApiState: FromRef<S>,
{
    Router::new()
        .merge(warehouse::create_routes())
        .merge(batch::create_routes())
        .merge(location::create_routes())
        .merge(serial_number::create_routes())
        .merge(transfer_order::create_routes())
        .merge(inventory::create_routes())
        .merge(inventory_alert::create_routes())
        .merge(inventory_movement::create_routes())
        .merge(inbound_order::create_routes())
        .merge(outbound_order::create_routes())
        .merge(stock_take::create_routes())
        .merge(smart_replenishment::create_routes())
        .merge(wave_pick::create_routes())
        // V514-2: 恢复 cycle_count 挂载（模块实现完整，此前仅注册被注释）
        .merge(cycle_count::create_routes())
        // V514-2: slotting 库位优化（P0-2 缺口补实现）
        .merge(slotting::create_routes())
        // V514-3: 恢复 discrepancy 挂载（修复存量编译错误后启用）
        .merge(discrepancy::create_routes())
        .merge(audit::create_routes())
        .merge(data_sync::create_routes())
}
