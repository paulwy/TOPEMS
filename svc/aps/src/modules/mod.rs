use axum::{extract::FromRef, Router};

use crate::shared::AppState;

pub mod aps_plugin;
pub mod capacity;
pub mod forecast;
pub mod material_plan;
pub mod openapi;
pub mod production_plan;
pub mod schedule;

/// APS 服务状态别名（与 shared::AppState 同一类型）
pub type ApiState = AppState;

pub fn create_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    ApiState: FromRef<S>,
{
    Router::new()
        .merge(production_plan::create_routes())
        .merge(schedule::create_routes())
        .merge(capacity::create_routes())
        .merge(material_plan::create_routes())
        .merge(forecast::create_routes())
}
