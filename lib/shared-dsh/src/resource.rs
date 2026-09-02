//! Resource 类型定义和相关工具

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::error::DshToolError;

/// Resource 定义
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceDefinition {
    /// 资源 URI（格式：{业务域}://{资源类型}/{资源标识}）
    pub uri: String,
    /// 资源名称
    pub name: String,
    /// 资源描述
    pub description: String,
    /// MIME 类型
    pub mime_type: String,
    /// 资源 Schema（JSON Schema 格式）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub schema: Option<serde_json::Value>,
    /// 资源分类
    #[serde(skip_serializing_if = "Option::is_none")]
    pub category: Option<String>,
    /// 资源标签
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub tags: Vec<String>,
    /// 是否可写
    #[serde(default)]
    pub writable: bool,
}

impl ResourceDefinition {
    /// 创建新的资源定义
    pub fn new(
        uri: impl Into<String>,
        name: impl Into<String>,
        description: impl Into<String>,
        mime_type: impl Into<String>,
    ) -> Self {
        Self {
            uri: uri.into(),
            name: name.into(),
            description: description.into(),
            mime_type: mime_type.into(),
            schema: None,
            category: None,
            tags: vec![],
            writable: false,
        }
    }

    /// 设置 Schema
    pub fn with_schema(mut self, schema: serde_json::Value) -> Self {
        self.schema = Some(schema);
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

    /// 设置可写
    pub fn writable(mut self) -> Self {
        self.writable = true;
        self
    }

    /// 验证 URI 格式
    pub fn validate_uri(&self) -> Result<(), String> {
        if self.uri.is_empty() {
            return Err("资源 URI 不能为空".to_string());
        }
        if !self.uri.contains("://") {
            return Err("资源 URI 必须包含 '://' 分隔符".to_string());
        }
        let parts: Vec<&str> = self.uri.splitn(2, "://").collect();
        if parts.len() != 2 {
            return Err("资源 URI 格式错误".to_string());
        }
        let scheme = parts[0];
        let path = parts[1];
        if scheme.is_empty() {
            return Err("资源 URI 的协议部分不能为空".to_string());
        }
        if path.is_empty() {
            return Err("资源 URI 的路径部分不能为空".to_string());
        }
        if !scheme
            .chars()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit())
        {
            return Err("资源 URI 的协议部分只能包含小写字母和数字".to_string());
        }
        Ok(())
    }

    /// 解析 URI
    pub fn parse_uri(&self) -> Option<ResourceUriParts> {
        if !self.uri.contains("://") {
            return None;
        }
        let parts: Vec<&str> = self.uri.splitn(2, "://").collect();
        if parts.len() != 2 {
            return None;
        }
        let scheme = parts[0].to_string();
        let path = parts[1].to_string();
        let path_parts: Vec<&str> = path.splitn(2, '/').collect();
        let (resource_type, resource_id) = if path_parts.len() == 2 {
            (path_parts[0].to_string(), Some(path_parts[1].to_string()))
        } else {
            (path, None)
        };
        Some(ResourceUriParts {
            scheme,
            resource_type,
            resource_id,
        })
    }
}

/// 资源 URI 组成部分
#[derive(Debug, Clone)]
pub struct ResourceUriParts {
    /// 协议（业务域）
    pub scheme: String,
    /// 资源类型
    pub resource_type: String,
    /// 资源标识
    pub resource_id: Option<String>,
}

/// 资源内容
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceContent {
    /// 资源 URI
    pub uri: String,
    /// MIME 类型
    pub mime_type: String,
    /// 文本内容（文本类型资源）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
    /// 二进制内容（Base64 编码，二进制类型资源）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub blob: Option<String>,
    /// 元数据
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<HashMap<String, String>>,
}

impl ResourceContent {
    /// 创建文本资源
    pub fn text(
        uri: impl Into<String>,
        mime_type: impl Into<String>,
        content: impl Into<String>,
    ) -> Self {
        Self {
            uri: uri.into(),
            mime_type: mime_type.into(),
            text: Some(content.into()),
            blob: None,
            metadata: None,
        }
    }

    /// 创建 JSON 资源
    pub fn json(uri: impl Into<String>, value: &serde_json::Value) -> Result<Self, DshToolError> {
        let text = serde_json::to_string_pretty(value)
            .map_err(|e| DshToolError::internal_error(format!("JSON 序列化失败: {}", e)))?;
        Ok(Self::text(uri, "application/json", text))
    }

    /// 创建二进制资源
    pub fn blob(
        uri: impl Into<String>,
        mime_type: impl Into<String>,
        base64_content: impl Into<String>,
    ) -> Self {
        Self {
            uri: uri.into(),
            mime_type: mime_type.into(),
            text: None,
            blob: Some(base64_content.into()),
            metadata: None,
        }
    }

    /// 添加元数据
    pub fn with_metadata(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        if self.metadata.is_none() {
            self.metadata = Some(HashMap::new());
        }
        if let Some(meta) = &mut self.metadata {
            meta.insert(key.into(), value.into());
        }
        self
    }
}

