#![allow(dead_code)]

use axum::{extract::State, Json};
use serde::Deserialize;
use topems_shared_core::response::ApiResponse;

use crate::services::multimodal::{
    ImageAnalysisRequest, ImageAnalysisResponse, VideoAnalysisRequest, VideoAnalysisResponse,
};
use crate::shared::AppState;

#[derive(Debug, Deserialize)]
pub struct ImageQualityRequest {
    pub image_base64: String,
}

#[derive(Debug, Deserialize)]
pub struct ChartAnalysisRequest {
    pub image_base64: String,
}

#[derive(Debug, Deserialize)]
pub struct ImageCompareRequest {
    pub image1_base64: String,
    pub image2_base64: String,
}

pub struct MultimodalApi;

#[cfg(test)]
mod tests {
    use super::*;

    // ── ImageQualityRequest ──

    #[test]
    fn test_image_quality_request_deserialize() {
        let req: ImageQualityRequest =
            serde_json::from_str("{\"image_base64\":\"iVBORw0KGgo=\"}").unwrap();
        assert_eq!(req.image_base64, "iVBORw0KGgo=");
    }

    #[test]
    fn test_image_quality_request_empty_base64() {
        let req: ImageQualityRequest = serde_json::from_str("{\"image_base64\":\"\"}").unwrap();
        assert!(req.image_base64.is_empty());
    }

    #[test]
    fn test_image_quality_request_debug() {
        let req = ImageQualityRequest {
            image_base64: "abc".into(),
        };
        let debug_str = format!("{:?}", req);
        assert!(debug_str.contains("ImageQualityRequest"));
    }

    // ── ChartAnalysisRequest ──

    #[test]
    fn test_chart_analysis_request_deserialize() {
        let req: ChartAnalysisRequest =
            serde_json::from_str("{\"image_base64\":\"base64data==\"}").unwrap();
        assert_eq!(req.image_base64, "base64data==");
    }

    #[test]
    fn test_chart_analysis_request_deserialize_long() {
        let req: ChartAnalysisRequest =
            serde_json::from_str("{\"image_base64\":\"verylongbase64stringdata==\"}").unwrap();
        assert_eq!(req.image_base64, "verylongbase64stringdata==");
    }

    // ── ImageCompareRequest ──

    #[test]
    fn test_image_compare_request_deserialize() {
        let req: ImageCompareRequest =
            serde_json::from_str("{\"image1_base64\":\"img1==\",\"image2_base64\":\"img2==\"}")
                .unwrap();
        assert_eq!(req.image1_base64, "img1==");
        assert_eq!(req.image2_base64, "img2==");
    }

    #[test]
    fn test_image_compare_request_both_empty() {
        let req: ImageCompareRequest =
            serde_json::from_str("{\"image1_base64\":\"\",\"image2_base64\":\"\"}").unwrap();
        assert!(req.image1_base64.is_empty());
        assert!(req.image2_base64.is_empty());
    }

