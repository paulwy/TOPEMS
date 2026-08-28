//! Tool 定义 trait 和相关类型

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::future::Future;
use std::pin::Pin;

use crate::error::DshToolError;
use crate::types::DshResponse;

/// Tool 定义
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolDefinition {
    /// 工具名称（符合命名规范：{业务域}_{操作}_{对象}）
    pub name: String,
    /// 工具描述
    pub description: String,
    /// 版本号
    pub version: String,
    /// 输入 Schema（JSON Schema 格式）
    pub input_schema: serde_json::Value,
    /// 输出 Schema（JSON Schema 格式，可选）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub output_schema: Option<serde_json::Value>,
    /// 所需权限
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub required_permissions: Vec<String>,
    /// 工具分类
    #[serde(skip_serializing_if = "Option::is_none")]
    pub category: Option<String>,
    /// 工具标签
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub tags: Vec<String>,
    /// 是否废弃
    #[serde(default)]
    pub deprecated: bool,
    /// 废弃说明
    #[serde(skip_serializing_if = "Option::is_none")]
    pub deprecation_message: Option<String>,
}

impl ToolDefinition {
    /// 创建新的工具定义
    pub fn new(name: impl Into<String>, description: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            description: description.into(),
            version: "1.0.0".to_string(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {},
                "required": []
            }),
            output_schema: None,
            required_permissions: vec![],
            category: None,
            tags: vec![],
            deprecated: false,
            deprecation_message: None,
        }
    }

    /// 设置版本
    pub fn with_version(mut self, version: impl Into<String>) -> Self {
        self.version = version.into();
        self
    }

    /// 设置输入 Schema
    pub fn with_input_schema(mut self, schema: serde_json::Value) -> Self {
        self.input_schema = schema;
        self
    }

    /// 设置输出 Schema
    pub fn with_output_schema(mut self, schema: serde_json::Value) -> Self {
        self.output_schema = Some(schema);
        self
    }

    /// 添加所需权限
    pub fn with_permission(mut self, permission: impl Into<String>) -> Self {
        self.required_permissions.push(permission.into());
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

    /// 标记为废弃
    pub fn deprecated(mut self, message: impl Into<String>) -> Self {
        self.deprecated = true;
        self.deprecation_message = Some(message.into());
        self
    }

    /// 验证工具名称是否符合规范
    pub fn validate_name(&self) -> Result<(), String> {
        if self.name.is_empty() {
            return Err("工具名称不能为空".to_string());
        }
        if self.name.len() > 50 {
            return Err("工具名称不能超过 50 个字符".to_string());
        }
        if !self.name.chars().all(|c| c.is_ascii_lowercase() || c == '_' || c.is_ascii_digit()) {
            return Err("工具名称只能包含小写字母、数字和下划线".to_string());
        }
        let parts: Vec<&str> = self.name.split('_').collect();
        if parts.len() < 3 {
            return Err("工具名称应包含至少 3 部分：{业务域}_{操作}_{对象}".to_string());
        }
        Ok(())
    }
}

/// Tool 执行上下文
#[derive(Debug, Clone, Default)]
pub struct ToolContext {
    /// 租户 ID
    pub tenant_id: Option<String>,
    /// 用户 ID
    pub user_id: Option<String>,
    /// 请求 ID
    pub request_id: Option<String>,
    /// 语言区域
    pub locale: Option<String>,
    /// 额外上下文数据
    pub extra: HashMap<String, String>,
}

impl ToolContext {
    /// 创建新的上下文
    pub fn new() -> Self {
        Self::default()
    }

    /// 设置租户 ID
    pub fn with_tenant_id(mut self, tenant_id: impl Into<String>) -> Self {
        self.tenant_id = Some(tenant_id.into());
        self
    }

    /// 设置用户 ID
    pub fn with_user_id(mut self, user_id: impl Into<String>) -> Self {
        self.user_id = Some(user_id.into());
        self
    }

