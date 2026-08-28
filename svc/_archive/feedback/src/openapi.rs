//! TOPEMS Feedback（工单/意见反馈/评价）最小 OpenAPI 文档骨架
use utoipa::OpenApi;

use crate::handlers::{CreateFeedbackRequest, Feedback, ResponseFeedbackRequest};

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::handlers::create_feedback,
        crate::handlers::list_feedbacks,
        crate::handlers::get_feedback,
        crate::handlers::response_feedback,
        crate::handlers::delete_feedback,
    ),
    components(
        schemas(
            Feedback,
            CreateFeedbackRequest,
            ResponseFeedbackRequest,
        )
    ),
    tags(
        (name = "feedback_ticket", description = "反馈工单 API"),
        (name = "rating",          description = "满意度评分 API"),
        (name = "suggestion",      description = "产品建议 API")
    ),
    info(
        title       = "TOPEMS Feedback API",
        version     = "1.0.0",
        description = "反馈服务 API - 包含工单、满意度评分、产品建议等能力"
    )
)]
pub struct FeedbackApiDoc;

#[cfg(test)]
mod tests {
    use super::*;
    use utoipa::OpenApi;

    #[test]
    fn extract_openapi_spec() {
        let spec = FeedbackApiDoc::openapi();
        let json = serde_json::to_string_pretty(&spec).expect("Failed to serialize OpenAPI spec");
        std::fs::write("/tmp/topems-feedback-openapi.json", json).expect("Failed to write spec");
        tracing::info!("OpenAPI spec written to /tmp/topems-feedback-openapi.json");
    }
}
