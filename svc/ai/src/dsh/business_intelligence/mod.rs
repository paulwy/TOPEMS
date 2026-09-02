//! DSH 业务智能模块
//!
//! 提供智能表单（自动填充、验证、生成）和文档智能（解析、生成、摘要）能力。

use std::collections::HashMap;
use std::sync::Arc;

use parking_lot::Mutex;
use serde::{Deserialize, Serialize};

// ============================================================================
// 智能表单
// ============================================================================

/// 表单定义
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormDefinition {
    /// 表单 ID
    pub form_id: String,
    /// 表单名称
    pub name: String,
    /// 表单描述
    pub description: String,
    /// 表单类别
    pub category: String,
    /// 字段定义
    pub fields: Vec<FormField>,
    /// 表单验证规则
    pub validation_rules: Vec<FormValidationRule>,
    /// 表单模板
    pub template: Option<HashMap<String, serde_json::Value>>,
    /// 版本
    pub version: String,
    /// 是否启用
    pub enabled: bool,
}

/// 表单字段
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormField {
    /// 字段 ID
    pub field_id: String,
    /// 字段名称
    pub name: String,
    /// 字段标签
    pub label: String,
    /// 字段类型
    pub field_type: FormFieldType,
    /// 字段描述
    pub description: Option<String>,
    /// 占位符
    pub placeholder: Option<String>,
    /// 默认值
    pub default_value: Option<serde_json::Value>,
    /// 是否必填
    pub required: bool,
    /// 是否只读
    pub read_only: bool,
    /// 是否隐藏
    pub hidden: bool,
    /// 验证规则
    pub validation: Option<FieldValidation>,
    /// 选项（枚举/单选/多选）
    pub options: Option<Vec<FormFieldOption>>,
    /// 字段依赖（显示条件）
    pub depends_on: Option<Vec<FieldDependency>>,
    /// 自动填充配置
    pub auto_fill: Option<AutoFillConfig>,
    /// 字段组
    pub group: Option<String>,
    /// 排序
    pub order: u32,
}

/// 表单字段类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum FormFieldType {
    /// 文本
    Text,
    /// 多行文本
    Textarea,
    /// 数字
    Number,
    /// 整数
    Integer,
    /// 浮点数
    Decimal,
    /// 日期
    Date,
    /// 时间
    Time,
    /// 日期时间
    DateTime,
    /// 布尔
    Boolean,
    /// 单选
    Select,
    /// 多选
    MultiSelect,
    /// 单选按钮
    Radio,
    /// 复选框
    Checkbox,
    /// 文件上传
    File,
    /// 图片
    Image,
    /// 邮箱
    Email,
    /// 电话
    Phone,
    /// URL
    Url,
    /// 密码
    Password,
    /// 颜色
    Color,
    /// 范围
    Range,
    /// 富文本
    RichText,
    /// 标签
    Tags,
    /// 关联记录
    Reference,
    /// 子表单
    SubForm,
    /// 计算字段
    Calculated,
    /// 签名
    Signature,
    /// 其他
    Other,
}

impl FormFieldType {
    pub fn as_str(&self) -> &str {
        match self {
            FormFieldType::Text => "text",
            FormFieldType::Textarea => "textarea",
            FormFieldType::Number => "number",
            FormFieldType::Integer => "integer",
            FormFieldType::Decimal => "decimal",
            FormFieldType::Date => "date",
            FormFieldType::Time => "time",
            FormFieldType::DateTime => "datetime",
            FormFieldType::Boolean => "boolean",
            FormFieldType::Select => "select",
            FormFieldType::MultiSelect => "multiselect",
            FormFieldType::Radio => "radio",
            FormFieldType::Checkbox => "checkbox",
            FormFieldType::File => "file",
            FormFieldType::Image => "image",
            FormFieldType::Email => "email",
            FormFieldType::Phone => "phone",
            FormFieldType::Url => "url",
            FormFieldType::Password => "password",
            FormFieldType::Color => "color",
            FormFieldType::Range => "range",
            FormFieldType::RichText => "richtext",
            FormFieldType::Tags => "tags",
            FormFieldType::Reference => "reference",
            FormFieldType::SubForm => "subform",
            FormFieldType::Calculated => "calculated",
            FormFieldType::Signature => "signature",
            FormFieldType::Other => "other",
        }
    }
}

/// 表单字段选项
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormFieldOption {
    /// 选项值
    pub value: String,
    /// 选项标签
    pub label: String,
    /// 是否禁用
    pub disabled: bool,
    /// 排序
    pub order: u32,
}

/// 字段验证
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldValidation {
    /// 最小长度
    pub min_length: Option<u32>,
    /// 最大长度
    pub max_length: Option<u32>,
    /// 最小值
    pub min_value: Option<f64>,
    /// 最大值
    pub max_value: Option<f64>,
    /// 正则表达式
    pub pattern: Option<String>,
    /// 自定义验证规则
    pub custom_rules: Option<Vec<String>>,
    /// 错误消息
    pub error_message: Option<String>,
}

/// 字段依赖
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldDependency {
    /// 依赖字段 ID
    pub field_id: String,
    /// 依赖条件
    pub condition: DependencyCondition,
    /// 条件值
    pub value: serde_json::Value,
}

/// 依赖条件
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum DependencyCondition {
    /// 等于
    Equals,
    /// 不等于
    NotEquals,
    /// 包含
    Contains,
    /// 不包含
    NotContains,
    /// 大于
    GreaterThan,
    /// 小于
    LessThan,
    /// 为空
    IsEmpty,
    /// 不为空
    IsNotEmpty,
}

/// 自动填充配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutoFillConfig {
    /// 填充来源
    pub source: AutoFillSource,
    /// 来源字段
    pub source_field: Option<String>,
    /// 填充规则
    pub rule: Option<String>,
    /// 是否实时填充
    pub real_time: bool,
}

/// 自动填充来源
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AutoFillSource {
    /// 用户信息
    UserInfo,
    /// 当前时间
    CurrentTime,
    /// 关联记录
    RelatedRecord,
    /// 计算字段
    Calculation,
    /// 外部 API
    ExternalApi,
    /// 历史记录
    History,
    /// AI 推断
    AIInference,
}

/// 表单验证规则
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormValidationRule {
    /// 规则 ID
    pub rule_id: String,
    /// 规则名称
    pub name: String,
    /// 规则类型
    pub rule_type: ValidationRuleType,
    /// 涉及字段
    pub fields: Vec<String>,
    /// 规则表达式
    pub expression: String,
    /// 错误消息
    pub error_message: String,
    /// 严重程度
    pub severity: ValidationSeverity,
}

/// 验证规则类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ValidationRuleType {
    /// 必填验证
    Required,
    /// 格式验证
    Format,
    /// 范围验证
    Range,
    /// 交叉字段验证
    CrossField,
    /// 业务规则验证
    BusinessRule,
    /// 自定义验证
    Custom,
}

/// 验证严重程度
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ValidationSeverity {
    /// 错误
    Error,
    /// 警告
    Warning,
    /// 信息
    Info,
}

/// 表单数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormData {
    /// 表单 ID
    pub form_id: String,
    /// 记录 ID（编辑时）
    pub record_id: Option<String>,
    /// 字段值
    pub values: HashMap<String, serde_json::Value>,
    /// 表单状态
    pub status: FormStatus,
    /// 创建时间
    pub created_at: String,
    /// 更新时间
    pub updated_at: String,
}

/// 表单状态
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum FormStatus {
    /// 草稿
    Draft,
    /// 填写中
    InProgress,
    /// 已提交
    Submitted,
    /// 审核中
    UnderReview,
    /// 已批准
    Approved,
    /// 已拒绝
    Rejected,
    /// 已归档
    Archived,
}

/// 表单验证结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormValidationResult {
    /// 是否有效
    pub is_valid: bool,
    /// 字段错误
    pub field_errors: HashMap<String, Vec<FieldError>>,
    /// 表单级错误
    pub form_errors: Vec<FormError>,
    /// 警告
    pub warnings: Vec<FormWarning>,
    /// 验证时间
    pub validated_at: String,
}

/// 字段错误
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldError {
    /// 错误代码
    pub code: String,
    /// 错误消息
    pub message: String,
    /// 严重程度
    pub severity: ValidationSeverity,
}

/// 表单错误
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormError {
    /// 错误代码
    pub code: String,
    /// 错误消息
    pub message: String,
    /// 涉及字段
    pub fields: Vec<String>,
}

/// 表单警告
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormWarning {
    /// 警告代码
    pub code: String,
    /// 警告消息
    pub message: String,
    /// 涉及字段
    pub fields: Vec<String>,
}

// ============================================================================
// 智能表单引擎
// ============================================================================

/// 智能表单引擎
#[derive(Clone)]
pub struct SmartFormEngine {
    /// 表单定义存储
    forms: Arc<Mutex<HashMap<String, FormDefinition>>>,
}

