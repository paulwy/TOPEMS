use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use super::common::{AiFeatures, BusinessTerm, FieldDefinition, FormDomain, FormValidationRule};

// ==================== 表单配置 ====================

/// 单个业务表单的 AI 辅助配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormConfig {
    /// 表单类型标识（如 customer、sales_order）
    pub form_type: String,
    /// 表单中文名（如 客户、销售订单）
    pub display_name: String,
    /// 所属业务域
    pub domain: FormDomain,
    /// 表单描述
    pub description: String,
    /// 字段说明列表
    pub field_descriptions: Vec<FieldDefinition>,
    /// 填写示例（JSON 对象）
    pub filling_examples: serde_json::Value,
    /// 验证规则列表
    pub validation_rules: Vec<FormValidationRule>,
    /// 业务术语列表
    pub business_terms: Vec<BusinessTerm>,
    /// AI 功能开关
    pub ai_features: AiFeatures,
    /// 提示词覆盖（按功能名: suggest/enhance/validate/translate）
    #[serde(default)]
    pub prompt_overrides: HashMap<String, String>,
}

impl FormConfig {
    pub fn new(
        form_type: impl Into<String>,
        display_name: impl Into<String>,
        domain: FormDomain,
    ) -> Self {
        Self {
            form_type: form_type.into(),
            display_name: display_name.into(),
            domain,
            description: String::new(),
            field_descriptions: Vec::new(),
            filling_examples: serde_json::json!({}),
            validation_rules: Vec::new(),
            business_terms: Vec::new(),
            ai_features: AiFeatures::default(),
            prompt_overrides: HashMap::new(),
        }
    }

    pub fn with_description(mut self, desc: impl Into<String>) -> Self {
        self.description = desc.into();
        self
    }

    pub fn with_field(mut self, field: FieldDefinition) -> Self {
        self.field_descriptions.push(field);
        self
    }

    pub fn with_example(mut self, filling_examples: serde_json::Value) -> Self {
        self.filling_examples = filling_examples;
        self
    }

    pub fn with_validation_rule(mut self, rule: FormValidationRule) -> Self {
        self.validation_rules.push(rule);
        self
    }

    pub fn with_business_term(mut self, term: BusinessTerm) -> Self {
        self.business_terms.push(term);
        self
    }

    pub fn with_ai_features(mut self, features: AiFeatures) -> Self {
        self.ai_features = features;
        self
    }

    pub fn supports(&self, feature: &str) -> bool {
        self.ai_features.supports(feature)
    }

    /// 获取字段说明的可读字符串（用于提示词）
    pub fn fields_description_text(&self) -> String {
        self.field_descriptions
            .iter()
            .map(|f| {
                format!(
                    "- {}（{}，{}）：{}；示例：{}",
                    f.name, f.label, f.field_type, f.description, f.example
                )
            })
            .collect::<Vec<_>>()
            .join("\n")
    }

    /// 获取验证规则的可读字符串
    pub fn validation_rules_text(&self) -> String {
        self.validation_rules
            .iter()
            .map(|r| format!("- {}（{}）：{}", r.field_name, r.rule_type, r.description))
            .collect::<Vec<_>>()
            .join("\n")
    }

    /// 获取业务术语的可读字符串
    pub fn business_terms_text(&self) -> String {
        self.business_terms
            .iter()
            .map(|t| {
                let en = t
                    .english
                    .as_ref()
                    .map(|e| format!("（{}）", e))
                    .unwrap_or_default();
                format!("- {}{}：{}", t.term, en, t.explanation)
            })
            .collect::<Vec<_>>()
            .join("\n")
    }
}
