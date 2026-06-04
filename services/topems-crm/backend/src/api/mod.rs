use axum::{
    extract::FromRef,
    Router,
};
use sqlx::postgres::PgPool;
use std::sync::Arc;
use topems_shared::AuthState;

pub mod customer;
pub mod contact;
pub mod opportunity;
pub mod interaction;
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
        .merge(customer::create_routes())
        .merge(contact::create_routes())
        .merge(opportunity::create_routes())
        .merge(interaction::create_routes())
        .merge(audit::create_routes())
}
