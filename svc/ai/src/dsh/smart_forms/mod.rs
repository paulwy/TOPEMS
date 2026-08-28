//! 智能表单模块
//!
//! 提供 AI 驱动的表单智能功能：
//! - AI 表单填充（根据上下文自动填充表单字段）
//! - 表单校验（AI 辅助数据校验和错误提示）
//! - 智能建议（根据历史数据提供填写建议）
//! - 表单模板生成（自然语言 → 表单模板）

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// 表单定义
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormDefinition {
    /// 表单 ID
    pub id: String,
    /// 表单名称
    pub name: String,
    /// 表单描述
    pub description: String,
    /// 表单分类
    pub category: String,
    /// 字段列表
    pub fields: Vec<FormField>,
    /// 版本号
    pub version: String,
    /// 是否启用 AI 填充
    #[serde(default)]
    pub ai_fill_enabled: bool,
    /// 是否启用 AI 校验
    #[serde(default)]
    pub ai_validation_enabled: bool,
    /// 创建时间
    pub created_at: String,
    /// 更新时间
    pub updated_at: String,
}

/// 表单字段
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormField {
    /// 字段 ID
    pub id: String,
    /// 字段名称
    pub name: String,
    /// 字段标签
    pub label: String,
    /// 字段类型
    pub field_type: FieldType,
    /// 是否必填
    #[serde(default)]
    pub required: bool,
    /// 占位符
    #[serde(skip_serializing_if = "Option::is_none")]
    pub placeholder: Option<String>,
    /// 默认值
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default_value: Option<String>,
    /// 验证规则
    #[serde(skip_serializing_if = "Option::is_none")]
    pub validation: Option<FieldValidation>,
    /// 选项（下拉框、单选框等）
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub options: Vec<FieldOption>,
    /// 字段分组
    #[serde(skip_serializing_if = "Option::is_none")]
    pub group: Option<String>,
    /// 排序
    #[serde(default)]
    pub order: i32,
    /// 是否只读
    #[serde(default)]
    pub readonly: bool,
    /// 是否隐藏
    #[serde(default)]
    pub hidden: bool,
}

/// 字段类型
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum FieldType {
    /// 文本输入
    Text,
    /// 多行文本
    Textarea,
    /// 数字
    Number,
    /// 整数
    Integer,
    /// 小数
    Decimal,
    /// 日期
    Date,
    /// 时间
    Time,
    /// 日期时间
    DateTime,
    /// 邮箱
    Email,
    /// 电话
    Phone,
    /// URL
    Url,
    /// 下拉选择
    Select,
    /// 单选
    Radio,
    /// 多选
    Checkbox,
    /// 开关
    Switch,
    /// 文件上传
    File,
    /// 图片上传
    Image,
    /// 富文本
    RichText,
    /// 地址
    Address,
    /// 货币
    Currency,
    /// 百分比
    Percentage,
    /// 评分
    Rating,
    /// 签名
    Signature,
}

/// 字段验证规则
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldValidation {
    /// 最小长度
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min_length: Option<usize>,
    /// 最大长度
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_length: Option<usize>,
    /// 最小值
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min_value: Option<f64>,
    /// 最大值
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_value: Option<f64>,
    /// 正则表达式
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pattern: Option<String>,
    /// 自定义验证规则
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub custom_rules: Vec<CustomValidationRule>,
}

/// 自定义验证规则
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomValidationRule {
    /// 规则名称
    pub name: String,
    /// 规则描述
    pub description: String,
    /// 验证表达式
    pub expression: String,
    /// 错误消息
    pub error_message: String,
}

/// 字段选项
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldOption {
    /// 选项值
    pub value: String,
    /// 选项标签
    pub label: String,
    /// 是否禁用
    #[serde(default)]
    pub disabled: bool,
}

/// 表单数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormData {
    /// 表单 ID
    pub form_id: String,
    /// 字段值映射
    pub values: HashMap<String, FormFieldValue>,
    /// 提交时间
    #[serde(skip_serializing_if = "Option::is_none")]
    pub submitted_at: Option<String>,
}

/// 表单字段值
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormFieldValue {
    /// 字段 ID
    pub field_id: String,
    /// 字段值
    pub value: serde_json::Value,
    /// 是否由 AI 填充
    #[serde(default)]
    pub ai_filled: bool,
    /// AI 填充置信度
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ai_confidence: Option<f32>,
}

/// AI 填充请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiFillRequest {
    /// 表单 ID
    pub form_id: String,
    /// 上下文数据
    pub context: HashMap<String, serde_json::Value>,
    /// 已填写的字段
    pub existing_values: HashMap<String, serde_json::Value>,
    /// 需要填充的字段（空表示全部）
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub target_fields: Vec<String>,
}

/// AI 填充结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiFillResult {
    /// 填充的字段
    pub filled_fields: Vec<AiFilledField>,
    /// 建议的字段值
    pub suggestions: Vec<AiSuggestion>,
    /// 总体置信度
    pub overall_confidence: f32,
}

