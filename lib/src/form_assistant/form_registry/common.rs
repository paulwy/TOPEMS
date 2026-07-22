use serde::{Deserialize, Serialize};

// ==================== 业务域 ====================

/// 表单所属的业务域
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum FormDomain {
    /// 客户关系管理（CRM）
    Crm,
    /// ERP 销售域
    ErpSales,
    /// ERP 采购域
    ErpPurchase,
    /// ERP 生产域
    ErpProduction,
    /// ERP 财务域
    ErpFinance,
    /// ERP 库存域
    ErpInventory,
    /// 项目管理（PM）
    Pm,
    /// 身份与权限管理（IAM）
    Iam,
    /// 系统域
    System,
    /// 质量管理（QMS）
    Qms,
    /// 制造执行（MES）
    Mes,
    /// 仓储管理（WMS）
    Wms,
    /// 人力资源（HRM）
    Hrm,
    /// 供应链（SCM）
    Scm,
    /// 实验室管理（LIMS）
    Lims,
    /// 环境健康安全（EHS）
    Ehs,
    /// 研发管理（RD）
    Rd,
}

impl FormDomain {
    /// 返回业务域的中文展示名称
    pub fn display_name(&self) -> &'static str {
        match self {
            FormDomain::Crm => "客户关系管理（CRM）",
            FormDomain::ErpSales => "ERP 销售",
            FormDomain::ErpPurchase => "ERP 采购",
            FormDomain::ErpProduction => "ERP 生产",
            FormDomain::ErpFinance => "ERP 财务",
            FormDomain::ErpInventory => "ERP 库存",
            FormDomain::Pm => "项目管理（PM）",
            FormDomain::Iam => "身份与权限管理（IAM）",
            FormDomain::System => "系统管理",
            FormDomain::Qms => "质量管理（QMS）",
            FormDomain::Mes => "制造执行（MES）",
            FormDomain::Wms => "仓储管理（WMS）",
            FormDomain::Hrm => "人力资源（HRM）",
            FormDomain::Scm => "供应链（SCM）",
            FormDomain::Lims => "实验室管理（LIMS）",
            FormDomain::Ehs => "环境健康安全（EHS）",
            FormDomain::Rd => "研发管理（RD）",
        }
    }
}

// ==================== 字段定义 ====================

/// 表单字段定义
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldDefinition {
    /// 字段名（英文标识）
    pub name: String,
    /// 字段标签（中文展示名）
    pub label: String,
    /// 字段类型：text/number/date/select/textarea/bool 等
    pub field_type: String,
    /// 字段说明
    pub description: String,
    /// 是否必填
    pub required: bool,
    /// 填写示例
    pub example: String,
}

impl FieldDefinition {
    pub fn new(
        name: impl Into<String>,
        label: impl Into<String>,
        field_type: impl Into<String>,
        description: impl Into<String>,
        required: bool,
        example: impl Into<String>,
    ) -> Self {
        Self {
            name: name.into(),
            label: label.into(),
            field_type: field_type.into(),
            description: description.into(),
            required,
            example: example.into(),
        }
    }
}

// ==================== 验证规则 ====================

/// 表单字段验证规则
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormValidationRule {
    /// 字段名
    pub field_name: String,
    /// 规则类型：format/range/logic/required
    pub rule_type: String,
    /// 规则描述
    pub description: String,
    /// 正则模式（可选）
    pub pattern: Option<String>,
}

impl FormValidationRule {
    pub fn new(
        field_name: impl Into<String>,
        rule_type: impl Into<String>,
        description: impl Into<String>,
    ) -> Self {
        Self {
            field_name: field_name.into(),
            rule_type: rule_type.into(),
            description: description.into(),
            pattern: None,
        }
    }

    pub fn with_pattern(mut self, pattern: impl Into<String>) -> Self {
        self.pattern = Some(pattern.into());
        self
    }
}

// ==================== 业务术语 ====================

/// 业务术语解释
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BusinessTerm {
    /// 中文术语
    pub term: String,
    /// 英文术语（可选）
    pub english: Option<String>,
    /// 通俗解释
    pub explanation: String,
}

impl BusinessTerm {
    pub fn new(
        term: impl Into<String>,
        english: Option<String>,
        explanation: impl Into<String>,
    ) -> Self {
        Self {
            term: term.into(),
            english,
            explanation: explanation.into(),
        }
    }
}

// ==================== AI 功能开关 ====================

/// 表单可用的 AI 功能开关
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiFeatures {
    /// 是否启用字段建议
    pub suggest: bool,
    /// 是否启用文本增强
    pub enhance: bool,
    /// 是否启用数据验证
    pub validate: bool,
    /// 是否启用术语翻译
    pub translate: bool,
}

impl Default for AiFeatures {
    fn default() -> Self {
        Self {
            suggest: true,
            enhance: true,
            validate: true,
            translate: true,
        }
    }
}

impl AiFeatures {
    pub fn disabled() -> Self {
        Self {
            suggest: false,
            enhance: false,
            validate: false,
            translate: false,
        }
    }

    pub fn supports(&self, feature: &str) -> bool {
        match feature {
            "suggest" => self.suggest,
            "enhance" => self.enhance,
            "validate" => self.validate,
            "translate" => self.translate,
            _ => false,
        }
    }
}
