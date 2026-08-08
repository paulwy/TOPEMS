use axum::{extract::Extension, extract::State, Json};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;
use uuid::Uuid;

use crate::modules::models::*;
use crate::shared::AppState;

fn get_tenant_id(claims: &Claims) -> Uuid {
    claims
        .tenant_id
        .clone()
        .and_then(|id| Uuid::parse_str(&id).ok())
        .unwrap_or(Uuid::nil())
}

pub struct AnalysisApi;

impl AnalysisApi {
    /// POST /api/analysis/sentiment - 情感分析
    pub async fn sentiment(
        State(state): State<AppState>,
        Extension(claims): Extension<Claims>,
        Json(req): Json<SentimentAnalysisRequest>,
    ) -> Json<ApiResponse<SentimentAnalysisResponse>> {
        let tenant_id = get_tenant_id(&claims);
        match state
            .analysis_service
            .analyze_sentiment(&req.text, tenant_id)
            .await
        {
            Ok(response) => Json(ApiResponse::success(response, "Success")),
            Err(e) => Json(ApiResponse::<SentimentAnalysisResponse>::error(500, &e)),
        }
    }

    /// POST /api/analysis/classify - 文本分类
    pub async fn classify(
        State(state): State<AppState>,
        Extension(claims): Extension<Claims>,
        Json(req): Json<ClassifyTextRequest>,
    ) -> Json<ApiResponse<ClassifyTextResponse>> {
        let tenant_id = get_tenant_id(&claims);
        match state
            .analysis_service
            .classify_text(&req.text, req.categories.as_deref(), tenant_id)
            .await
        {
            Ok(response) => Json(ApiResponse::success(response, "Success")),
            Err(e) => Json(ApiResponse::<ClassifyTextResponse>::error(500, &e)),
        }
    }

    /// POST /api/analysis/entities - 实体提取
    pub async fn extract_entities(
        State(state): State<AppState>,
        Extension(claims): Extension<Claims>,
        Json(req): Json<ExtractEntitiesRequest>,
    ) -> Json<ApiResponse<ExtractEntitiesResponse>> {
        let tenant_id = get_tenant_id(&claims);
        match state
            .analysis_service
            .extract_entities(&req.text, req.entity_types.as_deref(), tenant_id)
            .await
        {
            Ok(response) => Json(ApiResponse::success(response, "Success")),
            Err(e) => Json(ApiResponse::<ExtractEntitiesResponse>::error(500, &e)),
        }
    }

    /// POST /api/analysis/extract-keywords - 关键词提取
    pub async fn extract_keywords(
        State(state): State<AppState>,
        Extension(claims): Extension<Claims>,
        Json(req): Json<ExtractKeywordsRequest>,
    ) -> Json<ApiResponse<ExtractKeywordsResponse>> {
        let tenant_id = get_tenant_id(&claims);
        match state
            .analysis_service
            .extract_keywords(&req.text, req.max_keywords, tenant_id)
            .await
        {
            Ok(response) => Json(ApiResponse::success(response, "Success")),
            Err(e) => Json(ApiResponse::<ExtractKeywordsResponse>::error(500, &e)),
        }
    }

    /// GET /api/analysis/history - 获取分析历史
    pub async fn history(
        State(state): State<AppState>,
        Extension(claims): Extension<Claims>,
        Json(req): Json<AnalysisHistoryRequest>,
    ) -> Json<ApiResponse<AnalysisHistoryResponse>> {
        let tenant_id = get_tenant_id(&claims);
        let limit = req.limit.unwrap_or(50);
        match state
            .analysis_service
            .get_analysis_history(req.analysis_type.as_deref(), limit, tenant_id)
            .await
        {
            Ok(history) => {
                let total = history.len() as i32;
                Json(ApiResponse::success(
                    AnalysisHistoryResponse { history, total },
                    "Success",
                ))
            }
            Err(e) => Json(ApiResponse::<AnalysisHistoryResponse>::error(500, &e)),
        }
    }
}
