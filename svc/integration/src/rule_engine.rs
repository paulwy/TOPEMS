//! Rule Engine Module
//!
//! 实现转换规则解析器和执行引擎

use serde_json::Value as JsonValue;

use super::conversion_rules::{
    ConditionalMapping, ConversionExecution, ConversionRule, FieldMapping, RuleStatus, ValueMap,
};
use chrono::Utc;
use uuid::Uuid;

// ==================== Condition Expression Types ====================

/// 条件表达式
#[derive(Debug, Clone)]
pub struct ConditionExpression {
    /// 字段名
    pub field: String,
    /// 操作符
    pub operator: ConditionOperator,
    /// 比较值
    pub value: JsonValue,
}

/// 条件操作符
#[derive(Debug, Clone, PartialEq)]
pub enum ConditionOperator {
    /// 等于
    Eq,
    /// 不等于
    Ne,
    /// 大于
    Gt,
    /// 小于
    Lt,
    /// 大于等于
    Gte,
    /// 小于等于
    Lte,
    /// 包含
    Contains,
    /// 不包含
    NotContains,
    /// 为空
    IsNull,
    /// 不为空
    IsNotNull,
    /// 开头是
    StartsWith,
    /// 结尾是
    EndsWith,
    /// 在列表中
    In,
}

impl ConditionOperator {
    /// 从字符串解析操作符
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "eq" | "=" | "==" => Some(ConditionOperator::Eq),
            "ne" | "!=" | "<>" => Some(ConditionOperator::Ne),
            "gt" | ">" => Some(ConditionOperator::Gt),
            "lt" | "<" => Some(ConditionOperator::Lt),
            "gte" | ">=" => Some(ConditionOperator::Gte),
            "lte" | "<=" => Some(ConditionOperator::Lte),
            "contains" => Some(ConditionOperator::Contains),
            "not_contains" | "notcontains" => Some(ConditionOperator::NotContains),
            "is_null" | "isnull" | "null" => Some(ConditionOperator::IsNull),
            "is_not_null" | "isnotnull" | "notnull" => Some(ConditionOperator::IsNotNull),
            "starts_with" | "startswith" => Some(ConditionOperator::StartsWith),
            "ends_with" | "endswith" => Some(ConditionOperator::EndsWith),
            "in" => Some(ConditionOperator::In),
            _ => None,
        }
    }
}

// ==================== Rule Evaluator ====================

/// 规则评估器
pub struct RuleEvaluator;

impl RuleEvaluator {
    /// 从 JSON 解析条件表达式
    pub fn parse_condition(condition: &JsonValue) -> Result<ConditionExpression, String> {
        let obj = condition
            .as_object()
            .ok_or("Condition must be a JSON object")?;

        let field = obj
            .get("field")
            .and_then(|v| v.as_str())
            .ok_or("Condition must have 'field' property")?
            .to_string();

        let operator_str = obj
            .get("operator")
            .and_then(|v| v.as_str())
            .ok_or("Condition must have 'operator' property")?;

        let operator = ConditionOperator::from_str(operator_str)
            .ok_or(format!("Unknown operator: {}", operator_str))?;

        let value = obj
            .get("value")
            .cloned()
            .ok_or("Condition must have 'value' property")?;

        Ok(ConditionExpression {
            field,
            operator,
            value,
        })
    }

    /// 评估条件是否满足
    pub fn evaluate(condition: &ConditionExpression, data: &JsonValue) -> bool {
        // 支持嵌套字段路径 (如 "order.customer.name")
        let field_value = Self::get_nested_value(data, &condition.field);

        match condition.operator {
            ConditionOperator::IsNull => field_value.is_none(),
            ConditionOperator::IsNotNull => field_value.is_some(),
            ConditionOperator::Eq => Self::compare_eq(&field_value, &condition.value),
            ConditionOperator::Ne => !Self::compare_eq(&field_value, &condition.value),
            ConditionOperator::Gt => {
                Self::compare_num(&field_value, &condition.value, |a, b| a > b)
            }
            ConditionOperator::Lt => {
                Self::compare_num(&field_value, &condition.value, |a, b| a < b)
            }
            ConditionOperator::Gte => {
                Self::compare_num(&field_value, &condition.value, |a, b| a >= b)
            }
            ConditionOperator::Lte => {
                Self::compare_num(&field_value, &condition.value, |a, b| a <= b)
            }
            ConditionOperator::Contains => Self::contains(&field_value, &condition.value),
            ConditionOperator::NotContains => !Self::contains(&field_value, &condition.value),
            ConditionOperator::StartsWith => Self::starts_with(&field_value, &condition.value),
            ConditionOperator::EndsWith => Self::ends_with(&field_value, &condition.value),
            ConditionOperator::In => Self::in_list(&field_value, &condition.value),
        }
    }