    #[test]
    fn test_image_compare_request_debug() {
        let req = ImageCompareRequest {
            image1_base64: "a".into(),
            image2_base64: "b".into(),
        };
        let debug_str = format!("{:?}", req);
        assert!(debug_str.contains("ImageCompareRequest"));
        assert!(debug_str.contains("image1_base64"));
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/multimodal/image/analyze",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn analyze_image(
    State(state): State<AppState>,
    Json(req): Json<ImageAnalysisRequest>,
) -> Json<ApiResponse<ImageAnalysisResponse>> {
    match state.multimodal_service.analyze_image(req).await {
        Ok(response) => Json(ApiResponse::success(response, "图片分析成功")),
        Err(e) => Json(ApiResponse::<ImageAnalysisResponse>::error(500, &e)),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/multimodal/image/caption",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn generate_caption(
    State(state): State<AppState>,
    Json(req): Json<ImageAnalysisRequest>,
) -> Json<ApiResponse<ImageAnalysisResponse>> {
    let mut request = req;
    request.analysis_type = "caption".to_string();
    match state.multimodal_service.analyze_image(request).await {
        Ok(response) => Json(ApiResponse::success(response, "图片标题生成成功")),
        Err(e) => Json(ApiResponse::<ImageAnalysisResponse>::error(500, &e)),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/multimodal/image/objects",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn detect_objects(
    State(state): State<AppState>,
    Json(req): Json<ImageAnalysisRequest>,
) -> Json<ApiResponse<ImageAnalysisResponse>> {
    let mut request = req;
    request.analysis_type = "objects".to_string();
    match state.multimodal_service.analyze_image(request).await {
        Ok(response) => Json(ApiResponse::success(response, "物体检测成功")),
        Err(e) => Json(ApiResponse::<ImageAnalysisResponse>::error(500, &e)),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/multimodal/image/text",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn extract_text(
    State(state): State<AppState>,
    Json(req): Json<ImageAnalysisRequest>,
) -> Json<ApiResponse<ImageAnalysisResponse>> {
    let mut request = req;
    request.analysis_type = "text".to_string();
    match state.multimodal_service.analyze_image(request).await {
        Ok(response) => Json(ApiResponse::success(response, "文字提取成功")),
        Err(e) => Json(ApiResponse::<ImageAnalysisResponse>::error(500, &e)),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/multimodal/image/describe",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn describe_image(
    State(state): State<AppState>,
    Json(req): Json<ImageAnalysisRequest>,
) -> Json<ApiResponse<ImageAnalysisResponse>> {
    let mut request = req;
    request.analysis_type = "describe".to_string();
    match state.multimodal_service.analyze_image(request).await {
        Ok(response) => Json(ApiResponse::success(response, "图片描述成功")),
        Err(e) => Json(ApiResponse::<ImageAnalysisResponse>::error(500, &e)),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/multimodal/video/analyze",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn analyze_video(
    State(state): State<AppState>,
    Json(req): Json<VideoAnalysisRequest>,
) -> Json<ApiResponse<VideoAnalysisResponse>> {
    match state.multimodal_service.analyze_video(req).await {
        Ok(response) => Json(ApiResponse::success(response, "视频分析成功")),
        Err(e) => Json(ApiResponse::<VideoAnalysisResponse>::error(500, &e)),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/multimodal/video/summary",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn summarize_video(
    State(state): State<AppState>,
    Json(req): Json<VideoAnalysisRequest>,
) -> Json<ApiResponse<VideoAnalysisResponse>> {
    let mut request = req;
    request.analysis_type = "summary".to_string();
    match state.multimodal_service.analyze_video(request).await {
        Ok(response) => Json(ApiResponse::success(response, "视频摘要生成成功")),
        Err(e) => Json(ApiResponse::<VideoAnalysisResponse>::error(500, &e)),
    }
}

pub async fn assess_image_quality(
    State(state): State<AppState>,
    Json(req): Json<ImageQualityRequest>,
) -> Json<ApiResponse<crate::services::multimodal::ImageQualityAssessment>> {
    match state
        .multimodal_service
        .assess_image_quality(&req.image_base64)
        .await
    {
        Ok(response) => Json(ApiResponse::success(response, "图片质量评估成功")),
        Err(e) => Json(ApiResponse::<
            crate::services::multimodal::ImageQualityAssessment,
        >::error(500, &e)),
    }
}

pub async fn analyze_chart(
    State(state): State<AppState>,
    Json(req): Json<ChartAnalysisRequest>,
) -> Json<ApiResponse<crate::services::multimodal::ChartAnalysisResult>> {
    match state
        .multimodal_service
        .analyze_chart(&req.image_base64)
        .await
    {
        Ok(response) => Json(ApiResponse::success(response, "图表分析成功")),
        Err(e) => Json(ApiResponse::<
            crate::services::multimodal::ChartAnalysisResult,
        >::error(500, &e)),
    }
}

pub async fn detect_faces(
    State(state): State<AppState>,
    Json(req): Json<ImageQualityRequest>,
) -> Json<ApiResponse<crate::services::multimodal::FaceDetectionResult>> {
    match state
        .multimodal_service
        .detect_faces(&req.image_base64)
        .await
    {
        Ok(response) => Json(ApiResponse::success(response, "人脸检测成功")),
        Err(e) => Json(ApiResponse::<
            crate::services::multimodal::FaceDetectionResult,
        >::error(500, &e)),
    }
}

pub async fn compare_images(
    State(state): State<AppState>,
    Json(req): Json<ImageCompareRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    match state
        .multimodal_service
        .compare_images(&req.image1_base64, &req.image2_base64)
        .await
    {
        Ok(response) => Json(ApiResponse::success(response, "图片比较成功")),
        Err(e) => Json(ApiResponse::<serde_json::Value>::error(500, &e)),
    }
}

pub async fn generate_image_tags(
    State(state): State<AppState>,
    Json(req): Json<ImageQualityRequest>,
) -> Json<ApiResponse<Vec<String>>> {
    match state
        .multimodal_service
        .generate_image_tags(&req.image_base64)
        .await
    {
        Ok(response) => Json(ApiResponse::success(response, "图片标签生成成功")),
        Err(e) => Json(ApiResponse::<Vec<String>>::error(500, &e)),
    }
}
