//! Portal compatibility endpoints for OpenAPI documentation.
//!
//! These functions provide utoipa annotations for frontend API calls
//! that are not yet covered by real backend handlers.

#[utoipa::path(
    get,
    path = "/api/portal/search/suggestions",
    tag = "Portal-Compat",
    responses((status = 200, description = "Portal compatibility endpoint"))
)]
pub async fn compat_get_api_portal_search_suggestions() {}