    /// 评估触发条件 (可能是复合条件)
    pub fn evaluate_trigger_condition(condition: &JsonValue, data: &JsonValue) -> bool {
        // 检查是否是复合条件 (and/or)
        if let Some(obj) = condition.as_object() {
            if let Some(and_conditions) = obj.get("and") {
                if let Some(conditions) = and_conditions.as_array() {
                    return conditions.iter().all(|c| {
                        Self::parse_condition(c)
                            .map(|cond| Self::evaluate(&cond, data))
                            .unwrap_or(false)
                    });
                }
            }
            if let Some(or_conditions) = obj.get("or") {
                if let Some(conditions) = or_conditions.as_array() {
                    return conditions.iter().any(|c| {
                        Self::parse_condition(c)
                            .map(|cond| Self::evaluate(&cond, data))
                            .unwrap_or(false)
                    });
                }
            }
        }

        // 单个条件
        Self::parse_condition(condition)
            .map(|cond| Self::evaluate(&cond, data))
            .unwrap_or(false)
    }

    /// 获取嵌套字段值
    fn get_nested_value(data: &JsonValue, path: &str) -> Option<JsonValue> {
        let parts: Vec<&str> = path.split('.').collect();
        let mut current = data.clone();

        for part in parts {
            current = current.get(part)?.clone();
        }
        Some(current)
    }

    /// 比较两个值是否相等
    fn compare_eq(left: &Option<JsonValue>, right: &JsonValue) -> bool {
        match left {
            Some(l) => {
                // 字符串比较
                if let (Some(ls), Some(rs)) = (l.as_str(), right.as_str()) {
                    return ls == rs;
                }
                // 数字比较
                if let (Some(ln), Some(rn)) = (l.as_f64(), right.as_f64()) {
                    return (ln - rn).abs() < f64::EPSILON;
                }
                // 布尔比较
                if let (Some(lb), Some(rb)) = (l.as_bool(), right.as_bool()) {
                    return lb == rb;
                }
                // JSON 直接比较
                l == right
            }
            None => right.is_null(),
        }
    }

    /// 数字比较
    fn compare_num<F>(left: &Option<JsonValue>, right: &JsonValue, op: F) -> bool
    where
        F: Fn(f64, f64) -> bool,
    {
        match left {
            Some(l) => {
                if let (Some(ln), Some(rn)) = (l.as_f64(), right.as_f64()) {
                    return op(ln, rn);
                }
                false
            }
            None => false,
        }
    }

    /// 检查是否包含
    fn contains(left: &Option<JsonValue>, right: &JsonValue) -> bool {
        match left {
            Some(l) => {
                if let (Some(ls), Some(rs)) = (l.as_str(), right.as_str()) {
                    return ls.contains(rs);
                }
                if let Some(arr) = l.as_array() {
                    return arr.contains(right);
                }
                false
            }
            None => false,
        }
    }

    /// 检查是否开头是
    fn starts_with(left: &Option<JsonValue>, right: &JsonValue) -> bool {
        match left {
            Some(l) => {
                if let (Some(ls), Some(rs)) = (l.as_str(), right.as_str()) {
                    return ls.starts_with(rs);
                }
                false
            }
            None => false,
        }
    }

    /// 检查是否结尾是
    fn ends_with(left: &Option<JsonValue>, right: &JsonValue) -> bool {
        match left {
            Some(l) => {
                if let (Some(ls), Some(rs)) = (l.as_str(), right.as_str()) {
                    return ls.ends_with(rs);
                }
                false
            }
            None => false,
        }
    }

