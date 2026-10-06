//! AI 表单助手核心类型
//!
//! 为 svc/ai/src/modules/ai_form/ 提供共享类型定义。
//! 实际 AI 调用通过 UnifiedAIClient 完成。

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use topems_shared_ai::ai_client::{AIClientError, UnifiedAIClient};

// ==================== 结果类型 ====================

/// 字段建议结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldSuggestion {
    pub field_name: String,
    pub suggested_value: String,
    pub confidence: f64,
    pub reasoning: String,
}

impl FieldSuggestion {
    pub fn new(
        field_name: impl Into<String>,
        suggested_value: impl Into<String>,
        confidence: f64,
        reasoning: impl Into<String>,
    ) -> Self {
        Self {
            field_name: field_name.into(),
            suggested_value: suggested_value.into(),
            confidence,
            reasoning: reasoning.into(),
        }
    }
}

/// 表单验证结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    pub field_name: String,
    pub validation_type: String,
    pub is_valid: bool,
    pub message: String,
    pub suggestion: Option<String>,
}

impl ValidationResult {
    pub fn valid(field_name: impl Into<String>) -> Self {
        Self {
            field_name: field_name.into(),
            validation_type: "format".into(),
            is_valid: true,
            message: "校验通过".into(),
            suggestion: None,
        }
    }

    pub fn invalid(
        field_name: impl Into<String>,
        validation_type: impl Into<String>,
        message: impl Into<String>,
        suggestion: Option<String>,
    ) -> Self {
        Self {
            field_name: field_name.into(),
            validation_type: validation_type.into(),
            is_valid: false,
            message: message.into(),
            suggestion,
        }
    }
}

// ==================== Action 枚举 ====================

/// 表单助手动作
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FormAssistantAction {
    SuggestFields,
    EnhanceText(String),
    ValidateForm,
    TranslateTerm(String),
}

// ==================== Request / Response ====================

/// 统一助手请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiFormAssistantRequest {
    pub form_type: String,
    pub form_schema: serde_json::Value,
    pub current_data: serde_json::Value,
    pub action: FormAssistantAction,
    pub target_field: Option<String>,
}

/// 统一助手响应
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AiFormAssistantResponse {
    #[serde(default)]
    pub suggestions: Vec<FieldSuggestion>,
    #[serde(default)]
    pub enhanced_text: Option<String>,
    #[serde(default)]
    pub validation_results: Vec<ValidationResult>,
    #[serde(default)]
    pub translated_text: Option<String>,
}

// ==================== Trait ====================

#[async_trait]
pub trait AiFormAssistant: Send + Sync {
    async fn suggest_fields(
        &self,
        form_type: &str,
        form_schema: &serde_json::Value,
        current_data: &serde_json::Value,
        target_field: Option<&str>,
    ) -> Result<Vec<FieldSuggestion>, AIClientError>;

    async fn suggest_fields_with_config(
        &self,
        form_type: &str,
        form_schema: &serde_json::Value,
        current_data: &serde_json::Value,
        target_field: Option<&str>,
    ) -> Result<Vec<FieldSuggestion>, AIClientError> {
        self.suggest_fields(form_type, form_schema, current_data, target_field)
            .await
    }

    async fn enhance_text(
        &self,
        text: &str,
        enhancement_type: &str,
    ) -> Result<String, AIClientError>;

    async fn enhance_text_for_form(
        &self,
        text: &str,
        enhancement_type: &str,
        _form_type: &str,
    ) -> Result<String, AIClientError> {
        self.enhance_text(text, enhancement_type).await
    }

    async fn validate_form(
        &self,
        form_type: &str,
        form_schema: &serde_json::Value,
        current_data: &serde_json::Value,
    ) -> Result<Vec<ValidationResult>, AIClientError>;

    async fn translate_term(&self, term: &str, form_type: &str) -> Result<String, AIClientError>;

