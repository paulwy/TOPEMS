use anyhow::Result;
use axum::{
    extract::FromRef,
    Router,
};
use sqlx::postgres::PgPool;
use topems_shared::AuthState;

pub mod quality_standard;
pub mod quality_inspection;
pub mod quality_issue;
pub mod corrective_action;

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
        .merge(quality_standard::create_routes().await?)
        .merge(quality_inspection::create_routes().await?)
        .merge(quality_issue::create_routes().await?)
        .merge(corrective_action::create_routes().await?)
        .with_state(state);

    Ok(app)
}