/// 常见 MIME 类型
pub mod mime_types {
    /// JSON
    pub const JSON: &str = "application/json";
    /// 纯文本
    pub const TEXT: &str = "text/plain";
    /// Markdown
    pub const MARKDOWN: &str = "text/markdown";
    /// HTML
    pub const HTML: &str = "text/html";
    /// CSV
    pub const CSV: &str = "text/csv";
    /// XML
    pub const XML: &str = "application/xml";
    /// YAML
    pub const YAML: &str = "application/x-yaml";
    /// PDF
    pub const PDF: &str = "application/pdf";
    /// 二进制流
    pub const OCTET_STREAM: &str = "application/octet-stream";
}

/// 资源注册表
#[derive(Default)]
pub struct ResourceRegistry {
    resources: HashMap<String, ResourceDefinition>,
}

impl ResourceRegistry {
    /// 创建新的注册表
    pub fn new() -> Self {
        Self::default()
    }

    /// 注册资源
    pub fn register(&mut self, resource: ResourceDefinition) -> Result<(), DshToolError> {
        resource
            .validate_uri()
            .map_err(DshToolError::definition_error)?;
        if self.resources.contains_key(&resource.uri) {
            return Err(DshToolError::definition_error(format!(
                "资源 '{}' 已存在",
                resource.uri
            )));
        }
        let uri = resource.uri.clone();
        self.resources.insert(uri, resource);
        Ok(())
    }

    /// 获取资源定义
    pub fn get(&self, uri: &str) -> Option<&ResourceDefinition> {
        self.resources.get(uri)
    }

    /// 列出所有资源
    pub fn list(&self) -> Vec<&ResourceDefinition> {
        self.resources.values().collect()
    }

    /// 按协议（业务域）列出资源
    pub fn list_by_scheme(&self, scheme: &str) -> Vec<&ResourceDefinition> {
        self.resources
            .values()
            .filter(|r| r.uri.starts_with(&format!("{}://", scheme)))
            .collect()
    }

    /// 按分类列出资源
    pub fn list_by_category(&self, category: &str) -> Vec<&ResourceDefinition> {
        self.resources
            .values()
            .filter(|r| r.category.as_deref() == Some(category))
            .collect()
    }

    /// 资源数量
    pub fn count(&self) -> usize {
        self.resources.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_resource_definition_validation() {
        let valid = ResourceDefinition::new(
            "erp://sales-order/SO-001",
            "销售订单",
            "销售订单详细信息",
            mime_types::JSON,
        );
        assert!(valid.validate_uri().is_ok());

        let empty = ResourceDefinition::new("", "空", "空", mime_types::TEXT);
        assert!(empty.validate_uri().is_err());

        let no_separator =
            ResourceDefinition::new("erp-sales-order", "无分隔符", "无", mime_types::TEXT);
        assert!(no_separator.validate_uri().is_err());

        let empty_scheme = ResourceDefinition::new("://path", "空协议", "空", mime_types::TEXT);
        assert!(empty_scheme.validate_uri().is_err());
    }

    #[test]
    fn test_resource_uri_parsing() {
        let resource = ResourceDefinition::new(
            "erp://sales-order/SO-001",
            "销售订单",
            "销售订单",
            mime_types::JSON,
        );
        let parts = resource.parse_uri().unwrap();
        assert_eq!(parts.scheme, "erp");
        assert_eq!(parts.resource_type, "sales-order");
        assert_eq!(parts.resource_id.as_deref(), Some("SO-001"));
    }

    #[test]
    fn test_resource_content_text() {
        let content = ResourceContent::text(
            "erp://sales-order/SO-001",
            mime_types::JSON,
            r#"{"order_id": "SO-001"}"#,
        );
        assert_eq!(content.uri, "erp://sales-order/SO-001");
        assert_eq!(content.mime_type, mime_types::JSON);
        assert!(content.text.is_some());
    }

    #[test]
    fn test_resource_content_json() {
        let value = serde_json::json!({"order_id": "SO-001", "amount": 100});
        let content = ResourceContent::json("erp://sales-order/SO-001", &value).unwrap();
        assert_eq!(content.mime_type, mime_types::JSON);
        assert!(content.text.unwrap().contains("SO-001"));
    }

    #[test]
    fn test_resource_registry() {
        let mut registry = ResourceRegistry::new();

        let resource = ResourceDefinition::new(
            "erp://sales-order/SO-001",
            "销售订单",
            "销售订单",
            mime_types::JSON,
        )
        .with_category("sales");

        registry.register(resource).unwrap();
        assert_eq!(registry.count(), 1);

        let resources = registry.list();
        assert_eq!(resources.len(), 1);

        let by_scheme = registry.list_by_scheme("erp");
        assert_eq!(by_scheme.len(), 1);

        let by_category = registry.list_by_category("sales");
        assert_eq!(by_category.len(), 1);
    }
}
