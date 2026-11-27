use axum::{extract::State, Extension, Json};
use topems_shared_core::error::TopemsError;
use topems_shared_core::response::ApiResponse;
use uuid::Uuid;

use crate::services::recommendation::{RecommendationRequest, RecommendationResponse, UserProfile};
use crate::shared::AppState;
use topems_shared_auth::get_tenant_id_from_claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;

pub struct RecommendationApi;

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/recommend",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn recommend(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Json(req): Json<RecommendationRequest>,
) -> Json<ApiResponse<RecommendationResponse>> {
    match state.recommendation_service.recommend(req, &txn_arc).await {
        Ok(response) => Json(ApiResponse::success(response, "推荐成功")),
        Err(e) => Json(ApiResponse::<RecommendationResponse>::from(
            TopemsError::internal("推荐失败", e),
        )),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/profile/get",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn get_user_profile(
    Extension(txn_arc): Extension<RlsTxnCell>,
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
            return Json(ApiResponse::<UserProfile>::from(TopemsError::internal(
                "无效的用户ID",
                e,
            )));
        }
    };

    match state
        .recommendation_service
        .get_user_profile(user_id, &txn_arc)
        .await
    {
        Ok(response) => Json(ApiResponse::success(response, "获取用户画像成功")),
        Err(e) => Json(ApiResponse::<UserProfile>::from(TopemsError::internal(
            "获取用户画像失败",
            e,
        ))),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/profile/update",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn update_user_profile(
    Extension(txn_arc): Extension<RlsTxnCell>,
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
            return Json(ApiResponse::<UserProfile>::from(TopemsError::internal(
                "无效的用户ID",
                e,
            )));
        }
    };

    match state
        .recommendation_service
        .update_user_profile(user_id, req, &txn_arc)
        .await
    {
        Ok(response) => Json(ApiResponse::success(response, "更新用户画像成功")),
        Err(e) => Json(ApiResponse::<UserProfile>::from(TopemsError::internal(
            "更新用户画像失败",
            e,
        ))),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/recommend/documents",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn recommend_documents(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(claims): Extension<topems_shared_auth::auth::Claims>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<RecommendationResponse>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let request = RecommendationRequest {
        user_id: None,
        context: req,
        recommendation_type: "documents".to_string(),
        top_k: Some(10),
        filters: None,
        tenant_id,
    };
    match state
        .recommendation_service
        .recommend(request, &txn_arc)
        .await
    {
        Ok(response) => Json(ApiResponse::success(response, "文档推荐成功")),
        Err(e) => Json(ApiResponse::<RecommendationResponse>::from(
            TopemsError::internal("文档推荐失败", e),
        )),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/recommend/opportunities",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn recommend_opportunities(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(claims): Extension<topems_shared_auth::auth::Claims>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<RecommendationResponse>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let request = RecommendationRequest {
        user_id: None,
        context: req,
        recommendation_type: "opportunities".to_string(),
        top_k: Some(10),
        filters: None,
        tenant_id,
    };
    match state
        .recommendation_service
        .recommend(request, &txn_arc)
        .await
    {
        Ok(response) => Json(ApiResponse::success(response, "商机推荐成功")),
        Err(e) => Json(ApiResponse::<RecommendationResponse>::from(
            TopemsError::internal("商机推荐失败", e),
        )),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/recommend/knowledge",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn recommend_knowledge(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(claims): Extension<topems_shared_auth::auth::Claims>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<RecommendationResponse>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let request = RecommendationRequest {
        user_id: None,
        context: req,
        recommendation_type: "knowledge".to_string(),
        top_k: Some(10),
        filters: None,
        tenant_id,
    };
    match state
        .recommendation_service
        .recommend(request, &txn_arc)
        .await
    {
        Ok(response) => Json(ApiResponse::success(response, "知识推荐成功")),
        Err(e) => Json(ApiResponse::<RecommendationResponse>::from(
            TopemsError::internal("知识推荐失败", e),
        )),
    }
}

// ============ 前端契约收口（2026-10-06）：/recommendations 轻量兜底 ============
// 前端 recommendation.ts 约定了 /recommendations、/recommendations/personalized、
// /recommendations/feedback 三个端点；crate 现有推荐服务走 /recommend/* 路径，
// 与此契约路径不同。这里按契约补轻量占位（空推荐列表 / 成功回执），待上游接入。

/// POST /api/ai/recommendations - 通用推荐（待上游支持，返回空列表）
#[utoipa::path(
    security(("BearerAuth" = ["ai:write"])),
    post,
    path = "/api/ai/recommendations",
    tag = "Filled",
    responses((status = 200, description = "ok")),
)]
pub async fn recommendations(
    State(_state): State<AppState>,
    Extension(_claims): Extension<topems_shared_auth::auth::Claims>,
    Json(_req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({ "recommendations": [], "_note": "待上游支持" }),
        "Success",
    ))
}

/// GET /api/ai/recommendations/personalized - 个性化推荐（待上游支持，返回空 items）
#[utoipa::path(
    security(("BearerAuth" = ["ai:read"])),
    get,
    path = "/api/ai/recommendations/personalized",
    tag = "Filled",
    responses((status = 200, description = "ok")),
)]
pub async fn personalized(
    State(_state): State<AppState>,
    Extension(_claims): Extension<topems_shared_auth::auth::Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({ "items": [], "_note": "待上游支持" }),
        "Success",
    ))
}

/// POST /api/ai/recommendations/feedback - 推荐反馈回执（待上游支持）
#[utoipa::path(
    security(("BearerAuth" = ["ai:write"])),
    post,
    path = "/api/ai/recommendations/feedback",
    tag = "Filled",
    responses((status = 200, description = "ok")),
)]
pub async fn feedback(
    State(_state): State<AppState>,
    Extension(_claims): Extension<topems_shared_auth::auth::Claims>,
    Json(_req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({ "success": true, "_note": "待上游支持" }),
        "Success",
    ))
}
