//! 事件 Schema 注册表模块
//!
//! 集中管理事件 payload 的 JSON Schema，提供注册、查询、校验、文档生成与导入导出能力。
//! 内置一个轻量级 JSON Schema 校验器，支持常见的核心关键字：
//! - `type`（object/array/string/number/integer/boolean/null）
//! - `required`
//! - `properties` / `additionalProperties`
//! - `items`（数组元素）
//! - `enum`
//! - `minimum` / `maximum` / `minLength` / `maxLength`
//!
//! 如需完整 JSON Schema Draft 2020-12 支持，可后续接入 `jsonschema` crate。

use chrono::{DateTime, Utc};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tracing::info;
use uuid::Uuid;

use super::error::{EventError, EventResult};

/// 事件 Schema 定义
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventSchema {
    pub event_type: String,
    pub schema_id: Uuid,
    pub json_schema: serde_json::Value,
    pub description: String,
    pub payload_example: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Schema 校验结果
#[derive(Debug, Clone)]
pub struct ValidationResult {
    pub valid: bool,
    pub errors: Vec<String>,
}

impl ValidationResult {
    pub fn ok() -> Self {
        Self {
            valid: true,
            errors: Vec::new(),
        }
    }

    pub fn fail(err: impl Into<String>) -> Self {
        Self {
            valid: false,
            errors: vec![err.into()],
        }
    }

    pub fn add_error(&mut self, err: impl Into<String>) {
        self.valid = false;
        self.errors.push(err.into());
    }
}

/// Schema 注册表
pub struct SchemaRegistry {
    schemas: Arc<RwLock<HashMap<String, EventSchema>>>,
}

impl Default for SchemaRegistry {
    fn default() -> Self {
        Self::new()
    }
}

impl SchemaRegistry {
    pub fn new() -> Self {
        Self {
            schemas: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// 注册事件 Schema
    ///
    /// 如果 `event_type` 已存在 Schema，将覆盖现有条目（保留 schema_id 不变，
    /// 仅更新 schema、description 与 updated_at）。
    pub fn register(
        &self,
        event_type: &str,
        schema: serde_json::Value,
        description: &str,
    ) -> EventResult<Uuid> {
        let mut schemas = self.schemas.write();
        let now = Utc::now();
        if let Some(existing) = schemas.get_mut(event_type) {
            existing.json_schema = schema;
            existing.description = description.to_string();
            existing.updated_at = now;
            info!(event_type = %event_type, "更新事件 Schema");
            Ok(existing.schema_id)
        } else {
            let schema_id = Uuid::new_v4();
            let event_schema = EventSchema {
                event_type: event_type.to_string(),
                schema_id,
                json_schema: schema,
                description: description.to_string(),
                payload_example: None,
                created_at: now,
                updated_at: now,
            };
            schemas.insert(event_type.to_string(), event_schema);
            info!(event_type = %event_type, %schema_id, "注册事件 Schema");
            Ok(schema_id)
        }
    }

    /// 设置 payload 示例
    pub fn set_example(&self, event_type: &str, example: serde_json::Value) -> EventResult<()> {
        let mut schemas = self.schemas.write();
        let entry = schemas
            .get_mut(event_type)
            .ok_or_else(|| EventError::InvalidEventType(event_type.to_string()))?;
        entry.payload_example = Some(example);
        entry.updated_at = Utc::now();
        Ok(())
    }

    /// 获取事件 Schema
    pub fn get(&self, event_type: &str) -> Option<EventSchema> {
        self.schemas.read().get(event_type).cloned()
    }

    /// 校验事件 payload 是否符合 Schema
    pub fn validate(&self, event_type: &str, payload: &serde_json::Value) -> ValidationResult {
        let schema_json = {
            let schemas = self.schemas.read();
            let Some(schema) = schemas.get(event_type) else {
                return ValidationResult::fail(format!("事件 {} 未注册 Schema", event_type));
            };
            schema.json_schema.clone()
        };
        validate_against_schema(payload, &schema_json)
    }

    /// 列出所有 Schema
    pub fn list_all(&self) -> Vec<EventSchema> {
        let schemas = self.schemas.read();
        let mut list: Vec<EventSchema> = schemas.values().cloned().collect();
        list.sort_by(|a, b| a.event_type.cmp(&b.event_type));
        list
    }

    /// 生成 Schema 文档（Markdown 格式）
    pub fn generate_documentation(&self) -> String {
        let schemas = self.schemas.read();
        let mut list: Vec<&EventSchema> = schemas.values().collect();
        list.sort_by(|a, b| a.event_type.cmp(&b.event_type));

        let mut doc = String::new();
        doc.push_str("# TOPEMS 事件 Schema 文档\n\n");
        doc.push_str(&format!(
            "- Schema 总数: {}\n- 生成时间: {}\n\n",
            list.len(),
            Utc::now()
        ));
        doc.push_str("---\n\n");

        for schema in list {
            doc.push_str(&format!("## {}\n\n", schema.event_type));
            doc.push_str(&format!("- **Schema ID**: {}\n", schema.schema_id));
            doc.push_str(&format!("- **描述**: {}\n", schema.description));
            doc.push_str(&format!("- **创建时间**: {}\n", schema.created_at));
            doc.push_str(&format!("- **更新时间**: {}\n", schema.updated_at));
            doc.push_str("\n### JSON Schema\n\n```json\n");
            doc.push_str(&serde_json::to_string_pretty(&schema.json_schema).unwrap_or_default());
            doc.push_str("\n```\n\n");
            if let Some(example) = &schema.payload_example {
                doc.push_str("### 示例 Payload\n\n```json\n");
                doc.push_str(&serde_json::to_string_pretty(example).unwrap_or_default());
                doc.push_str("\n```\n\n");
            }
            doc.push_str("---\n\n");
        }
        doc
    }

    /// 导出所有 Schema 为 JSON
    pub fn export_all(&self) -> serde_json::Value {
        let schemas = self.schemas.read();
        let list: Vec<EventSchema> = schemas.values().cloned().collect();
        serde_json::to_value(list).unwrap_or(serde_json::Value::Null)
    }

    /// 从 JSON 导入 Schema
    ///
    /// 输入应为 `Vec<EventSchema>` 的 JSON 序列化结果。
    pub fn import_all(&self, data: serde_json::Value) -> EventResult<()> {
        let list: Vec<EventSchema> = serde_json::from_value(data)?;
        let mut schemas = self.schemas.write();
        for entry in list {
            info!(event_type = %entry.event_type, "导入事件 Schema");
            schemas.insert(entry.event_type.clone(), entry);
        }
        Ok(())
    }

    /// 删除 Schema
    pub fn remove(&self, event_type: &str) -> EventResult<Option<EventSchema>> {
        Ok(self.schemas.write().remove(event_type))
    }

    /// 获取 Schema 总数
    pub fn count(&self) -> usize {
        self.schemas.read().len()
    }
}

// ====================================================================
// 轻量级 JSON Schema 校验器
// ====================================================================

/// 校验 `value` 是否符合给定的 `schema`
fn validate_against_schema(
    value: &serde_json::Value,
    schema: &serde_json::Value,
) -> ValidationResult {
    let mut result = ValidationResult::ok();
    if !schema.is_object() {
        return result;
    }
    let obj = schema.as_object().unwrap();

    // type
    if let Some(type_val) = obj.get("type") {
        if let Err(e) = check_type(value, type_val) {
            result.add_error(e);
        }
    }

    // enum
    if let Some(enum_val) = obj.get("enum") {
        if let Some(arr) = enum_val.as_array() {
            if !arr.iter().any(|v| v == value) {
                result.add_error(format!("值 {:?} 不在 enum 列表中", value));
            }
        }
    }

    // 数值范围
    if let Some(num) = value.as_f64() {
        if let Some(min) = obj.get("minimum").and_then(|v| v.as_f64()) {
            if num < min {
                result.add_error(format!("数值 {} 小于 minimum {}", num, min));
            }
        }
        if let Some(max) = obj.get("maximum").and_then(|v| v.as_f64()) {
            if num > max {
                result.add_error(format!("数值 {} 大于 maximum {}", num, max));
            }
        }
    }

    // 字符串长度
    if let Some(s) = value.as_str() {
        if let Some(min_len) = obj.get("minLength").and_then(|v| v.as_u64()) {
            if (s.len() as u64) < min_len {
                result.add_error(format!("字符串长度 {} 小于 minLength {}", s.len(), min_len));
            }
        }
        if let Some(max_len) = obj.get("maxLength").and_then(|v| v.as_u64()) {
            if (s.len() as u64) > max_len {
                result.add_error(format!("字符串长度 {} 大于 maxLength {}", s.len(), max_len));
            }
        }
    }

    // object: required + properties
    if let Some(map) = value.as_object() {
        if let Some(required) = obj.get("required").and_then(|v| v.as_array()) {
            for r in required {
                if let Some(key) = r.as_str() {
                    if !map.contains_key(key) {
                        result.add_error(format!("缺少必填字段: {}", key));
                    }
                }
            }
        }
        if let Some(props) = obj.get("properties").and_then(|v| v.as_object()) {
            for (key, sub_schema) in props {
                if let Some(sub_value) = map.get(key) {
                    let sub_result = validate_against_schema(sub_value, sub_schema);
                    if !sub_result.valid {
                        for e in &sub_result.errors {
                            result.add_error(format!("字段 {}: {}", key, e));
                        }
                    }
                }
            }
        }
        // additionalProperties
        if let Some(additional) = obj.get("additionalProperties") {
            if additional.is_boolean() && !additional.as_bool().unwrap_or(true) {
                if let Some(props) = obj.get("properties").and_then(|v| v.as_object()) {
                    for key in map.keys() {
                        if !props.contains_key(key) {
                            result.add_error(format!("不允许的额外字段: {}", key));
                        }
                    }
                }
            }
        }
    }

    // array: items
    if let Some(arr) = value.as_array() {
        if let Some(items_schema) = obj.get("items") {
            for (idx, item) in arr.iter().enumerate() {
                let sub_result = validate_against_schema(item, items_schema);
                if !sub_result.valid {
                    for e in &sub_result.errors {
                        result.add_error(format!("数组元素[{}]: {}", idx, e));
                    }
                }
            }
        }
    }

    result
}

fn check_type(value: &serde_json::Value, type_val: &serde_json::Value) -> Result<(), String> {
    let expected = match type_val.as_str() {
        Some(s) => s,
        None => return Ok(()),
    };
    let actual = json_type_of(value);
    // integer 也是 number 的特例
    let matched = match expected {
        "number" => matches!(actual, "number" | "integer"),
        other => other == actual,
    };
    if matched {
        Ok(())
    } else {
        Err(format!("类型不匹配：期望 {}，实际 {}", expected, actual))
    }
}

fn json_type_of(value: &serde_json::Value) -> &'static str {
    match value {
        serde_json::Value::Null => "null",
        serde_json::Value::Bool(_) => "boolean",
        serde_json::Value::Number(n) => {
            if n.is_i64() || n.is_u64() {
                "integer"
            } else {
                "number"
            }
        }
        serde_json::Value::String(_) => "string",
        serde_json::Value::Array(_) => "array",
        serde_json::Value::Object(_) => "object",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn sample_schema() -> serde_json::Value {
        json!({
            "type": "object",
            "required": ["event_id", "event_type"],
            "properties": {
                "event_id": { "type": "string" },
                "event_type": { "type": "string" },
                "payload": {
                    "type": "object",
                    "properties": {
                        "name": { "type": "string", "minLength": 1 }
                    }
                },
                "count": { "type": "integer", "minimum": 0 }
            },
            "additionalProperties": false
        })
    }

    #[test]
    fn test_schema_registry_register() {
        let registry = SchemaRegistry::new();
        let id = registry
            .register("user.created", sample_schema(), "用户创建事件")
            .unwrap();
        assert!(!id.to_string().is_empty());

        let schema = registry.get("user.created").expect("Schema 应已注册");
        assert_eq!(schema.event_type, "user.created");
        assert_eq!(schema.description, "用户创建事件");
        assert_eq!(registry.count(), 1);

        // 重复注册应覆盖
        let id2 = registry
            .register("user.created", sample_schema(), "更新描述")
            .unwrap();
        assert_eq!(id, id2, "重复注册应保留原 schema_id");
        assert_eq!(registry.count(), 1);
        let schema = registry.get("user.created").unwrap();
        assert_eq!(schema.description, "更新描述");
    }

    #[test]
    fn test_schema_registry_validate() {
        let registry = SchemaRegistry::new();
        registry
            .register("order.created", sample_schema(), "订单创建事件")
            .unwrap();

        // 校验通过
        let valid_payload = json!({
            "event_id": "abc",
            "event_type": "order.created",
            "payload": { "name": "Alice" },
            "count": 5
        });
        let result = registry.validate("order.created", &valid_payload);
        assert!(result.valid, "errors: {:?}", result.errors);

        // 缺少必填字段
        let invalid_payload = json!({
            "event_id": "abc"
        });
        let result = registry.validate("order.created", &invalid_payload);
        assert!(!result.valid);
        assert!(
            result.errors.iter().any(|e| e.contains("event_type")),
            "应有 event_type 缺失错误"
        );

        // 类型不匹配
        let invalid_payload2 = json!({
            "event_id": "abc",
            "event_type": "order.created",
            "count": "not a number"
        });
        let result = registry.validate("order.created", &invalid_payload2);
        assert!(!result.valid);

        // 未注册的事件类型
        let result = registry.validate("unknown.event", &json!({}));
        assert!(!result.valid);
    }

    #[test]
    fn test_schema_registry_doc_and_export() {
        let registry = SchemaRegistry::new();
        registry
            .register("user.created", sample_schema(), "用户创建事件")
            .unwrap();

        let doc = registry.generate_documentation();
        assert!(doc.contains("user.created"));
        assert!(doc.contains("JSON Schema"));

        let exported = registry.export_all();
        assert!(exported.is_array());

        let registry2 = SchemaRegistry::new();
        registry2.import_all(exported).unwrap();
        assert!(registry2.get("user.created").is_some());
    }

    #[test]
    fn test_event_schema_serde_roundtrip() {
        let now = Utc::now();
        let schema = EventSchema {
            event_type: "test.event".to_string(),
            schema_id: Uuid::new_v4(),
            json_schema: json!({"type": "object"}),
            description: "测试事件".to_string(),
            payload_example: Some(json!({"key": "value"})),
            created_at: now,
            updated_at: now,
        };
        let json_str = serde_json::to_string(&schema).expect("serialize");
        let back: EventSchema = serde_json::from_str(&json_str).expect("deserialize");
        assert_eq!(back.event_type, "test.event");
        assert_eq!(back.schema_id, schema.schema_id);
        assert_eq!(back.description, "测试事件");
        assert!(back.payload_example.is_some());
        assert_eq!(back.created_at, now);
        assert_eq!(back.updated_at, now);
    }

    #[test]
    fn test_event_schema_serde_roundtrip_without_example() {
        let schema = EventSchema {
            event_type: "no.example".to_string(),
            schema_id: Uuid::new_v4(),
            json_schema: json!({"type": "string"}),
            description: "无示例".to_string(),
            payload_example: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let v = serde_json::to_value(&schema).unwrap();
        assert_eq!(v["payload_example"], json!(null));
        let back: EventSchema = serde_json::from_value(v).unwrap();
        assert!(back.payload_example.is_none());
    }

    #[test]
    fn test_event_schema_clone_preserves_fields() {
        let schema = EventSchema {
            event_type: "clone.test".to_string(),
            schema_id: Uuid::new_v4(),
            json_schema: json!({"type": "boolean"}),
            description: "clone".to_string(),
            payload_example: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let cloned = schema.clone();
        assert_eq!(cloned.event_type, schema.event_type);
        assert_eq!(cloned.schema_id, schema.schema_id);
        assert_eq!(cloned.description, schema.description);
    }

    #[test]
    fn test_validation_result_ok_and_fail() {
        let ok = ValidationResult::ok();
        assert!(ok.valid);
        assert!(ok.errors.is_empty());

        let fail = ValidationResult::fail("something wrong");
        assert!(!fail.valid);
        assert_eq!(fail.errors.len(), 1);
        assert_eq!(fail.errors[0], "something wrong");
    }

    #[test]
    fn test_validation_result_add_error() {
        let mut result = ValidationResult::ok();
        assert!(result.valid);
        result.add_error("first error");
        assert!(!result.valid);
        assert_eq!(result.errors.len(), 1);
        result.add_error("second error");
        assert_eq!(result.errors.len(), 2);
        assert_eq!(result.errors[1], "second error");
    }

    #[test]
    fn test_validation_result_clone() {
        let mut result = ValidationResult::ok();
        result.add_error("err1");
        let cloned = result.clone();
        assert!(!cloned.valid);
        assert_eq!(cloned.errors.len(), 1);
        assert_eq!(cloned.errors[0], "err1");
    }

    #[test]
    fn test_schema_registry_default_is_empty() {
        let registry = SchemaRegistry::default();
        assert_eq!(registry.count(), 0);
        assert!(registry.list_all().is_empty());
    }

    #[test]
    fn test_schema_registry_set_example_success() {
        let registry = SchemaRegistry::new();
        registry
            .register("user.created", sample_schema(), "desc")
            .unwrap();
        let result = registry.set_example("user.created", json!({"name": "Alice"}));
        assert!(result.is_ok());
        let schema = registry.get("user.created").unwrap();
        assert!(schema.payload_example.is_some());
    }

    #[test]
    fn test_schema_registry_set_example_unregistered_returns_error() {
        let registry = SchemaRegistry::new();
        let result = registry.set_example("nonexistent", json!({}));
        assert!(result.is_err());
        match result.unwrap_err() {
            EventError::InvalidEventType(s) => assert_eq!(s, "nonexistent"),
            other => panic!("Expected InvalidEventType, got {other:?}"),
        }
    }

    #[test]
    fn test_schema_registry_list_all_is_sorted() {
        let registry = SchemaRegistry::new();
        registry.register("c.event", json!({}), "c").unwrap();
        registry.register("a.event", json!({}), "a").unwrap();
        registry.register("b.event", json!({}), "b").unwrap();
        let list = registry.list_all();
        assert_eq!(list.len(), 3);
        assert_eq!(list[0].event_type, "a.event");
        assert_eq!(list[1].event_type, "b.event");
        assert_eq!(list[2].event_type, "c.event");
    }

    #[test]
    fn test_schema_registry_remove_existing() {
        let registry = SchemaRegistry::new();
        registry.register("to.remove", json!({}), "desc").unwrap();
        assert_eq!(registry.count(), 1);
        let removed = registry.remove("to.remove").unwrap();
        assert!(removed.is_some());
        assert_eq!(removed.unwrap().event_type, "to.remove");
        assert_eq!(registry.count(), 0);
        assert!(registry.get("to.remove").is_none());
    }

    #[test]
    fn test_schema_registry_remove_nonexistent_returns_none() {
        let registry = SchemaRegistry::new();
        let result = registry.remove("nonexistent").unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn test_schema_registry_export_all_empty() {
        let registry = SchemaRegistry::new();
        let exported = registry.export_all();
        assert!(exported.is_array());
        assert_eq!(exported.as_array().unwrap().len(), 0);
    }

    #[test]
    fn test_schema_registry_import_all_invalid_data_returns_err() {
        let registry = SchemaRegistry::new();
        let result = registry.import_all(json!("not an array"));
        assert!(result.is_err());
    }

    #[test]
    fn test_schema_registry_get_nonexistent_returns_none() {
        let registry = SchemaRegistry::new();
        assert!(registry.get("nonexistent").is_none());
    }

    #[test]
    fn test_validate_against_schema_array_items() {
        let schema = json!({
            "type": "array",
            "items": { "type": "integer", "minimum": 0 }
        });
        let valid = json!([1, 2, 3]);
        let result = validate_against_schema(&valid, &schema);
        assert!(result.valid, "errors: {:?}", result.errors);

        let invalid = json!([1, -2, 3]);
        let result = validate_against_schema(&invalid, &schema);
        assert!(!result.valid);
        assert!(result.errors.iter().any(|e| e.contains("数组元素[1]")));
    }

    #[test]
    fn test_validate_against_schema_enum_constraint() {
        let schema = json!({
            "type": "string",
            "enum": ["active", "inactive", "pending"]
        });
        let valid = json!("active");
        assert!(validate_against_schema(&valid, &schema).valid);

        let invalid = json!("unknown");
        let result = validate_against_schema(&invalid, &schema);
        assert!(!result.valid);
        assert!(result.errors.iter().any(|e| e.contains("enum")));
    }

    #[test]
    fn test_validate_against_schema_string_max_length() {
        let schema = json!({
            "type": "string",
            "minLength": 2,
            "maxLength": 5
        });
        assert!(validate_against_schema(&json!("abc"), &schema).valid);
        assert!(!validate_against_schema(&json!("a"), &schema).valid);
        assert!(!validate_against_schema(&json!("abcdef"), &schema).valid);
    }

    #[test]
    fn test_validate_against_schema_number_maximum() {
        let schema = json!({
            "type": "number",
            "minimum": 10,
            "maximum": 100
        });
        assert!(validate_against_schema(&json!(50), &schema).valid);
        assert!(!validate_against_schema(&json!(5), &schema).valid);
        assert!(!validate_against_schema(&json!(101), &schema).valid);
    }

    #[test]
    fn test_validate_against_schema_additional_properties_false() {
        let schema = json!({
            "type": "object",
            "properties": {
                "name": { "type": "string" }
            },
            "additionalProperties": false
        });
        let valid = json!({"name": "Alice"});
        assert!(validate_against_schema(&valid, &schema).valid);

        let invalid = json!({"name": "Alice", "extra": "field"});
        let result = validate_against_schema(&invalid, &schema);
        assert!(!result.valid);
        assert!(result.errors.iter().any(|e| e.contains("额外字段")));
    }

    #[test]
    fn test_json_type_of_all_variants() {
        assert_eq!(json_type_of(&json!(null)), "null");
        assert_eq!(json_type_of(&json!(true)), "boolean");
        assert_eq!(json_type_of(&json!(42)), "integer");
        assert_eq!(json_type_of(&json!(42u64)), "integer");
        assert_eq!(json_type_of(&json!(2.5)), "number");
        assert_eq!(json_type_of(&json!("hello")), "string");
        assert_eq!(json_type_of(&json!([1, 2])), "array");
        assert_eq!(json_type_of(&json!({"k": "v"})), "object");
    }

    #[test]
    fn test_check_type_number_accepts_integer() {
        // "number" 类型应接受 integer（特例）
        assert!(check_type(&json!(42), &json!("number")).is_ok());
        assert!(check_type(&json!(2.5), &json!("number")).is_ok());
        // "integer" 类型不接受浮点数
        assert!(check_type(&json!(42), &json!("integer")).is_ok());
        assert!(check_type(&json!(2.5), &json!("integer")).is_err());
        // 类型不匹配
        assert!(check_type(&json!("str"), &json!("integer")).is_err());
    }
}
