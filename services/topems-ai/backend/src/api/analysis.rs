use axum::Json;
use topems_shared::ApiResponse;

use crate::api::models::*;
use crate::services::AnalysisService;

pub struct AnalysisApi;

impl AnalysisApi {
    /// POST /api/v1/analysis/sentiment - 情感分析
    pub async fn sentiment(
        analysis_service: AnalysisService,
        Json(req): Json<SentimentAnalysisRequest>,
    ) -> Json<ApiResponse<SentimentAnalysisResponse>> {
        match analysis_service.analyze_sentiment(&req.text).await {
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
        analysis_service: AnalysisService,
        Json(req): Json<ClassifyTextRequest>,
    ) -> Json<ApiResponse<ClassifyTextResponse>> {
        match analysis_service
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
        analysis_service: AnalysisService,
        Json(req): Json<ExtractEntitiesRequest>,
    ) -> Json<ApiResponse<ExtractEntitiesResponse>> {
        match analysis_service
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
        analysis_service: AnalysisService,
        Json(req): Json<ExtractKeywordsRequest>,
    ) -> Json<ApiResponse<ExtractKeywordsResponse>> {
        match analysis_service
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
}