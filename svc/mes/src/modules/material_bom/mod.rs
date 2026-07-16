mod bom_handlers;
mod issue_handlers;
mod models;
mod return_handlers;
mod utils;

use axum::{
    routing::get, Router,
};

use crate::AppState;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/api/mes/boms",
            get(bom_handlers::list_material_boms).post(bom_handlers::create_material_bom),
        )
        .route(
            "/api/mes/boms/{id}",
            get(bom_handlers::get_material_bom)
                .put(bom_handlers::update_material_bom)
                .delete(bom_handlers::delete_material_bom),
        )
        .route(
            "/api/mes/material-issues",
            get(issue_handlers::list_material_issues).post(issue_handlers::create_material_issue),
        )
        .route(
            "/api/mes/material-issues/{id}",
            get(issue_handlers::get_material_issue)
                .put(issue_handlers::update_material_issue)
                .delete(issue_handlers::delete_material_issue),
        )
        .route(
            "/api/mes/material-returns",
            get(return_handlers::list_material_returns).post(return_handlers::create_material_return),
        )
        .route(
            "/api/mes/material-returns/{id}",
            get(return_handlers::get_material_return)
                .put(return_handlers::update_material_return)
                .delete(return_handlers::delete_material_return),
        )
}

pub use models::*;
pub use bom_handlers::{
    list_material_boms,
    create_material_bom,
    get_material_bom,
    update_material_bom,
    delete_material_bom,
};
pub use issue_handlers::{
    list_material_issues,
    create_material_issue,
    get_material_issue,
    update_material_issue,
    delete_material_issue,
};
pub use return_handlers::{
    list_material_returns,
    create_material_return,
    get_material_return,
    update_material_return,
    delete_material_return,
};
