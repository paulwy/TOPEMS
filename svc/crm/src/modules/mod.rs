use axum::{extract::FromRef, Router};
use sqlx::postgres::PgPool;
use std::sync::Arc;
use std::time::Instant;
use topems_shared_auth::auth::AuthState;
use topems_shared_auth::security::FieldEncryptionService;
use topems_shared_core::health::SystemMetrics;
use topems_shared_core::l2_cache::AsyncL2Cache;
use topems_shared_db::scope::Db;

pub mod aftersales;
pub mod analytics;
pub mod audit;
pub mod billing;
pub mod billing_status;
pub mod contact;
pub mod contact_approval_status;
pub mod contact_status;
pub mod contract;
pub mod contract_status;
pub mod crm_plugin;
pub mod customer;
pub mod customer_approval_status;
pub mod customer_order_status;
pub mod customer_profile;
pub mod customer_recommendation;
pub mod customer_scoring;
pub mod customer_segmentation;
pub mod customer_status;
pub mod finance_risk;
pub mod forecast;
pub mod interaction;
pub mod interaction_status;
pub mod master_data_ref_status;
pub mod openapi;
pub mod opportunity;
pub mod opportunity_status;
pub mod return_status;
pub mod rfm;
pub mod sales_forecast;
pub mod sales_forecast_status;
pub mod sales_funnel;
pub mod sales_funnel_logic;
pub mod sales_order_status;
pub mod scoring_logic;
pub mod tag;

#[derive(Clone)]
pub struct ApiState {
    /// 请求链路统一入口：已开启 `deny_request_own_txn` + `deny_request_tenant_scope`。
    /// handler 通过 `RlsTxnCell` 复用请求事务，不得再自开租户作用域。
    pub db: Db,
    /// 系统通道专用连接池：仅用于审计落库与健康探针，不得用于请求租户查询。
    pub system_pool: PgPool,
    pub auth_state: AuthState,
    pub metrics: Arc<SystemMetrics>,
    pub start_time: Instant,
    pub encryption: Arc<FieldEncryptionService>,
    pub event_publisher: Option<Arc<topems_shared_event::event::publisher::EventPublisher>>,
    pub erp_client: Option<
        Arc<
            topems_shared_service_client::service_client::TypedServiceClient<
                topems_shared_service_client::service_client::ErpApi,
            >,
        >,
    >,
    pub wms_client: Option<
        Arc<
            topems_shared_service_client::service_client::TypedServiceClient<
                topems_shared_service_client::service_client::WmsApi,
            >,
        >,
    >,
    pub workflow_client: topems_shared_service_client::service_client::TypedServiceClient<
        topems_shared_service_client::service_client::WorkflowApi,
    >,
    pub customer_cache: Arc<AsyncL2Cache<serde_json::Value>>,
    pub opportunity_cache: Arc<AsyncL2Cache<serde_json::Value>>,
    pub dict_cache: Arc<AsyncL2Cache<String>>,
    pub dashboard_cache: Arc<AsyncL2Cache<serde_json::Value>>,
}

impl FromRef<ApiState> for AuthState {
    fn from_ref(state: &ApiState) -> Self {
        state.auth_state.clone()
    }
}

impl FromRef<ApiState> for Db {
    fn from_ref(state: &ApiState) -> Self {
        state.db.clone()
    }
}

impl FromRef<ApiState>
    for topems_shared_service_client::service_client::TypedServiceClient<
        topems_shared_service_client::service_client::WorkflowApi,
    >
{
    fn from_ref(state: &ApiState) -> Self {
        state.workflow_client.clone()
    }
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .merge(customer::create_routes())
        // .merge(customer_profile::create_routes())
        // .merge(customer_segmentation::create_routes())
        // .merge(customer_recommendation::create_routes())
        .merge(contact::create_routes())
        .merge(contract::create_routes())
        .merge(opportunity::create_routes())
        .merge(interaction::create_routes())
        .merge(aftersales::create_routes())
        .merge(billing::create_routes())
        .merge(audit::create_routes())
        .merge(analytics::create_routes())
        .merge(rfm::create_routes())
        .merge(forecast::create_routes())
        .merge(tag::create_routes())
        .merge(customer_profile::create_routes())
        .merge(customer_scoring::create_routes())
        .merge(customer_segmentation::create_routes())
        .merge(customer_recommendation::create_routes())
        .merge(sales_forecast::create_routes())
        .merge(sales_funnel::create_routes())
        .route(
            "/health",
            axum::routing::get(crm_plugin::crm_health),
        )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn create_routes_smoke() {
        let _router: Router<ApiState> = create_routes();
    }

    #[test]
    fn api_state_clone_trait() {
        fn assert_clone<T: Clone>() {}
        assert_clone::<ApiState>();
    }
}
