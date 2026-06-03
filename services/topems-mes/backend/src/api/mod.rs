use anyhow::Result;
use axum::{
    extract::FromRef,
    Router,
};
use sqlx::postgres::PgPool;
use topems_shared::AuthState;

pub mod production_order;
pub mod production_process;
pub mod work_station;
pub mod production_record;
pub mod audit;
pub mod equipment;

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

pub async fn create_routes(db: PgPool, auth_state: AuthState) -> Result<Router> {
    let state = ApiState { db, auth_state };
    
    let app = Router::new()
        .merge(production_order::create_routes().await?)
        .merge(production_process::create_routes().await?)
        .merge(work_station::create_routes().await?)
        .merge(production_record::create_routes().await?)
        .merge(audit::create_routes().await?)
        .merge(equipment::create_routes().await?)
        .with_state(state);

    Ok(app)
}
