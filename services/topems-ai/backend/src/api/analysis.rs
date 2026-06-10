use axum::{extract::State, Json};
use topems_shared::ApiResponse;

use crate::api::models::*;
use crate::AppState;

pub struct AnalysisApi;

impl AnalysisApi {
    /// POST /api/v1/analysis/sentiment - 情感分析
    pub async fn sentiment(
        State(state): State<AppState>,
        Json(req): Json<SentimentAnalysisRequest>,
    ) -> Json<ApiResponse<SentimentAnalysisResponse>> {
        match state.analysis_service.analyze_sentiment(&req.text).await {
            Ok(response) => {
                Json(ApiResponse::success(response, "Success"))
            }
            Err(e) => {
                Json(ApiResponse::<SentimentAnalysisResponse>::error(500, &e))
            }
        }
    }

    /// POST /api/v1/analysis/classify - 文本分类
    pub async fn classify(
        State(state): State<AppState>,
        Json(req): Json<ClassifyTextRequest>,
    ) -> Json<ApiResponse<ClassifyTextResponse>> {
        match state
            .analysis_service
            .classify_text(&req.text, req.categories.as_deref())
            .await
        {
            Ok(response) => {
                Json(ApiResponse::success(response, "Success"))
            }
            Err(e) => {
                Json(ApiResponse::<ClassifyTextResponse>::error(500, &e))
            }
        }
    }

    /// POST /api/v1/analysis/entities - 实体提取
    pub async fn extract_entities(
        State(state): State<AppState>,
        Json(req): Json<ExtractEntitiesRequest>,
    ) -> Json<ApiResponse<ExtractEntitiesResponse>> {
        match state
            .analysis_service
            .extract_entities(&req.text, req.entity_types.as_deref())
            .await
        {
            Ok(response) => {
                Json(ApiResponse::success(response, "Success"))
            }
            Err(e) => {
                Json(ApiResponse::<ExtractEntitiesResponse>::error(500, &e))
            }
        }
    }

    /// POST /api/v1/analysis/extract-keywords - 关键词提取
    pub async fn extract_keywords(
        State(state): State<AppState>,
        Json(req): Json<ExtractKeywordsRequest>,
    ) -> Json<ApiResponse<ExtractKeywordsResponse>> {
        match state
            .analysis_service
            .extract_keywords(&req.text, req.max_keywords)
            .await
        {
            Ok(response) => {
                Json(ApiResponse::success(response, "Success"))
            }
            Err(e) => {
                Json(ApiResponse::<ExtractKeywordsResponse>::error(500, &e))
            }
        }
    }

    /// GET /api/v1/analysis/history - 获取分析历史
    pub async fn history(
        State(state): State<AppState>,
        Json(req): Json<AnalysisHistoryRequest>,
    ) -> Json<ApiResponse<AnalysisHistoryResponse>> {
        let limit = req.limit.unwrap_or(50);
        match state
            .analysis_service
            .get_analysis_history(req.analysis_type.as_deref(), limit)
            .await
        {
            Ok(history) => {
                let total = history.len() as i32;
                Json(ApiResponse::success(
                    AnalysisHistoryResponse { history, total },
                    "Success",
                ))
            }
            Err(e) => {
                Json(ApiResponse::<AnalysisHistoryResponse>::error(500, &e))
            }
        }
    }
}