impl SmartFormEngine {
    /// 创建新的表单引擎
    pub fn new() -> Self {
        Self {
            forms: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// 使用默认配置创建
    pub fn with_defaults() -> Self {
        let engine = Self::new();
        engine.register_default_forms();
        engine
    }

    /// 注册默认表单
    fn register_default_forms(&self) {
        // 采购申请单
        self.register_form(create_purchase_request_form());
        // 费用报销单
        self.register_form(create_expense_report_form());
        // 客户信息表
        self.register_form(create_customer_info_form());
        // 入库单
        self.register_form(create_inbound_order_form());
    }

    /// 注册表单
    pub fn register_form(&self, form: FormDefinition) {
        self.forms.lock().insert(form.form_id.clone(), form);
    }

    /// 获取表单定义
    pub fn get_form(&self, form_id: &str) -> Option<FormDefinition> {
        self.forms.lock().get(form_id).cloned()
    }

    /// 获取所有表单
    pub fn get_all_forms(&self) -> Vec<FormDefinition> {
        self.forms.lock().values().cloned().collect()
    }

    /// 按类别获取表单
    pub fn get_forms_by_category(&self, category: &str) -> Vec<FormDefinition> {
        self.forms
            .lock()
            .values()
            .filter(|f| f.category == category)
            .cloned()
            .collect()
    }

    /// 验证表单数据
    pub fn validate_form(
        &self,
        form_id: &str,
        data: &FormData,
    ) -> Result<FormValidationResult, String> {
        let form = self
            .get_form(form_id)
            .ok_or_else(|| format!("表单 {} 不存在", form_id))?;

        let mut field_errors: HashMap<String, Vec<FieldError>> = HashMap::new();
        let mut form_errors = Vec::new();
        let mut warnings = Vec::new();

        // 验证每个字段
        for field in &form.fields {
            if field.hidden || field.read_only {
                continue;
            }

            let value = data.values.get(&field.field_id);

            // 必填验证
            if field.required {
                let is_empty = match value {
                    None => true,
                    Some(v) => match v {
                        serde_json::Value::Null => true,
                        serde_json::Value::String(s) => s.is_empty(),
                        serde_json::Value::Array(a) => a.is_empty(),
                        _ => false,
                    },
                };

                if is_empty {
                    field_errors
                        .entry(field.field_id.clone())
                        .or_default()
                        .push(FieldError {
                            code: "REQUIRED".to_string(),
                            message: format!("{} 为必填项", field.label),
                            severity: ValidationSeverity::Error,
                        });
                }
            }

            // 字段级验证
            if let Some(validation) = &field.validation {
                if let Some(value) = value {
                    // 长度验证
                    if let Some(min_len) = validation.min_length {
                        if let Some(s) = value.as_str() {
                            if s.len() < min_len as usize {
                                field_errors
                                    .entry(field.field_id.clone())
                                    .or_default()
                                    .push(FieldError {
                                        code: "MIN_LENGTH".to_string(),
                                        message: format!(
                                            "{} 最少需要 {} 个字符",
                                            field.label, min_len
                                        ),
                                        severity: ValidationSeverity::Error,
                                    });
                            }
                        }
                    }

                    if let Some(max_len) = validation.max_length {
                        if let Some(s) = value.as_str() {
                            if s.len() > max_len as usize {
                                field_errors
                                    .entry(field.field_id.clone())
                                    .or_default()
                                    .push(FieldError {
                                        code: "MAX_LENGTH".to_string(),
                                        message: format!("{} 最多 {} 个字符", field.label, max_len),
                                        severity: ValidationSeverity::Error,
                                    });
                            }
                        }
                    }

                    // 数值范围验证
                    if let Some(min_val) = validation.min_value {
                        if let Some(n) = value.as_f64() {
                            if n < min_val {
                                field_errors
                                    .entry(field.field_id.clone())
                                    .or_default()
                                    .push(FieldError {
                                        code: "MIN_VALUE".to_string(),
                                        message: format!("{} 不能小于 {}", field.label, min_val),
                                        severity: ValidationSeverity::Error,
                                    });
                            }
                        }
                    }

                    if let Some(max_val) = validation.max_value {
                        if let Some(n) = value.as_f64() {
                            if n > max_val {
                                field_errors
                                    .entry(field.field_id.clone())
                                    .or_default()
                                    .push(FieldError {
                                        code: "MAX_VALUE".to_string(),
                                        message: format!("{} 不能大于 {}", field.label, max_val),
                                        severity: ValidationSeverity::Error,
                                    });
                            }
                        }
                    }

                    // 正则验证
                    if let Some(pattern) = &validation.pattern {
                        if let Some(s) = value.as_str() {
                            if !regex_match(s, pattern) {
                                field_errors
                                    .entry(field.field_id.clone())
                                    .or_default()
                                    .push(FieldError {
                                        code: "PATTERN".to_string(),
                                        message: validation.error_message.clone().unwrap_or_else(
                                            || format!("{} 格式不正确", field.label),
                                        ),
                                        severity: ValidationSeverity::Error,
                                    });
                            }
                        }
                    }
                }
            }
        }

        // 表单级验证规则
        for rule in &form.validation_rules {
            // 简化处理：检查涉及字段是否都有值
            let all_filled = rule.fields.iter().all(|f| data.values.contains_key(f));
            if !all_filled && rule.rule_type == ValidationRuleType::CrossField {
                match rule.severity {
                    ValidationSeverity::Error => {
                        form_errors.push(FormError {
                            code: rule.rule_id.clone(),
                            message: rule.error_message.clone(),
                            fields: rule.fields.clone(),
                        });
                    }
                    ValidationSeverity::Warning => {
                        warnings.push(FormWarning {
                            code: rule.rule_id.clone(),
                            message: rule.error_message.clone(),
                            fields: rule.fields.clone(),
                        });
                    }
                    _ => {}
                }
            }
        }

        let is_valid = field_errors.is_empty() && form_errors.is_empty();

        Ok(FormValidationResult {
            is_valid,
            field_errors,
            form_errors,
            warnings,
            validated_at: chrono::Utc::now().to_rfc3339(),
        })
    }

    /// 自动填充表单
    pub fn auto_fill_form(
        &self,
        form_id: &str,
        context: &HashMap<String, serde_json::Value>,
    ) -> Result<FormData, String> {
        let form = self
            .get_form(form_id)
            .ok_or_else(|| format!("表单 {} 不存在", form_id))?;

        let mut values = HashMap::new();
        let now = chrono::Utc::now().to_rfc3339();

        for field in &form.fields {
            // 默认值
            if let Some(default) = &field.default_value {
                values.insert(field.field_id.clone(), default.clone());
            }

            // 自动填充
            if let Some(auto_fill) = &field.auto_fill {
                match auto_fill.source {
                    AutoFillSource::CurrentTime => {
                        values.insert(field.field_id.clone(), serde_json::json!(now));
                    }
                    AutoFillSource::UserInfo => {
                        if let Some(source_field) = &auto_fill.source_field {
                            if let Some(user_value) = context.get("user") {
                                if let Some(obj) = user_value.as_object() {
                                    if let Some(val) = obj.get(source_field) {
                                        values.insert(field.field_id.clone(), val.clone());
                                    }
                                }
                            }
                        }
                    }
                    AutoFillSource::RelatedRecord => {
                        if let Some(source_field) = &auto_fill.source_field {
                            if let Some(related) = context.get("related_record") {
                                if let Some(obj) = related.as_object() {
                                    if let Some(val) = obj.get(source_field) {
                                        values.insert(field.field_id.clone(), val.clone());
                                    }
                                }
                            }
                        }
                    }
                    _ => {}
                }
            }
        }

        Ok(FormData {
            form_id: form_id.to_string(),
            record_id: None,
            values,
            status: FormStatus::Draft,
            created_at: now.clone(),
            updated_at: now,
        })
    }

    /// 从自然语言生成表单数据
    pub fn generate_from_text(&self, form_id: &str, text: &str) -> Result<FormData, String> {
        let form = self
            .get_form(form_id)
            .ok_or_else(|| format!("表单 {} 不存在", form_id))?;

        let mut values = HashMap::new();

        // 简化的自然语言解析：提取数字、日期、金额等
        for field in &form.fields {
            match field.field_type {
                FormFieldType::Text | FormFieldType::Textarea => {
                    // 尝试提取描述性文本
                    if text.len() > 10 {
                        values.insert(field.field_id.clone(), serde_json::json!(text));
                    }
                }
                FormFieldType::Number | FormFieldType::Integer | FormFieldType::Decimal => {
                    if let Some(num) = extract_number(text) {
                        values.insert(field.field_id.clone(), serde_json::json!(num));
                    }
                }
                FormFieldType::Date => {
                    if let Some(date) = extract_date(text) {
                        values.insert(field.field_id.clone(), serde_json::json!(date));
                    }
                }
                _ => {}
            }
        }

        let now = chrono::Utc::now().to_rfc3339();

        Ok(FormData {
            form_id: form_id.to_string(),
            record_id: None,
            values,
            status: FormStatus::Draft,
            created_at: now.clone(),
            updated_at: now,
        })
    }

    /// 获取表单数量
    pub fn form_count(&self) -> usize {
        self.forms.lock().len()
    }
}

impl Default for SmartFormEngine {
    fn default() -> Self {
        Self::with_defaults()
    }
}

// ============================================================================
// 默认表单定义
// ============================================================================

/// 创建采购申请单
fn create_purchase_request_form() -> FormDefinition {
    FormDefinition {
        form_id: "purchase_request".to_string(),
        name: "采购申请单".to_string(),
        description: "用于申请采购物料或服务的表单".to_string(),
        category: "采购".to_string(),
        fields: vec![
            FormField {
                field_id: "request_no".to_string(),
                name: "申请单号".to_string(),
                label: "申请单号".to_string(),
                field_type: FormFieldType::Text,
                description: Some("系统自动生成".to_string()),
                placeholder: None,
                default_value: None,
                required: false,
                read_only: true,
                hidden: false,
                validation: None,
                options: None,
                depends_on: None,
                auto_fill: None,
                group: Some("基本信息".to_string()),
                order: 1,
            },
            FormField {
                field_id: "applicant".to_string(),
                name: "申请人".to_string(),
                label: "申请人".to_string(),
                field_type: FormFieldType::Text,
                description: None,
                placeholder: Some("请输入申请人姓名".to_string()),
                default_value: None,
                required: true,
                read_only: false,
                hidden: false,
                validation: Some(FieldValidation {
                    min_length: Some(2),
                    max_length: Some(50),
                    min_value: None,
                    max_value: None,
                    pattern: None,
                    custom_rules: None,
                    error_message: None,
                }),
                options: None,
                depends_on: None,
                auto_fill: Some(AutoFillConfig {
                    source: AutoFillSource::UserInfo,
                    source_field: Some("name".to_string()),
                    rule: None,
                    real_time: false,
                }),
                group: Some("基本信息".to_string()),
                order: 2,
            },
            FormField {
                field_id: "department".to_string(),
                name: "申请部门".to_string(),
                label: "申请部门".to_string(),
                field_type: FormFieldType::Select,
                description: None,
                placeholder: Some("请选择部门".to_string()),
                default_value: None,
                required: true,
                read_only: false,
                hidden: false,
                validation: None,
                options: Some(vec![
                    FormFieldOption {
                        value: "tech".to_string(),
                        label: "技术部".to_string(),
                        disabled: false,
                        order: 1,
                    },
                    FormFieldOption {
                        value: "sales".to_string(),
                        label: "销售部".to_string(),
                        disabled: false,
                        order: 2,
                    },
                    FormFieldOption {
                        value: "finance".to_string(),
                        label: "财务部".to_string(),
                        disabled: false,
                        order: 3,
                    },
                    FormFieldOption {
                        value: "hr".to_string(),
                        label: "人事部".to_string(),
                        disabled: false,
                        order: 4,
                    },
                    FormFieldOption {
                        value: "admin".to_string(),
                        label: "行政部".to_string(),
                        disabled: false,
                        order: 5,
                    },
                ]),
                depends_on: None,
                auto_fill: Some(AutoFillConfig {
                    source: AutoFillSource::UserInfo,
                    source_field: Some("department".to_string()),
                    rule: None,
                    real_time: false,
                }),
                group: Some("基本信息".to_string()),
                order: 3,
            },
            FormField {
                field_id: "request_date".to_string(),
                name: "申请日期".to_string(),
                label: "申请日期".to_string(),
                field_type: FormFieldType::Date,
                description: None,
                placeholder: None,
                default_value: None,
                required: true,
                read_only: false,
                hidden: false,
                validation: None,
                options: None,
                depends_on: None,
                auto_fill: Some(AutoFillConfig {
                    source: AutoFillSource::CurrentTime,
                    source_field: None,
                    rule: None,
                    real_time: false,
                }),
                group: Some("基本信息".to_string()),
                order: 4,
            },
            FormField {
                field_id: "expected_date".to_string(),
                name: "期望到货日期".to_string(),
                label: "期望到货日期".to_string(),
                field_type: FormFieldType::Date,
                description: None,
                placeholder: None,
                default_value: None,
                required: false,
                read_only: false,
                hidden: false,
                validation: None,
                options: None,
                depends_on: None,
                auto_fill: None,
                group: Some("基本信息".to_string()),
                order: 5,
            },
            FormField {
                field_id: "item_name".to_string(),
                name: "采购物品".to_string(),
                label: "采购物品名称".to_string(),
                field_type: FormFieldType::Text,
                description: None,
                placeholder: Some("请输入采购物品名称".to_string()),
                default_value: None,
                required: true,
                read_only: false,
                hidden: false,
                validation: Some(FieldValidation {
                    min_length: Some(2),
                    max_length: Some(200),
                    min_value: None,
                    max_value: None,
                    pattern: None,
                    custom_rules: None,
                    error_message: None,
                }),
                options: None,
                depends_on: None,
                auto_fill: None,
                group: Some("采购明细".to_string()),
                order: 6,
            },
            FormField {
                field_id: "quantity".to_string(),
                name: "数量".to_string(),
                label: "采购数量".to_string(),
                field_type: FormFieldType::Integer,
                description: None,
                placeholder: Some("请输入数量".to_string()),
                default_value: Some(serde_json::json!(1)),
                required: true,
                read_only: false,
                hidden: false,
                validation: Some(FieldValidation {
                    min_length: None,
                    max_length: None,
                    min_value: Some(1.0),
                    max_value: Some(100000.0),
                    pattern: None,
                    custom_rules: None,
                    error_message: None,
                }),
                options: None,
                depends_on: None,
                auto_fill: None,
                group: Some("采购明细".to_string()),
                order: 7,
            },
            FormField {
                field_id: "unit_price".to_string(),
                name: "单价".to_string(),
                label: "预估单价（元）".to_string(),
                field_type: FormFieldType::Decimal,
                description: None,
                placeholder: Some("请输入预估单价".to_string()),
                default_value: None,
                required: true,
                read_only: false,
                hidden: false,
                validation: Some(FieldValidation {
                    min_length: None,
                    max_length: None,
                    min_value: Some(0.01),
                    max_value: Some(1000000.0),
                    pattern: None,
                    custom_rules: None,
                    error_message: None,
                }),
                options: None,
                depends_on: None,
                auto_fill: None,
                group: Some("采购明细".to_string()),
                order: 8,
            },
            FormField {
                field_id: "total_amount".to_string(),
                name: "总金额".to_string(),
                label: "总金额（元）".to_string(),
                field_type: FormFieldType::Calculated,
                description: Some("数量 × 单价".to_string()),
                placeholder: None,
                default_value: None,
                required: false,
                read_only: true,
                hidden: false,
                validation: None,
                options: None,
                depends_on: None,
                auto_fill: Some(AutoFillConfig {
                    source: AutoFillSource::Calculation,
                    source_field: None,
                    rule: Some("quantity * unit_price".to_string()),
                    real_time: true,
                }),
                group: Some("采购明细".to_string()),
                order: 9,
            },
            FormField {
                field_id: "reason".to_string(),
                name: "采购原因".to_string(),
                label: "采购原因".to_string(),
                field_type: FormFieldType::Textarea,
                description: None,
                placeholder: Some("请详细说明采购原因和用途".to_string()),
                default_value: None,
                required: true,
                read_only: false,
                hidden: false,
                validation: Some(FieldValidation {
                    min_length: Some(10),
                    max_length: Some(1000),
                    min_value: None,
                    max_value: None,
                    pattern: None,
                    custom_rules: None,
                    error_message: None,
                }),
                options: None,
                depends_on: None,
                auto_fill: None,
                group: Some("其他信息".to_string()),
                order: 10,
            },
            FormField {
                field_id: "remarks".to_string(),
                name: "备注".to_string(),
                label: "备注".to_string(),
                field_type: FormFieldType::Textarea,
                description: None,
                placeholder: Some("请输入备注信息（选填）".to_string()),
                default_value: None,
                required: false,
                read_only: false,
                hidden: false,
                validation: None,
                options: None,
                depends_on: None,
                auto_fill: None,
                group: Some("其他信息".to_string()),
                order: 11,
            },
        ],
        validation_rules: vec![FormValidationRule {
            rule_id: "amount_check".to_string(),
            name: "金额校验".to_string(),
            rule_type: ValidationRuleType::BusinessRule,
            fields: vec!["quantity".to_string(), "unit_price".to_string()],
            expression: "quantity * unit_price > 0".to_string(),
            error_message: "采购总金额必须大于 0".to_string(),
            severity: ValidationSeverity::Error,
        }],
        template: None,
        version: "1.0".to_string(),
        enabled: true,
    }
}

/// 创建费用报销单
fn create_expense_report_form() -> FormDefinition {
    FormDefinition {
        form_id: "expense_report".to_string(),
        name: "费用报销单".to_string(),
        description: "用于员工费用报销的表单".to_string(),
        category: "财务".to_string(),
        fields: vec![
            FormField {
                field_id: "report_no".to_string(),
                name: "报销单号".to_string(),
                label: "报销单号".to_string(),
                field_type: FormFieldType::Text,
                description: Some("系统自动生成".to_string()),
                placeholder: None,
                default_value: None,
                required: false,
                read_only: true,
                hidden: false,
                validation: None,
                options: None,
                depends_on: None,
                auto_fill: None,
                group: Some("基本信息".to_string()),
                order: 1,
            },
            FormField {
                field_id: "applicant".to_string(),
                name: "报销人".to_string(),
                label: "报销人".to_string(),
                field_type: FormFieldType::Text,
                description: None,
                placeholder: Some("请输入报销人姓名".to_string()),
                default_value: None,
                required: true,
                read_only: false,
                hidden: false,
                validation: None,
                options: None,
                depends_on: None,
                auto_fill: Some(AutoFillConfig {
                    source: AutoFillSource::UserInfo,
                    source_field: Some("name".to_string()),
                    rule: None,
                    real_time: false,
                }),
                group: Some("基本信息".to_string()),
                order: 2,
            },
            FormField {
                field_id: "expense_type".to_string(),
                name: "费用类型".to_string(),
                label: "费用类型".to_string(),
                field_type: FormFieldType::Select,
                description: None,
                placeholder: Some("请选择费用类型".to_string()),
                default_value: None,
                required: true,
                read_only: false,
                hidden: false,
                validation: None,
                options: Some(vec![
                    FormFieldOption {
                        value: "travel".to_string(),
                        label: "差旅费".to_string(),
                        disabled: false,
                        order: 1,
                    },
                    FormFieldOption {
                        value: "entertainment".to_string(),
                        label: "招待费".to_string(),
                        disabled: false,
                        order: 2,
                    },
                    FormFieldOption {
                        value: "office".to_string(),
                        label: "办公费".to_string(),
                        disabled: false,
                        order: 3,
                    },
                    FormFieldOption {
                        value: "transport".to_string(),
                        label: "交通费".to_string(),
                        disabled: false,
                        order: 4,
                    },
                    FormFieldOption {
                        value: "communication".to_string(),
                        label: "通讯费".to_string(),
                        disabled: false,
                        order: 5,
                    },
                    FormFieldOption {
                        value: "training".to_string(),
                        label: "培训费".to_string(),
                        disabled: false,
                        order: 6,
                    },
                    FormFieldOption {
                        value: "other".to_string(),
                        label: "其他".to_string(),
                        disabled: false,
                        order: 7,
                    },
                ]),
                depends_on: None,
                auto_fill: None,
                group: Some("费用明细".to_string()),
                order: 3,
            },
            FormField {
                field_id: "amount".to_string(),
                name: "报销金额".to_string(),
                label: "报销金额（元）".to_string(),
                field_type: FormFieldType::Decimal,
                description: None,
                placeholder: Some("请输入报销金额".to_string()),
                default_value: None,
                required: true,
                read_only: false,
                hidden: false,
                validation: Some(FieldValidation {
                    min_length: None,
                    max_length: None,
                    min_value: Some(0.01),
                    max_value: Some(100000.0),
                    pattern: None,
                    custom_rules: None,
                    error_message: None,
                }),
                options: None,
                depends_on: None,
                auto_fill: None,
                group: Some("费用明细".to_string()),
                order: 4,
            },
            FormField {
                field_id: "expense_date".to_string(),
                name: "费用发生日期".to_string(),
                label: "费用发生日期".to_string(),
                field_type: FormFieldType::Date,
                description: None,
                placeholder: None,
                default_value: None,
                required: true,
                read_only: false,
                hidden: false,
                validation: None,
                options: None,
                depends_on: None,
                auto_fill: None,
                group: Some("费用明细".to_string()),
                order: 5,
            },
            FormField {
                field_id: "description".to_string(),
                name: "费用说明".to_string(),
                label: "费用说明".to_string(),
                field_type: FormFieldType::Textarea,
                description: None,
                placeholder: Some("请详细说明费用发生情况".to_string()),
                default_value: None,
                required: true,
                read_only: false,
                hidden: false,
                validation: Some(FieldValidation {
                    min_length: Some(5),
                    max_length: Some(500),
                    min_value: None,
                    max_value: None,
                    pattern: None,
                    custom_rules: None,
                    error_message: None,
                }),
                options: None,
                depends_on: None,
                auto_fill: None,
                group: Some("费用明细".to_string()),
                order: 6,
            },
            FormField {
                field_id: "invoice_attached".to_string(),
                name: "发票附件".to_string(),
                label: "是否附发票".to_string(),
                field_type: FormFieldType::Boolean,
                description: None,
                placeholder: None,
                default_value: Some(serde_json::json!(true)),
                required: true,
                read_only: false,
                hidden: false,
                validation: None,
                options: None,
                depends_on: None,
                auto_fill: None,
                group: Some("附件信息".to_string()),
                order: 7,
            },
            FormField {
                field_id: "remarks".to_string(),
                name: "备注".to_string(),
                label: "备注".to_string(),
                field_type: FormFieldType::Textarea,
                description: None,
                placeholder: Some("请输入备注信息（选填）".to_string()),
                default_value: None,
                required: false,
                read_only: false,
                hidden: false,
                validation: None,
                options: None,
                depends_on: None,
                auto_fill: None,
                group: Some("其他信息".to_string()),
                order: 8,
            },
        ],
        validation_rules: vec![],
        template: None,
        version: "1.0".to_string(),
        enabled: true,
    }
}

/// 创建客户信息表
fn create_customer_info_form() -> FormDefinition {
    FormDefinition {
        form_id: "customer_info".to_string(),
        name: "客户信息表".to_string(),
        description: "用于录入和维护客户信息的表单".to_string(),
        category: "CRM".to_string(),
        fields: vec![
            FormField {
                field_id: "customer_name".to_string(),
                name: "客户名称".to_string(),
                label: "客户名称".to_string(),
                field_type: FormFieldType::Text,
                description: None,
                placeholder: Some("请输入客户公司或个人名称".to_string()),
                default_value: None,
                required: true,
                read_only: false,
                hidden: false,
                validation: Some(FieldValidation {
                    min_length: Some(2),
                    max_length: Some(200),
                    min_value: None,
                    max_value: None,
                    pattern: None,
                    custom_rules: None,
                    error_message: None,
                }),
                options: None,
                depends_on: None,
                auto_fill: None,
                group: Some("基本信息".to_string()),
                order: 1,
            },
            FormField {
                field_id: "customer_type".to_string(),
                name: "客户类型".to_string(),
                label: "客户类型".to_string(),
                field_type: FormFieldType::Select,
                description: None,
                placeholder: Some("请选择客户类型".to_string()),
                default_value: None,
                required: true,
                read_only: false,
                hidden: false,
                validation: None,
                options: Some(vec![
                    FormFieldOption {
                        value: "enterprise".to_string(),
                        label: "企业客户".to_string(),
                        disabled: false,
                        order: 1,
                    },
                    FormFieldOption {
                        value: "individual".to_string(),
                        label: "个人客户".to_string(),
                        disabled: false,
                        order: 2,
                    },
                    FormFieldOption {
                        value: "government".to_string(),
                        label: "政府机构".to_string(),
                        disabled: false,
                        order: 3,
                    },
                    FormFieldOption {
                        value: "partner".to_string(),
                        label: "合作伙伴".to_string(),
                        disabled: false,
                        order: 4,
                    },
                ]),
                depends_on: None,
                auto_fill: None,
                group: Some("基本信息".to_string()),
                order: 2,
            },
            FormField {
                field_id: "level".to_string(),
                name: "客户等级".to_string(),
                label: "客户等级".to_string(),
                field_type: FormFieldType::Select,
                description: None,
                placeholder: Some("请选择客户等级".to_string()),
                default_value: Some(serde_json::json!("normal")),
                required: true,
                read_only: false,
                hidden: false,
                validation: None,
                options: Some(vec![
                    FormFieldOption {
                        value: "vip".to_string(),
                        label: "VIP客户".to_string(),
                        disabled: false,
                        order: 1,
                    },
                    FormFieldOption {
                        value: "important".to_string(),
                        label: "重要客户".to_string(),
                        disabled: false,
                        order: 2,
                    },
                    FormFieldOption {
                        value: "normal".to_string(),
                        label: "普通客户".to_string(),
                        disabled: false,
                        order: 3,
                    },
                    FormFieldOption {
                        value: "potential".to_string(),
                        label: "潜在客户".to_string(),
                        disabled: false,
                        order: 4,
                    },
                ]),
                depends_on: None,
                auto_fill: None,
                group: Some("基本信息".to_string()),
                order: 3,
            },
            FormField {
                field_id: "contact_person".to_string(),
                name: "联系人".to_string(),
                label: "主要联系人".to_string(),
                field_type: FormFieldType::Text,
                description: None,
                placeholder: Some("请输入联系人姓名".to_string()),
                default_value: None,
                required: true,
                read_only: false,
                hidden: false,
                validation: None,
                options: None,
                depends_on: None,
                auto_fill: None,
                group: Some("联系信息".to_string()),
                order: 4,
            },
            FormField {
                field_id: "phone".to_string(),
                name: "联系电话".to_string(),
                label: "联系电话".to_string(),
                field_type: FormFieldType::Phone,
                description: None,
                placeholder: Some("请输入联系电话".to_string()),
                default_value: None,
                required: true,
                read_only: false,
                hidden: false,
                validation: Some(FieldValidation {
                    min_length: None,
                    max_length: None,
                    min_value: None,
                    max_value: None,
                    pattern: Some(r"^1[3-9]\d{9}$".to_string()),
                    custom_rules: None,
                    error_message: Some("请输入正确的手机号码".to_string()),
                }),
                options: None,
                depends_on: None,
                auto_fill: None,
                group: Some("联系信息".to_string()),
                order: 5,
            },
            FormField {
                field_id: "email".to_string(),
                name: "邮箱".to_string(),
                label: "电子邮箱".to_string(),
                field_type: FormFieldType::Email,
                description: None,
                placeholder: Some("请输入电子邮箱".to_string()),
                default_value: None,
                required: false,
                read_only: false,
                hidden: false,
                validation: Some(FieldValidation {
                    min_length: None,
                    max_length: None,
                    min_value: None,
                    max_value: None,
                    pattern: Some(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$".to_string()),
                    custom_rules: None,
                    error_message: Some("请输入正确的邮箱地址".to_string()),
                }),
                options: None,
                depends_on: None,
                auto_fill: None,
                group: Some("联系信息".to_string()),
                order: 6,
            },
            FormField {
                field_id: "address".to_string(),
                name: "地址".to_string(),
                label: "公司地址".to_string(),
                field_type: FormFieldType::Textarea,
                description: None,
                placeholder: Some("请输入详细地址".to_string()),
                default_value: None,
                required: false,
                read_only: false,
                hidden: false,
                validation: None,
                options: None,
                depends_on: None,
                auto_fill: None,
                group: Some("联系信息".to_string()),
                order: 7,
            },
            FormField {
                field_id: "industry".to_string(),
                name: "所属行业".to_string(),
                label: "所属行业".to_string(),
                field_type: FormFieldType::Select,
                description: None,
                placeholder: Some("请选择所属行业".to_string()),
                default_value: None,
                required: false,
                read_only: false,
                hidden: false,
                validation: None,
                options: Some(vec![
                    FormFieldOption {
                        value: "it".to_string(),
                        label: "信息技术".to_string(),
                        disabled: false,
                        order: 1,
                    },
                    FormFieldOption {
                        value: "finance".to_string(),
                        label: "金融".to_string(),
                        disabled: false,
                        order: 2,
                    },
                    FormFieldOption {
                        value: "manufacturing".to_string(),
                        label: "制造业".to_string(),
                        disabled: false,
                        order: 3,
                    },
                    FormFieldOption {
                        value: "retail".to_string(),
                        label: "零售".to_string(),
                        disabled: false,
                        order: 4,
                    },
                    FormFieldOption {
                        value: "education".to_string(),
                        label: "教育".to_string(),
                        disabled: false,
                        order: 5,
                    },
                    FormFieldOption {
                        value: "healthcare".to_string(),
                        label: "医疗健康".to_string(),
                        disabled: false,
                        order: 6,
                    },
                    FormFieldOption {
                        value: "other".to_string(),
                        label: "其他".to_string(),
                        disabled: false,
                        order: 7,
                    },
                ]),
                depends_on: None,
                auto_fill: None,
                group: Some("其他信息".to_string()),
                order: 8,
            },
            FormField {
                field_id: "remarks".to_string(),
                name: "备注".to_string(),
                label: "备注".to_string(),
                field_type: FormFieldType::Textarea,
                description: None,
                placeholder: Some("请输入备注信息（选填）".to_string()),
                default_value: None,
                required: false,
                read_only: false,
                hidden: false,
                validation: None,
                options: None,
                depends_on: None,
                auto_fill: None,
                group: Some("其他信息".to_string()),
                order: 9,
            },
        ],
        validation_rules: vec![],
        template: None,
        version: "1.0".to_string(),
        enabled: true,
    }
}

/// 创建入库单
fn create_inbound_order_form() -> FormDefinition {
    FormDefinition {
        form_id: "inbound_order".to_string(),
        name: "入库单".to_string(),
        description: "用于商品入库的表单".to_string(),
        category: "WMS".to_string(),
        fields: vec![
            FormField {
                field_id: "order_no".to_string(),
                name: "入库单号".to_string(),
                label: "入库单号".to_string(),
                field_type: FormFieldType::Text,
                description: Some("系统自动生成".to_string()),
                placeholder: None,
                default_value: None,
                required: false,
                read_only: true,
                hidden: false,
                validation: None,
                options: None,
                depends_on: None,
                auto_fill: None,
                group: Some("基本信息".to_string()),
                order: 1,
            },
            FormField {
                field_id: "warehouse".to_string(),
                name: "入库仓库".to_string(),
                label: "入库仓库".to_string(),
                field_type: FormFieldType::Select,
                description: None,
                placeholder: Some("请选择入库仓库".to_string()),
                default_value: None,
                required: true,
                read_only: false,
                hidden: false,
                validation: None,
                options: Some(vec![
                    FormFieldOption {
                        value: "wh_main".to_string(),
                        label: "主仓库".to_string(),
                        disabled: false,
                        order: 1,
                    },
                    FormFieldOption {
                        value: "wh_east".to_string(),
                        label: "东区仓库".to_string(),
                        disabled: false,
                        order: 2,
                    },
                    FormFieldOption {
                        value: "wh_west".to_string(),
                        label: "西区仓库".to_string(),
                        disabled: false,
                        order: 3,
                    },
                    FormFieldOption {
                        value: "wh_temp".to_string(),
                        label: "临时仓库".to_string(),
                        disabled: false,
                        order: 4,
                    },
                ]),
                depends_on: None,
                auto_fill: None,
                group: Some("基本信息".to_string()),
                order: 2,
            },
            FormField {
                field_id: "source_type".to_string(),
                name: "入库类型".to_string(),
                label: "入库类型".to_string(),
                field_type: FormFieldType::Select,
                description: None,
                placeholder: Some("请选择入库类型".to_string()),
                default_value: None,
                required: true,
                read_only: false,
                hidden: false,
                validation: None,
                options: Some(vec![
                    FormFieldOption {
                        value: "purchase".to_string(),
                        label: "采购入库".to_string(),
                        disabled: false,
                        order: 1,
                    },
                    FormFieldOption {
                        value: "return".to_string(),
                        label: "退货入库".to_string(),
                        disabled: false,
                        order: 2,
                    },
                    FormFieldOption {
                        value: "transfer".to_string(),
                        label: "调拨入库".to_string(),
                        disabled: false,
                        order: 3,
                    },
                    FormFieldOption {
                        value: "other".to_string(),
                        label: "其他入库".to_string(),
                        disabled: false,
                        order: 4,
                    },
                ]),
                depends_on: None,
                auto_fill: None,
                group: Some("基本信息".to_string()),
                order: 3,
            },
            FormField {
                field_id: "reference_no".to_string(),
                name: "关联单号".to_string(),
                label: "关联单号".to_string(),
                field_type: FormFieldType::Text,
                description: Some("采购单号/退货单号等".to_string()),
                placeholder: Some("请输入关联单号".to_string()),
                default_value: None,
                required: false,
                read_only: false,
                hidden: false,
                validation: None,
                options: None,
                depends_on: None,
                auto_fill: None,
                group: Some("基本信息".to_string()),
                order: 4,
            },
            FormField {
                field_id: "inbound_date".to_string(),
                name: "入库日期".to_string(),
                label: "入库日期".to_string(),
                field_type: FormFieldType::Date,
                description: None,
                placeholder: None,
                default_value: None,
                required: true,
                read_only: false,
                hidden: false,
                validation: None,
                options: None,
                depends_on: None,
                auto_fill: Some(AutoFillConfig {
                    source: AutoFillSource::CurrentTime,
                    source_field: None,
                    rule: None,
                    real_time: false,
                }),
                group: Some("基本信息".to_string()),
                order: 5,
            },
            FormField {
                field_id: "sku".to_string(),
                name: "商品SKU".to_string(),
                label: "商品SKU".to_string(),
                field_type: FormFieldType::Text,
                description: None,
                placeholder: Some("请输入商品SKU".to_string()),
                default_value: None,
                required: true,
                read_only: false,
                hidden: false,
                validation: None,
                options: None,
                depends_on: None,
                auto_fill: None,
                group: Some("入库明细".to_string()),
                order: 6,
            },
            FormField {
                field_id: "quantity".to_string(),
                name: "入库数量".to_string(),
                label: "入库数量".to_string(),
                field_type: FormFieldType::Integer,
                description: None,
                placeholder: Some("请输入入库数量".to_string()),
                default_value: Some(serde_json::json!(1)),
                required: true,
                read_only: false,
                hidden: false,
                validation: Some(FieldValidation {
                    min_length: None,
                    max_length: None,
                    min_value: Some(1.0),
                    max_value: Some(100000.0),
                    pattern: None,
                    custom_rules: None,
                    error_message: None,
                }),
                options: None,
                depends_on: None,
                auto_fill: None,
                group: Some("入库明细".to_string()),
                order: 7,
            },
            FormField {
                field_id: "location".to_string(),
                name: "存放库位".to_string(),
                label: "存放库位".to_string(),
                field_type: FormFieldType::Text,
                description: None,
                placeholder: Some("请输入存放库位（如 A-01-01）".to_string()),
                default_value: None,
                required: false,
                read_only: false,
                hidden: false,
                validation: None,
                options: None,
                depends_on: None,
                auto_fill: None,
                group: Some("入库明细".to_string()),
                order: 8,
            },
            FormField {
                field_id: "remarks".to_string(),
                name: "备注".to_string(),
                label: "备注".to_string(),
                field_type: FormFieldType::Textarea,
                description: None,
                placeholder: Some("请输入备注信息（选填）".to_string()),
                default_value: None,
                required: false,
                read_only: false,
                hidden: false,
                validation: None,
                options: None,
                depends_on: None,
                auto_fill: None,
                group: Some("其他信息".to_string()),
                order: 9,
            },
        ],
        validation_rules: vec![],
        template: None,
        version: "1.0".to_string(),
        enabled: true,
    }
}

// ============================================================================
// 文档智能
// ============================================================================

/// 文档类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum DocumentType {
    /// PDF
    PDF,
    /// Word
    Word,
    /// Excel
    Excel,
    /// PowerPoint
    PowerPoint,
    /// 文本
    Text,
    /// Markdown
    Markdown,
    /// HTML
    HTML,
    /// JSON
    JSON,
    /// CSV
    CSV,
    /// 图片
    Image,
    /// 其他
    Other,
}

impl DocumentType {
    pub fn as_str(&self) -> &str {
        match self {
            DocumentType::PDF => "pdf",
            DocumentType::Word => "word",
            DocumentType::Excel => "excel",
            DocumentType::PowerPoint => "powerpoint",
            DocumentType::Text => "text",
            DocumentType::Markdown => "markdown",
            DocumentType::HTML => "html",
            DocumentType::JSON => "json",
            DocumentType::CSV => "csv",
            DocumentType::Image => "image",
            DocumentType::Other => "other",
        }
    }

    pub fn from_extension(ext: &str) -> Self {
        match ext.to_lowercase().as_str() {
            "pdf" => DocumentType::PDF,
            "doc" | "docx" => DocumentType::Word,
            "xls" | "xlsx" => DocumentType::Excel,
            "ppt" | "pptx" => DocumentType::PowerPoint,
            "txt" => DocumentType::Text,
            "md" => DocumentType::Markdown,
            "html" | "htm" => DocumentType::HTML,
            "json" => DocumentType::JSON,
            "csv" => DocumentType::CSV,
            "jpg" | "jpeg" | "png" | "gif" | "bmp" => DocumentType::Image,
            _ => DocumentType::Other,
        }
    }
}

/// 文档信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentInfo {
    /// 文档 ID
    pub document_id: String,
    /// 文档名称
    pub name: String,
    /// 文档类型
    pub document_type: DocumentType,
    /// 文件大小（字节）
    pub file_size: u64,
    /// 文档内容（文本）
    pub content: Option<String>,
    /// 文档元数据
    pub metadata: DocumentMetadata,
    /// 上传时间
    pub uploaded_at: String,
    /// 处理状态
    pub processing_status: ProcessingStatus,
}

/// 文档元数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentMetadata {
    /// 作者
    pub author: Option<String>,
    /// 创建时间
    pub created_at: Option<String>,
    /// 修改时间
    pub modified_at: Option<String>,
    /// 页数
    pub page_count: Option<u32>,
    /// 字数
    pub word_count: Option<u64>,
    /// 语言
    pub language: Option<String>,
    /// 标题
    pub title: Option<String>,
    /// 主题
    pub subject: Option<String>,
    /// 关键词
    pub keywords: Option<Vec<String>>,
    /// 自定义属性
    pub custom: HashMap<String, serde_json::Value>,
}

