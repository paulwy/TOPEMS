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

impl MultimodalApi {
    pub async fn analyze_image(
        State(state): State<AppState>,
        Json(req): Json<ImageAnalysisRequest>,
    ) -> Json<ApiResponse<ImageAnalysisResponse>> {
        match state.multimodal_service.analyze_image(req).await {
            Ok(response) => Json(ApiResponse::success(response, "图片分析成功")),
            Err(e) => Json(ApiResponse::<ImageAnalysisResponse>::error(500, &e)),
        }
    }

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

    pub async fn analyze_video(
        State(state): State<AppState>,
        Json(req): Json<VideoAnalysisRequest>,
    ) -> Json<ApiResponse<VideoAnalysisResponse>> {
        match state.multimodal_service.analyze_video(req).await {
            Ok(response) => Json(ApiResponse::success(response, "视频分析成功")),
            Err(e) => Json(ApiResponse::<VideoAnalysisResponse>::error(500, &e)),
        }
    }

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
}
