#![allow(dead_code, clippy::empty_loop)]

//! AI 前端兼容 OpenAPI 注解模块
//!
//! 为前端 API 调用中存在但 OpenAPI 规格中缺失的路径补充 utoipa 注解。
//! 这些函数仅用于生成 OpenAPI spec，运行期不会被调用。

// =============================================================================
// conversations
// =============================================================================

#[utoipa::path(
    get,
    path = "/api/ai/conversations",
    tag = "AI-Compat",
    responses((status = 200, description = "AI compatibility endpoint"))
)]
pub async fn compat_get_api_ai_conversations() {}

#[utoipa::path(
    get,
    path = "/api/ai/conversations/{id}",
    tag = "AI-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "AI compatibility endpoint"))
)]
pub async fn compat_get_api_ai_conversations_id() {}

#[utoipa::path(
    post,
    path = "/api/ai/conversations",
    tag = "AI-Compat",
    responses((status = 200, description = "AI compatibility endpoint"))
)]
pub async fn compat_post_api_ai_conversations() {}

#[utoipa::path(
    delete,
    path = "/api/ai/conversations/{id}",
    tag = "AI-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "AI compatibility endpoint"))
)]
pub async fn compat_delete_api_ai_conversations_id() {}

#[utoipa::path(
    put,
    path = "/api/ai/conversations/{id}",
    tag = "AI-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "AI compatibility endpoint"))
)]
pub async fn compat_put_api_ai_conversations_id() {}

#[utoipa::path(
    get,
    path = "/api/ai/conversations/{id}/messages",
    tag = "AI-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "AI compatibility endpoint"))
)]
pub async fn compat_get_api_ai_conversations_id_messages() {}

#[utoipa::path(
    post,
    path = "/api/ai/conversations/{conversationId}/messages/{messageId}/regenerate",
    tag = "AI-Compat",
    params(
        ("conversationId" = String, Path, description = "conversationId"),
        ("messageId" = String, Path, description = "messageId")
    ),
    responses((status = 200, description = "AI compatibility endpoint"))
)]
pub async fn compat_post_api_ai_conversations_conversationid_messages_messageid_regenerate() {}

// =============================================================================
// documents
// =============================================================================

#[utoipa::path(
    post,
    path = "/api/ai/documents/{id}/translate",
    tag = "AI-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "AI compatibility endpoint"))
)]
pub async fn compat_post_api_ai_documents_id_translate() {}

#[utoipa::path(
    post,
    path = "/api/ai/documents/{id}/ocr",
    tag = "AI-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "AI compatibility endpoint"))
)]
pub async fn compat_post_api_ai_documents_id_ocr() {}

#[utoipa::path(
    post,
    path = "/api/ai/documents/{id}/classify",
    tag = "AI-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "AI compatibility endpoint"))
)]
pub async fn compat_post_api_ai_documents_id_classify() {}

#[utoipa::path(
    post,
    path = "/api/ai/documents/{id}/entities",
    tag = "AI-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "AI compatibility endpoint"))
)]
pub async fn compat_post_api_ai_documents_id_entities() {}

// =============================================================================
// dashboard
// =============================================================================

#[utoipa::path(
    get,
    path = "/api/ai/dashboard/stats",
    tag = "AI-Compat",
    responses((status = 200, description = "AI compatibility endpoint"))
)]
pub async fn compat_get_api_ai_dashboard_stats() {}

#[utoipa::path(
    get,
    path = "/api/ai/dashboard/activity-trend",
    tag = "AI-Compat",
    responses((status = 200, description = "AI compatibility endpoint"))
)]
pub async fn compat_get_api_ai_dashboard_activity_trend() {}

#[utoipa::path(
    get,
    path = "/api/ai/dashboard/feature-usage",
    tag = "AI-Compat",
    responses((status = 200, description = "AI compatibility endpoint"))
)]
pub async fn compat_get_api_ai_dashboard_feature_usage() {}

// =============================================================================
// models
// =============================================================================

#[utoipa::path(
    get,
    path = "/api/ai/models",
    tag = "AI-Compat",
    responses((status = 200, description = "AI compatibility endpoint"))
)]
pub async fn compat_get_api_ai_models() {}

#[utoipa::path(
    get,
    path = "/api/ai/models/usage",
    tag = "AI-Compat",
    responses((status = 200, description = "AI compatibility endpoint"))
)]
pub async fn compat_get_api_ai_models_usage() {}

// =============================================================================
// prompts
// =============================================================================

