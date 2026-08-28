//! Prompt 模板类型和相关工具

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::error::DshToolError;

/// Prompt 模板定义
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptTemplate {
    /// 模板名称（符合命名规范：{业务域}_{场景}_{用途}）
    pub name: String,
    /// 模板描述
    pub description: String,
    /// 版本号
    pub version: String,
    /// 系统提示词
    pub system: String,
    /// 用户提示词
    pub user: String,
    /// 变量定义
    pub variables: Vec<PromptVariable>,
    /// 模型参数
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model_params: Option<ModelParams>,
    /// 模板分类
    #[serde(skip_serializing_if = "Option::is_none")]
    pub category: Option<String>,
    /// 模板标签
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub tags: Vec<String>,
}

/// Prompt 变量定义
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptVariable {
    /// 变量名称
    pub name: String,
    /// 变量描述
    pub description: String,
    /// 变量类型
    pub variable_type: VariableType,
    /// 是否必填
    #[serde(default)]
    pub required: bool,
    /// 默认值
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default: Option<String>,
    /// 枚举值（可选）
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub enum_values: Vec<String>,
}

/// 变量类型
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum VariableType {
    /// 字符串
    String,
    /// 整数
    Integer,
    /// 数字
    Number,
    /// 布尔值
    Boolean,
    /// 对象
    Object,
    /// 数组
    Array,
}

/// 模型参数
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelParams {
    /// 温度（0-2）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
    /// Top P（0-1）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub top_p: Option<f32>,
    /// 最大 Token 数
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_tokens: Option<u32>,
    /// 频率惩罚（-2 到 2）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub frequency_penalty: Option<f32>,
    /// 存在惩罚（-2 到 2）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub presence_penalty: Option<f32>,
    /// 停止序列
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub stop: Vec<String>,
}

impl Default for ModelParams {
    fn default() -> Self {
        Self {
            temperature: Some(0.7),
            top_p: Some(0.9),
            max_tokens: Some(4096),
            frequency_penalty: None,
            presence_penalty: None,
            stop: vec![],
        }
    }
}

/// 渲染后的 Prompt
#[derive(Debug, Clone)]
pub struct RenderedPrompt {
    /// 系统提示词
    pub system: String,
    /// 用户提示词
    pub user: String,
    /// 模型参数
    pub model_params: Option<ModelParams>,
}

impl PromptTemplate {
    /// 创建新的 Prompt 模板
    pub fn new(
        name: impl Into<String>,
        description: impl Into<String>,
        system: impl Into<String>,
        user: impl Into<String>,
    ) -> Self {
        Self {
            name: name.into(),
            description: description.into(),
            version: "1.0.0".to_string(),
            system: system.into(),
            user: user.into(),
            variables: vec![],
            model_params: Some(ModelParams::default()),
            category: None,
            tags: vec![],
        }
    }

    /// 添加变量
    pub fn with_variable(mut self, variable: PromptVariable) -> Self {
        self.variables.push(variable);
        self
    }

    /// 设置模型参数
    pub fn with_model_params(mut self, params: ModelParams) -> Self {
        self.model_params = Some(params);
        self
    }

    /// 设置分类
    pub fn with_category(mut self, category: impl Into<String>) -> Self {
        self.category = Some(category.into());
        self
    }

    /// 添加标签
    pub fn with_tag(mut self, tag: impl Into<String>) -> Self {
        self.tags.push(tag.into());
        self
    }

    /// 渲染 Prompt
    pub fn render(&self, variables: &HashMap<String, String>) -> Result<RenderedPrompt, DshToolError> {
        // 验证必填变量
        for var in &self.variables {
            if var.required && !variables.contains_key(&var.name) {
                return Err(DshToolError::validation_error(
                    &var.name,
                    format!("必填变量 '{}' 缺失", var.name),
                ));
            }
        }

        // 渲染系统提示词
        let mut system = self.system.clone();
        let mut user = self.user.clone();

        for (key, value) in variables {
            let placeholder = format!("{{{}}}", key);
            system = system.replace(&placeholder, value);
            user = user.replace(&placeholder, value);
        }

        // 检查是否有未替换的变量
        let remaining_system: Vec<&str> = system
            .matches(|c: char| c == '{' || c == '}')
            .collect();
        if !remaining_system.is_empty() {
            // 简单检查是否有未替换的 {variable}
            for var in &self.variables {
                let placeholder = format!("{{{}}}", var.name);
                if system.contains(&placeholder) || user.contains(&placeholder) {
                    if var.required {
                        return Err(DshToolError::validation_error(
                            &var.name,
                            format!("变量 '{}' 未被替换", var.name),
                        ));
                    }
                }
            }
        }

        Ok(RenderedPrompt {
            system,
            user,
            model_params: self.model_params.clone(),
        })
    }