    /// 设置请求 ID
    pub fn with_request_id(mut self, request_id: impl Into<String>) -> Self {
        self.request_id = Some(request_id.into());
        self
    }

    /// 添加额外数据
    pub fn with_extra(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        self.extra.insert(key.into(), value.into());
        self
    }
}

/// Tool trait - 所有工具必须实现此 trait
#[async_trait]
pub trait Tool: Send + Sync {
    /// 获取工具定义
    fn definition(&self) -> ToolDefinition;

    /// 执行工具
    async fn execute(
        &self,
        input: serde_json::Value,
        context: ToolContext,
    ) -> Result<DshResponse<serde_json::Value>, DshToolError>;

    /// 验证输入
    fn validate_input(&self, input: &serde_json::Value) -> Result<(), DshToolError> {
        let schema = &self.definition().input_schema;
        if let Some(properties) = schema.get("properties").and_then(|p| p.as_object()) {
            if let Some(required) = schema.get("required").and_then(|r| r.as_array()) {
                for field in required {
                    if let Some(field_name) = field.as_str() {
                        if input.get(field_name).is_none() {
                            return Err(DshToolError::validation_error(
                                field_name,
                                format!("必填字段 '{}' 缺失", field_name),
                            ));
                        }
                    }
                }
            }
            // 简单的类型检查
            for (key, prop) in properties {
                if let Some(value) = input.get(key) {
                    if let Some(expected_type) = prop.get("type").and_then(|t| t.as_str()) {
                        let type_valid = match expected_type {
                            "string" => value.is_string(),
                            "integer" => value.is_i64(),
                            "number" => value.is_number(),
                            "boolean" => value.is_boolean(),
                            "array" => value.is_array(),
                            "object" => value.is_object(),
                            _ => true,
                        };
                        if !type_valid {
                            return Err(DshToolError::validation_error(
                                key,
                                format!("字段 '{}' 类型错误，期望 {}", key, expected_type),
                            ));
                        }
                    }
                }
            }
        }
        Ok(())
    }
}

/// 简单工具 - 使用闭包实现
pub struct SimpleTool {
    definition: ToolDefinition,
    handler: Box<
        dyn Fn(
                serde_json::Value,
                ToolContext,
            ) -> Pin<Box<dyn Future<Output = Result<DshResponse<serde_json::Value>, DshToolError>> + Send>>
            + Send
            + Sync,
    >,
}

impl SimpleTool {
    /// 创建简单工具
    pub fn new<F, Fut>(definition: ToolDefinition, handler: F) -> Self
    where
        F: Fn(serde_json::Value, ToolContext) -> Fut + Send + Sync + 'static,
        Fut: Future<Output = Result<DshResponse<serde_json::Value>, DshToolError>> + Send + 'static,
    {
        Self {
            definition,
            handler: Box::new(move |input, context| Box::pin(handler(input, context))),
        }
    }
}

#[async_trait]
impl Tool for SimpleTool {
    fn definition(&self) -> ToolDefinition {
        self.definition.clone()
    }

    async fn execute(
        &self,
        input: serde_json::Value,
        context: ToolContext,
    ) -> Result<DshResponse<serde_json::Value>, DshToolError> {
        self.validate_input(&input)?;
        (self.handler)(input, context).await
    }
}

/// 工具注册表
#[derive(Default)]
pub struct ToolRegistry {
    tools: HashMap<String, Box<dyn Tool>>,
}

impl ToolRegistry {
    /// 创建新的注册表
    pub fn new() -> Self {
        Self::default()
    }

    /// 注册工具
    pub fn register(&mut self, tool: Box<dyn Tool>) -> Result<(), DshToolError> {
        let def = tool.definition();
        def.validate_name()
            .map_err(|e| DshToolError::definition_error(e))?;
        if self.tools.contains_key(&def.name) {
            return Err(DshToolError::definition_error(format!(
                "工具 '{}' 已存在",
                def.name
            )));
        }
        self.tools.insert(def.name, tool);
        Ok(())
    }