    /// 检查是否在列表中
    fn in_list(left: &Option<JsonValue>, right: &JsonValue) -> bool {
        match left {
            Some(l) => {
                if let Some(arr) = right.as_array() {
                    return arr.iter().any(|v| Self::compare_eq(&Some(l.clone()), v));
                }
                false
            }
            None => false,
        }
    }
}

// ==================== Field Mapper ====================

/// 字段映射器
pub struct FieldMapper;

impl FieldMapper {
    /// 执行字段映射，将源数据转换为目标数据
    pub fn apply_mappings(
        source_data: &JsonValue,
        mappings: &[FieldMapping],
    ) -> Result<JsonValue, String> {
        let mut result = serde_json::json!({});

        for mapping in mappings {
            let source_value = Self::get_nested_value(source_data, &mapping.source_field);

            let target_value = Self::process_mapping(source_value, mapping, source_data)?;

            // 设置目标字段值
            Self::set_nested_value(&mut result, &mapping.target_field, target_value);
        }

        Ok(result)
    }

    /// 处理单个字段映射
    fn process_mapping(
        source_value: Option<JsonValue>,
        mapping: &FieldMapping,
        source_data: &JsonValue,
    ) -> Result<JsonValue, String> {
        // 检查源值是否存在且非空
        if source_value.is_none() || source_value.as_ref().map(|v| v.is_null()).unwrap_or(true) {
            // 返回默认值
            return Ok(mapping
                .default_value
                .clone()
                .unwrap_or(serde_json::Value::Null));
        }

        let source_val = source_value.unwrap();

        // 优先检查条件映射
        if let Some(ref conditional_mappings) = mapping.conditional_mappings {
            for cond_mapping in conditional_mappings {
                if Self::evaluate_condition(&cond_mapping.condition, source_data) {
                    return Ok(cond_mapping.result.clone());
                }
            }
        }

        // 检查值映射表
        if let Some(ref value_map) = mapping.value_map {
            if let Some(str_val) = source_val.as_str() {
                return Ok(value_map.get(str_val).clone());
            }
        }

        // 检查转换表达式
        if let Some(ref transform) = mapping.transform {
            return Self::apply_transform(&source_val, transform);
        }

        // 返回原始值
        Ok(source_val)
    }

    /// 评估条件表达式
    fn evaluate_condition(condition: &JsonValue, data: &JsonValue) -> bool {
        RuleEvaluator::evaluate_trigger_condition(condition, data)
    }

    /// 获取嵌套字段值
    fn get_nested_value(data: &JsonValue, path: &str) -> Option<JsonValue> {
        let parts: Vec<&str> = path.split('.').collect();
        let mut current = data.clone();

        for part in parts {
            current = current.get(part)?.clone();
        }
        Some(current)
    }

    /// 设置嵌套字段值
    fn set_nested_value(data: &mut JsonValue, path: &str, value: JsonValue) {
        let parts: Vec<&str> = path.split('.').collect();
        let last_idx = parts.len() - 1;

        // 使用索引来操作，避免借用问题
        fn set_at_path(
            data: &mut serde_json::Value,
            parts: &[&str],
            last_idx: usize,
            value: serde_json::Value,
        ) {
            if parts.is_empty() {
                return;
            }

            let part = parts[0];
            let is_last = 0 == last_idx;

            if is_last {
                if let Some(obj) = data.as_object_mut() {
                    obj.insert(part.to_string(), value);
                }
            } else {
                // 确保子对象存在
                if !data.get(part).is_some() {
                    if let Some(obj) = data.as_object_mut() {
                        obj.insert(part.to_string(), serde_json::json!({}));
                    }
                }
                if let Some(next) = data.get_mut(part) {
                    set_at_path(next, &parts[1..], last_idx - 1, value);
                }
            }
        }

        set_at_path(data, &parts, last_idx, value);
    }