    async fn assist(
        &self,
        request: AiFormAssistantRequest,
    ) -> Result<AiFormAssistantResponse, AIClientError>;
}

// ==================== Client ====================

/// 表单助手客户端
pub struct AiFormAssistantClient {
    ai_client: Arc<UnifiedAIClient>,
}

impl AiFormAssistantClient {
    pub fn new(ai_client: Arc<UnifiedAIClient>) -> Self {
        Self { ai_client }
    }

    pub fn inner(&self) -> &Arc<UnifiedAIClient> {
        &self.ai_client
    }
}

#[async_trait]
impl AiFormAssistant for AiFormAssistantClient {
    async fn suggest_fields(
        &self,
        _form_type: &str,
        _form_schema: &serde_json::Value,
        _current_data: &serde_json::Value,
        _target_field: Option<&str>,
    ) -> Result<Vec<FieldSuggestion>, AIClientError> {
        Ok(Vec::new())
    }

    async fn enhance_text(
        &self,
        text: &str,
        _enhancement_type: &str,
    ) -> Result<String, AIClientError> {
        Ok(text.to_string())
    }

    async fn validate_form(
        &self,
        _form_type: &str,
        _form_schema: &serde_json::Value,
        _current_data: &serde_json::Value,
    ) -> Result<Vec<ValidationResult>, AIClientError> {
        Ok(Vec::new())
    }

    async fn translate_term(&self, term: &str, _form_type: &str) -> Result<String, AIClientError> {
        Ok(term.to_string())
    }

    async fn assist(
        &self,
        _request: AiFormAssistantRequest,
    ) -> Result<AiFormAssistantResponse, AIClientError> {
        Ok(AiFormAssistantResponse::default())
    }
}

// ==================== 单元测试 ====================

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

    #[test]
    fn rt_field_suggestion() {
        roundtrip(&FieldSuggestion::new(
            "amount",
            "100.00",
            0.95,
            "基于历史数据",
        ));
    }

    #[test]
    fn rt_field_suggestion_full() {
        roundtrip(&FieldSuggestion {
            field_name: "x".into(),
            suggested_value: "y".into(),
            confidence: 0.0,
            reasoning: "z".into(),
        });
    }

    #[test]
    fn rt_validation_result_valid() {
        roundtrip(&ValidationResult::valid("amount"));
    }

    #[test]
    fn rt_validation_result_invalid() {
        roundtrip(&ValidationResult::invalid(
            "amount",
            "range",
            "超出范围",
            Some("应在 0-100 之间".into()),
        ));
    }

    #[test]
    fn rt_action_suggest() {
        roundtrip(&FormAssistantAction::SuggestFields);
    }

    #[test]
    fn rt_action_enhance() {
        roundtrip(&FormAssistantAction::EnhanceText("hello".into()));
    }

    #[test]
    fn rt_action_validate() {
        roundtrip(&FormAssistantAction::ValidateForm);
    }

    #[test]
    fn rt_action_translate() {
        roundtrip(&FormAssistantAction::TranslateTerm("SKU".into()));
    }

    #[test]
    fn rt_request() {
        roundtrip(&AiFormAssistantRequest {
            form_type: "purchase_order".into(),
            form_schema: serde_json::json!({"type": "object"}),
            current_data: serde_json::json!({"amount": 50}),
            action: FormAssistantAction::SuggestFields,
            target_field: Some("amount".into()),
        });
    }

    #[test]
    fn rt_response_empty() {
        roundtrip(&AiFormAssistantResponse::default());
    }

    #[test]
    fn rt_response_full() {
        roundtrip(&AiFormAssistantResponse {
            suggestions: vec![FieldSuggestion::new("x", "y", 0.8, "ok")],
            enhanced_text: Some("hello world".into()),
            validation_results: vec![ValidationResult::valid("field1")],
            translated_text: Some("术语".into()),
        });
    }
}
