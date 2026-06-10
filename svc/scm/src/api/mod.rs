use axum::{
    extract::FromRef,
    Router,
};
use sqlx::postgres::PgPool;
use topems_shared::AuthState;

pub mod supplier;
pub mod purchase_order;
pub mod purchase_item;
pub mod supplier_evaluation;
pub mod audit;

#[derive(Clone)]
pub struct ApiState {
    pub db: PgPool,
    pub auth_state: AuthState,
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
        .merge(supplier::create_routes())
        .merge(purchase_order::create_routes())
        .merge(purchase_item::create_routes())
        .merge(supplier_evaluation::create_routes())
        .merge(audit::create_routes())
}