    /// 应用转换表达式
    fn apply_transform(value: &JsonValue, transform: &str) -> Result<JsonValue, String> {
        // 支持简单的转换表达式
        // 格式: "field.toUpperCase()" 或 "field.trim()" 等

        let transform_trimmed = transform.trim();

        // toUpperCase 转换
        if transform_trimmed.ends_with(".toUpperCase()") {
            if let Some(_field_path) = transform_trimmed.strip_suffix(".toUpperCase()") {
                if let Some(str_val) = value.as_str() {
                    return Ok(JsonValue::String(str_val.to_uppercase()));
                }
            }
        }

        // toLowerCase 转换
        if transform_trimmed.ends_with(".toLowerCase()") {
            if let Some(_field_path) = transform_trimmed.strip_suffix(".toLowerCase()") {
                if let Some(str_val) = value.as_str() {
                    return Ok(JsonValue::String(str_val.to_lowercase()));
                }
            }
        }

        // trim 转换
        if transform_trimmed.ends_with(".trim()") {
            if let Some(str_val) = value.as_str() {
                return Ok(JsonValue::String(str_val.trim().to_string()));
            }
        }

        // 字符串替换 "field.replace(old, new)"
        if transform_trimmed.contains(".replace(") {
            if let Some(rest) = transform_trimmed.strip_suffix(")") {
                if let Some(old_new) = rest.find(".replace(") {
                    let _field_path = &transform_trimmed[..old_new];
                    let args = &transform_trimmed[old_new + 9..];
                    if let Some((old, new)) = args.split_once(",") {
                        if let Some(str_val) = value.as_str() {
                            return Ok(JsonValue::String(str_val.replace(old.trim(), new.trim())));
                        }
                    }
                }
            }
        }

        // 日期格式化 "field.format('YYYY-MM-DD')"
        if transform_trimmed.contains(".format(") {
            if let Some(str_val) = value.as_str() {
                // 简单的日期格式化
                // 在实际实现中，可以使用 chrono 库进行复杂格式化
                return Ok(JsonValue::String(str_val.to_string()));
            }
        }

        // 如果没有匹配的转换，返回原值
        Ok(value.clone())
    }

    /// 从 JSON 数组解析字段映射
    pub fn parse_field_mappings(mappings: &JsonValue) -> Result<Vec<FieldMapping>, String> {
        let arr = mappings
            .as_array()
            .ok_or("Field mappings must be a JSON array")?;

        let mut result = Vec::new();
        for (idx, item) in arr.iter().enumerate() {
            let obj = item
                .as_object()
                .ok_or(format!("Mapping item {} must be an object", idx))?;

            let source_field = obj
                .get("source_field")
                .and_then(|v| v.as_str())
                .ok_or(format!("Mapping item {} missing source_field", idx))?
                .to_string();

            let target_field = obj
                .get("target_field")
                .and_then(|v| v.as_str())
                .ok_or(format!("Mapping item {} missing target_field", idx))?
                .to_string();

            let default_value = obj.get("default_value").cloned();
            let transform = obj
                .get("transform")
                .and_then(|v| v.as_str())
                .map(String::from);

            // 解析值映射表
            let value_map = obj
                .get("value_map")
                .and_then(|v| serde_json::from_value::<ValueMap>(v.clone()).ok());

            // 解析条件映射列表
            let conditional_mappings = obj
                .get("conditional_mappings")
                .and_then(|v| serde_json::from_value::<Vec<ConditionalMapping>>(v.clone()).ok());

            result.push(FieldMapping {
                source_field,
                target_field,
                default_value,
                transform,
                value_map,
                conditional_mappings,
            });
        }

        Ok(result)
    }
}

// ==================== Conversion Engine ====================

/// 转换执行器
pub struct ConversionEngine;

impl ConversionEngine {
    /// 检查规则是否可以执行
    pub fn can_execute(rule: &ConversionRule, source_data: &JsonValue) -> bool {
        // 检查规则是否启用
        if !rule.is_enabled {
            return false;
        }

        // 检查规则状态
        if rule.status != RuleStatus::Active {
            return false;
        }

        // 检查触发条件
        if let Some(ref condition) = rule.trigger_condition {
            return RuleEvaluator::evaluate_trigger_condition(condition, source_data);
        }

        // 没有触发条件时，直接执行
        true
    }