/// 处理状态
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ProcessingStatus {
    /// 待处理
    Pending,
    /// 处理中
    Processing,
    /// 已完成
    Completed,
    /// 失败
    Failed,
}

/// 文档摘要
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentSummary {
    /// 文档 ID
    pub document_id: String,
    /// 摘要类型
    pub summary_type: SummaryType,
    /// 摘要内容
    pub content: String,
    /// 摘要长度（字符数）
    pub length: u32,
    /// 关键句
    pub key_sentences: Vec<String>,
    /// 关键词
    pub keywords: Vec<KeywordWeight>,
    /// 生成时间
    pub generated_at: String,
}

/// 摘要类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SummaryType {
    /// 简短摘要
    Brief,
    /// 标准摘要
    Standard,
    /// 详细摘要
    Detailed,
    /// 章节摘要
    Section,
}

/// 关键词权重
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeywordWeight {
    /// 关键词
    pub keyword: String,
    /// 权重（0-1）
    pub weight: f64,
    /// 出现次数
    pub frequency: u32,
}

/// 文档解析结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentParseResult {
    /// 文档 ID
    pub document_id: String,
    /// 是否成功
    pub success: bool,
    /// 提取的文本
    pub text: Option<String>,
    /// 提取的表格
    pub tables: Vec<DocumentTable>,
    /// 提取的图片
    pub images: Vec<DocumentImage>,
    /// 文档结构
    pub structure: Option<DocumentStructure>,
    /// 错误信息
    pub error: Option<String>,
    /// 解析时间
    pub parsed_at: String,
}