    /// 验证模板名称
    pub fn validate_name(&self) -> Result<(), String> {
        if self.name.is_empty() {
            return Err("模板名称不能为空".to_string());
        }
        if !self
            .name
            .chars()
            .all(|c| c.is_ascii_lowercase() || c == '_' || c.is_ascii_digit())
        {
            return Err("模板名称只能包含小写字母、数字和下划线".to_string());
        }
        let parts: Vec<&str> = self.name.split('_').collect();
        if parts.len() < 3 {
            return Err("模板名称应包含至少 3 部分：{业务域}_{场景}_{用途}".to_string());
        }
        Ok(())
    }
}

/// Prompt 变量构建器
impl PromptVariable {
    /// 创建字符串变量
    pub fn string(name: impl Into<String>, description: impl Into<String>, required: bool) -> Self {
        Self {
            name: name.into(),
            description: description.into(),
            variable_type: VariableType::String,
            required,
            default: None,
            enum_values: vec![],
        }
    }

    /// 创建整数变量
    pub fn integer(name: impl Into<String>, description: impl Into<String>, required: bool) -> Self {
        Self {
            name: name.into(),
            description: description.into(),
            variable_type: VariableType::Integer,
            required,
            default: None,
            enum_values: vec![],
        }
    }

    /// 设置默认值
    pub fn with_default(mut self, default: impl Into<String>) -> Self {
        self.default = Some(default.into());
        self
    }

    /// 设置枚举值
    pub fn with_enum_values(mut self, values: Vec<String>) -> Self {
        self.enum_values = values;
        self
    }
}

/// Prompt 模板注册表
#[derive(Default)]
pub struct PromptRegistry {
    templates: HashMap<String, PromptTemplate>,
}

impl PromptRegistry {
    /// 创建新的注册表
    pub fn new() -> Self {
        Self::default()
    }

    /// 注册模板
    pub fn register(&mut self, template: PromptTemplate) -> Result<(), DshToolError> {
        template
            .validate_name()
            .map_err(|e| DshToolError::definition_error(e))?;
        if self.templates.contains_key(&template.name) {
            return Err(DshToolError::definition_error(format!(
                "模板 '{}' 已存在",
                template.name
            )));
        }
        let name = template.name.clone();
        self.templates.insert(name, template);
        Ok(())
    }

    /// 获取模板
    pub fn get(&self, name: &str) -> Option<&PromptTemplate> {
        self.templates.get(name)
    }

    /// 列出所有模板
    pub fn list(&self) -> Vec<&PromptTemplate> {
        self.templates.values().collect()
    }

    /// 按分类列出模板
    pub fn list_by_category(&self, category: &str) -> Vec<&PromptTemplate> {
        self.templates
            .values()
            .filter(|t| t.category.as_deref() == Some(category))
            .collect()
    }

    /// 模板数量
    pub fn count(&self) -> usize {
        self.templates.len()
    }

    /// 渲染模板
    pub fn render(
        &self,
        name: &str,
        variables: &HashMap<String, String>,
    ) -> Result<RenderedPrompt, DshToolError> {
        let template = self
            .get(name)
            .ok_or_else(|| DshToolError::not_found(name))?;
        template.render(variables)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_prompt_template_render() {
        let template = PromptTemplate::new(
            "test_greet_user",
            "问候用户",
            "你是一个友好的助手。",
            "请问候 {user_name}，他的角色是 {user_role}。",
        )
        .with_variable(PromptVariable::string("user_name", "用户名", true))
        .with_variable(PromptVariable::string("user_role", "用户角色", false));

        let mut variables = HashMap::new();
        variables.insert("user_name".to_string(), "张三".to_string());
        variables.insert("user_role".to_string(), "管理员".to_string());

        let rendered = template.render(&variables).unwrap();
        assert_eq!(rendered.system, "你是一个友好的助手。");
        assert_eq!(rendered.user, "请问候 张三，他的角色是 管理员。");
    }

    #[test]
    fn test_prompt_template_missing_required_variable() {
        let template = PromptTemplate::new(
            "test_required_var",
            "测试必填变量",
            "系统",
            "你好 {name}",
        )
        .with_variable(PromptVariable::string("name", "名称", true));

        let variables = HashMap::new();
        let result = template.render(&variables);
        assert!(result.is_err());
    }

    #[test]
    fn test_prompt_registry() {
        let mut registry = PromptRegistry::new();

        let template = PromptTemplate::new(
            "test_say_hello",
            "说你好",
            "系统提示",
            "你好 {name}",
        )
        .with_variable(PromptVariable::string("name", "名称", true));

        registry.register(template).unwrap();
        assert_eq!(registry.count(), 1);

        let rendered = registry
            .render(
                "test_say_hello",
                &HashMap::from([("name".to_string(), "世界".to_string())]),
            )
            .unwrap();
        assert_eq!(rendered.user, "你好 世界");
    }

    #[test]
    fn test_model_params_default() {
        let params = ModelParams::default();
        assert_eq!(params.temperature, Some(0.7));
        assert_eq!(params.top_p, Some(0.9));
        assert_eq!(params.max_tokens, Some(4096));
    }
}
