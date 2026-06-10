use axum::{
    extract::FromRef,
    Router,
};
use sqlx::postgres::PgPool;
use topems_shared::{AuthState, Config, Result};

pub mod sample;
pub mod inspection_process;
pub mod inspection_task;
pub mod inspection_record;
pub mod instrument;
pub mod audit;
pub mod reagent;
pub mod doc_integration;
pub mod ai_integration;
pub mod rs_integration;
pub mod openapi;
pub mod health;

#[derive(Clone)]
pub struct ApiState {
    pub db: PgPool,
    pub auth_state: AuthState,
    pub config: Config,
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

pub async fn create_routes(db: PgPool, auth_state: AuthState, config: Config) -> Result<Router> {
    let state = ApiState { db, auth_state, config };

    let app = Router::new()
        .merge(health::create_routes())
        .merge(sample::create_routes().await?)
        .merge(inspection_process::create_routes().await?)
        .merge(inspection_task::create_routes().await?)
        .merge(inspection_record::create_routes().await?)
        .merge(instrument::create_routes().await?)
        .merge(audit::create_routes().await?)
        .merge(reagent::create_routes().await?)
        .merge(doc_integration::create_routes().await?)
        .merge(ai_integration::create_routes().await?)
        .merge(rs_integration::create_routes().await?)
        .with_state(state);

    Ok(app)
}
