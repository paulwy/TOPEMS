#![allow(dead_code)]

use crate::models;
use axum::{extract::FromRef, Router};
use sqlx::postgres::PgPool;
use std::sync::Arc;
use std::time::Instant;
use topems_shared::AuthState;
use topems_shared::LocalInMemoryCache as InMemoryCache;
use topems_shared_auth::security::FieldEncryptionService;
use topems_shared_core::health::SystemMetrics;
use topems_shared_event::event::EventPublisher;
use topems_shared_service_client::notification::NotificationServiceClient;
use topems_shared_service_client::service_client::{
    api::finance_api::FinanceApi, api::hrm_api::HrmApi, api::mes_api::MesApi, TypedServiceClient,
};

pub mod addressbook;
pub mod announcement;
pub mod asset;
pub mod audit;
pub mod consolidation;
pub mod consolidation_calc;
pub mod customer;
pub mod customer_calc;
pub mod dashboard;
pub mod db_structure;
pub mod demo_data;
pub mod dict;
pub mod erp_plugin;
pub mod fixed_asset;
pub mod finance;
pub mod health;
pub mod holidays;
pub mod hr_proxy;
pub mod hrm_integration_example;
pub mod inventory;
pub mod inventory_calc;
pub mod leave_request;
pub mod master_data_assets;
pub mod master_data_audit;
pub mod master_data_catalog;
pub mod master_data_classification;
pub mod master_data_compliance_audit;
pub mod master_data_conflict;
pub mod master_data_crud;
pub mod master_data_dashboard;
pub mod master_data_gateway;
pub mod master_data_governance;
pub mod master_data_graph;
pub mod master_data_graphql;
pub mod master_data_lifecycle;
pub mod master_data_lineage;
pub mod master_data_lineage_graph;
pub mod master_data_lineage_impact;
pub mod master_data_matching;
pub mod master_data_maturity;
pub mod master_data_metadata;
pub mod master_data_quality_ai;
pub mod master_data_quality_loop;
pub mod master_data_quality_rules;
pub mod master_data_quality_trend;
pub mod master_data_refs;
pub mod master_data_report_automation;
pub mod master_data_service_registry;
pub mod master_data_sync;
pub mod master_data_sync_v2;
pub mod master_data_version;
pub mod material;
pub mod material_calc;
pub mod mdm_v49;
pub mod meeting_room;
pub mod office_supplies;
pub mod openapi;
pub mod opening_balance;
pub mod order_calc;
pub mod procurement_e2e;
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
    // 生产执行闭环：MES 服务客户端（erp 审核通过后下达生产工单）
    pub mes_client: Arc<TypedServiceClient<MesApi>>,
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
        .merge(finance::create_routes())
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
        // R12 Y-P0: ERP E2E 真实化采购链
        .merge(procurement_e2e::create_routes())
}
