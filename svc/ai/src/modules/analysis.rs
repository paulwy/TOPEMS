use axum::{extract::Extension, extract::State, http::HeaderMap, Json};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

use crate::modules::models::*;
use crate::shared::AppState;
use topems_shared_auth::get_tenant_id_from_claims;

pub struct AnalysisApi;

impl AnalysisApi {
    /// POST /api/analysis/sentiment - 情感分析
    pub async fn sentiment(
        State(state): State<AppState>,
        Extension(claims): Extension<Claims>,
        headers: HeaderMap,
        Json(req): Json<SentimentAnalysisRequest>,
    ) -> Json<ApiResponse<SentimentAnalysisResponse>> {
        let tenant_id = get_tenant_id_from_claims(&claims);
        let user_id = headers.get("x-username").and_then(|v| v.to_str().ok());
        let details = Some(serde_json::json!({"text_length": req.text.len()}));
        match state
            .analysis_service
            .analyze_sentiment(&req.text, tenant_id)
            .await
        {
            Ok(response) => {
                if let Err(e) = state
                    .audit
                    .log_analysis_operation(
                        "sentiment_analysis",
                        None,
                        user_id,
                        details.clone(),
                        "success",
                        None,
                    )
                    .await
                {
                    tracing::warn!("ai audit failed: {e}");
                }
                Json(ApiResponse::success(response, "Success"))
            }
            Err(e) => {
                let err_msg = e.to_string();
                if let Err(audit_err) = state
                    .audit
                    .log_analysis_operation(
                        "sentiment_analysis",
                        None,
                        user_id,
                        details,
                        "failed",
                        Some(&err_msg),
                    )
                    .await
                {
                    tracing::warn!("ai audit failed: {audit_err}");
                }
                Json(ApiResponse::<SentimentAnalysisResponse>::error(500, &e))
            }
        }
    }

    /// POST /api/analysis/classify - 文本分类
    pub async fn classify(
        State(state): State<AppState>,
        Extension(claims): Extension<Claims>,
        headers: HeaderMap,
        Json(req): Json<ClassifyTextRequest>,
    ) -> Json<ApiResponse<ClassifyTextResponse>> {
        let tenant_id = get_tenant_id_from_claims(&claims);
        let user_id = headers.get("x-username").and_then(|v| v.to_str().ok());
        let details = Some(serde_json::json!({"categories": req.categories}));
        match state
            .analysis_service
            .classify_text(&req.text, req.categories.as_deref(), tenant_id)
            .await
        {
            Ok(response) => {
                if let Err(e) = state
                    .audit
                    .log_analysis_operation(
                        "classify_text",
                        None,
                        user_id,
                        details.clone(),
                        "success",
                        None,
                    )
                    .await
                {
                    tracing::warn!("ai audit failed: {e}");
                }
                Json(ApiResponse::success(response, "Success"))
            }
            Err(e) => {
                let err_msg = e.to_string();
                if let Err(audit_err) = state
                    .audit
                    .log_analysis_operation(
                        "classify_text",
                        None,
                        user_id,
                        details,
                        "failed",
                        Some(&err_msg),
                    )
                    .await
                {
                    tracing::warn!("ai audit failed: {audit_err}");
                }
                Json(ApiResponse::<ClassifyTextResponse>::error(500, &e))
            }
        }
    }

    /// POST /api/analysis/entities - 实体提取
    pub async fn extract_entities(
        State(state): State<AppState>,
        Extension(claims): Extension<Claims>,
        Json(req): Json<ExtractEntitiesRequest>,
    ) -> Json<ApiResponse<ExtractEntitiesResponse>> {
        let tenant_id = get_tenant_id_from_claims(&claims);
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
        let tenant_id = get_tenant_id_from_claims(&claims);
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
        let tenant_id = get_tenant_id_from_claims(&claims);
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

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    fn any_uuid() -> Uuid {
        Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
    }

    fn sample_claims(tenant_id: Option<String>) -> Claims {
        Claims {
            sub: "00000000-0000-0000-0000-000000000001".into(),
            username: "tester".into(),
            role: "user".into(),
            roles: vec![],
            permissions: vec![],
            is_superuser: false,
            exp: 0,
            iat: 0,
            email: None,
            department: None,
            tenant_id,
            department_id: None,
            position_id: None,
            position_code: None,
        }
    }

    #[test]
    fn test_get_tenant_id_with_valid_id() {
        let claims = sample_claims(Some(any_uuid().to_string()));
        let tid = get_tenant_id_from_claims(&claims);
        assert_eq!(tid, any_uuid());
    }

    #[test]
    fn test_get_tenant_id_with_none_returns_nil() {
        let claims = sample_claims(None);
        let tid = get_tenant_id_from_claims(&claims);
        assert_eq!(tid, Uuid::nil());
    }

    #[test]
    fn test_get_tenant_id_with_invalid_returns_nil() {
        let claims = sample_claims(Some("invalid-uuid".to_string()));
        let tid = get_tenant_id_from_claims(&claims);
        assert_eq!(tid, Uuid::nil());
    }
}
