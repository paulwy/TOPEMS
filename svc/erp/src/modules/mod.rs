#![allow(dead_code)]

use crate::models;
use axum::{extract::FromRef, Router};
use sqlx::postgres::PgPool;
use std::sync::Arc;
use std::time::Instant;
use topems_shared::service_client::{
    api::finance_api::FinanceApi, api::hrm_api::HrmApi, TypedServiceClient,
};
use topems_shared::{
    event::EventPublisher, AuthState, FieldEncryptionService, LocalInMemoryCache as InMemoryCache,
    NotificationServiceClient, SystemMetrics,
};

pub mod addressbook;
pub mod announcement;
pub mod asset;
pub mod audit;
pub mod consolidation;
pub mod customer;
pub mod dashboard;
pub mod db_structure;
pub mod demo_data;
pub mod dict;
pub mod erp_plugin;
pub mod fixed_asset;
pub mod health;
pub mod holidays;
pub mod hr_proxy;
pub mod hrm_integration_example;
pub mod inventory;
pub mod master_data_refs;
pub mod material;
pub mod mdm_v49;
pub mod meeting_room;
pub mod office_supplies;
pub mod openapi;
pub mod opening_balance;
pub mod production_order;
pub mod purchase_order;
pub mod sales_order;
pub mod search;
pub mod supplier;
pub mod vehicles;

#[derive(Clone)]
pub struct ApiState {
    pub db: PgPool,
    pub auth_state: AuthState,
    pub metrics: Arc<SystemMetrics>,
    pub start_time: Instant,
    pub dict_cache: Arc<InMemoryCache<Vec<models::dict::DictType>>>,
    pub notification_client: Arc<NotificationServiceClient>,
    pub hrm_client: Arc<TypedServiceClient<HrmApi>>,
    pub encryption: Arc<FieldEncryptionService>,
    pub event_publisher: Option<Arc<EventPublisher>>,
    // V32.0 Finance 迁移：Finance 服务客户端
    pub finance_client: Arc<TypedServiceClient<FinanceApi>>,
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

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .merge(health::create_routes())
        .merge(dashboard::create_routes())
        .merge(addressbook::create_routes())
        .merge(asset::create_routes())
        .merge(audit::create_routes())
        .merge(consolidation::create_routes())
        .merge(fixed_asset::create_routes())
        .merge(dict::create_routes())
        .merge(db_structure::create_routes())
        .merge(office_supplies::create_routes())
        .merge(opening_balance::create_routes())
        .merge(meeting_room::create_routes())
        .merge(vehicles::create_routes())
        .merge(announcement::create_routes())
        .merge(hrm_integration_example::create_routes())
        .merge(production_order::create_routes())
        .merge(purchase_order::create_routes())
        .merge(erp_plugin::create_routes())
        .merge(material::create_routes())
        .merge(master_data_refs::create_routes())
        .merge(mdm_v49::create_routes())
        .merge(inventory::create_routes())
        .merge(customer::create_routes())
        .merge(supplier::create_routes())
        .merge(sales_order::create_routes())
        .merge(search::create_routes())
        // V15 Phase 3: HR 代理层
        .merge(hr_proxy::proxy_routes())
}
