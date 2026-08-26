//! JSON Schema 生成工具。
//!
//! 提供从 Rust 类型生成 JSON Schema 的辅助函数，
//! 用于 MCP 工具的 input_schema 字段。

use serde_json::{json, Value};

/// JSON Schema 类型
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SchemaType {
    /// 字符串
    String,
    /// 整数
    Integer,
    /// 数字
    Number,
    /// 布尔
    Boolean,
    /// 对象
    Object,
    /// 数组
    Array,
    /// 空值
    Null,
}

impl SchemaType {
    /// 转换为 JSON Schema 类型字符串
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::String => "string",
            Self::Integer => "integer",
            Self::Number => "number",
            Self::Boolean => "boolean",
            Self::Object => "object",
            Self::Array => "array",
            Self::Null => "null",
        }
    }
}

/// JSON Schema 构建器
///
/// 用于构建 MCP 工具的 input_schema。
///
/// # 示例
///
/// ```
/// use topems_shared_mcp::schema::SchemaBuilder;
///
/// let schema = SchemaBuilder::object()
///     .property("keyword", SchemaBuilder::string().description("搜索关键词"))
///     .property("page", SchemaBuilder::integer().minimum(1).default(1))
///     .required(&["keyword"])
///     .build();
/// ```
#[derive(Debug, Clone)]
pub struct SchemaBuilder {
    schema_type: SchemaType,
    description: Option<String>,
    properties: Vec<(String, Value)>,
    required: Vec<String>,
    minimum: Option<f64>,
    maximum: Option<f64>,
    min_length: Option<usize>,
    max_length: Option<usize>,
    enum_values: Option<Vec<String>>,
    default: Option<Value>,
    items: Option<Box<SchemaBuilder>>,
    additional_properties: Option<bool>,
}

impl SchemaBuilder {
    /// 创建字符串类型 Schema
    pub fn string() -> Self {
        Self::new(SchemaType::String)
    }

    /// 创建整数类型 Schema
    pub fn integer() -> Self {
        Self::new(SchemaType::Integer)
    }

    /// 创建数字类型 Schema
    pub fn number() -> Self {
        Self::new(SchemaType::Number)
    }

    /// 创建布尔类型 Schema
    pub fn boolean() -> Self {
        Self::new(SchemaType::Boolean)
    }

    /// 创建对象类型 Schema
    pub fn object() -> Self {
        Self::new(SchemaType::Object)
    }

    /// 创建数组类型 Schema
    pub fn array() -> Self {
        Self::new(SchemaType::Array)
    }

    /// 创建新的 SchemaBuilder
    pub fn new(schema_type: SchemaType) -> Self {
        Self {
            schema_type,
            description: None,
            properties: Vec::new(),
            required: Vec::new(),
            minimum: None,
            maximum: None,
            min_length: None,
            max_length: None,
            enum_values: None,
            default: None,
            items: None,
            additional_properties: None,
        }
    }

    /// 设置描述
    pub fn description(mut self, desc: impl Into<String>) -> Self {
        self.description = Some(desc.into());
        self
    }

    /// 添加属性（对象类型）
    pub fn property(mut self, name: impl Into<String>, schema: SchemaBuilder) -> Self {
        self.properties.push((name.into(), schema.build()));
        self
    }

    /// 设置必填字段
    pub fn required(mut self, fields: &[&str]) -> Self {
        self.required = fields.iter().map(|s| s.to_string()).collect();
        self
    }

    /// 设置最小值
    pub fn minimum(mut self, min: f64) -> Self {
        self.minimum = Some(min);
        self
    }

    /// 设置最大值
    pub fn maximum(mut self, max: f64) -> Self {
        self.maximum = Some(max);
        self
    }

    /// 设置最小长度
    pub fn min_length(mut self, min: usize) -> Self {
        self.min_length = Some(min);
        self
    }

    /// 设置最大长度
    pub fn max_length(mut self, max: usize) -> Self {
        self.max_length = Some(max);
        self
    }

    /// 设置枚举值
    pub fn enum_values(mut self, values: &[&str]) -> Self {
        self.enum_values = Some(values.iter().map(|s| s.to_string()).collect());
        self
    }