/// 文档表格
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentTable {
    /// 表格 ID
    pub table_id: String,
    /// 表格标题
    pub title: Option<String>,
    /// 表头
    pub headers: Vec<String>,
    /// 表格数据
    pub rows: Vec<Vec<String>>,
    /// 页码
    pub page: Option<u32>,
}

/// 文档图片
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentImage {
    /// 图片 ID
    pub image_id: String,
    /// 图片描述
    pub description: Option<String>,
    /// 图片格式
    pub format: String,
    /// 图片大小（字节）
    pub size: u64,
    /// 页码
    pub page: Option<u32>,
}

/// 文档结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentStructure {
    /// 章节列表
    pub sections: Vec<DocumentSection>,
    /// 目录
    pub table_of_contents: Vec<TOCEntry>,
}

/// 文档章节
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentSection {
    /// 章节 ID
    pub section_id: String,
    /// 章节标题
    pub title: String,
    /// 章节级别（1-6）
    pub level: u8,
    /// 章节内容
    pub content: String,
    /// 子章节
    pub children: Vec<DocumentSection>,
    /// 页码
    pub page: Option<u32>,
}

/// 目录条目
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TOCEntry {
    /// 标题
    pub title: String,
    /// 级别
    pub level: u8,
    /// 页码
    pub page: u32,
}

