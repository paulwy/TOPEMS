//! TOPEMS-AI OpenAPI 文档聚合
//!
//! 汇总所有 HTTP handler 的路径信息，生成统一的 OpenAPI 规范。
//!
//! 注意：utoipa 4.x 的 `#[utoipa::path]` 宏会生成一个 struct，无法放置在
//! `impl` 块内部。因此对于 `XxxApi::method` 形式的关联函数 handler，
//! 在此处使用占位函数承载 `#[utoipa::path]` 注解（仅用于生成 OpenAPI
//! spec，运行期不会被调用）。自由函数 handler 的注解保留在各自模块中。

use crate::handlers::{ai_handlers, connector_handlers, health};
use crate::modules::{agent, ai_plugin};
use utoipa::OpenApi;

// =============================================================================
// 占位函数：为 impl 块中的关联函数 handler 承载 utoipa::path 注解
// =============================================================================

// --- AnalysisApi ---
#[utoipa::path(
    post,
    path = "/api/ai/analysis/sentiment",
    request_body = crate::modules::models::SentimentAnalysisRequest,
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _analysis_sentiment() {}

#[utoipa::path(
    post,
    path = "/api/ai/analysis/classify",
    request_body = crate::modules::models::ClassifyTextRequest,
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _analysis_classify() {}

#[utoipa::path(
    post,
    path = "/api/ai/analysis/entities",
    request_body = crate::modules::models::ExtractEntitiesRequest,
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _analysis_entities() {}

#[utoipa::path(
    post,
    path = "/api/ai/analysis/keywords",
    request_body = crate::modules::models::ExtractKeywordsRequest,
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _analysis_keywords() {}

#[utoipa::path(
    post,
    path = "/api/ai/analysis/history",
    request_body = crate::modules::models::AnalysisHistoryRequest,
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _analysis_history() {}

// --- CodeAssistantApi ---
#[utoipa::path(
    post,
    path = "/api/ai/code/generate",
    request_body = crate::modules::code_assistant::CodeGenerateRequest,
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _code_generate() {}

#[utoipa::path(
    post,
    path = "/api/ai/code/explain",
    request_body = crate::modules::code_assistant::CodeExplainRequest,
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _code_explain() {}

#[utoipa::path(
    post,
    path = "/api/ai/code/fix",
    request_body = crate::modules::code_assistant::CodeFixRequest,
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _code_fix() {}

#[utoipa::path(
    post,
    path = "/api/ai/code/optimize",
    request_body = crate::modules::code_assistant::CodeOptimizeRequest,
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _code_optimize() {}

#[utoipa::path(
    post,
    path = "/api/ai/code/review",
    request_body = crate::modules::code_assistant::CodeReviewRequest,
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _code_review() {}

// --- DocumentApi ---
#[utoipa::path(
    post,
    path = "/api/ai/documents/upload",
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _document_upload() {}

#[utoipa::path(
    post,
    path = "/api/ai/documents/{id}/process",
    request_body = crate::modules::models::ProcessDocumentRequest,
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _document_process() {}

#[utoipa::path(
    get,
    path = "/api/ai/documents/{id}",
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _document_get() {}

#[utoipa::path(
    delete,
    path = "/api/ai/documents/{id}",
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _document_delete() {}

#[utoipa::path(
    get,
    path = "/api/ai/documents",
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _document_list() {}

#[utoipa::path(
    post,
    path = "/api/ai/documents",
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _document_create() {}

#[utoipa::path(
    put,
    path = "/api/ai/documents/{id}",
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _document_update() {}

#[utoipa::path(
    post,
    path = "/api/ai/documents/{id}/extract",
    request_body = crate::modules::models::ExtractDocumentRequest,
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _document_extract() {}

#[utoipa::path(
    post,
    path = "/api/ai/documents/vectorize-from-file",
    request_body = crate::modules::models::VectorizeFromFileRequest,
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _document_vectorize_from_file() {}

#[utoipa::path(
    post,
    path = "/api/ai/documents/{id}/summarize",
    request_body = crate::modules::models::SummarizeDocumentRequest,
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _document_summarize() {}

#[utoipa::path(
    post,
    path = "/api/ai/documents/{id}/key-points",
    request_body = crate::modules::models::ExtractKeyPointsRequest,
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _document_key_points() {}

