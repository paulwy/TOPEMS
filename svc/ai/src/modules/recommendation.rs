use axum::{extract::State, Extension, Json};
use topems_shared::ApiResponse;
use uuid::Uuid;

use crate::services::recommendation::{RecommendationRequest, RecommendationResponse, UserProfile};
use crate::shared::AppState;

pub struct RecommendationApi;

impl RecommendationApi {
    pub async fn recommend(
        State(state): State<AppState>,
        Json(req): Json<RecommendationRequest>,
    ) -> Json<ApiResponse<RecommendationResponse>> {
        match state.recommendation_service.recommend(req).await {
            Ok(response) => Json(ApiResponse::success(response, "推荐成功")),
            Err(e) => Json(ApiResponse::<RecommendationResponse>::error(500, &e)),
        }
    }

    pub async fn get_user_profile(
        State(state): State<AppState>,
        Json(req): Json<serde_json::Value>,
    ) -> Json<ApiResponse<UserProfile>> {
        let user_id_str = req
            .get("user_id")
            .and_then(|v| v.as_str())
            .unwrap_or_default();
        let user_id = match Uuid::parse_str(user_id_str) {
            Ok(id) => id,
            Err(e) => {
                return Json(ApiResponse::<UserProfile>::error(
                    500,
                    &format!("无效的用户ID: {}", e),
                ));
            }
        };

        match state.recommendation_service.get_user_profile(user_id).await {
            Ok(response) => Json(ApiResponse::success(response, "获取用户画像成功")),
            Err(e) => Json(ApiResponse::<UserProfile>::error(500, &e)),
        }
    }

    pub async fn update_user_profile(
        State(state): State<AppState>,
        Json(req): Json<serde_json::Value>,
    ) -> Json<ApiResponse<UserProfile>> {
        let user_id_str = req
            .get("user_id")
            .and_then(|v| v.as_str())
            .unwrap_or_default();
        let user_id = match Uuid::parse_str(user_id_str) {
            Ok(id) => id,
            Err(e) => {
                return Json(ApiResponse::<UserProfile>::error(
                    500,
                    &format!("无效的用户ID: {}", e),
                ));
            }
        };

        match state
            .recommendation_service
            .update_user_profile(user_id, req)
            .await
        {
            Ok(response) => Json(ApiResponse::success(response, "更新用户画像成功")),
            Err(e) => Json(ApiResponse::<UserProfile>::error(500, &e)),
        }
    }

    pub async fn recommend_documents(
        State(state): State<AppState>,
        Extension(claims): Extension<topems_shared::auth::Claims>,
        Json(req): Json<serde_json::Value>,
    ) -> Json<ApiResponse<RecommendationResponse>> {
        let tenant_id = crate::modules::qa::get_tenant_id(&claims);
        let request = RecommendationRequest {
            user_id: None,
            context: req,
            recommendation_type: "documents".to_string(),
            top_k: Some(10),
            filters: None,
            tenant_id,
        };
        match state.recommendation_service.recommend(request).await {
            Ok(response) => Json(ApiResponse::success(response, "文档推荐成功")),
            Err(e) => Json(ApiResponse::<RecommendationResponse>::error(500, &e)),
        }
    }

    pub async fn recommend_opportunities(
        State(state): State<AppState>,
        Extension(claims): Extension<topems_shared::auth::Claims>,
        Json(req): Json<serde_json::Value>,
    ) -> Json<ApiResponse<RecommendationResponse>> {
        let tenant_id = crate::modules::qa::get_tenant_id(&claims);
        let request = RecommendationRequest {
            user_id: None,
            context: req,
            recommendation_type: "opportunities".to_string(),
            top_k: Some(10),
            filters: None,
            tenant_id,
        };
        match state.recommendation_service.recommend(request).await {
            Ok(response) => Json(ApiResponse::success(response, "商机推荐成功")),
            Err(e) => Json(ApiResponse::<RecommendationResponse>::error(500, &e)),
        }
    }

    pub async fn recommend_knowledge(
        State(state): State<AppState>,
        Extension(claims): Extension<topems_shared::auth::Claims>,
        Json(req): Json<serde_json::Value>,
    ) -> Json<ApiResponse<RecommendationResponse>> {
        let tenant_id = crate::modules::qa::get_tenant_id(&claims);
        let request = RecommendationRequest {
            user_id: None,
            context: req,
            recommendation_type: "knowledge".to_string(),
            top_k: Some(10),
            filters: None,
            tenant_id,
        };
        match state.recommendation_service.recommend(request).await {
            Ok(response) => Json(ApiResponse::success(response, "知识推荐成功")),
            Err(e) => Json(ApiResponse::<RecommendationResponse>::error(500, &e)),
        }
    }
}