    /// 执行数据转换
    pub fn execute(
        rule: &ConversionRule,
        source_record_id: &str,
        source_data: &JsonValue,
    ) -> Result<ConversionExecution, String> {
        let start_time = Utc::now();

        // 解析字段映射
        let mappings = FieldMapper::parse_field_mappings(&rule.field_mappings)?;

        // 执行映射转换
        let target_data = FieldMapper::apply_mappings(source_data, &mappings)?;

        let end_time = Utc::now();

        // 创建执行记录
        let execution = ConversionExecution {
            id: Uuid::new_v4(),
            tenant_id: rule.tenant_id,
            rule_id: rule.id,
            rule_code: rule.code.clone(),
            source_record_id: source_record_id.to_string(),
            target_record_id: None, // 目标系统创建后填充
            source_data: Some(source_data.clone()),
            target_data: Some(target_data),
            status: "completed".to_string(),
            retry_count: 0,
            error_message: None,
            started_at: Some(start_time),
            completed_at: Some(end_time),
            created_at: start_time,
        };

        Ok(execution)
    }

    /// 创建待执行的执行记录
    pub fn create_pending_execution(
        rule: &ConversionRule,
        source_record_id: &str,
        source_data: &JsonValue,
    ) -> ConversionExecution {
        let now = Utc::now();

        ConversionExecution {
            id: Uuid::new_v4(),
            tenant_id: rule.tenant_id,
            rule_id: rule.id,
            rule_code: rule.code.clone(),
            source_record_id: source_record_id.to_string(),
            target_record_id: None,
            source_data: Some(source_data.clone()),
            target_data: None,
            status: "pending".to_string(),
            retry_count: 0,
            error_message: None,
            started_at: None,
            completed_at: None,
            created_at: now,
        }
    }
}

// ==================== Rule Repository Trait ====================

/// 规则仓库 trait - 用于解耦数据库操作
pub trait RuleRepository: Send + Sync {
    /// 获取规则
    fn get_rule_by_code(
        &self,
        code: &str,
    ) -> impl std::future::Future<Output = Result<Option<ConversionRule>, String>> + Send;
    /// 保存执行记录
    fn save_execution(
        &self,
        execution: &ConversionExecution,
    ) -> impl std::future::Future<Output = Result<(), String>> + Send;
    /// 更新执行记录
    fn update_execution(
        &self,
        execution: &ConversionExecution,
    ) -> impl std::future::Future<Output = Result<(), String>> + Send;
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::TriggerType;

    #[test]
    fn test_condition_operator_parsing() {
        assert_eq!(
            ConditionOperator::from_str("eq"),
            Some(ConditionOperator::Eq)
        );
        assert_eq!(
            ConditionOperator::from_str("="),
            Some(ConditionOperator::Eq)
        );
        assert_eq!(
            ConditionOperator::from_str("=="),
            Some(ConditionOperator::Eq)
        );
        assert_eq!(
            ConditionOperator::from_str("gt"),
            Some(ConditionOperator::Gt)
        );
        assert_eq!(
            ConditionOperator::from_str(">"),
            Some(ConditionOperator::Gt)
        );
        assert_eq!(
            ConditionOperator::from_str("contains"),
            Some(ConditionOperator::Contains)
        );
        assert_eq!(ConditionOperator::from_str("invalid"), None);
    }

    #[test]
    fn test_parse_condition() {
        let json = serde_json::json!({
            "field": "status",
            "operator": "eq",
            "value": "confirmed"
        });

        let condition = RuleEvaluator::parse_condition(&json).unwrap();
        assert_eq!(condition.field, "status");
        assert_eq!(condition.operator, ConditionOperator::Eq);
        assert_eq!(condition.value, serde_json::json!("confirmed"));
    }

    #[test]
    fn test_evaluate_eq() {
        let condition = ConditionExpression {
            field: "status".to_string(),
            operator: ConditionOperator::Eq,
            value: serde_json::json!("confirmed"),
        };

        let data = serde_json::json!({"status": "confirmed"});
        assert!(RuleEvaluator::evaluate(&condition, &data));

        let data2 = serde_json::json!({"status": "pending"});
        assert!(!RuleEvaluator::evaluate(&condition, &data2));
    }

