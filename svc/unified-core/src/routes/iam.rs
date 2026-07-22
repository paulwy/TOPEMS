use axum::routing::{delete, get, post, put};
use axum::Router;

use crate::middleware::permission::require_permission;
use crate::modules;
use crate::AppState;

pub fn iam_routes(state: &AppState) -> Router<AppState> {
    let read = Router::new()
        .route("users", get(modules::iam::user::list_users))
        .route("users/{id}", get(modules::iam::user::get_user))
        .route("users/me", get(modules::iam::user::get_current_user))
        .route(
            "users/me/preferences",
            get(modules::iam::user::get_preferences),
        )
        .route("roles", get(modules::iam::role::list_roles))
        .route("roles/{id}", get(modules::iam::role::get_role))
        .route(
            "permissions",
            get(modules::iam::permission::list_permissions),
        )
        .route(
            "user-permissions/{user_id}",
            get(modules::iam::user_permission::get_user_permissions),
        )
        .route("positions", get(modules::iam::position::list_positions))
        .route("positions/{id}", get(modules::iam::position::get_position))
        .route(
            "permissions/verify",
            post(modules::iam::permission_verify::verify_permission),
        )
        .route(
            "permissions/verify-multiple",
            post(modules::iam::permission_verify::verify_multiple_permissions),
        )
        .route(
            "permissions/my-permissions",
            get(modules::iam::permission_verify::get_my_permissions),
        )
        .route(
            "users/{user_id}/positions",
            get(modules::iam::user_position::get_user_positions),
        )
        .route(
            "positions/{position_id}/users",
            get(modules::iam::user_position::get_position_users),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("iam:read"),
        ));

    let write = Router::new()
        .route("users", post(modules::iam::user::create_user))
        .route("users/{id}", put(modules::iam::user::update_user))
        .route("users/{id}/disable", post(modules::iam::user::disable_user))
        .route("users/{id}/enable", post(modules::iam::user::enable_user))
        .route(
            "users/{id}/password",
            put(modules::iam::user::change_password),
        )
        .route(
            "users/me/preferences",
            put(modules::iam::user::update_preferences),
        )
        .route("roles", post(modules::iam::role::create_role))
        .route("roles/{id}", put(modules::iam::role::update_role))
        .route(
            "user-permissions/{user_id}",
            put(modules::iam::user_permission::update_user_permissions),
        )
        .route("positions", post(modules::iam::position::create_position))
        .route(
            "positions/{id}",
            put(modules::iam::position::update_position),
        )
        .route(
            "permissions/check-resource",
            post(modules::iam::permission_verify::check_resource_permission),
        )
        .route(
            "users/{user_id}/positions",
            post(modules::iam::user_position::assign_position),
        )
        .route(
            "users/batch-positions",
            post(modules::iam::user_position::batch_assign_positions),
        )
        .route(
            "users/{user_id}/positions/{position_id}",
            delete(modules::iam::user_position::unassign_position),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("iam:write"),
        ));

    let delete_routes = Router::new()
        .route("users/{id}", delete(modules::iam::user::delete_user))
        .route("roles/{id}", delete(modules::iam::role::delete_role))
        .route(
            "positions/{id}",
            delete(modules::iam::position::delete_position),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("iam:delete"),
        ));

    read.merge(write).merge(delete_routes)
}
