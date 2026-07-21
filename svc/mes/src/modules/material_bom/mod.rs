mod bom_handlers;
mod issue_handlers;
mod models;
mod return_handlers;
mod utils;

use axum::{routing::get, Router};

use crate::AppState;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/boms",
            get(bom_handlers::list_material_boms).post(bom_handlers::create_material_bom),
        )
        .route(
            "/boms/{id}",
            get(bom_handlers::get_material_bom)
                .put(bom_handlers::update_material_bom)
                .delete(bom_handlers::delete_material_bom),
        )
        .route(
            "/material-issues",
            get(issue_handlers::list_material_issues).post(issue_handlers::create_material_issue),
        )
        .route(
            "/material-issues/{id}",
            get(issue_handlers::get_material_issue)
                .put(issue_handlers::update_material_issue)
                .delete(issue_handlers::delete_material_issue),
        )
        .route(
            "/material-returns",
            get(return_handlers::list_material_returns)
                .post(return_handlers::create_material_return),
        )
        .route(
            "/material-returns/{id}",
            get(return_handlers::get_material_return)
                .put(return_handlers::update_material_return)
                .delete(return_handlers::delete_material_return),
        )
}

pub use bom_handlers::{
    create_material_bom, delete_material_bom, get_material_bom, list_material_boms,
    update_material_bom,
};
pub use issue_handlers::{
    create_material_issue, delete_material_issue, get_material_issue, list_material_issues,
    update_material_issue,
};
pub use models::*;
pub use return_handlers::{
    create_material_return, delete_material_return, get_material_return, list_material_returns,
    update_material_return,
};