/// 文档生成请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentGenerationRequest {
    /// 文档类型
    pub document_type: DocumentType,
    /// 文档标题
    pub title: String,
    /// 文档模板
    pub template: Option<String>,
    /// 文档内容
    pub content: DocumentContent,
    /// 样式配置
    pub style: Option<DocumentStyle>,
    /// 元数据
    pub metadata: Option<DocumentMetadata>,
}

/// 文档内容
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentContent {
    /// 章节列表
    pub sections: Vec<DocumentSectionContent>,
}

/// 文档章节内容
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentSectionContent {
    /// 章节标题
    pub title: String,
    /// 章节级别
    pub level: u8,
    /// 段落列表
    pub paragraphs: Vec<String>,
    /// 表格
    pub tables: Vec<DocumentTable>,
    /// 图片
    pub images: Vec<String>,
}

/// 文档样式
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentStyle {
    /// 字体
    pub font_family: Option<String>,
    /// 字号
    pub font_size: Option<f64>,
    /// 行距
    pub line_spacing: Option<f64>,
    /// 页边距
    pub margins: Option<DocumentMargins>,
    /// 主题色
    pub theme_color: Option<String>,
}

/// 文档页边距
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentMargins {
    /// 上边距
    pub top: f64,
    /// 下边距
    pub bottom: f64,
    /// 左边距
    pub left: f64,
    /// 右边距
    pub right: f64,
}

