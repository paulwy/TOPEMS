use axum::routing::{delete, get, post, put};
use axum::Router;

use crate::middleware::permission::require_permission;
use crate::modules;
use crate::AppState;

pub fn file_routes(state: &AppState) -> Router<AppState> {
    let read = Router::new()
        .route("download/{id}", get(modules::file::download::download_file))
        .route("preview/{id}", get(modules::file::download::preview_file))
        .route(
            "thumbnail/{id}",
            get(modules::file::download::get_thumbnail),
        )
        .route("files", get(modules::file::manage::list_files))
        .route("files/{id}", get(modules::file::manage::get_file))
        .route(
            "files/{id}/shares",
            get(modules::file::manage::get_file_shares),
        )
        .route(
            "files/{id}/permissions",
            get(modules::file::manage::get_file_permissions),
        )
        .route("files/shared", get(modules::file::manage::get_shared_files))
        .route(
            "files/received",
            get(modules::file::manage::get_received_files),
        )
        .route(
            "files/starred",
            get(modules::file::manage::list_starred_files),
        )
        .route("files/search", get(modules::file::manage::search_files))
        .route("stats", get(modules::file::manage::get_file_stats))
        .route("folders", get(modules::file::folder::list_folders))
        .route("folders/{id}", get(modules::file::folder::get_folder))
        .route("folders/tree", get(modules::file::folder::get_folder_tree))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("file:read"),
        ));

    let write = Router::new()
        .route("upload", post(modules::file::upload::upload_file))
        .route(
            "upload/multiple",
            post(modules::file::upload::upload_multiple),
        )
        .route("files/{id}", put(modules::file::manage::update_file))
        .route("files/{id}/move", post(modules::file::manage::move_file))
        .route("files/{id}/copy", post(modules::file::manage::copy_file))
        .route("files/{id}/share", post(modules::file::manage::share_file))
        .route("files/{id}/star", post(modules::file::manage::star_file))
        .route(
            "files/{id}/unstar",
            post(modules::file::manage::unstar_file),
        )
        .route(
            "files/{id}/permissions",
            post(modules::file::manage::set_file_permissions),
        )
        .route("files/export", post(modules::file::manage::export_files))
        .route("shares/{id}", delete(modules::file::manage::delete_share))
        .route("folders", post(modules::file::folder::create_folder))
        .route("folders/{id}", put(modules::file::folder::update_folder))
        .route(
            "folders/{id}/move",
            post(modules::file::folder::move_folder),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("file:write"),
        ));

    let delete_routes = Router::new()
        .route("files/{id}", delete(modules::file::manage::delete_file))
        .route("folders/{id}", delete(modules::file::folder::delete_folder))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("file:delete"),
        ));

    let admin = Router::new()
        .route(
            "files/{id}/permission",
            post(modules::file::manage::set_file_permission),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("file:admin"),
        ));

    read.merge(write).merge(delete_routes).merge(admin)
}
