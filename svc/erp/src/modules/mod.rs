#![allow(dead_code)]

use crate::models;
use crate::utils::InMemoryCache;
use axum::{extract::FromRef, Router};
use sqlx::postgres::PgPool;
use std::sync::Arc;
use std::time::Instant;
use topems_shared::{
    AuthState, FieldEncryptionService, HrmServiceClient, NotificationServiceClient, SystemMetrics,
};

pub mod addressbook;
pub mod announcement;
pub mod asset;
pub mod audit;
pub mod bank;
pub mod consolidation;
pub mod customer;
pub mod dashboard;
pub mod db_structure;
pub mod demo_data;
pub mod dict;
pub mod erp_plugin;
pub mod finance;
pub mod finance_reports;
pub mod fixed_asset;
pub mod health;
pub mod hr_proxy;
pub mod hrm_integration_example;
pub mod inventory;
pub mod material;
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
pub mod voucher;

// 财务数据缓存 TTL (秒)
const FINANCE_CACHE_TTL: u64 = 300;

#[derive(Clone)]
pub struct ApiState {
    pub db: PgPool,
    pub auth_state: AuthState,
    pub metrics: Arc<SystemMetrics>,
    pub start_time: Instant,
    pub dict_cache: Arc<InMemoryCache<Vec<models::dict::DictType>>>,
    pub notification_client: Arc<NotificationServiceClient>,
    pub hrm_client: Arc<HrmServiceClient>,
    pub encryption: Arc<FieldEncryptionService>,
    // 财务数据缓存
    pub expense_cache: Arc<InMemoryCache<serde_json::Value>>,
    pub budget_cache: Arc<InMemoryCache<serde_json::Value>>,
    pub receivable_cache: Arc<InMemoryCache<serde_json::Value>>,
    pub payable_cache: Arc<InMemoryCache<serde_json::Value>>,
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
        .merge(bank::create_routes())
        .merge(consolidation::create_routes())
        .merge(finance::create_routes())
        .merge(fixed_asset::create_routes())
        .merge(dict::create_routes())
        .merge(db_structure::create_routes())
        .merge(voucher::create_routes())
        .merge(finance_reports::create_routes())
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
        .merge(inventory::create_routes())
        .merge(customer::create_routes())
        .merge(supplier::create_routes())
        .merge(sales_order::create_routes())
        .merge(search::create_routes())
        // V15 Phase 3: HR 代理层
        .merge(hr_proxy::proxy_routes())
}
