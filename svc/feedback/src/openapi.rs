//! TOPEMS Feedback（工单/意见反馈/评价）最小 OpenAPI 文档骨架
use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::handlers::create_feedback,
        crate::handlers::list_feedbacks,
        crate::handlers::get_feedback,
        crate::handlers::response_feedback,
        crate::handlers::delete_feedback,
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
