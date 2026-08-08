use axum::extract::{Path, State};
use axum::Json;
use std::sync::Arc;

use crate::shared::AppState;
use topems_shared_core::response::api_error;
use topems_shared_core::response::api_success;
use topems_shared_core::response::ApiResponse;
use topems_shared_ai::ai_client::UnifiedAIClient;

use super::models::{
    AiFormAssistRequest, AiFormConfigResponse, AiFormEnhanceForFormRequest, AiFormEnhanceRequest,
    AiFormEnhanceResponse, AiFormListResponse, AiFormSuggestForFormRequest, AiFormSuggestRequest,
    AiFormSuggestResponse, AiFormTranslateRequest, AiFormTranslateResponse, AiFormValidateRequest,
    AiFormValidateResponse, FieldSuggestion, FormSummary, ValidationResult,
};
use super::service::{
    assist, enhance_text, enhance_text_for_form, suggest_fields, suggest_fields_for_form,
    translate_term, validate_form,
};

fn create_ai_client() -> UnifiedAIClient {
    let config = AIModelConfig {
        provider: AIProviderType::Ollama,
        model_name: "qwen2.5:7b-instruct".to_string(),
        base_url: "http://localhost:11434/v1".to_string(),
        ..Default::default()
    };
    create_client(config)
}

pub async fn ai_form_assist(
    State(_state): State<AppState>,
    Json(req): Json<AiFormAssistRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let ai_client = Arc::new(create_ai_client());

    let action = match req.action.as_str() {
        "suggest" => topems_shared::form_assistant::FormAssistantAction::SuggestFields,
        "enhance" => {
            let text = req
                .current_data
                .get("text")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            topems_shared::form_assistant::FormAssistantAction::EnhanceText(text.to_string())
        }
        "validate" => topems_shared::form_assistant::FormAssistantAction::ValidateForm,
        "translate" => {
            let term = req
                .current_data
                .get("term")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            topems_shared::form_assistant::FormAssistantAction::TranslateTerm(term.to_string())
        }
        _ => {
            return Json(api_error(400, "无效的 action 参数"));
        }
    };

    let assistant_request = topems_shared::form_assistant::AiFormAssistantRequest {
        form_type: req.form_type,
        form_schema: req.form_schema,
        current_data: req.current_data,
        action,
        target_field: req.target_field,
    };

    match assist(ai_client, assistant_request).await {
        Ok(response) => {
            let json_response = serde_json::json!({
                "suggestions": response.suggestions,
                "enhanced_text": response.enhanced_text,
                "validation_results": response.validation_results,
                "translated_text": response.translated_text,
            });
            Json(api_success(json_response))
        }
        Err(e) => Json(api_error(500, &format!("AI 服务调用失败: {}", e))),
    }
}

pub async fn ai_form_suggest(
    State(_state): State<AppState>,
    Json(req): Json<AiFormSuggestRequest>,
) -> Json<ApiResponse<AiFormSuggestResponse>> {
    let ai_client = Arc::new(create_ai_client());

    match suggest_fields(
        ai_client,
        &req.form_type,
        &req.form_schema,
        &req.current_data,
        req.target_field.as_deref(),
    )
    .await
    {
        Ok(suggestions) => {
            let converted: Vec<FieldSuggestion> =
                suggestions.into_iter().map(FieldSuggestion::from).collect();
            Json(api_success(AiFormSuggestResponse {
                suggestions: converted,
            }))
        }
        Err(e) => Json(api_error(500, &format!("AI 服务调用失败: {}", e))),
    }
}

pub async fn ai_form_enhance(
    State(_state): State<AppState>,
    Json(req): Json<AiFormEnhanceRequest>,
) -> Json<ApiResponse<AiFormEnhanceResponse>> {
    if req.text.is_empty() {
        return Json(api_error(400, "文本内容不能为空"));
    }

    let ai_client = Arc::new(create_ai_client());

    match enhance_text(ai_client, &req.text, &req.enhancement_type).await {
        Ok(enhanced) => Json(api_success(AiFormEnhanceResponse {
            enhanced_text: enhanced,
        })),
        Err(e) => Json(api_error(500, &format!("AI 服务调用失败: {}", e))),
    }
}

pub async fn ai_form_validate(
    State(_state): State<AppState>,
    Json(req): Json<AiFormValidateRequest>,
) -> Json<ApiResponse<AiFormValidateResponse>> {
    let ai_client = Arc::new(create_ai_client());

    match validate_form(
        ai_client,
        &req.form_type,
        &req.form_schema,
        &req.current_data,
    )
    .await
    {
        Ok(results) => {
            let converted: Vec<ValidationResult> =
                results.into_iter().map(ValidationResult::from).collect();
            let is_valid = converted.iter().all(|r| r.is_valid);
            Json(api_success(AiFormValidateResponse {
                validations: converted,
                is_valid,
            }))
        }
        Err(e) => Json(api_error(500, &format!("AI 服务调用失败: {}", e))),
    }
}

