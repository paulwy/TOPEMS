use axum::{
    extract::FromRef,
    Router,
};
use sqlx::postgres::PgPool;
use std::sync::Arc;
use std::time::{Duration, Instant};
use topems_shared::{AuthState, SystemMetrics};
use crate::utils::InMemoryCache;

pub mod company;
pub mod department;
pub mod employee;
pub mod asset;
pub mod audit;
pub mod finance;
pub mod dict;
pub mod db_structure;
pub mod contract;
pub mod budget;
pub mod payment_schedule;
pub mod addressbook;
pub mod voucher;
pub mod finance_reports;

#[derive(Clone)]
pub struct ApiState {
    pub db: PgPool,
    pub auth_state: AuthState,
    pub metrics: Arc<SystemMetrics>,
    pub start_time: Instant,
    pub company_cache: Arc<InMemoryCache<Vec<models::company::Company>>>,
    pub department_cache: Arc<InMemoryCache<Vec<models::department::Department>>>,
    pub employee_cache: Arc<InMemoryCache<Vec<models::employee::Employee>>>,
    pub dict_cache: Arc<InMemoryCache<Vec<models::dict::DictType>>>,
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
        .merge(company::create_routes())
        .merge(department::create_routes())
        .merge(employee::create_routes())
        .merge(asset::create_routes())
        .merge(audit::create_routes())
        .merge(finance::create_routes())
        .merge(dict::create_routes())
        .merge(db_structure::create_routes())
        .merge(contract::create_routes())
        .merge(budget::create_routes())
        .merge(payment_schedule::create_routes())
        .merge(addressbook::create_routes())
        .merge(voucher::create_routes())
        .merge(finance_reports::create_routes())
}