#[utoipa::path(
    post,
    path = "/api/ai/documents/qa",
    request_body = crate::modules::models::DocumentQAQuestionRequest,
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _document_qa() {}

// --- EmbeddingApi ---
#[utoipa::path(
    post,
    path = "/api/ai/embedding/generate",
    request_body = crate::modules::embedding::EmbeddingRequest,
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _embedding_generate() {}

// --- MultimodalApi ---
#[utoipa::path(
    post,
    path = "/api/ai/multimodal/image/analyze",
    request_body = crate::services::multimodal::ImageAnalysisRequest,
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _multimodal_image_analyze() {}

#[utoipa::path(
    post,
    path = "/api/ai/multimodal/image/caption",
    request_body = crate::services::multimodal::ImageAnalysisRequest,
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _multimodal_image_caption() {}

#[utoipa::path(
    post,
    path = "/api/ai/multimodal/image/objects",
    request_body = crate::services::multimodal::ImageAnalysisRequest,
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _multimodal_image_objects() {}

#[utoipa::path(
    post,
    path = "/api/ai/multimodal/image/text",
    request_body = crate::services::multimodal::ImageAnalysisRequest,
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _multimodal_image_text() {}

#[utoipa::path(
    post,
    path = "/api/ai/multimodal/image/describe",
    request_body = crate::services::multimodal::ImageAnalysisRequest,
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _multimodal_image_describe() {}

#[utoipa::path(
    post,
    path = "/api/ai/multimodal/video/analyze",
    request_body = crate::services::multimodal::VideoAnalysisRequest,
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _multimodal_video_analyze() {}

#[utoipa::path(
    post,
    path = "/api/ai/multimodal/video/summary",
    request_body = crate::services::multimodal::VideoAnalysisRequest,
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _multimodal_video_summary() {}

// --- QaApi ---
#[utoipa::path(
    post,
    path = "/api/ai/qa/ask",
    request_body = crate::modules::models::AskRequest,
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _qa_ask() {}

#[utoipa::path(
    post,
    path = "/api/ai/qa/ask-with-context",
    request_body = crate::modules::models::AskWithContextRequest,
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _qa_ask_with_context() {}

#[utoipa::path(
    post,
    path = "/api/ai/qa/ask-structured",
    request_body = crate::modules::qa::AskStructuredRequest,
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _qa_ask_structured() {}

#[utoipa::path(
    post,
    path = "/api/ai/qa/ask-conversation",
    request_body = crate::modules::qa::AskWithConversationRequest,
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _qa_ask_conversation() {}

#[utoipa::path(
    post,
    path = "/api/ai/qa/classify",
    request_body = crate::modules::qa::ClassifyRequest,
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _qa_classify() {}

#[utoipa::path(
    get,
    path = "/api/ai/qa/history",
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _qa_history() {}

#[utoipa::path(
    delete,
    path = "/api/ai/qa/history/{id}",
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _qa_delete_history() {}

#[utoipa::path(
    post,
    path = "/api/ai/qa/history/batch-delete",
    request_body = crate::modules::qa::BatchDeleteRequest,
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _qa_batch_delete_history() {}

#[utoipa::path(
    post,
    path = "/api/ai/qa/feedback",
    request_body = crate::modules::models::FeedbackRequest,
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _qa_feedback() {}

// --- RecommendationApi ---
#[utoipa::path(
    post,
    path = "/api/ai/recommend",
    request_body = crate::services::recommendation::RecommendationRequest,
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _recommend() {}

#[utoipa::path(
    post,
    path = "/api/ai/profile/get",
    request_body = serde_json::Value,
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _profile_get() {}

#[utoipa::path(
    post,
    path = "/api/ai/profile/update",
    request_body = serde_json::Value,
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _profile_update() {}

#[utoipa::path(
    post,
    path = "/api/ai/recommend/documents",
    request_body = serde_json::Value,
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _recommend_documents() {}

#[utoipa::path(
    post,
    path = "/api/ai/recommend/opportunities",
    request_body = serde_json::Value,
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _recommend_opportunities() {}

#[utoipa::path(
    post,
    path = "/api/ai/recommend/knowledge",
    request_body = serde_json::Value,
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _recommend_knowledge() {}

// --- VectorApi ---
#[utoipa::path(
    post,
    path = "/api/ai/vectors/store",
    request_body = crate::modules::models::StoreVectorRequest,
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _vector_store() {}