// ============================================================================
// 文档智能引擎
// ============================================================================

/// 文档智能引擎
#[derive(Clone)]
pub struct DocumentIntelligenceEngine {
    /// 文档存储
    documents: Arc<Mutex<HashMap<String, DocumentInfo>>>,
}

impl DocumentIntelligenceEngine {
    /// 创建新的文档智能引擎
    pub fn new() -> Self {
        Self {
            documents: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// 使用默认配置创建
    pub fn with_defaults() -> Self {
        Self::new()
    }

    /// 注册文档
    pub fn register_document(&self, document: DocumentInfo) {
        self.documents
            .lock()
            .insert(document.document_id.clone(), document);
    }

    /// 获取文档
    pub fn get_document(&self, document_id: &str) -> Option<DocumentInfo> {
        self.documents.lock().get(document_id).cloned()
    }

    /// 解析文档
    pub fn parse_document(
        &self,
        document_id: &str,
        content: &str,
    ) -> Result<DocumentParseResult, String> {
        let _document = self
            .get_document(document_id)
            .ok_or_else(|| format!("文档 {} 不存在", document_id))?;

        let text = content.to_string();

        // 提取结构（简化版）
        let structure = self.extract_structure(content);

        // 提取表格（简化版：检测 Markdown 表格）
        let tables = self.extract_tables(content);

        let result = DocumentParseResult {
            document_id: document_id.to_string(),
            success: true,
            text: Some(text),
            tables,
            images: Vec::new(),
            structure: Some(structure),
            error: None,
            parsed_at: chrono::Utc::now().to_rfc3339(),
        };

        // 更新文档状态
        if let Some(doc) = self.documents.lock().get_mut(document_id) {
            doc.content = result.text.clone();
            doc.processing_status = ProcessingStatus::Completed;
            doc.metadata.word_count = Some(content.len() as u64);
        }

        Ok(result)
    }

    /// 提取文档结构
    fn extract_structure(&self, content: &str) -> DocumentStructure {
        let mut sections = Vec::new();
        let mut toc = Vec::new();
        let mut current_section: Option<DocumentSection> = None;

        for line in content.lines() {
            if line.starts_with('#') {
                // 保存当前章节
                if let Some(section) = current_section.take() {
                    sections.push(section);
                }

                let level = line.chars().take_while(|&c| c == '#').count() as u8;
                let title = line.trim_start_matches('#').trim().to_string();

                toc.push(TOCEntry {
                    title: title.clone(),
                    level,
                    page: 1,
                });

                current_section = Some(DocumentSection {
                    section_id: format!("section_{}", sections.len() + 1),
                    title,
                    level,
                    content: String::new(),
                    children: Vec::new(),
                    page: Some(1),
                });
            } else if let Some(section) = current_section.as_mut() {
                if !section.content.is_empty() {
                    section.content.push('\n');
                }
                section.content.push_str(line);
            }
        }

        if let Some(section) = current_section.take() {
            sections.push(section);
        }

        DocumentStructure {
            sections,
            table_of_contents: toc,
        }
    }

    /// 提取表格
    fn extract_tables(&self, content: &str) -> Vec<DocumentTable> {
        let mut tables = Vec::new();
        let lines: Vec<&str> = content.lines().collect();
        let mut i = 0;

        while i < lines.len() {
            if lines[i].contains('|') && i + 1 < lines.len() && lines[i + 1].contains("---") {
                // 检测到 Markdown 表格
                let headers: Vec<String> = lines[i]
                    .split('|')
                    .map(|s| s.trim().to_string())
                    .filter(|s| !s.is_empty())
                    .collect();

                let mut rows = Vec::new();
                let mut j = i + 2;
                while j < lines.len() && lines[j].contains('|') {
                    let row: Vec<String> = lines[j]
                        .split('|')
                        .map(|s| s.trim().to_string())
                        .filter(|s| !s.is_empty())
                        .collect();
                    rows.push(row);
                    j += 1;
                }

                tables.push(DocumentTable {
                    table_id: format!("table_{}", tables.len() + 1),
                    title: None,
                    headers,
                    rows,
                    page: Some(1),
                });

                i = j;
            } else {
                i += 1;
            }
        }

        tables
    }

    /// 生成文档摘要
    pub fn generate_summary(
        &self,
        document_id: &str,
        summary_type: SummaryType,
    ) -> Result<DocumentSummary, String> {
        let document = self
            .get_document(document_id)
            .ok_or_else(|| format!("文档 {} 不存在", document_id))?;

        let content = document
            .content
            .as_deref()
            .ok_or_else(|| "文档内容为空，请先解析文档".to_string())?;

        // 简化的摘要生成：提取关键句
        let sentences: Vec<&str> = content
            .split(['。', '！', '？', '.', '!', '?'])
            .map(|s| s.trim())
            .filter(|s| !s.is_empty() && s.len() > 10)
            .collect();

        let max_sentences = match summary_type {
            SummaryType::Brief => 3,
            SummaryType::Standard => 5,
            SummaryType::Detailed => 10,
            SummaryType::Section => 5,
        };

        let key_sentences: Vec<String> = sentences
            .iter()
            .take(max_sentences)
            .map(|s| s.to_string())
            .collect();

        let summary_content = key_sentences.join("。");
        let summary_length = summary_content.len() as u32;

        // 提取关键词（简化版：高频词）
        let keywords = self.extract_keywords(content, 10);

        Ok(DocumentSummary {
            document_id: document_id.to_string(),
            summary_type,
            content: summary_content,
            length: summary_length,
            key_sentences,
            keywords,
            generated_at: chrono::Utc::now().to_rfc3339(),
        })
    }

    /// 提取关键词
    fn extract_keywords(&self, content: &str, top_n: usize) -> Vec<KeywordWeight> {
        let mut word_freq: HashMap<String, u32> = HashMap::new();

        // 简单分词（按空格和标点）
        for word in content.split(|c: char| c.is_whitespace() || c.is_ascii_punctuation()) {
            let word = word.trim();
            if word.len() >= 2 {
                *word_freq.entry(word.to_string()).or_insert(0) += 1;
            }
        }

        let max_freq = word_freq.values().max().copied().unwrap_or(1) as f64;

        let mut keywords: Vec<KeywordWeight> = word_freq
            .into_iter()
            .map(|(keyword, frequency)| KeywordWeight {
                weight: frequency as f64 / max_freq,
                keyword,
                frequency,
            })
            .collect();

        keywords.sort_by(|a, b| b.frequency.cmp(&a.frequency));
        keywords.truncate(top_n);
        keywords
    }

    /// 生成文档
    pub fn generate_document(
        &self,
        request: DocumentGenerationRequest,
    ) -> Result<DocumentInfo, String> {
        let document_id = format!("doc_{}", uuid::Uuid::new_v4());
        let now = chrono::Utc::now().to_rfc3339();
        let title = request.title.clone();

        // 生成 Markdown 内容
        let mut content = String::new();
        content.push_str(&format!("# {}\n\n", title));

        for section in &request.content.sections {
            let prefix = "#".repeat(section.level as usize);
            content.push_str(&format!("{} {}\n\n", prefix, section.title));

            for paragraph in &section.paragraphs {
                content.push_str(&format!("{}\n\n", paragraph));
            }

            for table in &section.tables {
                if !table.headers.is_empty() {
                    content.push_str(&format!("| {} |\n", table.headers.join(" | ")));
                    content.push_str(&format!(
                        "| {} |\n",
                        table
                            .headers
                            .iter()
                            .map(|_| "---")
                            .collect::<Vec<_>>()
                            .join(" | ")
                    ));
                    for row in &table.rows {
                        content.push_str(&format!("| {} |\n", row.join(" | ")));
                    }
                    content.push('\n');
                }
            }
        }

        let document = DocumentInfo {
            document_id: document_id.clone(),
            name: title.clone(),
            document_type: request.document_type,
            file_size: content.len() as u64,
            content: Some(content),
            metadata: request.metadata.unwrap_or(DocumentMetadata {
                author: None,
                created_at: Some(now.clone()),
                modified_at: Some(now.clone()),
                page_count: Some(1),
                word_count: None,
                language: Some("zh-CN".to_string()),
                title: Some(title),
                subject: None,
                keywords: None,
                custom: HashMap::new(),
            }),
            uploaded_at: now.clone(),
            processing_status: ProcessingStatus::Completed,
        };

        self.register_document(document.clone());

        Ok(document)
    }

    /// 获取文档数量
    pub fn document_count(&self) -> usize {
        self.documents.lock().len()
    }
}

impl Default for DocumentIntelligenceEngine {
    fn default() -> Self {
        Self::with_defaults()
    }
}

// ============================================================================
// 辅助函数
// ============================================================================

/// 简单的正则匹配（避免引入 regex 依赖）
fn regex_match(text: &str, pattern: &str) -> bool {
    // 简化处理：只支持一些常见模式
    if pattern.contains(r"\d") {
        // 数字模式
        return text.chars().all(|c| c.is_ascii_digit());
    }
    if pattern.contains('@') {
        // 邮箱模式
        return text.contains('@') && text.contains('.');
    }
    // 默认：检查是否包含模式中的字面量（去除特殊字符）
    let literal: String = pattern.chars().filter(|c| c.is_alphanumeric()).collect();
    text.contains(&literal)
}

/// 从文本中提取数字
fn extract_number(text: &str) -> Option<f64> {
    let mut current = String::new();
    let mut numbers = Vec::new();

    for c in text.chars() {
        if c.is_ascii_digit() || c == '.' || c == '-' {
            current.push(c);
        } else if !current.is_empty() {
            if let Ok(n) = current.parse::<f64>() {
                numbers.push(n);
            }
            current.clear();
        }
    }

    if !current.is_empty() {
        if let Ok(n) = current.parse::<f64>() {
            numbers.push(n);
        }
    }

    numbers.first().copied()
}

/// 从文本中提取日期
fn extract_date(text: &str) -> Option<String> {
    // 简单的日期提取：匹配 YYYY-MM-DD 或 YYYY/MM/DD 格式
    let separators = ['-', '/'];

    for sep in &separators {
        let bytes: Vec<char> = text.chars().collect();
        let mut i = 0;
        while i + 10 <= bytes.len() {
            // 检查 YYYY-MM-DD 格式
            if bytes[i..i + 4].iter().all(|c| c.is_ascii_digit())
                && bytes[i + 4] == *sep
                && bytes[i + 5..i + 7].iter().all(|c| c.is_ascii_digit())
                && bytes[i + 7] == *sep
                && bytes[i + 8..i + 10].iter().all(|c| c.is_ascii_digit())
            {
                let year: String = bytes[i..i + 4].iter().collect();
                let month: String = bytes[i + 5..i + 7].iter().collect();
                let day: String = bytes[i + 8..i + 10].iter().collect();
                return Some(format!("{}-{}-{}", year, month, day));
            }
            i += 1;
        }
    }

    None
}

// ============================================================================
// 测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    // 智能表单测试
    #[test]
    fn test_form_field_type_as_str() {
        assert_eq!(FormFieldType::Text.as_str(), "text");
        assert_eq!(FormFieldType::Number.as_str(), "number");
        assert_eq!(FormFieldType::Date.as_str(), "date");
        assert_eq!(FormFieldType::Select.as_str(), "select");
    }

    #[test]
    fn test_smart_form_engine_new() {
        let engine = SmartFormEngine::with_defaults();
        assert_eq!(engine.form_count(), 4);
    }

    #[test]
    fn test_smart_form_engine_get_form() {
        let engine = SmartFormEngine::with_defaults();
        let form = engine.get_form("purchase_request");
        assert!(form.is_some());
        assert_eq!(form.unwrap().name, "采购申请单");
    }

    #[test]
    fn test_smart_form_engine_get_form_not_found() {
        let engine = SmartFormEngine::with_defaults();
        let form = engine.get_form("nonexistent");
        assert!(form.is_none());
    }

    #[test]
    fn test_smart_form_engine_get_all_forms() {
        let engine = SmartFormEngine::with_defaults();
        let forms = engine.get_all_forms();
        assert_eq!(forms.len(), 4);
    }

    #[test]
    fn test_smart_form_engine_get_forms_by_category() {
        let engine = SmartFormEngine::with_defaults();
        let purchase_forms = engine.get_forms_by_category("采购");
        assert_eq!(purchase_forms.len(), 1);
    }

    #[test]
    fn test_smart_form_engine_validate_valid() {
        let engine = SmartFormEngine::with_defaults();
        let data = FormData {
            form_id: "purchase_request".to_string(),
            record_id: None,
            values: {
                let mut values = HashMap::new();
                values.insert("applicant".to_string(), serde_json::json!("张三"));
                values.insert("department".to_string(), serde_json::json!("tech"));
                values.insert("request_date".to_string(), serde_json::json!("2024-01-01"));
                values.insert("item_name".to_string(), serde_json::json!("办公电脑"));
                values.insert("quantity".to_string(), serde_json::json!(5));
                values.insert("unit_price".to_string(), serde_json::json!(5000.0));
                values.insert(
                    "reason".to_string(),
                    serde_json::json!("新员工入职需要配备办公电脑"),
                );
                values
            },
            status: FormStatus::Draft,
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
        };

        let result = engine.validate_form("purchase_request", &data).unwrap();
        assert!(result.is_valid);
    }

    #[test]
    fn test_smart_form_engine_validate_missing_required() {
        let engine = SmartFormEngine::with_defaults();
        let data = FormData {
            form_id: "purchase_request".to_string(),
            record_id: None,
            values: HashMap::new(),
            status: FormStatus::Draft,
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
        };

        let result = engine.validate_form("purchase_request", &data).unwrap();
        assert!(!result.is_valid);
        assert!(!result.field_errors.is_empty());
    }

    #[test]
    fn test_smart_form_engine_auto_fill() {
        let engine = SmartFormEngine::with_defaults();
        let mut context = HashMap::new();
        context.insert(
            "user".to_string(),
            serde_json::json!({
                "name": "张三",
                "department": "tech"
            }),
        );

        let data = engine.auto_fill_form("purchase_request", &context).unwrap();
        assert_eq!(data.form_id, "purchase_request");
        assert!(data.values.contains_key("applicant"));
        assert!(data.values.contains_key("department"));
        assert!(data.values.contains_key("request_date"));
    }

    #[test]
    fn test_smart_form_engine_generate_from_text() {
        let engine = SmartFormEngine::with_defaults();
        let data = engine
            .generate_from_text("expense_report", "差旅费报销 500元 2024-01-15")
            .unwrap();
        assert_eq!(data.form_id, "expense_report");
    }

    #[test]
    fn test_purchase_request_form_structure() {
        let form = create_purchase_request_form();
        assert_eq!(form.form_id, "purchase_request");
        assert_eq!(form.category, "采购");
        assert!(!form.fields.is_empty());
        assert!(form.fields.iter().any(|f| f.field_id == "applicant"));
        assert!(form.fields.iter().any(|f| f.field_id == "total_amount"));
    }

    #[test]
    fn test_expense_report_form_structure() {
        let form = create_expense_report_form();
        assert_eq!(form.form_id, "expense_report");
        assert_eq!(form.category, "财务");
        assert!(form.fields.iter().any(|f| f.field_id == "expense_type"));
        assert!(form.fields.iter().any(|f| f.field_id == "amount"));
    }

    #[test]
    fn test_customer_info_form_structure() {
        let form = create_customer_info_form();
        assert_eq!(form.form_id, "customer_info");
        assert_eq!(form.category, "CRM");
        assert!(form.fields.iter().any(|f| f.field_id == "customer_name"));
        assert!(form.fields.iter().any(|f| f.field_id == "phone"));
    }

    #[test]
    fn test_inbound_order_form_structure() {
        let form = create_inbound_order_form();
        assert_eq!(form.form_id, "inbound_order");
        assert_eq!(form.category, "WMS");
        assert!(form.fields.iter().any(|f| f.field_id == "warehouse"));
        assert!(form.fields.iter().any(|f| f.field_id == "quantity"));
    }

    // 文档智能测试
    #[test]
    fn test_document_type_as_str() {
        assert_eq!(DocumentType::PDF.as_str(), "pdf");
        assert_eq!(DocumentType::Word.as_str(), "word");
        assert_eq!(DocumentType::Excel.as_str(), "excel");
    }

    #[test]
    fn test_document_type_from_extension() {
        assert_eq!(DocumentType::from_extension("pdf"), DocumentType::PDF);
        assert_eq!(DocumentType::from_extension("docx"), DocumentType::Word);
        assert_eq!(DocumentType::from_extension("xlsx"), DocumentType::Excel);
        assert_eq!(DocumentType::from_extension("md"), DocumentType::Markdown);
        assert_eq!(DocumentType::from_extension("unknown"), DocumentType::Other);
    }

    #[test]
    fn test_document_intelligence_engine_new() {
        let engine = DocumentIntelligenceEngine::with_defaults();
        assert_eq!(engine.document_count(), 0);
    }

    #[test]
    fn test_document_intelligence_engine_register() {
        let engine = DocumentIntelligenceEngine::with_defaults();
        let doc = DocumentInfo {
            document_id: "doc1".to_string(),
            name: "测试文档".to_string(),
            document_type: DocumentType::Text,
            file_size: 100,
            content: Some("测试内容".to_string()),
            metadata: DocumentMetadata {
                author: None,
                created_at: None,
                modified_at: None,
                page_count: None,
                word_count: None,
                language: None,
                title: None,
                subject: None,
                keywords: None,
                custom: HashMap::new(),
            },
            uploaded_at: chrono::Utc::now().to_rfc3339(),
            processing_status: ProcessingStatus::Completed,
        };

        engine.register_document(doc);
        assert_eq!(engine.document_count(), 1);
    }

    #[test]
    fn test_document_intelligence_engine_parse() {
        let engine = DocumentIntelligenceEngine::with_defaults();
        let doc = DocumentInfo {
            document_id: "doc1".to_string(),
            name: "测试文档".to_string(),
            document_type: DocumentType::Markdown,
            file_size: 0,
            content: None,
            metadata: DocumentMetadata {
                author: None,
                created_at: None,
                modified_at: None,
                page_count: None,
                word_count: None,
                language: None,
                title: None,
                subject: None,
                keywords: None,
                custom: HashMap::new(),
            },
            uploaded_at: chrono::Utc::now().to_rfc3339(),
            processing_status: ProcessingStatus::Pending,
        };
        engine.register_document(doc);

        let content = "# 标题1\n\n这是第一段内容。\n\n## 标题2\n\n这是第二段内容。";
        let result = engine.parse_document("doc1", content).unwrap();
        assert!(result.success);
        assert!(result.text.is_some());
        assert!(result.structure.is_some());
        assert_eq!(result.structure.unwrap().sections.len(), 2);
    }

    #[test]
    fn test_document_intelligence_engine_generate_summary() {
        let engine = DocumentIntelligenceEngine::with_defaults();
        let content = "这是第一句话。这是第二句话。这是第三句话。这是第四句话。这是第五句话。";
        let doc = DocumentInfo {
            document_id: "doc1".to_string(),
            name: "测试文档".to_string(),
            document_type: DocumentType::Text,
            file_size: content.len() as u64,
            content: Some(content.to_string()),
            metadata: DocumentMetadata {
                author: None,
                created_at: None,
                modified_at: None,
                page_count: None,
                word_count: None,
                language: None,
                title: None,
                subject: None,
                keywords: None,
                custom: HashMap::new(),
            },
            uploaded_at: chrono::Utc::now().to_rfc3339(),
            processing_status: ProcessingStatus::Completed,
        };
        engine.register_document(doc);

        let summary = engine.generate_summary("doc1", SummaryType::Brief).unwrap();
        assert_eq!(summary.document_id, "doc1");
        assert!(!summary.content.is_empty());
        assert!(!summary.key_sentences.is_empty());
        assert!(!summary.keywords.is_empty());
    }

    #[test]
    fn test_document_intelligence_engine_generate_document() {
        let engine = DocumentIntelligenceEngine::with_defaults();
        let request = DocumentGenerationRequest {
            document_type: DocumentType::Markdown,
            title: "测试报告".to_string(),
            template: None,
            content: DocumentContent {
                sections: vec![
                    DocumentSectionContent {
                        title: "概述".to_string(),
                        level: 1,
                        paragraphs: vec!["这是概述内容。".to_string()],
                        tables: vec![],
                        images: vec![],
                    },
                    DocumentSectionContent {
                        title: "详情".to_string(),
                        level: 2,
                        paragraphs: vec!["这是详情内容。".to_string()],
                        tables: vec![],
                        images: vec![],
                    },
                ],
            },
            style: None,
            metadata: None,
        };

        let doc = engine.generate_document(request).unwrap();
        assert_eq!(doc.name, "测试报告");
        assert!(doc.content.is_some());
        assert!(doc.content.unwrap().contains("测试报告"));
    }

    #[test]
    fn test_extract_number() {
        assert_eq!(extract_number("金额是 100 元"), Some(100.0));
        assert_eq!(extract_number("价格 59.9 元"), Some(59.9));
        assert_eq!(extract_number("没有数字"), None);
    }

    #[test]
    fn test_extract_date() {
        assert_eq!(
            extract_date("日期是 2024-01-15"),
            Some("2024-01-15".to_string())
        );
        assert_eq!(
            extract_date("日期是 2024/01/15"),
            Some("2024-01-15".to_string())
        );
        assert_eq!(extract_date("没有日期"), None);
    }

    #[test]
    fn test_form_status() {
        assert_eq!(FormStatus::Draft as u8, 0);
        assert_eq!(FormStatus::Submitted as u8, 2);
    }

    #[test]
    fn test_processing_status() {
        assert_eq!(ProcessingStatus::Pending as u8, 0);
        assert_eq!(ProcessingStatus::Completed as u8, 2);
    }

    #[test]
    fn test_summary_type() {
        assert_eq!(SummaryType::Brief as u8, 0);
        assert_eq!(SummaryType::Detailed as u8, 2);
    }

    #[test]
    fn test_validation_severity() {
        assert_eq!(ValidationSeverity::Error as u8, 0);
        assert_eq!(ValidationSeverity::Warning as u8, 1);
    }
}
