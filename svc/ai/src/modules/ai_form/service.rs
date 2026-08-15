use axum::routing::{get, post};
use axum::Router;

use super::handlers::{
    ai_form_assist, ai_form_enhance, ai_form_suggest, ai_form_translate, ai_form_validate,
    enhance_for_form, get_form, list_forms, suggest_for_form,
};
use crate::shared::AppState;
use topems_shared::form_assistant::AiFormAssistant;

pub fn create_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/api/core/ai-form/assist", post(ai_form_assist))
        .route("/api/core/ai-form/suggest", post(ai_form_suggest))
        .route("/api/core/ai-form/enhance", post(ai_form_enhance))
        .route("/api/core/ai-form/validate", post(ai_form_validate))
        .route("/api/core/ai-form/translate", post(ai_form_translate))
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
    assistant: &dyn AiFormAssistant,
    form_type: &str,
    form_schema: &serde_json::Value,
    current_data: &serde_json::Value,
    target_field: Option<&str>,
) -> Result<Vec<topems_shared::form_assistant::FieldSuggestion>, String> {
    assistant
        .suggest_fields(form_type, form_schema, current_data, target_field)
        .await
        .map_err(|e| e.to_string())
}

pub async fn enhance_text(
    assistant: &dyn AiFormAssistant,
    text: &str,
    enhancement_type: &str,
) -> Result<String, String> {
    assistant
        .enhance_text(text, enhancement_type)
        .await
        .map_err(|e| e.to_string())
}

pub async fn validate_form(
    assistant: &dyn AiFormAssistant,
    form_type: &str,
    form_schema: &serde_json::Value,
    current_data: &serde_json::Value,
) -> Result<Vec<topems_shared::form_assistant::ValidationResult>, String> {
    assistant
        .validate_form(form_type, form_schema, current_data)
        .await
        .map_err(|e| e.to_string())
}

pub async fn translate_term(
    assistant: &dyn AiFormAssistant,
    term: &str,
    form_type: &str,
) -> Result<String, String> {
    assistant
        .translate_term(term, form_type)
        .await
        .map_err(|e| e.to_string())
}

pub async fn assist(
    assistant: &dyn AiFormAssistant,
    request: topems_shared::form_assistant::AiFormAssistantRequest,
) -> Result<topems_shared::form_assistant::AiFormAssistantResponse, String> {
    assistant.assist(request).await.map_err(|e| e.to_string())
}

pub async fn suggest_fields_for_form(
    assistant: &dyn AiFormAssistant,
    form_type: &str,
    form_schema: &serde_json::Value,
    current_data: &serde_json::Value,
    target_field: Option<&str>,
) -> Result<Vec<topems_shared::form_assistant::FieldSuggestion>, String> {
    assistant
        .suggest_fields_with_config(form_type, form_schema, current_data, target_field)
        .await
        .map_err(|e| e.to_string())
}

pub async fn enhance_text_for_form(
    assistant: &dyn AiFormAssistant,
    text: &str,
    enhancement_type: &str,
    form_type: &str,
) -> Result<String, String> {
    assistant
        .enhance_text_for_form(text, enhancement_type, form_type)
        .await
        .map_err(|e| e.to_string())
}