    #[test]
    fn test_evaluate_nested() {
        let condition = ConditionExpression {
            field: "order.customer.name".to_string(),
            operator: ConditionOperator::Eq,
            value: serde_json::json!("张三"),
        };

        let data = serde_json::json!({
            "order": {
                "customer": {
                    "name": "张三"
                }
            }
        });

        assert!(RuleEvaluator::evaluate(&condition, &data));
    }

    #[test]
    fn test_evaluate_gt() {
        let condition = ConditionExpression {
            field: "quantity".to_string(),
            operator: ConditionOperator::Gt,
            value: serde_json::json!(100),
        };

        let data = serde_json::json!({"quantity": 150});
        assert!(RuleEvaluator::evaluate(&condition, &data));

        let data2 = serde_json::json!({"quantity": 50});
        assert!(!RuleEvaluator::evaluate(&condition, &data2));
    }

    #[test]
    fn test_evaluate_contains() {
        let condition = ConditionExpression {
            field: "tags".to_string(),
            operator: ConditionOperator::Contains,
            value: serde_json::json!("urgent"),
        };

        let data = serde_json::json!({"tags": ["urgent", "important"]});
        assert!(RuleEvaluator::evaluate(&condition, &data));

        let data2 = serde_json::json!({"tags": ["normal", "low"]});
        assert!(!RuleEvaluator::evaluate(&condition, &data2));
    }

    #[test]
    fn test_field_mapping() {
        let mappings = vec![
            FieldMapping {
                source_field: "order_number".to_string(),
                target_field: "source_order_number".to_string(),
                default_value: None,
                transform: None,
                value_map: None,
                conditional_mappings: None,
            },
            FieldMapping {
                source_field: "product_name".to_string(),
                target_field: "product_name".to_string(),
                default_value: None,
                transform: None,
                value_map: None,
                conditional_mappings: None,
            },
            FieldMapping {
                source_field: "notes".to_string(),
                target_field: "description".to_string(),
                default_value: Some(serde_json::json!("无备注")),
                transform: None,
                value_map: None,
                conditional_mappings: None,
            },
        ];

        let source = serde_json::json!({
            "order_number": "SO-2024-001",
            "product_name": "测试产品"
        });

        let result = FieldMapper::apply_mappings(&source, &mappings).unwrap();
        assert_eq!(result["source_order_number"], "SO-2024-001");
        assert_eq!(result["product_name"], "测试产品");
        assert_eq!(result["description"], "无备注");
    }

    #[test]
    fn test_transform_to_uppercase() {
        let value = serde_json::json!("hello");
        let result = FieldMapper::apply_transform(&value, "field.toUpperCase()").unwrap();
        assert_eq!(result, serde_json::json!("HELLO"));
    }

    #[test]
    fn test_transform_to_lowercase() {
        let value = serde_json::json!("HELLO");
        let result = FieldMapper::apply_transform(&value, "field.toLowerCase()").unwrap();
        assert_eq!(result, serde_json::json!("hello"));
    }

