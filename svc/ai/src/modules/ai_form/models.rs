use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct AiFormAssistRequest {
    pub form_type: String,
    pub form_schema: serde_json::Value,
    pub current_data: serde_json::Value,
    pub action: String,
    pub target_field: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AiFormSuggestRequest {
    pub form_type: String,
    pub form_schema: serde_json::Value,
    pub current_data: serde_json::Value,
    pub target_field: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AiFormEnhanceRequest {
    pub text: String,
    pub enhancement_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AiFormValidateRequest {
    pub form_type: String,
    pub form_schema: serde_json::Value,
    pub current_data: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AiFormTranslateRequest {
    pub term: String,
    pub form_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AiFormSuggestResponse {
    pub suggestions: Vec<FieldSuggestion>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AiFormEnhanceResponse {
    pub enhanced_text: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AiFormValidateResponse {
    pub validations: Vec<ValidationResult>,
    pub is_valid: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AiFormTranslateResponse {
    pub translated_text: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FieldSuggestion {
    pub field_name: String,
    pub suggested_value: String,
    pub confidence: f64,
    pub reasoning: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ValidationResult {
    pub field_name: String,
    pub validation_type: String,
    pub is_valid: bool,
    pub message: String,
    pub suggestion: Option<String>,
}

impl From<topems_shared::form_assistant::FieldSuggestion> for FieldSuggestion {
    fn from(src: topems_shared::form_assistant::FieldSuggestion) -> Self {
        Self {
            field_name: src.field_name,
            suggested_value: src.suggested_value,
            confidence: src.confidence,
            reasoning: src.reasoning,
        }
    }
}

impl From<topems_shared::form_assistant::ValidationResult> for ValidationResult {
    fn from(src: topems_shared::form_assistant::ValidationResult) -> Self {
        Self {
            field_name: src.field_name,
            validation_type: src.validation_type,
            is_valid: src.is_valid,
            message: src.message,
            suggestion: src.suggestion,
        }
    }
}

// ==================== 表单注册表 API 模型 ====================

/// 表单列表项（精简视图）
#[derive(Debug, Serialize, Deserialize)]
pub struct FormSummary {
    pub form_type: String,
    pub display_name: String,
    pub domain: String,
    pub description: String,
    pub supports_suggest: bool,
    pub supports_enhance: bool,
    pub supports_validate: bool,
    pub supports_translate: bool,
}

impl From<&topems_shared::form_assistant::FormConfig> for FormSummary {
    fn from(cfg: &topems_shared::form_assistant::FormConfig) -> Self {
        Self {
            form_type: cfg.form_type.clone(),
            display_name: cfg.display_name.clone(),
            domain: cfg.domain.display_name().to_string(),
            description: cfg.description.clone(),
            supports_suggest: cfg.ai_features.suggest,
            supports_enhance: cfg.ai_features.enhance,
            supports_validate: cfg.ai_features.validate,
            supports_translate: cfg.ai_features.translate,
        }
    }
}

/// 表单列表响应
#[derive(Debug, Serialize, Deserialize)]
pub struct AiFormListResponse {
    pub total: usize,
    pub forms: Vec<FormSummary>,
    pub domains: Vec<String>,
}

/// 表单配置详情响应
#[derive(Debug, Serialize, Deserialize)]
pub struct AiFormConfigResponse {
    pub form_type: String,
    pub display_name: String,
    pub domain: String,
    pub description: String,
    pub field_descriptions: Vec<FormFieldDefinitionDto>,
    pub filling_examples: serde_json::Value,
    pub validation_rules: Vec<FormValidationRuleDto>,
    pub business_terms: Vec<BusinessTermDto>,
    pub ai_features: AiFeaturesDto,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FormFieldDefinitionDto {
    pub name: String,
    pub label: String,
    pub field_type: String,
    pub description: String,
    pub required: bool,
    pub example: String,
}

impl From<&topems_shared::form_assistant::FieldDefinition> for FormFieldDefinitionDto {
    fn from(f: &topems_shared::form_assistant::FieldDefinition) -> Self {
        Self {
            name: f.name.clone(),
            label: f.label.clone(),
            field_type: f.field_type.clone(),
            description: f.description.clone(),
            required: f.required,
            example: f.example.clone(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FormValidationRuleDto {
    pub field_name: String,
    pub rule_type: String,
    pub description: String,
    pub pattern: Option<String>,
}

impl From<&topems_shared::form_assistant::FormValidationRule> for FormValidationRuleDto {
    fn from(r: &topems_shared::form_assistant::FormValidationRule) -> Self {
        Self {
            field_name: r.field_name.clone(),
            rule_type: r.rule_type.clone(),
            description: r.description.clone(),
            pattern: r.pattern.clone(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BusinessTermDto {
    pub term: String,
    pub english: Option<String>,
    pub explanation: String,
}

impl From<&topems_shared::form_assistant::BusinessTerm> for BusinessTermDto {
    fn from(t: &topems_shared::form_assistant::BusinessTerm) -> Self {
        Self {
            term: t.term.clone(),
            english: t.english.clone(),
            explanation: t.explanation.clone(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AiFeaturesDto {
    pub suggest: bool,
    pub enhance: bool,
    pub validate: bool,
    pub translate: bool,
}

impl From<&topems_shared::form_assistant::AiFeatures> for AiFeaturesDto {
    fn from(f: &topems_shared::form_assistant::AiFeatures) -> Self {
        Self {
            suggest: f.suggest,
            enhance: f.enhance,
            validate: f.validate,
            translate: f.translate,
        }
    }
}

impl From<&topems_shared::form_assistant::FormConfig> for AiFormConfigResponse {
    fn from(cfg: &topems_shared::form_assistant::FormConfig) -> Self {
        Self {
            form_type: cfg.form_type.clone(),
            display_name: cfg.display_name.clone(),
            domain: cfg.domain.display_name().to_string(),
            description: cfg.description.clone(),
            field_descriptions: cfg
                .field_descriptions
                .iter()
                .map(FormFieldDefinitionDto::from)
                .collect(),
            filling_examples: cfg.filling_examples.clone(),
            validation_rules: cfg
                .validation_rules
                .iter()
                .map(FormValidationRuleDto::from)
                .collect(),
            business_terms: cfg
                .business_terms
                .iter()
                .map(BusinessTermDto::from)
                .collect(),
            ai_features: AiFeaturesDto::from(&cfg.ai_features),
        }
    }
}

/// 针对特定表单的建议请求
#[derive(Debug, Serialize, Deserialize)]
pub struct AiFormSuggestForFormRequest {
    pub form_schema: serde_json::Value,
    pub current_data: serde_json::Value,
    pub target_field: Option<String>,
}

/// 针对特定表单的增强请求
#[derive(Debug, Serialize, Deserialize)]
pub struct AiFormEnhanceForFormRequest {
    pub text: String,
    /// 增强类型：summarize/expand/polish/domain_specific
    pub enhancement_type: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::{Deserialize, Serialize};
    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test] fn rt_assist_req() { roundtrip(&AiFormAssistRequest { form_type: "x".into(), form_schema: serde_json::Value::Null, current_data: serde_json::Value::Null, action: "x".into(), target_field: None }); }
    #[test] fn rt_suggest_req() { roundtrip(&AiFormSuggestRequest { form_type: "x".into(), form_schema: serde_json::Value::Null, current_data: serde_json::Value::Null, target_field: None }); }
    #[test] fn rt_enhance_req() { roundtrip(&AiFormEnhanceRequest { text: "x".into(), enhancement_type: "x".into() }); }
    #[test] fn rt_validate_req() { roundtrip(&AiFormValidateRequest { form_type: "x".into(), form_schema: serde_json::Value::Null, current_data: serde_json::Value::Null }); }
    #[test] fn rt_translate_req() { roundtrip(&AiFormTranslateRequest { term: "x".into(), form_type: "x".into() }); }
    #[test] fn rt_suggest_resp() { roundtrip(&AiFormSuggestResponse { suggestions: vec![] }); }
    #[test] fn rt_enhance_resp() { roundtrip(&AiFormEnhanceResponse { enhanced_text: "x".into() }); }
    #[test] fn rt_validate_resp() { roundtrip(&AiFormValidateResponse { validations: vec![], is_valid: true }); }
    #[test] fn rt_translate_resp() { roundtrip(&AiFormTranslateResponse { translated_text: "x".into() }); }
    #[test] fn rt_field_suggestion() { roundtrip(&FieldSuggestion { field_name: "x".into(), suggested_value: "x".into(), confidence: 0.0, reasoning: "x".into() }); }
    #[test] fn rt_validation_result() { roundtrip(&ValidationResult { field_name: "x".into(), validation_type: "x".into(), is_valid: true, message: "x".into(), suggestion: None }); }
    #[test] fn rt_form_summary() { roundtrip(&FormSummary { form_type: "x".into(), display_name: "x".into(), domain: "x".into(), description: "x".into(), supports_suggest: true, supports_enhance: true, supports_validate: true, supports_translate: true }); }
    #[test] fn rt_list_resp() { roundtrip(&AiFormListResponse { total: 0, forms: vec![], domains: vec![] }); }
    #[test] fn rt_config_resp() { roundtrip(&AiFormConfigResponse { form_type: "x".into(), display_name: "x".into(), domain: "x".into(), description: "x".into(), field_descriptions: vec![], filling_examples: serde_json::Value::Null, validation_rules: vec![], business_terms: vec![], ai_features: AiFeaturesDto { suggest: true, enhance: true, validate: true, translate: true } }); }
    #[test] fn rt_field_def_dto() { roundtrip(&FormFieldDefinitionDto { name: "x".into(), label: "x".into(), field_type: "x".into(), description: "x".into(), required: true, example: "x".into() }); }
    #[test] fn rt_validation_rule_dto() { roundtrip(&FormValidationRuleDto { field_name: "x".into(), rule_type: "x".into(), description: "x".into(), pattern: None }); }
    #[test] fn rt_business_term_dto() { roundtrip(&BusinessTermDto { term: "x".into(), english: None, explanation: "x".into() }); }
    #[test] fn rt_ai_features_dto() { roundtrip(&AiFeaturesDto { suggest: true, enhance: true, validate: true, translate: true }); }
    #[test] fn rt_suggest_for_form_req() { roundtrip(&AiFormSuggestForFormRequest { form_schema: serde_json::Value::Null, current_data: serde_json::Value::Null, target_field: None }); }
    #[test] fn rt_enhance_for_form_req() { roundtrip(&AiFormEnhanceForFormRequest { text: "x".into(), enhancement_type: "x".into() }); }
}
