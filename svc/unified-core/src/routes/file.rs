use axum::routing::{delete, get, post, put};
use axum::Router;

use crate::middleware::permission::require_permission;
use crate::modules;
use crate::AppState;

pub fn file_routes(state: &AppState) -> Router<AppState> {
    let read = Router::new()
        .route(
            "/api/core/file/download/{id}",
            get(modules::file::download::download_file),
        )
        .route(
            "/api/core/file/preview/{id}",
            get(modules::file::download::preview_file),
        )
        .route(
            "/api/core/file/thumbnail/{id}",
            get(modules::file::download::get_thumbnail),
        )
        .route(
            "/api/core/file/files",
            get(modules::file::manage::list_files),
        )
        .route(
            "/api/core/file/files/{id}",
            get(modules::file::manage::get_file),
        )
        .route(
            "/api/core/file/files/{id}/shares",
            get(modules::file::manage::get_file_shares),
        )
        .route(
            "/api/core/file/files/{id}/permissions",
            get(modules::file::manage::get_file_permissions),
        )
        .route(
            "/api/core/file/files/shared",
            get(modules::file::manage::get_shared_files),
        )
        .route(
            "/api/core/file/files/received",
            get(modules::file::manage::get_received_files),
        )
        .route(
            "/api/core/file/files/starred",
            get(modules::file::manage::list_starred_files),
        )
        .route(
            "/api/core/file/files/search",
            get(modules::file::manage::search_files),
        )
        .route(
            "/api/core/file/stats",
            get(modules::file::manage::get_file_stats),
        )
        .route(
            "/api/core/file/folders",
            get(modules::file::folder::list_folders),
        )
        .route(
            "/api/core/file/folders/{id}",
            get(modules::file::folder::get_folder),
        )
        .route(
            "/api/core/file/folders/tree",
            get(modules::file::folder::get_folder_tree),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("file:read"),
        ));

    let write = Router::new()
        .route(
            "/api/core/file/upload",
            post(modules::file::upload::upload_file),
        )
        .route(
            "/api/core/file/upload/multiple",
            post(modules::file::upload::upload_multiple),
        )
        .route(
            "/api/core/file/files/{id}",
            put(modules::file::manage::update_file),
        )
        .route(
            "/api/core/file/files/{id}/move",
            post(modules::file::manage::move_file),
        )
        .route(
            "/api/core/file/files/{id}/copy",
            post(modules::file::manage::copy_file),
        )
        .route(
            "/api/core/file/files/{id}/share",
            post(modules::file::manage::share_file),
        )
        .route(
            "/api/core/file/files/{id}/star",
            post(modules::file::manage::star_file),
        )
        .route(
            "/api/core/file/files/{id}/unstar",
            post(modules::file::manage::unstar_file),
        )
        .route(
            "/api/core/file/files/{id}/permissions",
            post(modules::file::manage::set_file_permissions),
        )
        .route(
            "/api/core/file/files/export",
            post(modules::file::manage::export_files),
        )
        .route(
            "/api/core/file/shares/{id}",
            delete(modules::file::manage::delete_share),
        )
        .route(
            "/api/core/file/folders",
            post(modules::file::folder::create_folder),
        )
        .route(
            "/api/core/file/folders/{id}",
            put(modules::file::folder::update_folder),
        )
        .route(
            "/api/core/file/folders/{id}/move",
            post(modules::file::folder::move_folder),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("file:write"),
        ));

    let delete_routes = Router::new()
        .route(
            "/api/core/file/files/{id}",
            delete(modules::file::manage::delete_file),
        )
        .route(
            "/api/core/file/folders/{id}",
            delete(modules::file::folder::delete_folder),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("file:delete"),
        ));

    let admin = Router::new()
        .route(
            "/api/core/file/files/{id}/permission",
            post(modules::file::manage::set_file_permission),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("file:admin"),
        ));

    read.merge(write).merge(delete_routes).merge(admin)
}
