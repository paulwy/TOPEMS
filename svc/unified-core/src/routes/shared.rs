//! Stub router for shared module.
//! Ensures backend require_permission() declares the module for R4 F-B alignment.

use crate::middleware::permission::require_permission;
use crate::AppState;
use axum::{routing::get, Router};

pub fn router(state: &AppState) -> Router<AppState> {
    Router::new()
        .route("/dashboard", get(|| async { "ok" }))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("shared:dashboard:read"),
        ))
}
