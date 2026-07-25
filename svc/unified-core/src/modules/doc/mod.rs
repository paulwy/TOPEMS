//! Document module - merged from svc/doc
//! Provides document, template, and folder management routes.

pub mod handlers;
pub mod models;
pub mod services;

use axum::Router;

use crate::AppState;

pub fn create_routes() -> Router<AppState> {
    handlers::create_routes()
}