    /// 设置默认值
    pub fn default(mut self, value: Value) -> Self {
        self.default = Some(value);
        self
    }

    /// 设置数组元素类型
    pub fn items(mut self, schema: SchemaBuilder) -> Self {
        self.items = Some(Box::new(schema));
        self
    }

    /// 设置是否允许额外属性
    pub fn additional_properties(mut self, allowed: bool) -> Self {
        self.additional_properties = Some(allowed);
        self
    }

    /// 构建 JSON Schema
    pub fn build(&self) -> Value {
        let mut schema = json!({
            "type": self.schema_type.as_str(),
        });

        if let Some(ref desc) = self.description {
            schema["description"] = json!(desc);
        }

        if !self.properties.is_empty() {
            let mut props = json!({});
            for (name, value) in &self.properties {
                props[name] = value.clone();
            }
            schema["properties"] = props;
        }

        if !self.required.is_empty() {
            schema["required"] = json!(self.required);
        }

        if let Some(min) = self.minimum {
            schema["minimum"] = json!(min);
        }

        if let Some(max) = self.maximum {
            schema["maximum"] = json!(max);
        }

        if let Some(min) = self.min_length {
            schema["minLength"] = json!(min);
        }

        if let Some(max) = self.max_length {
            schema["maxLength"] = json!(max);
        }

        if let Some(ref values) = self.enum_values {
            schema["enum"] = json!(values);
        }

        if let Some(ref default) = self.default {
            schema["default"] = default.clone();
        }

        if let Some(ref items) = self.items {
            schema["items"] = items.build();
        }

        if let Some(allowed) = self.additional_properties {
            schema["additionalProperties"] = json!(allowed);
        }

        schema
    }
}

/// 创建空的对象 Schema（用于无参数工具）
pub fn empty_object_schema() -> Value {
    json!({
        "type": "object",
        "properties": {},
        "additionalProperties": false,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_string_schema() {
        let schema = SchemaBuilder::string()
            .description("搜索关键词")
            .min_length(1)
            .max_length(100)
            .build();
        assert_eq!(schema["type"], "string");
        assert_eq!(schema["description"], "搜索关键词");
        assert_eq!(schema["minLength"], 1);
        assert_eq!(schema["maxLength"], 100);
    }

    #[test]
    fn test_integer_schema() {
        let schema = SchemaBuilder::integer()
            .minimum(1)
            .maximum(100)
            .default(json!(1))
            .build();
        assert_eq!(schema["type"], "integer");
        assert_eq!(schema["minimum"], 1);
        assert_eq!(schema["maximum"], 100);
        assert_eq!(schema["default"], 1);
    }

    #[test]
    fn test_object_schema_with_properties() {
        let schema = SchemaBuilder::object()
            .property("keyword", SchemaBuilder::string().description("关键词"))
            .property(
                "page",
                SchemaBuilder::integer().minimum(1).default(json!(1)),
            )
            .required(&["keyword"])
            .additional_properties(false)
            .build();
        assert_eq!(schema["type"], "object");
        assert!(schema["properties"]["keyword"].is_object());
        assert!(schema["properties"]["page"].is_object());
        assert_eq!(schema["required"][0], "keyword");
        assert_eq!(schema["additionalProperties"], false);
    }

    #[test]
    fn test_enum_schema() {
        let schema = SchemaBuilder::string()
            .enum_values(&["active", "inactive", "pending"])
            .build();
        assert_eq!(schema["enum"][0], "active");
        assert_eq!(schema["enum"][1], "inactive");
        assert_eq!(schema["enum"][2], "pending");
    }

    #[test]
    fn test_array_schema() {
        let schema = SchemaBuilder::array()
            .items(SchemaBuilder::string())
            .build();
        assert_eq!(schema["type"], "array");
        assert_eq!(schema["items"]["type"], "string");
    }

    #[test]
    fn test_empty_object_schema() {
        let schema = empty_object_schema();
        assert_eq!(schema["type"], "object");
        assert!(schema["properties"].as_object().unwrap().is_empty());
        assert_eq!(schema["additionalProperties"], false);
    }
}