#[utoipa::path(
    post,
    path = "/api/ai/vectors/search",
    request_body = crate::modules::models::VectorSearchRequest,
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _vector_search() {}

#[utoipa::path(
    get,
    path = "/api/ai/vectors/{id}",
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _vector_get() {}

#[utoipa::path(
    delete,
    path = "/api/ai/vectors/{id}",
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _vector_delete() {}

#[utoipa::path(
    post,
    path = "/api/ai/vectors/batch-store",
    request_body = crate::modules::models::BatchStoreVectorsRequest,
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _vector_batch_store() {}

#[utoipa::path(
    post,
    path = "/api/ai/vectors/hybrid-search",
    request_body = crate::modules::models::HybridSearchRequest,
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _vector_hybrid_search() {}

#[utoipa::path(
    get,
    path = "/api/ai/vectors/stats",
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _vector_stats() {}

#[utoipa::path(
    post,
    path = "/api/ai/vectors/clear",
    tag = "ai",
    responses((status = 200, description = "OK")),
)]
fn _vector_clear() {}

// =============================================================================
// ApiDoc: OpenApi 派生结构体
// =============================================================================

#[derive(OpenApi)]
#[openapi(
    info(
        title = "TOPEMS-AI API",
        version = "1.0.0",
        description = "TOPEMS 人工智能服务 API - 智能问答、文档处理、向量检索、多模态分析",
    ),
    servers(
        (url = "http://localhost:8013", description = "本地开发环境"),
    ),
    paths(
        // health (自由函数，注解在 handlers/health.rs)
        health::home,
        health::health,
        health::health_check_detailed,
        // ai_handlers (自由函数，注解在 handlers/ai_handlers.rs)
        ai_handlers::generate,
        ai_handlers::validate,
        ai_handlers::complete,
        ai_handlers::summarize,
        ai_handlers::list_templates,
        ai_handlers::chat,
        ai_handlers::ai_search,
        ai_handlers::report_assistant,
        ai_handlers::flow_assistant,
        ai_handlers::anomaly_predict,
        ai_handlers::knowledge_ask,
        // ai_plugin (自由函数，注解在 modules/ai_plugin.rs)
        ai_plugin::get_plugin_info,
        ai_plugin::plugin_health_check,
        // agent (自由函数，注解在 modules/agent.rs)
        agent::agent_run,
        agent::list_agent_tools,
        // connectors (自由函数，注解在 handlers/connector_handlers.rs)
        connector_handlers::list_connectors,
        connector_handlers::get_connector,
        connector_handlers::create_connector,
        connector_handlers::update_connector,
        connector_handlers::delete_connector,
        connector_handlers::test_connector,
        connector_handlers::query_data,
        // === 以下为 impl 块中的关联函数 handler，通过占位函数注册 ===
        // analysis
        _analysis_sentiment,
        _analysis_classify,
        _analysis_entities,
        _analysis_keywords,
        _analysis_history,
        // code_assistant
        _code_generate,
        _code_explain,
        _code_fix,
        _code_optimize,
        _code_review,
        // document
        _document_upload,
        _document_process,
        _document_get,
        _document_delete,
        _document_update,
        _document_list,
        _document_create,
        _document_extract,
        _document_vectorize_from_file,
        _document_summarize,
        _document_key_points,
        _document_qa,
        // embedding
        _embedding_generate,
        // multimodal
        _multimodal_image_analyze,
        _multimodal_image_caption,
        _multimodal_image_objects,
        _multimodal_image_text,
        _multimodal_image_describe,
        _multimodal_video_analyze,
        _multimodal_video_summary,
        // qa
        _qa_ask,
        _qa_ask_with_context,
        _qa_ask_structured,
        _qa_ask_conversation,
        _qa_classify,
        _qa_history,
        _qa_delete_history,
        _qa_batch_delete_history,
        _qa_feedback,
        // recommendation
        _recommend,
        _profile_get,
        _profile_update,
        _recommend_documents,
        _recommend_opportunities,
        _recommend_knowledge,
        // vector
        _vector_store,
        _vector_search,
        _vector_get,
        _vector_delete,
        _vector_batch_store,
        _vector_hybrid_search,
        _vector_stats,
        _vector_clear
    ),
)]
pub struct ApiDoc;