/// AI 填充的字段
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiFilledField {
    /// 字段 ID
    pub field_id: String,
    /// 字段值
    pub value: serde_json::Value,
    /// 置信度
    pub confidence: f32,
    /// 填充原因
    pub reason: String,
}

/// AI 建议
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiSuggestion {
    /// 字段 ID
    pub field_id: String,
    /// 建议值
    pub suggested_value: serde_json::Value,
    /// 置信度
    pub confidence: f32,
    /// 建议原因
    pub reason: String,
    /// 相关历史数据
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub related_history: Vec<serde_json::Value>,
}

/// 表单校验请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationRequest {
    /// 表单 ID
    pub form_id: String,
    /// 表单数据
    pub data: HashMap<String, serde_json::Value>,
    /// 是否启用 AI 校验
    #[serde(default = "default_true")]
    pub ai_enabled: bool,
}

fn default_true() -> bool { true }

/// 表单校验结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    /// 是否通过
    pub valid: bool,
    /// 字段错误
    pub field_errors: Vec<FieldError>,
    /// AI 警告（不阻塞提交）
    pub ai_warnings: Vec<AiWarning>,
    /// 总体评分
    pub overall_score: f32,
}

/// 字段错误
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldError {
    /// 字段 ID
    pub field_id: String,
    /// 错误码
    pub error_code: String,
    /// 错误消息
    pub message: String,
    /// 错误级别
    pub level: ErrorLevel,
    /// 修复建议
    #[serde(skip_serializing_if = "Option::is_none")]
    pub suggestion: Option<String>,
}

/// 错误级别
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ErrorLevel {
    /// 错误（阻塞提交）
    Error,
    /// 警告
    Warning,
    /// 信息
    Info,
}

/// AI 警告
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiWarning {
    /// 字段 ID
    pub field_id: String,
    /// 警告类型
    pub warning_type: String,
    /// 警告消息
    pub message: String,
    /// 置信度
    pub confidence: f32,
    /// 建议
    #[serde(skip_serializing_if = "Option::is_none")]
    pub suggestion: Option<String>,
}

/// 表单模板生成请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateGenerationRequest {
    /// 自然语言描述
    pub description: String,
    /// 表单分类
    pub category: String,
    /// 参考模板 ID
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reference_template_id: Option<String>,
    /// 额外要求
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub requirements: Vec<String>,
}

/// 内置表单模板
pub mod builtin_templates {
    use super::*;

    /// 采购申请表单
    pub fn purchase_request() -> FormDefinition {
        FormDefinition {
            id: "builtin-purchase-request".to_string(),
            name: "采购申请".to_string(),
            description: "用于采购物品的申请审批表单".to_string(),
            category: "procurement".to_string(),
            fields: vec![
                FormField {
                    id: "title".to_string(),
                    name: "title".to_string(),
                    label: "申请标题".to_string(),
                    field_type: FieldType::Text,
                    required: true,
                    placeholder: Some("请输入采购申请标题".to_string()),
                    validation: Some(FieldValidation {
                        min_length: Some(2),
                        max_length: Some(100),
                        min_value: None,
                        max_value: None,
                        pattern: None,
                        custom_rules: vec![],
                    }),
                    options: vec![],
                    group: Some("基本信息".to_string()),
                    order: 1,
                    readonly: false,
                    hidden: false,
                    default_value: None,
                },
                FormField {
                    id: "department".to_string(),
                    name: "department".to_string(),
                    label: "申请部门".to_string(),
                    field_type: FieldType::Select,
                    required: true,
                    placeholder: Some("请选择申请部门".to_string()),
                    validation: None,
                    options: vec![
                        FieldOption { value: "tech".to_string(), label: "技术部".to_string(), disabled: false },
                        FieldOption { value: "sales".to_string(), label: "销售部".to_string(), disabled: false },
                        FieldOption { value: "finance".to_string(), label: "财务部".to_string(), disabled: false },
                        FieldOption { value: "hr".to_string(), label: "人事部".to_string(), disabled: false },
                    ],
                    group: Some("基本信息".to_string()),
                    order: 2,
                    readonly: false,
                    hidden: false,
                    default_value: None,
                },
                FormField {
                    id: "total_amount".to_string(),
                    name: "total_amount".to_string(),
                    label: "采购总金额".to_string(),
                    field_type: FieldType::Currency,
                    required: true,
                    placeholder: Some("请输入采购总金额".to_string()),
                    validation: Some(FieldValidation {
                        min_length: None,
                        max_length: None,
                        min_value: Some(0.01),
                        max_value: Some(1000000.0),
                        pattern: None,
                        custom_rules: vec![],
                    }),
                    options: vec![],
                    group: Some("采购明细".to_string()),
                    order: 3,
                    readonly: false,
                    hidden: false,
                    default_value: None,
                },
                FormField {
                    id: "reason".to_string(),
                    name: "reason".to_string(),
                    label: "采购原因".to_string(),
                    field_type: FieldType::Textarea,
                    required: true,
                    placeholder: Some("请详细说明采购原因和用途".to_string()),
                    validation: Some(FieldValidation {
                        min_length: Some(10),
                        max_length: Some(500),
                        min_value: None,
                        max_value: None,
                        pattern: None,
                        custom_rules: vec![],
                    }),
                    options: vec![],
                    group: Some("采购明细".to_string()),
                    order: 4,
                    readonly: false,
                    hidden: false,
                    default_value: None,
                },
            ],
            version: "1.0.0".to_string(),
            ai_fill_enabled: true,
            ai_validation_enabled: true,
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
        }
    }

