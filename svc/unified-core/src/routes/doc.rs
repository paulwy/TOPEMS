use axum::Router;

use crate::modules;
use crate::AppState;

/// Doc routes registered under `/api/core/doc/*`.
/// Merges the doc module's create_routes() under the `/doc` prefix.
pub fn doc_routes(_state: &AppState) -> Router<AppState> {
    Router::new().nest("/doc", modules::doc::create_routes())
}
