use axum::routing::{get, post, put};
use axum::Router;

use topems_shared::auth_middleware;

use crate::middleware::permission::require_permission;
use crate::modules;
use crate::AppState;

pub fn help_routes(state: &AppState) -> Router<AppState> {
    let read = Router::new()
        .route("faqs", get(modules::help::faq::list_faqs))
        .route(
            "faqs/categories",
            get(modules::help::faq::get_faq_categories),
        )
        .route("faqs/{id}", get(modules::help::faq::get_faq))
        .route("guides", get(modules::help::guide::list_guides))
        .route(
            "guides/categories",
            get(modules::help::guide::get_guide_categories),
        )
        .route("guides/{id}", get(modules::help::guide::get_guide))
        .layer(axum::middleware::from_fn_with_state(
            state.auth_state.clone(),
            auth_middleware,
        ));

    let admin = Router::new()
        .route("faqs", post(modules::help::faq::create_faq))
        .route(
            "faqs/{id}",
            put(modules::help::faq::update_faq).delete(modules::help::faq::delete_faq),
        )
        .route("guides", post(modules::help::guide::create_guide))
        .route(
            "guides/{guide_id}/lessons",
            post(modules::help::guide::add_lesson),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("help:write"),
        ));

    read.merge(admin)
}