pub async fn ai_form_translate(
    State(_state): State<AppState>,
    Json(req): Json<AiFormTranslateRequest>,
) -> Json<ApiResponse<AiFormTranslateResponse>> {
    if req.term.is_empty() {
        return Json(api_error(400, "术语不能为空"));
    }

    let ai_client = Arc::new(create_ai_client());

    match translate_term(ai_client, &req.term, &req.form_type).await {
        Ok(translated) => Json(api_success(AiFormTranslateResponse {
            translated_text: translated,
        })),
        Err(e) => Json(api_error(500, &format!("AI 服务调用失败: {}", e))),
    }
}

// ==================== 表单注册表 API ====================

/// GET /api/core/ai-form/forms
///
/// 列出所有支持的表单类型（30+ 核心表单）。
pub async fn list_forms(State(_state): State<AppState>) -> Json<ApiResponse<AiFormListResponse>> {
    let registry = topems_shared::form_assistant::default_registry();
    let forms: Vec<FormSummary> = registry.list().into_iter().map(FormSummary::from).collect();
    let domains: Vec<String> = registry
        .domains()
        .into_iter()
        .map(|d| d.display_name().to_string())
        .collect();

    Json(api_success(AiFormListResponse {
        total: forms.len(),
        forms,
        domains,
    }))
}

/// GET /api/core/ai-form/forms/{form_type}
///
/// 获取指定表单的详细配置（字段、示例、验证规则、业务术语）。
pub async fn get_form(
    State(_state): State<AppState>,
    Path(form_type): Path<String>,
) -> Json<ApiResponse<AiFormConfigResponse>> {
    let registry = topems_shared::form_assistant::default_registry();
    match registry.get(&form_type) {
        Some(cfg) => Json(api_success(AiFormConfigResponse::from(cfg))),
        None => Json(api_error(
            404,
            &format!(
                "未找到表单类型「{}」，请调用 GET /api/core/ai-form/forms 查看支持的表单列表",
                form_type
            ),
        )),
    }
}

/// POST /api/core/ai-form/forms/{form_type}/suggest
///
/// 针对特定表单类型提供 AI 字段建议（基于表单配置增强）。
pub async fn suggest_for_form(
    State(_state): State<AppState>,
    Path(form_type): Path<String>,
    Json(req): Json<AiFormSuggestForFormRequest>,
) -> Json<ApiResponse<AiFormSuggestResponse>> {
    // 校验表单类型是否存在
    let registry = topems_shared::form_assistant::default_registry();
    if !registry.contains(&form_type) {
        return Json(api_error(
            404,
            &format!(
                "未找到表单类型「{}」，请调用 GET /api/core/ai-form/forms 查看支持的表单列表",
                form_type
            ),
        ));
    }
    let cfg = registry
        .get(&form_type)
        .expect("form config should exist after contains() check");
    if !cfg.supports("suggest") {
        return Json(api_error(
            400,
            &format!("表单「{}」未启用字段建议功能", cfg.display_name),
        ));
    }

    let ai_client = Arc::new(create_ai_client());

    match suggest_fields_for_form(
        ai_client,
        &form_type,
        &req.form_schema,
        &req.current_data,
        req.target_field.as_deref(),
    )
    .await
    {
        Ok(suggestions) => {
            let converted: Vec<FieldSuggestion> =
                suggestions.into_iter().map(FieldSuggestion::from).collect();
            Json(api_success(AiFormSuggestResponse {
                suggestions: converted,
            }))
        }
        Err(e) => Json(api_error(500, &format!("AI 服务调用失败: {}", e))),
    }
}

/// POST /api/core/ai-form/forms/{form_type}/enhance
///
/// 针对特定表单类型的文本增强。
/// 当 enhancement_type 为 "domain_specific" 时，使用业务域专属提示词。
pub async fn enhance_for_form(
    State(_state): State<AppState>,
    Path(form_type): Path<String>,
    Json(req): Json<AiFormEnhanceForFormRequest>,
) -> Json<ApiResponse<AiFormEnhanceResponse>> {
    if req.text.is_empty() {
        return Json(api_error(400, "文本内容不能为空"));
    }

    // 校验表单类型是否存在
    let registry = topems_shared::form_assistant::default_registry();
    if !registry.contains(&form_type) {
        return Json(api_error(
            404,
            &format!(
                "未找到表单类型「{}」，请调用 GET /api/core/ai-form/forms 查看支持的表单列表",
                form_type
            ),
        ));
    }
    let cfg = registry
        .get(&form_type)
        .expect("form config should exist after contains() check");
    if !cfg.supports("enhance") {
        return Json(api_error(
            400,
            &format!("表单「{}」未启用文本增强功能", cfg.display_name),
        ));
    }

    let ai_client = Arc::new(create_ai_client());

    match enhance_text_for_form(ai_client, &req.text, &req.enhancement_type, &form_type).await {
        Ok(enhanced) => Json(api_success(AiFormEnhanceResponse {
            enhanced_text: enhanced,
        })),
        Err(e) => Json(api_error(500, &format!("AI 服务调用失败: {}", e))),
    }
}