#[utoipa::path(
    get,
    path = "/api/ai/prompts/templates",
    tag = "AI-Compat",
    responses((status = 200, description = "AI compatibility endpoint"))
)]
pub async fn compat_get_api_ai_prompts_templates() {}

#[utoipa::path(
    get,
    path = "/api/ai/prompts/templates/{id}",
    tag = "AI-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "AI compatibility endpoint"))
)]
pub async fn compat_get_api_ai_prompts_templates_id() {}

#[utoipa::path(
    post,
    path = "/api/ai/prompts/templates",
    tag = "AI-Compat",
    responses((status = 200, description = "AI compatibility endpoint"))
)]
pub async fn compat_post_api_ai_prompts_templates() {}

#[utoipa::path(
    put,
    path = "/api/ai/prompts/templates/{id}",
    tag = "AI-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "AI compatibility endpoint"))
)]
pub async fn compat_put_api_ai_prompts_templates_id() {}

#[utoipa::path(
    delete,
    path = "/api/ai/prompts/templates/{id}",
    tag = "AI-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "AI compatibility endpoint"))
)]
pub async fn compat_delete_api_ai_prompts_templates_id() {}

#[utoipa::path(
    post,
    path = "/api/ai/prompts/templates/{id}/favorite",
    tag = "AI-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "AI compatibility endpoint"))
)]
pub async fn compat_post_api_ai_prompts_templates_id_favorite() {}

#[utoipa::path(
    get,
    path = "/api/ai/prompts/categories",
    tag = "AI-Compat",
    responses((status = 200, description = "AI compatibility endpoint"))
)]
pub async fn compat_get_api_ai_prompts_categories() {}

#[utoipa::path(
    post,
    path = "/api/ai/prompts/templates/{id}/use",
    tag = "AI-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "AI compatibility endpoint"))
)]
pub async fn compat_post_api_ai_prompts_templates_id_use() {}

// =============================================================================
// recommendations
// =============================================================================

#[utoipa::path(
    post,
    path = "/api/ai/recommendations",
    tag = "AI-Compat",
    responses((status = 200, description = "AI compatibility endpoint"))
)]
pub async fn compat_post_api_ai_recommendations() {}

#[utoipa::path(
    get,
    path = "/api/ai/recommendations/personalized",
    tag = "AI-Compat",
    responses((status = 200, description = "AI compatibility endpoint"))
)]
pub async fn compat_get_api_ai_recommendations_personalized() {}

#[utoipa::path(
    post,
    path = "/api/ai/recommendations/feedback",
    tag = "AI-Compat",
    responses((status = 200, description = "AI compatibility endpoint"))
)]
pub async fn compat_post_api_ai_recommendations_feedback() {}

// =============================================================================
// vector
// =============================================================================

#[utoipa::path(
    get,
    path = "/api/ai/vector/collections",
    tag = "AI-Compat",
    responses((status = 200, description = "AI compatibility endpoint"))
)]
pub async fn compat_get_api_ai_vector_collections() {}

#[utoipa::path(
    post,
    path = "/api/ai/vector/collections",
    tag = "AI-Compat",
    responses((status = 200, description = "AI compatibility endpoint"))
)]
pub async fn compat_post_api_ai_vector_collections() {}

#[utoipa::path(
    delete,
    path = "/api/ai/vector/collections/{id}",
    tag = "AI-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "AI compatibility endpoint"))
)]
pub async fn compat_delete_api_ai_vector_collections_id() {}

#[utoipa::path(
    post,
    path = "/api/ai/vector/index/{documentId}",
    tag = "AI-Compat",
    params(("documentId" = String, Path, description = "documentId")),
    responses((status = 200, description = "AI compatibility endpoint"))
)]
pub async fn compat_post_api_ai_vector_index_documentid() {}

// =============================================================================
// health & model config
// =============================================================================

#[utoipa::path(
    get,
    path = "/api/ai/health",
    tag = "AI-Compat",
    responses((status = 200, description = "AI compatibility endpoint"))
)]
pub async fn compat_get_api_ai_health() {}

#[utoipa::path(
    get,
    path = "/api/ai/models/{modelId}/config",
    tag = "AI-Compat",
    params(("modelId" = String, Path, description = "modelId")),
    responses((status = 200, description = "AI compatibility endpoint"))
)]
pub async fn compat_get_api_ai_models_modelid_config() {}

#[utoipa::path(
    put,
    path = "/api/ai/models/{modelId}/config",
    tag = "AI-Compat",
    params(("modelId" = String, Path, description = "modelId")),
    responses((status = 200, description = "AI compatibility endpoint"))
)]
pub async fn compat_put_api_ai_models_modelid_config() {}