    /// 获取工具
    pub fn get(&self, name: &str) -> Option<&dyn Tool> {
        self.tools.get(name).map(|t| t.as_ref())
    }

    /// 列出所有工具
    pub fn list(&self) -> Vec<ToolDefinition> {
        self.tools.values().map(|t| t.definition()).collect()
    }

    /// 按分类列出工具
    pub fn list_by_category(&self, category: &str) -> Vec<ToolDefinition> {
        self.tools
            .values()
            .filter(|t| t.definition().category.as_deref() == Some(category))
            .map(|t| t.definition())
            .collect()
    }

    /// 工具数量
    pub fn count(&self) -> usize {
        self.tools.len()
    }

    /// 执行工具
    pub async fn execute(
        &self,
        name: &str,
        input: serde_json::Value,
        context: ToolContext,
    ) -> Result<DshResponse<serde_json::Value>, DshToolError> {
        let tool = self
            .get(name)
            .ok_or_else(|| DshToolError::not_found(name))?;
        tool.execute(input, context).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tool_definition_validation() {
        let valid = ToolDefinition::new("erp_create_order", "创建订单");
        assert!(valid.validate_name().is_ok());

        let empty = ToolDefinition::new("", "空名称");
        assert!(empty.validate_name().is_err());

        let too_long = ToolDefinition::new(&"a".repeat(51), "太长");
        assert!(too_long.validate_name().is_err());

        let invalid_chars = ToolDefinition::new("ERP-Create-Order", "无效字符");
        assert!(invalid_chars.validate_name().is_err());

        let too_few_parts = ToolDefinition::new("erp_create", "部分太少");
        assert!(too_few_parts.validate_name().is_err());
    }

    #[test]
    fn test_tool_definition_builder() {
        let def = ToolDefinition::new("erp_create_order", "创建订单")
            .with_version("2.0.0")
            .with_category("sales")
            .with_tag("order")
            .with_permission("erp:order:create");

        assert_eq!(def.name, "erp_create_order");
        assert_eq!(def.version, "2.0.0");
        assert_eq!(def.category.as_deref(), Some("sales"));
        assert_eq!(def.tags, vec!["order"]);
        assert_eq!(def.required_permissions, vec!["erp:order:create"]);
    }

    #[tokio::test]
    async fn test_simple_tool() {
        let def = ToolDefinition::new(
            "test_hello_world",
            "测试工具",
        )
        .with_input_schema(serde_json::json!({
            "type": "object",
            "properties": {
                "name": {"type": "string"}
            },
            "required": ["name"]
        }));

        let tool = SimpleTool::new(def, |input, _context| async move {
            let name = input.get("name").and_then(|n| n.as_str()).unwrap_or("world");
            Ok(DshResponse::success(serde_json::json!({"message": format!("Hello, {}!", name)})))
        });

        let result = tool
            .execute(
                serde_json::json!({"name": "TOPEMS"}),
                ToolContext::new(),
            )
            .await
            .unwrap();

        assert!(result.success);
        assert_eq!(
            result.data.unwrap().get("message").unwrap(),
            "Hello, TOPEMS!"
        );
    }

    #[tokio::test]
    async fn test_tool_registry() {
        let mut registry = ToolRegistry::new();

        let def = ToolDefinition::new("test_greet_user", "问候用户");
        let tool = SimpleTool::new(def, |input, _context| async move {
            Ok(DshResponse::success(serde_json::json!({"status": "ok"})))
        });

        registry.register(Box::new(tool)).unwrap();
        assert_eq!(registry.count(), 1);

        let tools = registry.list();
        assert_eq!(tools.len(), 1);
        assert_eq!(tools[0].name, "test_greet_user");

        let result = registry
            .execute("test_greet_user", serde_json::json!({}), ToolContext::new())
            .await
            .unwrap();
        assert!(result.success);
    }
}
