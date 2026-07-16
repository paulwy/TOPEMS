use axum::{
    routing::{get, post},
    Router,
};

use crate::shared::AppState;

mod models;
mod instrument_data_crud;
mod data_parsing;
mod collection_tasks;
mod parse_rules;
mod statistics;

pub use models::*;
pub use instrument_data_crud::*;
pub use data_parsing::*;
pub use collection_tasks::*;
pub use parse_rules::*;
pub use statistics::*;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/api/lims/instrument-data",
            get(list_instrument_data).post(create_instrument_data),
        )
        .route(
            "/api/lims/instrument-data/{id}",
            get(get_instrument_data)
                .put(update_instrument_data)
                .delete(delete_instrument_data),
        )
        .route(
            "/api/lims/instrument-data/{id}/parse",
            post(parse_instrument_data),
        )
        .route(
            "/api/lims/instrument-data/parse/test",
            post(test_parse_data),
        )
        .route(
            "/api/lims/instrument-data/statistics",
            get(get_instrument_data_statistics),
        )
        .route(
            "/api/lims/collection-tasks",
            get(list_collection_tasks).post(create_collection_task),
        )
        .route(
            "/api/lims/collection-tasks/{id}",
            get(get_collection_task)
                .put(update_collection_task)
                .delete(delete_collection_task),
        )
        .route(
            "/api/lims/collection-tasks/{id}/trigger",
            post(trigger_collection),
        )
        .route(
            "/api/lims/parse-rules",
            get(list_parse_rules).post(create_parse_rule),
        )
        .route(
            "/api/lims/parse-rules/{id}",
            get(get_parse_rule)
                .put(update_parse_rule)
                .delete(delete_parse_rule),
        )
}
