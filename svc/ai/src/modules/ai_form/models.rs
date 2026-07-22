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