    /// 费用报销表单
    pub fn expense_reimbursement() -> FormDefinition {
        FormDefinition {
            id: "builtin-expense-reimbursement".to_string(),
            name: "费用报销".to_string(),
            description: "用于员工费用报销申请".to_string(),
            category: "finance".to_string(),
            fields: vec![
                FormField {
                    id: "expense_type".to_string(),
                    name: "expense_type".to_string(),
                    label: "费用类型".to_string(),
                    field_type: FieldType::Select,
                    required: true,
                    placeholder: None,
                    validation: None,
                    options: vec![
                        FieldOption { value: "travel".to_string(), label: "差旅费".to_string(), disabled: false },
                        FieldOption { value: "meal".to_string(), label: "餐饮费".to_string(), disabled: false },
                        FieldOption { value: "transport".to_string(), label: "交通费".to_string(), disabled: false },
                        FieldOption { value: "office".to_string(), label: "办公用品".to_string(), disabled: false },
                        FieldOption { value: "other".to_string(), label: "其他".to_string(), disabled: false },
                    ],
                    group: Some("基本信息".to_string()),
                    order: 1,
                    readonly: false,
                    hidden: false,
                    default_value: None,
                },
                FormField {
                    id: "amount".to_string(),
                    name: "amount".to_string(),
                    label: "报销金额".to_string(),
                    field_type: FieldType::Currency,
                    required: true,
                    placeholder: Some("请输入报销金额".to_string()),
                    validation: Some(FieldValidation {
                        min_length: None,
                        max_length: None,
                        min_value: Some(0.01),
                        max_value: Some(100000.0),
                        pattern: None,
                        custom_rules: vec![],
                    }),
                    options: vec![],
                    group: Some("费用明细".to_string()),
                    order: 2,
                    readonly: false,
                    hidden: false,
                    default_value: None,
                },
                FormField {
                    id: "expense_date".to_string(),
                    name: "expense_date".to_string(),
                    label: "费用日期".to_string(),
                    field_type: FieldType::Date,
                    required: true,
                    placeholder: None,
                    validation: None,
                    options: vec![],
                    group: Some("费用明细".to_string()),
                    order: 3,
                    readonly: false,
                    hidden: false,
                    default_value: None,
                },
                FormField {
                    id: "description".to_string(),
                    name: "description".to_string(),
                    label: "费用说明".to_string(),
                    field_type: FieldType::Textarea,
                    required: true,
                    placeholder: Some("请详细说明费用情况".to_string()),
                    validation: Some(FieldValidation {
                        min_length: Some(5),
                        max_length: Some(300),
                        min_value: None,
                        max_value: None,
                        pattern: None,
                        custom_rules: vec![],
                    }),
                    options: vec![],
                    group: Some("费用明细".to_string()),
                    order: 4,
                    readonly: false,
                    hidden: false,
                    default_value: None,
                },
            ],
            version: "1.0.0".to_string(),
            ai_fill_enabled: true,
            ai_validation_enabled: true,
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
        }
    }

    /// 获取所有内置模板
    pub fn all_templates() -> Vec<FormDefinition> {
        vec![
            purchase_request(),
            expense_reimbursement(),
        ]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_builtin_templates() {
        let templates = builtin_templates::all_templates();
        assert_eq!(templates.len(), 2);

        let purchase = builtin_templates::purchase_request();
        assert_eq!(purchase.id, "builtin-purchase-request");
        assert_eq!(purchase.fields.len(), 4);
        assert!(purchase.ai_fill_enabled);
        assert!(purchase.ai_validation_enabled);

        let expense = builtin_templates::expense_reimbursement();
        assert_eq!(expense.id, "builtin-expense-reimbursement");
        assert_eq!(expense.fields.len(), 4);
    }

    #[test]
    fn test_field_type_serialization() {
        let text_type = FieldType::Text;
        let json = serde_json::to_string(&text_type).unwrap();
        assert_eq!(json, "\"text\"");

        let select_type = FieldType::Select;
        let json = serde_json::to_string(&select_type).unwrap();
        assert_eq!(json, "\"select\"");
    }

    #[test]
    fn test_validation_result() {
        let result = ValidationResult {
            valid: true,
            field_errors: vec![],
            ai_warnings: vec![],
            overall_score: 95.0,
        };
        assert!(result.valid);
        assert_eq!(result.overall_score, 95.0);
    }
}
