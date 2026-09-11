use axum::{extract::FromRef, Router};

use crate::shared::AppState;

pub mod analytics;
pub mod carrier;
pub mod driver;
pub mod openapi;
pub mod optimization;
pub mod route;
pub mod shipment;
pub mod tms_plugin;
pub mod vehicle;

pub fn create_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    AppState: FromRef<S>,
{
    Router::new()
        .merge(vehicle::create_routes())
        .merge(driver::create_routes())
        .merge(carrier::create_routes())
        .merge(route::create_routes())
        .merge(shipment::create_routes())
        .merge(optimization::create_routes())
        .merge(analytics::create_routes())
}
