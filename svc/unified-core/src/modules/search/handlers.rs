use axum::{
    extract::{Query, State},
    Json,
};

use crate::AppState;
use topems_shared::{api_error, api_success, ApiResponse};

use super::models::{SearchRequest, SearchResponse};
use super::service::search_all;

pub async fn search(
    State(state): State<AppState>,
    Query(req): Query<SearchRequest>,
) -> Json<ApiResponse<SearchResponse>> {
    let keyword = req.keyword.trim().to_string();

    if keyword.is_empty() {
        return Json(api_error(400, "搜索关键词不能为空"));
    }

    let page = req.page.unwrap_or(1).max(1);
    let page_size = req.page_size.unwrap_or(20).min(100);

    let results = search_all(&state.pool, &keyword, &req.modules, page_size).await;
    let total = results.len() as i64;

    Json(api_success(SearchResponse {
        items: results,
        total,
        page,
        page_size,
    }))
}