    #[test]
    fn test_can_execute() {
        let rule = ConversionRule {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            code: "test".to_string(),
            name: "Test Rule".to_string(),
            description: None,
            source_system: "erp".to_string(),
            source_entity: "sales_order".to_string(),
            target_system: "mes".to_string(),
            target_entity: "production_order".to_string(),
            trigger_type: TriggerType::Event,
            trigger_condition: Some(serde_json::json!({
                "field": "status",
                "operator": "eq",
                "value": "confirmed"
            })),
            field_mappings: serde_json::json!([]),
            transform_script: None,
            status: RuleStatus::Active,
            priority: 10,
            is_enabled: true,
            max_retries: 3,
            retry_interval_secs: 60,
            stop_on_failure: false,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        let data_matched = serde_json::json!({"status": "confirmed"});
        assert!(ConversionEngine::can_execute(&rule, &data_matched));

        let data_not_matched = serde_json::json!({"status": "pending"});
        assert!(!ConversionEngine::can_execute(&rule, &data_not_matched));
    }

    #[test]
    fn test_value_map() {
        let mut mappings = std::collections::HashMap::new();
        mappings.insert("pending".to_string(), serde_json::json!("待处理"));
        mappings.insert("confirmed".to_string(), serde_json::json!("已确认"));
        mappings.insert("shipped".to_string(), serde_json::json!("已发货"));
        mappings.insert("completed".to_string(), serde_json::json!("已完成"));

        let value_map = ValueMap {
            mappings,
            default_value: Some(serde_json::json!("未知状态")),
        };

        assert_eq!(value_map.get("confirmed"), &serde_json::json!("已确认"));
        assert_eq!(value_map.get("shipped"), &serde_json::json!("已发货"));
        assert_eq!(value_map.get("invalid"), &serde_json::json!("未知状态"));
    }

    #[test]
    fn test_field_mapping_with_value_map() {
        let mappings = vec![FieldMapping {
            source_field: "status".to_string(),
            target_field: "order_status".to_string(),
            default_value: None,
            transform: None,
            value_map: {
                let mut map = std::collections::HashMap::new();
                map.insert("pending".to_string(), serde_json::json!("待处理"));
                map.insert("confirmed".to_string(), serde_json::json!("已确认"));
                map.insert("shipped".to_string(), serde_json::json!("已发货"));
                Some(ValueMap {
                    mappings: map,
                    default_value: Some(serde_json::json!("未知状态")),
                })
            },
            conditional_mappings: None,
        }];

        let source = serde_json::json!({"status": "confirmed"});
        let result = FieldMapper::apply_mappings(&source, &mappings).unwrap();
        assert_eq!(result["order_status"], "已确认");

        let source2 = serde_json::json!({"status": "cancelled"});
        let result2 = FieldMapper::apply_mappings(&source2, &mappings).unwrap();
        assert_eq!(result2["order_status"], "未知状态");
    }

    #[test]
    fn test_field_mapping_with_conditional_mappings() {
        let mappings = vec![FieldMapping {
            source_field: "amount".to_string(),
            target_field: "category".to_string(),
            default_value: None,
            transform: None,
            value_map: None,
            conditional_mappings: Some(vec![
                ConditionalMapping {
                    condition: serde_json::json!({
                        "field": "amount",
                        "operator": "lt",
                        "value": 1000
                    }),
                    result: serde_json::json!("small"),
                },
                ConditionalMapping {
                    condition: serde_json::json!({
                        "field": "amount",
                        "operator": "gte",
                        "value": 10000
                    }),
                    result: serde_json::json!("large"),
                },
                ConditionalMapping {
                    condition: serde_json::json!({
                        "field": "amount",
                        "operator": "gte",
                        "value": 1000
                    }),
                    result: serde_json::json!("medium"),
                },
            ]),
        }];

        let source1 = serde_json::json!({"amount": 500});
        let result1 = FieldMapper::apply_mappings(&source1, &mappings).unwrap();
        assert_eq!(result1["category"], "small");

        let source2 = serde_json::json!({"amount": 5000});
        let result2 = FieldMapper::apply_mappings(&source2, &mappings).unwrap();
        assert_eq!(result2["category"], "medium");

        let source3 = serde_json::json!({"amount": 15000});
        let result3 = FieldMapper::apply_mappings(&source3, &mappings).unwrap();
        assert_eq!(result3["category"], "large");
    }

    #[test]
    fn test_field_mapping_conditional_with_nested_field() {
        let mappings = vec![FieldMapping {
            source_field: "order.total".to_string(),
            target_field: "order_level".to_string(),
            default_value: Some(serde_json::json!("normal")),
            transform: None,
            value_map: None,
            conditional_mappings: Some(vec![ConditionalMapping {
                condition: serde_json::json!({
                    "field": "order.total",
                    "operator": "gte",
                    "value": 10000
                }),
                result: serde_json::json!("vip"),
            }]),
        }];

        let source = serde_json::json!({
            "order": {
                "total": 15000
            }
        });
        let result = FieldMapper::apply_mappings(&source, &mappings).unwrap();
        assert_eq!(result["order_level"], "vip");
    }
}
