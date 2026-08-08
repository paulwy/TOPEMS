use axum::routing::{get, post};
use axum::Router;
use std::sync::Arc;

use crate::shared::AppState;
// 引入 AiFormAssistant trait 以便调用其方法（suggest_fields/enhance_text/validate_form/translate_term/assist）
use super::handlers::{
    ai_form_assist, ai_form_enhance, ai_form_suggest, ai_form_translate, ai_form_validate,
    enhance_for_form, get_form, list_forms, suggest_for_form,
};
use topems_shared::form_assistant::AiFormAssistant;

pub fn create_routes(state: AppState) -> Router<AppState> {
    Router::new()
        // 通用 AI 表单助手接口（原有，保持向后兼容）
        .route("/api/core/ai-form/assist", post(ai_form_assist))
        .route("/api/core/ai-form/suggest", post(ai_form_suggest))
        .route("/api/core/ai-form/enhance", post(ai_form_enhance))
        .route("/api/core/ai-form/validate", post(ai_form_validate))
        .route("/api/core/ai-form/translate", post(ai_form_translate))
        // 表单注册表 API（新增：30+ 核心表单）
        .route("/api/core/ai-form/forms", get(list_forms))
        .route("/api/core/ai-form/forms/{form_type}", get(get_form))
        .route(
            "/api/core/ai-form/forms/{form_type}/suggest",
            post(suggest_for_form),
        )
        .route(
            "/api/core/ai-form/forms/{form_type}/enhance",
            post(enhance_for_form),
        )
        .with_state(state)
}

pub async fn suggest_fields(
    ai_client: Arc<topems_shared_ai::ai_client::UnifiedAIClient>,
    form_type: &str,
    form_schema: &serde_json::Value,
    current_data: &serde_json::Value,
    target_field: Option<&str>,
) -> Result<Vec<topems_shared::form_assistant::FieldSuggestion>, String> {
    let assistant = topems_shared::form_assistant::AiFormAssistantClient::new(ai_client);

    assistant
        .suggest_fields(form_type, form_schema, current_data, target_field)
        .await
        .map_err(|e| e.to_string())
}

pub async fn enhance_text(
    ai_client: Arc<topems_shared_ai::ai_client::UnifiedAIClient>,
    text: &str,
    enhancement_type: &str,
) -> Result<String, String> {
    let assistant = topems_shared::form_assistant::AiFormAssistantClient::new(ai_client);

    assistant
        .enhance_text(text, enhancement_type)
        .await
        .map_err(|e| e.to_string())
}

pub async fn validate_form(
    ai_client: Arc<topems_shared_ai::ai_client::UnifiedAIClient>,
    form_type: &str,
    form_schema: &serde_json::Value,
    current_data: &serde_json::Value,
) -> Result<Vec<topems_shared::form_assistant::ValidationResult>, String> {
    let assistant = topems_shared::form_assistant::AiFormAssistantClient::new(ai_client);

    assistant
        .validate_form(form_type, form_schema, current_data)
        .await
        .map_err(|e| e.to_string())
}

pub async fn translate_term(
    ai_client: Arc<topems_shared_ai::ai_client::UnifiedAIClient>,
    term: &str,
    form_type: &str,
) -> Result<String, String> {
    let assistant = topems_shared::form_assistant::AiFormAssistantClient::new(ai_client);

    assistant
        .translate_term(term, form_type)
        .await
        .map_err(|e| e.to_string())
}

pub async fn assist(
    ai_client: Arc<topems_shared_ai::ai_client::UnifiedAIClient>,
    request: topems_shared::form_assistant::AiFormAssistantRequest,
) -> Result<topems_shared::form_assistant::AiFormAssistantResponse, String> {
    let assistant = topems_shared::form_assistant::AiFormAssistantClient::new(ai_client);

    assistant.assist(request).await.map_err(|e| e.to_string())
}

// ==================== 增强版服务函数（基于表单配置） ====================

/// 针对特定表单的字段建议（使用 FormConfig 增强）
pub async fn suggest_fields_for_form(
    ai_client: Arc<topems_shared_ai::ai_client::UnifiedAIClient>,
    form_type: &str,
    form_schema: &serde_json::Value,
    current_data: &serde_json::Value,
    target_field: Option<&str>,
) -> Result<Vec<topems_shared::form_assistant::FieldSuggestion>, String> {
    let assistant = topems_shared::form_assistant::AiFormAssistantClient::new(ai_client);

    assistant
        .suggest_fields_with_config(form_type, form_schema, current_data, target_field)
        .await
        .map_err(|e| e.to_string())
}

/// 针对特定表单的文本增强（使用 FormConfig 与业务域专属提示词）
pub async fn enhance_text_for_form(
    ai_client: Arc<topems_shared_ai::ai_client::UnifiedAIClient>,
    text: &str,
    enhancement_type: &str,
    form_type: &str,
) -> Result<String, String> {
    let assistant = topems_shared::form_assistant::AiFormAssistantClient::new(ai_client);

    assistant
        .enhance_text_for_form(text, enhancement_type, form_type)
        .await
        .map_err(|e| e.to_string())
}

// 静默未使用警告（service 层函数被 handlers 通过 super::service 引用）
#[allow(dead_code)]
const _: fn() = || {
    let _ = suggest_fields as fn(_, _, _, _, _) -> _;
    let _ = enhance_text as fn(_, _, _) -> _;
    let _ = validate_form as fn(_, _, _, _) -> _;
    let _ = translate_term as fn(_, _, _) -> _;
    let _ = assist as fn(_, _) -> _;
    let _ = suggest_fields_for_form as fn(_, _, _, _, _) -> _;
    let _ = enhance_text_for_form as fn(_, _, _, _) -> _;
};
