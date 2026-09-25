use axum::extract::{Path, State};
use axum::Json;

use crate::shared::AppState;
use topems_shared::form_assistant::{AiFormAssistantClient, FormAssistantAction};
use topems_shared::ApiResponse;
use topems_shared_ai::ai_client::{create_client, AIModelConfig, AIProviderType};
use topems_shared_core::response::{api_error, api_success};

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

fn create_ai_client() -> topems_shared_ai::ai_client::UnifiedAIClient {
    let config = AIModelConfig {
        provider: AIProviderType::Ollama,
        model_name: "qwen2.5:7b-instruct".to_string(),
        base_url: "http://localhost:11434/v1".to_string(),
        ..Default::default()
    };
    create_client(config)
}

fn default_assistant() -> AiFormAssistantClient {
    AiFormAssistantClient::new(std::sync::Arc::new(create_ai_client()))
}

pub fn parse_action(
    action: &str,
    current_data: &serde_json::Value,
) -> Result<FormAssistantAction, &'static str> {
    match action {
        "suggest" => Ok(FormAssistantAction::SuggestFields),
        "enhance" => {
            let text = current_data
                .get("text")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            Ok(FormAssistantAction::EnhanceText(text.to_string()))
        }
        "validate" => Ok(FormAssistantAction::ValidateForm),
        "translate" => {
            let term = current_data
                .get("term")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            Ok(FormAssistantAction::TranslateTerm(term.to_string()))
        }
        _ => Err("无效的 action 参数"),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/api/core/ai-form/assist",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn ai_form_assist(
    State(_state): State<AppState>,
    Json(req): Json<AiFormAssistRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let assistant = default_assistant();

    let action = match parse_action(&req.action, &req.current_data) {
        Ok(a) => a,
        Err(msg) => return Json(api_error(400, msg)),
    };

    let assistant_request = topems_shared::form_assistant::AiFormAssistantRequest {
        form_type: req.form_type,
        form_schema: req.form_schema,
        current_data: req.current_data,
        action,
        target_field: req.target_field,
    };

    match assist(&assistant, assistant_request).await {
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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/api/core/ai-form/suggest",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn ai_form_suggest(
    State(_state): State<AppState>,
    Json(req): Json<AiFormSuggestRequest>,
) -> Json<ApiResponse<AiFormSuggestResponse>> {
    let assistant = default_assistant();

    match suggest_fields(
        &assistant,
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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/api/core/ai-form/enhance",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn ai_form_enhance(
    State(_state): State<AppState>,
    Json(req): Json<AiFormEnhanceRequest>,
) -> Json<ApiResponse<AiFormEnhanceResponse>> {
    if req.text.is_empty() {
        return Json(api_error(400, "文本内容不能为空"));
    }

    let assistant = default_assistant();

    match enhance_text(&assistant, &req.text, &req.enhancement_type).await {
        Ok(enhanced) => Json(api_success(AiFormEnhanceResponse {
            enhanced_text: enhanced,
        })),
        Err(e) => Json(api_error(500, &format!("AI 服务调用失败: {}", e))),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/api/core/ai-form/validate",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn ai_form_validate(
    State(_state): State<AppState>,
    Json(req): Json<AiFormValidateRequest>,
) -> Json<ApiResponse<AiFormValidateResponse>> {
    let assistant = default_assistant();

    match validate_form(
        &assistant,
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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/api/core/ai-form/translate",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn ai_form_translate(
    State(_state): State<AppState>,
    Json(req): Json<AiFormTranslateRequest>,
) -> Json<ApiResponse<AiFormTranslateResponse>> {
    if req.term.is_empty() {
        return Json(api_error(400, "术语不能为空"));
    }

    let assistant = default_assistant();

    match translate_term(&assistant, &req.term, &req.form_type).await {
        Ok(translated) => Json(api_success(AiFormTranslateResponse {
            translated_text: translated,
        })),
        Err(e) => Json(api_error(500, &format!("AI 服务调用失败: {}", e))),
    }
}

// ==================== 表单注册表 API ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ai:read"])),
    path = "/api/core/ai-form/forms",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ai:read"])),
    path = "/api/core/ai-form/forms/{form_type}",
    params(
        ("form_type" = String, Path, description = "form_type")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/api/core/ai-form/forms/{form_type}/suggest",
    params(
        ("form_type" = String, Path, description = "form_type")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn suggest_for_form(
    State(_state): State<AppState>,
    Path(form_type): Path<String>,
    Json(req): Json<AiFormSuggestForFormRequest>,
) -> Json<ApiResponse<AiFormSuggestResponse>> {
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
    let cfg = registry.get(&form_type).unwrap();
    if !cfg.supports("suggest") {
        return Json(api_error(
            400,
            &format!("表单「{}」未启用字段建议功能", cfg.display_name),
        ));
    }

    let assistant = default_assistant();

    match suggest_fields_for_form(
        &assistant,
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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/api/core/ai-form/forms/{form_type}/enhance",
    params(
        ("form_type" = String, Path, description = "form_type")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "ai"
)]
pub async fn enhance_for_form(
    State(_state): State<AppState>,
    Path(form_type): Path<String>,
    Json(req): Json<AiFormEnhanceForFormRequest>,
) -> Json<ApiResponse<AiFormEnhanceResponse>> {
    if req.text.is_empty() {
        return Json(api_error(400, "文本内容不能为空"));
    }

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
    let cfg = registry.get(&form_type).unwrap();
    if !cfg.supports("enhance") {
        return Json(api_error(
            400,
            &format!("表单「{}」未启用文本增强功能", cfg.display_name),
        ));
    }

    let assistant = default_assistant();

    match enhance_text_for_form(&assistant, &req.text, &req.enhancement_type, &form_type).await {
        Ok(enhanced) => Json(api_success(AiFormEnhanceResponse {
            enhanced_text: enhanced,
        })),
        Err(e) => Json(api_error(500, &format!("AI 服务调用失败: {}", e))),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use async_trait::async_trait;
    use topems_shared::form_assistant::{
        AiFormAssistant, AiFormAssistantRequest, AiFormAssistantResponse, ValidationResult,
    };

    #[derive(Default, Clone)]
    struct MockAssistant;

    #[async_trait]
    impl AiFormAssistant for MockAssistant {
        async fn suggest_fields(
            &self,
            _form_type: &str,
            _form_schema: &serde_json::Value,
            _current_data: &serde_json::Value,
            _target_field: Option<&str>,
        ) -> Result<
            Vec<topems_shared::form_assistant::FieldSuggestion>,
            topems_shared_ai::ai_client::AIClientError,
        > {
            Ok(vec![topems_shared::form_assistant::FieldSuggestion::new(
                "f1", "v1", 1.0, "test",
            )])
        }

        async fn enhance_text(
            &self,
            text: &str,
            _enhancement_type: &str,
        ) -> Result<String, topems_shared_ai::ai_client::AIClientError> {
            Ok(format!("enhanced: {}", text))
        }

        async fn validate_form(
            &self,
            _form_type: &str,
            _form_schema: &serde_json::Value,
            _current_data: &serde_json::Value,
        ) -> Result<Vec<ValidationResult>, topems_shared_ai::ai_client::AIClientError> {
            Ok(vec![ValidationResult::valid("f1")])
        }

        async fn translate_term(
            &self,
            term: &str,
            _form_type: &str,
        ) -> Result<String, topems_shared_ai::ai_client::AIClientError> {
            Ok(format!("translated:{}", term))
        }

        async fn assist(
            &self,
            _request: AiFormAssistantRequest,
        ) -> Result<AiFormAssistantResponse, topems_shared_ai::ai_client::AIClientError> {
            Ok(AiFormAssistantResponse {
                enhanced_text: Some("assist-ok".into()),
                ..Default::default()
            })
        }
    }

    // ==================== parse_action ====================

    #[test]
    fn test_parse_action_suggest() {
        let r = parse_action("suggest", &serde_json::json!({})).unwrap();
        assert!(matches!(r, FormAssistantAction::SuggestFields));
    }

    #[test]
    fn test_parse_action_enhance_with_text() {
        let data = serde_json::json!({"text": "hello"});
        let r = parse_action("enhance", &data).unwrap();
        assert!(matches!(r, FormAssistantAction::EnhanceText(t) if t == "hello"));
    }

    #[test]
    fn test_parse_action_enhance_no_text() {
        let r = parse_action("enhance", &serde_json::json!({})).unwrap();
        assert!(matches!(r, FormAssistantAction::EnhanceText(t) if t.is_empty()));
    }

    #[test]
    fn test_parse_action_validate() {
        let r = parse_action("validate", &serde_json::json!({})).unwrap();
        assert!(matches!(r, FormAssistantAction::ValidateForm));
    }

    #[test]
    fn test_parse_action_translate_with_term() {
        let data = serde_json::json!({"term": "SKU"});
        let r = parse_action("translate", &data).unwrap();
        assert!(matches!(r, FormAssistantAction::TranslateTerm(t) if t == "SKU"));
    }

    #[test]
    fn test_parse_action_translate_no_term() {
        let r = parse_action("translate", &serde_json::json!({})).unwrap();
        assert!(matches!(r, FormAssistantAction::TranslateTerm(t) if t.is_empty()));
    }

    #[test]
    fn test_parse_action_unknown() {
        let r = parse_action("unknown", &serde_json::json!({}));
        assert!(r.is_err());
        assert_eq!(r.unwrap_err(), "无效的 action 参数");
    }

    // ==================== service 层 + MockAssistant ====================

    #[tokio::test]
    async fn test_service_suggest_fields() {
        let mock = MockAssistant;
        let result = suggest_fields(
            &mock,
            "po",
            &serde_json::json!({}),
            &serde_json::json!({}),
            None,
        )
        .await;
        let list = result.unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].field_name, "f1");
    }

    #[tokio::test]
    async fn test_service_enhance_text() {
        let mock = MockAssistant;
        let result = enhance_text(&mock, "hi", "polish").await;
        assert_eq!(result.unwrap(), "enhanced: hi");
    }

    #[tokio::test]
    async fn test_service_validate_form() {
        let mock = MockAssistant;
        let result =
            validate_form(&mock, "po", &serde_json::json!({}), &serde_json::json!({})).await;
        let list = result.unwrap();
        assert_eq!(list.len(), 1);
        assert!(list[0].is_valid);
    }

    #[tokio::test]
    async fn test_service_translate_term() {
        let mock = MockAssistant;
        let result = translate_term(&mock, "SKU", "po").await;
        assert_eq!(result.unwrap(), "translated:SKU");
    }

    #[tokio::test]
    async fn test_service_assist() {
        let mock = MockAssistant;
        let req = AiFormAssistantRequest {
            form_type: "po".into(),
            form_schema: serde_json::json!({}),
            current_data: serde_json::json!({}),
            action: FormAssistantAction::SuggestFields,
            target_field: None,
        };
        let resp = assist(&mock, req).await.unwrap();
        assert_eq!(resp.enhanced_text, Some("assist-ok".into()));
    }

    #[tokio::test]
    async fn test_service_suggest_for_form() {
        let mock = MockAssistant;
        let result = suggest_fields_for_form(
            &mock,
            "po",
            &serde_json::json!({}),
            &serde_json::json!({}),
            None,
        )
        .await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_service_enhance_for_form() {
        let mock = MockAssistant;
        let result = enhance_text_for_form(&mock, "hi", "polish", "po").await;
        assert_eq!(result.unwrap(), "enhanced: hi");
    }

    // ==================== registry 校验（纯逻辑） ====================

    #[test]
    fn test_list_forms_is_nonempty() {
        let registry = topems_shared::form_assistant::default_registry();
        assert!(registry.list().len() >= 30);
    }

    #[test]
    fn test_get_form_existing() {
        let registry = topems_shared::form_assistant::default_registry();
        let cfg = registry.get("purchase_order");
        assert!(cfg.is_some(), "purchase_order 应该存在");
    }

    #[test]
    fn test_get_form_nonexistent() {
        let registry = topems_shared::form_assistant::default_registry();
        assert!(registry.get("totally_fake_form_xyz").is_none());
    }

    #[test]
    fn test_form_supports_all_features() {
        let registry = topems_shared::form_assistant::default_registry();
        let cfg = registry.get("purchase_order").unwrap();
        assert!(cfg.supports("suggest"));
        assert!(cfg.supports("enhance"));
        assert!(cfg.supports("validate"));
        assert!(cfg.supports("translate"));
        assert!(!cfg.supports("unknown_feature"));
    }
}
