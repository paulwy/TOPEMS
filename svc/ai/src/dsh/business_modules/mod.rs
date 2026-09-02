//! DSH 特定业务模块 Copilot 模块
//!
//! 提供 ERP、Finance、CRM、WMS 四个特定业务模块的 Copilot 配置、工具定义、知识库等。

use std::collections::HashMap;
use std::sync::Arc;

use parking_lot::Mutex;
use serde::{Deserialize, Serialize};

use crate::dsh::business_copilot::{BusinessModule, CopilotIntent};

// ============================================================================
// 业务模块配置
// ============================================================================

/// 业务模块 Copilot 配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BusinessModuleConfig {
    /// 业务模块
    pub module: BusinessModule,
    /// 模块名称
    pub name: String,
    /// 模块描述
    pub description: String,
    /// 系统提示词
    pub system_prompt: String,
    /// 欢迎消息
    pub welcome_message: String,
    /// 支持的意图
    pub supported_intents: Vec<CopilotIntent>,
    /// 可用工具
    pub available_tools: Vec<BusinessToolDefinition>,
    /// 常见问题
    pub faqs: Vec<FAQItem>,
    /// 业务术语
    pub glossary: Vec<GlossaryTerm>,
    /// 快捷操作
    pub quick_actions: Vec<QuickAction>,
    /// 数据实体
    pub entities: Vec<EntityDefinition>,
    /// 是否启用
    pub enabled: bool,
}

/// 业务工具定义
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BusinessToolDefinition {
    /// 工具 ID
    pub tool_id: String,
    /// 工具名称
    pub name: String,
    /// 工具描述
    pub description: String,
    /// 工具类别
    pub category: ToolCategory,
    /// 参数定义
    pub parameters: Vec<ToolParameter>,
    /// 是否需要确认
    pub requires_confirmation: bool,
    /// 适用场景
    pub use_cases: Vec<String>,
}

/// 工具类别
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ToolCategory {
    /// 查询
    Query,
    /// 创建
    Create,
    /// 更新
    Update,
    /// 删除
    Delete,
    /// 分析
    Analysis,
    /// 报表
    Report,
    /// 审批
    Approval,
    /// 导入导出
    ImportExport,
    /// 其他
    Other,
}

impl ToolCategory {
    pub fn as_str(&self) -> &str {
        match self {
            ToolCategory::Query => "query",
            ToolCategory::Create => "create",
            ToolCategory::Update => "update",
            ToolCategory::Delete => "delete",
            ToolCategory::Analysis => "analysis",
            ToolCategory::Report => "report",
            ToolCategory::Approval => "approval",
            ToolCategory::ImportExport => "import_export",
            ToolCategory::Other => "other",
        }
    }
}

/// 工具参数
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolParameter {
    /// 参数名
    pub name: String,
    /// 参数类型
    pub param_type: String,
    /// 参数描述
    pub description: String,
    /// 是否必需
    pub required: bool,
    /// 默认值
    pub default_value: Option<serde_json::Value>,
    /// 枚举值
    pub enum_values: Option<Vec<String>>,
}

/// FAQ 项
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FAQItem {
    /// 问题
    pub question: String,
    /// 答案
    pub answer: String,
    /// 相关关键词
    pub keywords: Vec<String>,
    /// 分类
    pub category: String,
}

/// 术语表项
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GlossaryTerm {
    /// 术语
    pub term: String,
    /// 定义
    pub definition: String,
    /// 缩写
    pub abbreviation: Option<String>,
    /// 相关术语
    pub related_terms: Vec<String>,
}

/// 快捷操作
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuickAction {
    /// 操作 ID
    pub action_id: String,
    /// 操作标签
    pub label: String,
    /// 操作描述
    pub description: String,
    /// 图标
    pub icon: String,
    /// 触发的意图
    pub intent: CopilotIntent,
    /// 预设提示词
    pub preset_prompt: String,
}

/// 实体定义
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntityDefinition {
    /// 实体名
    pub name: String,
    /// 实体描述
    pub description: String,
    /// 关键字段
    pub key_fields: Vec<EntityField>,
    /// 常用查询
    pub common_queries: Vec<String>,
}

/// 实体字段
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntityField {
    /// 字段名
    pub name: String,
    /// 字段类型
    pub field_type: String,
    /// 字段描述
    pub description: String,
    /// 是否必填
    pub required: bool,
}

// ============================================================================
// ERP 模块配置
// ============================================================================

/// 创建 ERP 模块配置
pub fn create_erp_config() -> BusinessModuleConfig {
    BusinessModuleConfig {
        module: BusinessModule::ERP,
        name: "ERP 智能助手".to_string(),
        description: "企业资源规划智能助手，帮助处理采购、库存、生产、销售等业务".to_string(),
        system_prompt: "你是一个专业的 ERP（企业资源规划）智能助手。你可以帮助用户处理采购管理、库存管理、生产管理、销售管理、供应链管理等业务。请用专业、简洁的语言回答用户问题，并在需要时提供操作建议。".to_string(),
        welcome_message: "您好！我是 ERP 智能助手，可以帮您处理采购、库存、生产、销售等业务。请问有什么可以帮您的？".to_string(),
        supported_intents: vec![
            CopilotIntent::Query,
            CopilotIntent::Create,
            CopilotIntent::Update,
            CopilotIntent::Delete,
            CopilotIntent::Analyze,
            CopilotIntent::Report,
            CopilotIntent::Approve,
            CopilotIntent::Knowledge,
            CopilotIntent::Guidance,
        ],
        available_tools: vec![
            BusinessToolDefinition {
                tool_id: "erp.query_purchase_order".to_string(),
                name: "查询采购订单".to_string(),
                description: "根据条件查询采购订单列表或详情".to_string(),
                category: ToolCategory::Query,
                parameters: vec![
                    ToolParameter { name: "order_no".to_string(), param_type: "string".to_string(), description: "采购订单号".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "status".to_string(), param_type: "string".to_string(), description: "订单状态".to_string(), required: false, default_value: None, enum_values: Some(vec!["待审批".to_string(), "已审批".to_string(), "执行中".to_string(), "已完成".to_string(), "已取消".to_string()]) },
                    ToolParameter { name: "start_date".to_string(), param_type: "date".to_string(), description: "开始日期".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "end_date".to_string(), param_type: "date".to_string(), description: "结束日期".to_string(), required: false, default_value: None, enum_values: None },
                ],
                requires_confirmation: false,
                use_cases: vec!["查询采购订单".to_string(), "查看采购详情".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "erp.create_purchase_order".to_string(),
                name: "创建采购订单".to_string(),
                description: "创建新的采购订单".to_string(),
                category: ToolCategory::Create,
                parameters: vec![
                    ToolParameter { name: "supplier_id".to_string(), param_type: "string".to_string(), description: "供应商ID".to_string(), required: true, default_value: None, enum_values: None },
                    ToolParameter { name: "items".to_string(), param_type: "array".to_string(), description: "采购明细".to_string(), required: true, default_value: None, enum_values: None },
                    ToolParameter { name: "expected_date".to_string(), param_type: "date".to_string(), description: "期望交货日期".to_string(), required: false, default_value: None, enum_values: None },
                ],
                requires_confirmation: true,
                use_cases: vec!["创建采购订单".to_string(), "新增采购".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "erp.query_inventory".to_string(),
                name: "查询库存".to_string(),
                description: "查询库存数量、库存状态、库存预警".to_string(),
                category: ToolCategory::Query,
                parameters: vec![
                    ToolParameter { name: "sku".to_string(), param_type: "string".to_string(), description: "商品SKU".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "warehouse".to_string(), param_type: "string".to_string(), description: "仓库".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "low_stock_only".to_string(), param_type: "boolean".to_string(), description: "仅显示低库存".to_string(), required: false, default_value: Some(serde_json::json!(false)), enum_values: None },
                ],
                requires_confirmation: false,
                use_cases: vec!["查询库存".to_string(), "库存预警".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "erp.analyze_sales".to_string(),
                name: "销售分析".to_string(),
                description: "分析销售数据、销售趋势、销售排名".to_string(),
                category: ToolCategory::Analysis,
                parameters: vec![
                    ToolParameter { name: "period".to_string(), param_type: "string".to_string(), description: "分析周期".to_string(), required: false, default_value: Some(serde_json::json!("本月")), enum_values: Some(vec!["本周".to_string(), "本月".to_string(), "本季度".to_string(), "本年".to_string()]) },
                    ToolParameter { name: "dimension".to_string(), param_type: "string".to_string(), description: "分析维度".to_string(), required: false, default_value: None, enum_values: Some(vec!["按产品".to_string(), "按客户".to_string(), "按区域".to_string(), "按销售员".to_string()]) },
                ],
                requires_confirmation: false,
                use_cases: vec!["销售分析".to_string(), "销售报表".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "erp.approve_order".to_string(),
                name: "审批订单".to_string(),
                description: "审批采购订单或销售订单".to_string(),
                category: ToolCategory::Approval,
                parameters: vec![
                    ToolParameter { name: "order_id".to_string(), param_type: "string".to_string(), description: "订单ID".to_string(), required: true, default_value: None, enum_values: None },
                    ToolParameter { name: "action".to_string(), param_type: "string".to_string(), description: "审批动作".to_string(), required: true, default_value: None, enum_values: Some(vec!["通过".to_string(), "驳回".to_string()]) },
                    ToolParameter { name: "comment".to_string(), param_type: "string".to_string(), description: "审批意见".to_string(), required: false, default_value: None, enum_values: None },
                ],
                requires_confirmation: true,
                use_cases: vec!["审批订单".to_string(), "订单审核".to_string()],
            },
        ],
        faqs: vec![
            FAQItem {
                question: "如何创建采购订单？".to_string(),
                answer: "您可以在采购管理模块点击「新建采购订单」，选择供应商，添加采购明细，填写期望交货日期后提交。提交后需要审批流程。".to_string(),
                keywords: vec!["采购订单".to_string(), "创建".to_string(), "新增".to_string()],
                category: "采购管理".to_string(),
            },
            FAQItem {
                question: "库存预警阈值如何设置？".to_string(),
                answer: "在商品管理中，每个商品可以设置最低库存和最高库存阈值。当库存低于最低库存时系统会自动预警。".to_string(),
                keywords: vec!["库存".to_string(), "预警".to_string(), "阈值".to_string()],
                category: "库存管理".to_string(),
            },
            FAQItem {
                question: "如何查看销售报表？".to_string(),
                answer: "在销售管理模块选择「销售报表」，可以按时间、产品、客户、区域等维度查看销售数据，支持导出 Excel。".to_string(),
                keywords: vec!["销售报表".to_string(), "销售分析".to_string()],
                category: "销售管理".to_string(),
            },
        ],
        glossary: vec![
            GlossaryTerm { term: "SKU".to_string(), definition: "库存量单位，用于区分不同商品的唯一标识".to_string(), abbreviation: Some("SKU".to_string()), related_terms: vec!["商品".to_string(), "库存".to_string()] },
            GlossaryTerm { term: "BOM".to_string(), definition: "物料清单，描述产品组成结构的技术文件".to_string(), abbreviation: Some("BOM".to_string()), related_terms: vec!["生产".to_string(), "物料".to_string()] },
            GlossaryTerm { term: "MRP".to_string(), definition: "物料需求计划，根据生产计划计算物料需求的系统".to_string(), abbreviation: Some("MRP".to_string()), related_terms: vec!["采购".to_string(), "生产".to_string()] },
        ],
        quick_actions: vec![
            QuickAction { action_id: "erp.new_purchase".to_string(), label: "新建采购".to_string(), description: "创建新的采购订单".to_string(), icon: "shopping-cart".to_string(), intent: CopilotIntent::Create, preset_prompt: "帮我创建一个采购订单".to_string() },
            QuickAction { action_id: "erp.check_inventory".to_string(), label: "库存查询".to_string(), description: "查询当前库存状态".to_string(), icon: "box".to_string(), intent: CopilotIntent::Query, preset_prompt: "查询当前库存情况".to_string() },
            QuickAction { action_id: "erp.sales_report".to_string(), label: "销售报表".to_string(), description: "查看销售数据分析".to_string(), icon: "bar-chart".to_string(), intent: CopilotIntent::Report, preset_prompt: "生成本月销售报表".to_string() },
            QuickAction { action_id: "erp.pending_approval".to_string(), label: "待审批".to_string(), description: "查看待审批订单".to_string(), icon: "check-circle".to_string(), intent: CopilotIntent::Query, preset_prompt: "查看待我审批的订单".to_string() },
        ],
        entities: vec![
            EntityDefinition {
                name: "采购订单".to_string(),
                description: "企业向供应商采购商品或服务的订单".to_string(),
                key_fields: vec![
                    EntityField { name: "订单号".to_string(), field_type: "string".to_string(), description: "采购订单唯一编号".to_string(), required: true },
                    EntityField { name: "供应商".to_string(), field_type: "string".to_string(), description: "供应商名称".to_string(), required: true },
                    EntityField { name: "订单状态".to_string(), field_type: "enum".to_string(), description: "待审批/已审批/执行中/已完成/已取消".to_string(), required: true },
                    EntityField { name: "订单金额".to_string(), field_type: "decimal".to_string(), description: "订单总金额".to_string(), required: true },
                ],
                common_queries: vec!["查询采购订单".to_string(), "采购订单详情".to_string()],
            },
            EntityDefinition {
                name: "库存".to_string(),
                description: "仓库中商品的库存数量和状态".to_string(),
                key_fields: vec![
                    EntityField { name: "SKU".to_string(), field_type: "string".to_string(), description: "商品SKU".to_string(), required: true },
                    EntityField { name: "仓库".to_string(), field_type: "string".to_string(), description: "所在仓库".to_string(), required: true },
                    EntityField { name: "可用库存".to_string(), field_type: "integer".to_string(), description: "可用库存数量".to_string(), required: true },
                    EntityField { name: "锁定库存".to_string(), field_type: "integer".to_string(), description: "已锁定库存".to_string(), required: false },
                ],
                common_queries: vec!["查询库存".to_string(), "库存预警".to_string()],
            },
        ],
        enabled: true,
    }
}

// ============================================================================
// Finance 模块配置
// ============================================================================

/// 创建 Finance 模块配置
pub fn create_finance_config() -> BusinessModuleConfig {
    BusinessModuleConfig {
        module: BusinessModule::Finance,
        name: "财务智能助手".to_string(),
        description: "财务管理智能助手，帮助处理账务、报表、预算、资金等业务".to_string(),
        system_prompt: "你是一个专业的财务智能助手。你可以帮助用户处理账务管理、财务报表、预算管理、资金管理、应收应付、成本核算等业务。请用专业、准确的语言回答用户问题，涉及金额时请注明币种。".to_string(),
        welcome_message: "您好！我是财务智能助手，可以帮您处理账务、报表、预算、资金等财务业务。请问有什么可以帮您的？".to_string(),
        supported_intents: vec![
            CopilotIntent::Query,
            CopilotIntent::Create,
            CopilotIntent::Update,
            CopilotIntent::Analyze,
            CopilotIntent::Report,
            CopilotIntent::Approve,
            CopilotIntent::Knowledge,
            CopilotIntent::Guidance,
        ],
        available_tools: vec![
            BusinessToolDefinition {
                tool_id: "finance.query_voucher".to_string(),
                name: "查询凭证".to_string(),
                description: "查询会计凭证列表或详情".to_string(),
                category: ToolCategory::Query,
                parameters: vec![
                    ToolParameter { name: "voucher_no".to_string(), param_type: "string".to_string(), description: "凭证号".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "period".to_string(), param_type: "string".to_string(), description: "会计期间".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "status".to_string(), param_type: "string".to_string(), description: "凭证状态".to_string(), required: false, default_value: None, enum_values: Some(vec!["未审核".to_string(), "已审核".to_string(), "已过账".to_string()]) },
                ],
                requires_confirmation: false,
                use_cases: vec!["查询凭证".to_string(), "凭证详情".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "finance.create_voucher".to_string(),
                name: "创建凭证".to_string(),
                description: "创建新的会计凭证".to_string(),
                category: ToolCategory::Create,
                parameters: vec![
                    ToolParameter { name: "voucher_type".to_string(), param_type: "string".to_string(), description: "凭证类型".to_string(), required: true, default_value: None, enum_values: Some(vec!["收款凭证".to_string(), "付款凭证".to_string(), "转账凭证".to_string()]) },
                    ToolParameter { name: "entries".to_string(), param_type: "array".to_string(), description: "凭证分录".to_string(), required: true, default_value: None, enum_values: None },
                    ToolParameter { name: "summary".to_string(), param_type: "string".to_string(), description: "摘要".to_string(), required: true, default_value: None, enum_values: None },
                ],
                requires_confirmation: true,
                use_cases: vec!["创建凭证".to_string(), "新增凭证".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "finance.query_report".to_string(),
                name: "查询财务报表".to_string(),
                description: "查询资产负债表、利润表、现金流量表等".to_string(),
                category: ToolCategory::Report,
                parameters: vec![
                    ToolParameter { name: "report_type".to_string(), param_type: "string".to_string(), description: "报表类型".to_string(), required: true, default_value: None, enum_values: Some(vec!["资产负债表".to_string(), "利润表".to_string(), "现金流量表".to_string(), "科目余额表".to_string()]) },
                    ToolParameter { name: "period".to_string(), param_type: "string".to_string(), description: "会计期间".to_string(), required: true, default_value: None, enum_values: None },
                ],
                requires_confirmation: false,
                use_cases: vec!["财务报表".to_string(), "资产负债表".to_string(), "利润表".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "finance.analyze_cashflow".to_string(),
                name: "现金流分析".to_string(),
                description: "分析现金流入流出、资金状况、资金预测".to_string(),
                category: ToolCategory::Analysis,
                parameters: vec![
                    ToolParameter { name: "period".to_string(), param_type: "string".to_string(), description: "分析周期".to_string(), required: false, default_value: Some(serde_json::json!("本月")), enum_values: None },
                    ToolParameter { name: "forecast_months".to_string(), param_type: "integer".to_string(), description: "预测月数".to_string(), required: false, default_value: Some(serde_json::json!(3)), enum_values: None },
                ],
                requires_confirmation: false,
                use_cases: vec!["现金流分析".to_string(), "资金预测".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "finance.query_budget".to_string(),
                name: "查询预算".to_string(),
                description: "查询预算执行情况、预算使用率".to_string(),
                category: ToolCategory::Query,
                parameters: vec![
                    ToolParameter { name: "department".to_string(), param_type: "string".to_string(), description: "部门".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "period".to_string(), param_type: "string".to_string(), description: "预算期间".to_string(), required: false, default_value: None, enum_values: None },
                ],
                requires_confirmation: false,
                use_cases: vec!["预算查询".to_string(), "预算执行".to_string()],
            },
        ],
        faqs: vec![
            FAQItem {
                question: "如何生成月度财务报表？".to_string(),
                answer: "在财务报表模块选择「报表生成」，选择会计期间和报表类型（资产负债表/利润表/现金流量表），系统会自动计算并生成报表。生成前请确保所有凭证已过账。".to_string(),
                keywords: vec!["财务报表".to_string(), "月度报表".to_string()],
                category: "报表管理".to_string(),
            },
            FAQItem {
                question: "凭证审核和过账有什么区别？".to_string(),
                answer: "审核是对凭证的正确性进行检查确认，审核后凭证不能修改；过账是将凭证数据登记到账簿中，过账后数据才会反映在报表中。一般流程是：制单 → 审核 → 过账。".to_string(),
                keywords: vec!["凭证".to_string(), "审核".to_string(), "过账".to_string()],
                category: "账务管理".to_string(),
            },
            FAQItem {
                question: "如何查看应收账款账龄？".to_string(),
                answer: "在应收管理模块选择「账龄分析」，可以按客户、按账龄区间（30天/60天/90天/180天以上）查看应收账款分布情况，支持导出和催收提醒。".to_string(),
                keywords: vec!["应收账款".to_string(), "账龄".to_string()],
                category: "应收管理".to_string(),
            },
        ],
        glossary: vec![
            GlossaryTerm { term: "凭证".to_string(), definition: "会计凭证，记录经济业务的书面证明".to_string(), abbreviation: None, related_terms: vec!["分录".to_string(), "过账".to_string()] },
            GlossaryTerm { term: "账龄".to_string(), definition: "应收账款或应付账款从发生日到当前的时间长度".to_string(), abbreviation: None, related_terms: vec!["应收".to_string(), "应付".to_string()] },
            GlossaryTerm { term: "折旧".to_string(), definition: "固定资产在使用过程中逐渐损耗的价值".to_string(), abbreviation: None, related_terms: vec!["固定资产".to_string(), "摊销".to_string()] },
        ],
        quick_actions: vec![
            QuickAction { action_id: "finance.new_voucher".to_string(), label: "新建凭证".to_string(), description: "创建新的会计凭证".to_string(), icon: "file-text".to_string(), intent: CopilotIntent::Create, preset_prompt: "帮我创建一个会计凭证".to_string() },
            QuickAction { action_id: "finance.monthly_report".to_string(), label: "月度报表".to_string(), description: "生成月度财务报表".to_string(), icon: "pie-chart".to_string(), intent: CopilotIntent::Report, preset_prompt: "生成本月财务报表".to_string() },
            QuickAction { action_id: "finance.cashflow".to_string(), label: "现金流".to_string(), description: "查看现金流分析".to_string(), icon: "trending-up".to_string(), intent: CopilotIntent::Analyze, preset_prompt: "分析本月现金流情况".to_string() },
            QuickAction { action_id: "finance.budget".to_string(), label: "预算执行".to_string(), description: "查看预算执行情况".to_string(), icon: "target".to_string(), intent: CopilotIntent::Query, preset_prompt: "查询本月预算执行情况".to_string() },
        ],
        entities: vec![
            EntityDefinition {
                name: "会计凭证".to_string(),
                description: "记录经济业务的会计凭证".to_string(),
                key_fields: vec![
                    EntityField { name: "凭证号".to_string(), field_type: "string".to_string(), description: "凭证唯一编号".to_string(), required: true },
                    EntityField { name: "凭证类型".to_string(), field_type: "enum".to_string(), description: "收款/付款/转账".to_string(), required: true },
                    EntityField { name: "会计期间".to_string(), field_type: "string".to_string(), description: "所属会计期间".to_string(), required: true },
                    EntityField { name: "借贷金额".to_string(), field_type: "decimal".to_string(), description: "借方和贷方金额".to_string(), required: true },
                ],
                common_queries: vec!["查询凭证".to_string(), "凭证详情".to_string()],
            },
        ],
        enabled: true,
    }
}

// ============================================================================
// CRM 模块配置
// ============================================================================

/// 创建 CRM 模块配置
pub fn create_crm_config() -> BusinessModuleConfig {
    BusinessModuleConfig {
        module: BusinessModule::CRM,
        name: "CRM 智能助手".to_string(),
        description: "客户关系管理智能助手，帮助处理客户、商机、合同、服务等业务".to_string(),
        system_prompt: "你是一个专业的 CRM（客户关系管理）智能助手。你可以帮助用户处理客户管理、商机管理、合同管理、服务管理、营销活动等业务。请用友好、专业的语言回答用户问题。".to_string(),
        welcome_message: "您好！我是 CRM 智能助手，可以帮您处理客户、商机、合同、服务等业务。请问有什么可以帮您的？".to_string(),
        supported_intents: vec![
            CopilotIntent::Query,
            CopilotIntent::Create,
            CopilotIntent::Update,
            CopilotIntent::Delete,
            CopilotIntent::Analyze,
            CopilotIntent::Report,
            CopilotIntent::Reminder,
            CopilotIntent::Knowledge,
            CopilotIntent::Guidance,
        ],
        available_tools: vec![
            BusinessToolDefinition {
                tool_id: "crm.query_customer".to_string(),
                name: "查询客户".to_string(),
                description: "查询客户列表或客户详情".to_string(),
                category: ToolCategory::Query,
                parameters: vec![
                    ToolParameter { name: "keyword".to_string(), param_type: "string".to_string(), description: "搜索关键词".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "level".to_string(), param_type: "string".to_string(), description: "客户等级".to_string(), required: false, default_value: None, enum_values: Some(vec!["VIP".to_string(), "重要".to_string(), "普通".to_string(), "潜在".to_string()]) },
                    ToolParameter { name: "owner".to_string(), param_type: "string".to_string(), description: "负责人".to_string(), required: false, default_value: None, enum_values: None },
                ],
                requires_confirmation: false,
                use_cases: vec!["查询客户".to_string(), "客户详情".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "crm.create_customer".to_string(),
                name: "创建客户".to_string(),
                description: "创建新的客户档案".to_string(),
                category: ToolCategory::Create,
                parameters: vec![
                    ToolParameter { name: "customer_name".to_string(), param_type: "string".to_string(), description: "客户名称".to_string(), required: true, default_value: None, enum_values: None },
                    ToolParameter { name: "contact".to_string(), param_type: "string".to_string(), description: "联系人".to_string(), required: true, default_value: None, enum_values: None },
                    ToolParameter { name: "phone".to_string(), param_type: "string".to_string(), description: "联系电话".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "level".to_string(), param_type: "string".to_string(), description: "客户等级".to_string(), required: false, default_value: Some(serde_json::json!("普通")), enum_values: None },
                ],
                requires_confirmation: false,
                use_cases: vec!["创建客户".to_string(), "新增客户".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "crm.query_opportunity".to_string(),
                name: "查询商机".to_string(),
                description: "查询销售商机列表或详情".to_string(),
                category: ToolCategory::Query,
                parameters: vec![
                    ToolParameter { name: "stage".to_string(), param_type: "string".to_string(), description: "商机阶段".to_string(), required: false, default_value: None, enum_values: Some(vec!["初步接触".to_string(), "需求确认".to_string(), "方案报价".to_string(), "谈判".to_string(), "成交".to_string(), "流失".to_string()]) },
                    ToolParameter { name: "amount_min".to_string(), param_type: "decimal".to_string(), description: "最小金额".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "owner".to_string(), param_type: "string".to_string(), description: "负责人".to_string(), required: false, default_value: None, enum_values: None },
                ],
                requires_confirmation: false,
                use_cases: vec!["查询商机".to_string(), "商机详情".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "crm.analyze_sales_funnel".to_string(),
                name: "销售漏斗分析".to_string(),
                description: "分析销售漏斗转化率、商机阶段分布".to_string(),
                category: ToolCategory::Analysis,
                parameters: vec![
                    ToolParameter { name: "period".to_string(), param_type: "string".to_string(), description: "分析周期".to_string(), required: false, default_value: Some(serde_json::json!("本月")), enum_values: None },
                    ToolParameter { name: "owner".to_string(), param_type: "string".to_string(), description: "负责人".to_string(), required: false, default_value: None, enum_values: None },
                ],
                requires_confirmation: false,
                use_cases: vec!["销售漏斗".to_string(), "转化率分析".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "crm.query_contract".to_string(),
                name: "查询合同".to_string(),
                description: "查询合同列表或详情".to_string(),
                category: ToolCategory::Query,
                parameters: vec![
                    ToolParameter { name: "contract_no".to_string(), param_type: "string".to_string(), description: "合同编号".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "status".to_string(), param_type: "string".to_string(), description: "合同状态".to_string(), required: false, default_value: None, enum_values: Some(vec!["草稿".to_string(), "审批中".to_string(), "已签署".to_string(), "执行中".to_string(), "已完成".to_string(), "已终止".to_string()]) },
                    ToolParameter { name: "customer".to_string(), param_type: "string".to_string(), description: "客户名称".to_string(), required: false, default_value: None, enum_values: None },
                ],
                requires_confirmation: false,
                use_cases: vec!["查询合同".to_string(), "合同详情".to_string()],
            },
        ],
        faqs: vec![
            FAQItem {
                question: "如何录入新客户？".to_string(),
                answer: "在客户管理模块点击「新建客户」，填写客户名称、联系人、联系电话、客户等级等基本信息，保存后即可在客户列表中查看。建议完善客户画像信息以便后续分析。".to_string(),
                keywords: vec!["新客户".to_string(), "录入".to_string(), "创建".to_string()],
                category: "客户管理".to_string(),
            },
            FAQItem {
                question: "商机阶段有哪些？如何推进？".to_string(),
                answer: "商机阶段通常包括：初步接触、需求确认、方案报价、谈判、成交、流失。在商机详情页可以点击「推进阶段」按钮，填写阶段变更记录后即可推进到下一阶段。".to_string(),
                keywords: vec!["商机".to_string(), "阶段".to_string(), "推进".to_string()],
                category: "商机管理".to_string(),
            },
            FAQItem {
                question: "如何查看销售业绩排名？".to_string(),
                answer: "在报表分析模块选择「销售业绩」，可以按销售员、部门、时间等维度查看销售业绩排名，支持按金额、订单数、客户数等指标排序。".to_string(),
                keywords: vec!["销售业绩".to_string(), "排名".to_string()],
                category: "报表分析".to_string(),
            },
        ],
        glossary: vec![
            GlossaryTerm { term: "商机".to_string(), definition: "潜在的销售机会，有明确的客户、需求和金额".to_string(), abbreviation: None, related_terms: vec!["客户".to_string(), "销售漏斗".to_string()] },
            GlossaryTerm { term: "销售漏斗".to_string(), definition: "商机从初步接触到成交的阶段转化模型".to_string(), abbreviation: None, related_terms: vec!["商机".to_string(), "转化率".to_string()] },
            GlossaryTerm { term: "客户画像".to_string(), definition: "客户的基本信息、行为特征、偏好等综合描述".to_string(), abbreviation: None, related_terms: vec!["客户".to_string(), "标签".to_string()] },
        ],
        quick_actions: vec![
            QuickAction { action_id: "crm.new_customer".to_string(), label: "新建客户".to_string(), description: "创建新的客户档案".to_string(), icon: "users".to_string(), intent: CopilotIntent::Create, preset_prompt: "帮我创建一个新客户".to_string() },
            QuickAction { action_id: "crm.my_opportunities".to_string(), label: "我的商机".to_string(), description: "查看我的销售商机".to_string(), icon: "target".to_string(), intent: CopilotIntent::Query, preset_prompt: "查看我的商机".to_string() },
            QuickAction { action_id: "crm.sales_funnel".to_string(), label: "销售漏斗".to_string(), description: "查看销售漏斗分析".to_string(), icon: "filter".to_string(), intent: CopilotIntent::Analyze, preset_prompt: "分析本月销售漏斗".to_string() },
            QuickAction { action_id: "crm.follow_up".to_string(), label: "待跟进".to_string(), description: "查看待跟进客户".to_string(), icon: "phone".to_string(), intent: CopilotIntent::Reminder, preset_prompt: "查看今天待跟进的客户".to_string() },
        ],
        entities: vec![
            EntityDefinition {
                name: "客户".to_string(),
                description: "客户档案信息".to_string(),
                key_fields: vec![
                    EntityField { name: "客户名称".to_string(), field_type: "string".to_string(), description: "客户公司或个人名称".to_string(), required: true },
                    EntityField { name: "联系人".to_string(), field_type: "string".to_string(), description: "主要联系人".to_string(), required: true },
                    EntityField { name: "客户等级".to_string(), field_type: "enum".to_string(), description: "VIP/重要/普通/潜在".to_string(), required: true },
                    EntityField { name: "负责人".to_string(), field_type: "string".to_string(), description: "客户负责人".to_string(), required: true },
                ],
                common_queries: vec!["查询客户".to_string(), "客户详情".to_string()],
            },
            EntityDefinition {
                name: "商机".to_string(),
                description: "销售机会信息".to_string(),
                key_fields: vec![
                    EntityField { name: "商机名称".to_string(), field_type: "string".to_string(), description: "商机标题".to_string(), required: true },
                    EntityField { name: "关联客户".to_string(), field_type: "string".to_string(), description: "关联的客户".to_string(), required: true },
                    EntityField { name: "预计金额".to_string(), field_type: "decimal".to_string(), description: "预计成交金额".to_string(), required: true },
                    EntityField { name: "商机阶段".to_string(), field_type: "enum".to_string(), description: "当前所处阶段".to_string(), required: true },
                ],
                common_queries: vec!["查询商机".to_string(), "商机详情".to_string()],
            },
        ],
        enabled: true,
    }
}

// ============================================================================
// WMS 模块配置
// ============================================================================

/// 创建 WMS 模块配置
pub fn create_wms_config() -> BusinessModuleConfig {
    BusinessModuleConfig {
        module: BusinessModule::WMS,
        name: "WMS 智能助手".to_string(),
        description: "仓库管理智能助手，帮助处理入库、出库、库存、盘点、移库等业务".to_string(),
        system_prompt: "你是一个专业的 WMS（仓库管理系统）智能助手。你可以帮助用户处理入库管理、出库管理、库存管理、盘点管理、移库管理、库位管理等业务。请用准确、高效的语言回答用户问题。".to_string(),
        welcome_message: "您好！我是 WMS 智能助手，可以帮您处理入库、出库、库存、盘点、移库等仓库业务。请问有什么可以帮您的？".to_string(),
        supported_intents: vec![
            CopilotIntent::Query,
            CopilotIntent::Create,
            CopilotIntent::Update,
            CopilotIntent::Delete,
            CopilotIntent::Analyze,
            CopilotIntent::Report,
            CopilotIntent::Approve,
            CopilotIntent::Knowledge,
            CopilotIntent::Guidance,
        ],
        available_tools: vec![
            BusinessToolDefinition {
                tool_id: "wms.query_inbound".to_string(),
                name: "查询入库单".to_string(),
                description: "查询入库单列表或详情".to_string(),
                category: ToolCategory::Query,
                parameters: vec![
                    ToolParameter { name: "order_no".to_string(), param_type: "string".to_string(), description: "入库单号".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "status".to_string(), param_type: "string".to_string(), description: "入库状态".to_string(), required: false, default_value: None, enum_values: Some(vec!["待入库".to_string(), "入库中".to_string(), "已完成".to_string(), "已取消".to_string()]) },
                    ToolParameter { name: "warehouse".to_string(), param_type: "string".to_string(), description: "仓库".to_string(), required: false, default_value: None, enum_values: None },
                ],
                requires_confirmation: false,
                use_cases: vec!["查询入库".to_string(), "入库详情".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "wms.create_inbound".to_string(),
                name: "创建入库单".to_string(),
                description: "创建新的入库单".to_string(),
                category: ToolCategory::Create,
                parameters: vec![
                    ToolParameter { name: "warehouse".to_string(), param_type: "string".to_string(), description: "目标仓库".to_string(), required: true, default_value: None, enum_values: None },
                    ToolParameter { name: "source_type".to_string(), param_type: "string".to_string(), description: "来源类型".to_string(), required: true, default_value: None, enum_values: Some(vec!["采购入库".to_string(), "退货入库".to_string(), "调拨入库".to_string(), "其他入库".to_string()]) },
                    ToolParameter { name: "items".to_string(), param_type: "array".to_string(), description: "入库明细".to_string(), required: true, default_value: None, enum_values: None },
                    ToolParameter { name: "reference_no".to_string(), param_type: "string".to_string(), description: "关联单号".to_string(), required: false, default_value: None, enum_values: None },
                ],
                requires_confirmation: true,
                use_cases: vec!["创建入库".to_string(), "新增入库".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "wms.query_outbound".to_string(),
                name: "查询出库单".to_string(),
                description: "查询出库单列表或详情".to_string(),
                category: ToolCategory::Query,
                parameters: vec![
                    ToolParameter { name: "order_no".to_string(), param_type: "string".to_string(), description: "出库单号".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "status".to_string(), param_type: "string".to_string(), description: "出库状态".to_string(), required: false, default_value: None, enum_values: Some(vec!["待出库".to_string(), "拣货中".to_string(), "已出库".to_string(), "已取消".to_string()]) },
                    ToolParameter { name: "warehouse".to_string(), param_type: "string".to_string(), description: "仓库".to_string(), required: false, default_value: None, enum_values: None },
                ],
                requires_confirmation: false,
                use_cases: vec!["查询出库".to_string(), "出库详情".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "wms.query_inventory".to_string(),
                name: "查询库存".to_string(),
                description: "查询实时库存、库存分布、库位库存".to_string(),
                category: ToolCategory::Query,
                parameters: vec![
                    ToolParameter { name: "sku".to_string(), param_type: "string".to_string(), description: "商品SKU".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "warehouse".to_string(), param_type: "string".to_string(), description: "仓库".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "location".to_string(), param_type: "string".to_string(), description: "库位".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "zero_stock".to_string(), param_type: "boolean".to_string(), description: "是否包含零库存".to_string(), required: false, default_value: Some(serde_json::json!(false)), enum_values: None },
                ],
                requires_confirmation: false,
                use_cases: vec!["查询库存".to_string(), "实时库存".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "wms.create_stocktake".to_string(),
                name: "创建盘点单".to_string(),
                description: "创建库存盘点单".to_string(),
                category: ToolCategory::Create,
                parameters: vec![
                    ToolParameter { name: "warehouse".to_string(), param_type: "string".to_string(), description: "盘点仓库".to_string(), required: true, default_value: None, enum_values: None },
                    ToolParameter { name: "type".to_string(), param_type: "string".to_string(), description: "盘点类型".to_string(), required: true, default_value: None, enum_values: Some(vec!["全盘".to_string(), "抽盘".to_string(), "动盘".to_string()]) },
                    ToolParameter { name: "scope".to_string(), param_type: "string".to_string(), description: "盘点范围".to_string(), required: false, default_value: None, enum_values: None },
                ],
                requires_confirmation: true,
                use_cases: vec!["创建盘点".to_string(), "库存盘点".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "wms.analyze_warehouse".to_string(),
                name: "仓库分析".to_string(),
                description: "分析仓库利用率、库存周转率、出入库趋势".to_string(),
                category: ToolCategory::Analysis,
                parameters: vec![
                    ToolParameter { name: "warehouse".to_string(), param_type: "string".to_string(), description: "仓库".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "period".to_string(), param_type: "string".to_string(), description: "分析周期".to_string(), required: false, default_value: Some(serde_json::json!("本月")), enum_values: None },
                ],
                requires_confirmation: false,
                use_cases: vec!["仓库分析".to_string(), "库存周转".to_string()],
            },
        ],
        faqs: vec![
            FAQItem {
                question: "入库流程是怎样的？".to_string(),
                answer: "入库流程：1. 创建入库单（选择仓库、来源类型、入库明细）；2. 到货确认（核对商品数量和质量）；3. 上架操作（将商品放到指定库位）；4. 入库完成（系统更新库存）。".to_string(),
                keywords: vec!["入库".to_string(), "流程".to_string()],
                category: "入库管理".to_string(),
            },
            FAQItem {
                question: "如何进行库存盘点？".to_string(),
                answer: "在盘点管理模块点击「新建盘点」，选择盘点仓库和盘点类型（全盘/抽盘/动盘），系统生成盘点单。盘点人员按单盘点并录入实盘数量，系统自动计算盘盈盘亏，审核后调整库存。".to_string(),
                keywords: vec!["盘点".to_string(), "库存盘点".to_string()],
                category: "盘点管理".to_string(),
            },
            FAQItem {
                question: "库位如何管理？".to_string(),
                answer: "库位按仓库-库区-货架-层-位的层级结构管理。每个库位有唯一编码，可以设置库位类型（良品区/不良品区/待检区/退货区等）、容量限制等属性。商品上架时系统会推荐最优库位。".to_string(),
                keywords: vec!["库位".to_string(), "货架".to_string()],
                category: "库位管理".to_string(),
            },
        ],
        glossary: vec![
            GlossaryTerm { term: "SKU".to_string(), definition: "库存量单位，商品的唯一标识".to_string(), abbreviation: Some("SKU".to_string()), related_terms: vec!["商品".to_string(), "库存".to_string()] },
            GlossaryTerm { term: "库位".to_string(), definition: "仓库中存放商品的具体位置".to_string(), abbreviation: None, related_terms: vec!["仓库".to_string(), "货架".to_string()] },
            GlossaryTerm { term: "盘点".to_string(), definition: "对库存进行清点核对的过程".to_string(), abbreviation: None, related_terms: vec!["盘盈".to_string(), "盘亏".to_string()] },
            GlossaryTerm { term: "周转率".to_string(), definition: "一定时期内库存周转的次数".to_string(), abbreviation: None, related_terms: vec!["库存".to_string(), "效率".to_string()] },
        ],
        quick_actions: vec![
            QuickAction { action_id: "wms.new_inbound".to_string(), label: "新建入库".to_string(), description: "创建新的入库单".to_string(), icon: "download".to_string(), intent: CopilotIntent::Create, preset_prompt: "帮我创建一个入库单".to_string() },
            QuickAction { action_id: "wms.new_outbound".to_string(), label: "新建出库".to_string(), description: "创建新的出库单".to_string(), icon: "upload".to_string(), intent: CopilotIntent::Create, preset_prompt: "帮我创建一个出库单".to_string() },
            QuickAction { action_id: "wms.inventory".to_string(), label: "库存查询".to_string(), description: "查询实时库存".to_string(), icon: "box".to_string(), intent: CopilotIntent::Query, preset_prompt: "查询当前库存".to_string() },
            QuickAction { action_id: "wms.stocktake".to_string(), label: "库存盘点".to_string(), description: "创建盘点单".to_string(), icon: "clipboard".to_string(), intent: CopilotIntent::Create, preset_prompt: "帮我创建一个盘点单".to_string() },
        ],
        entities: vec![
            EntityDefinition {
                name: "入库单".to_string(),
                description: "商品入库的单据".to_string(),
                key_fields: vec![
                    EntityField { name: "入库单号".to_string(), field_type: "string".to_string(), description: "入库单唯一编号".to_string(), required: true },
                    EntityField { name: "仓库".to_string(), field_type: "string".to_string(), description: "目标仓库".to_string(), required: true },
                    EntityField { name: "来源类型".to_string(), field_type: "enum".to_string(), description: "采购/退货/调拨/其他".to_string(), required: true },
                    EntityField { name: "入库状态".to_string(), field_type: "enum".to_string(), description: "待入库/入库中/已完成/已取消".to_string(), required: true },
                ],
                common_queries: vec!["查询入库单".to_string(), "入库详情".to_string()],
            },
            EntityDefinition {
                name: "出库单".to_string(),
                description: "商品出库的单据".to_string(),
                key_fields: vec![
                    EntityField { name: "出库单号".to_string(), field_type: "string".to_string(), description: "出库单唯一编号".to_string(), required: true },
                    EntityField { name: "仓库".to_string(), field_type: "string".to_string(), description: "出库仓库".to_string(), required: true },
                    EntityField { name: "出库类型".to_string(), field_type: "enum".to_string(), description: "销售出库/调拨出库/退货出库/其他".to_string(), required: true },
                    EntityField { name: "出库状态".to_string(), field_type: "enum".to_string(), description: "待出库/拣货中/已出库/已取消".to_string(), required: true },
                ],
                common_queries: vec!["查询出库单".to_string(), "出库详情".to_string()],
            },
        ],
        enabled: true,
    }
}

// ============================================================================
// HR 人力资源模块配置
// ============================================================================

/// 创建 HR 人力资源模块配置
pub fn create_hr_config() -> BusinessModuleConfig {
    BusinessModuleConfig {
        module: BusinessModule::HR,
        name: "HR 智能助手".to_string(),
        description: "人力资源智能助手，帮助处理员工管理、招聘、考勤、薪酬、绩效等业务".to_string(),
        system_prompt: "你是一个专业的 HR（人力资源）智能助手。你可以帮助用户处理员工管理、招聘管理、考勤管理、薪酬管理、绩效管理、培训管理等人力资源业务。请用专业、简洁的语言回答用户问题，并在需要时提供操作建议。注意保护员工隐私，敏感信息需要授权后才能提供。".to_string(),
        welcome_message: "您好！我是 HR 智能助手，可以帮您处理员工管理、招聘、考勤、薪酬、绩效等业务。请问有什么可以帮您的？".to_string(),
        supported_intents: vec![
            CopilotIntent::Query,
            CopilotIntent::Create,
            CopilotIntent::Update,
            CopilotIntent::Delete,
            CopilotIntent::Analyze,
            CopilotIntent::Report,
            CopilotIntent::Approve,
            CopilotIntent::Knowledge,
            CopilotIntent::Guidance,
        ],
        available_tools: vec![
            BusinessToolDefinition {
                tool_id: "hr.query_employee".to_string(),
                name: "查询员工信息".to_string(),
                description: "根据条件查询员工列表或详情".to_string(),
                category: ToolCategory::Query,
                parameters: vec![
                    ToolParameter { name: "employee_id".to_string(), param_type: "string".to_string(), description: "员工ID".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "name".to_string(), param_type: "string".to_string(), description: "员工姓名".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "department".to_string(), param_type: "string".to_string(), description: "部门".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "status".to_string(), param_type: "string".to_string(), description: "员工状态".to_string(), required: false, default_value: None, enum_values: Some(vec!["在职".to_string(), "离职".to_string(), "试用期".to_string(), "休假".to_string()]) },
                ],
                requires_confirmation: false,
                use_cases: vec!["查询员工信息".to_string(), "查看员工详情".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "hr.create_employee".to_string(),
                name: "创建员工档案".to_string(),
                description: "创建新的员工档案".to_string(),
                category: ToolCategory::Create,
                parameters: vec![
                    ToolParameter { name: "name".to_string(), param_type: "string".to_string(), description: "员工姓名".to_string(), required: true, default_value: None, enum_values: None },
                    ToolParameter { name: "department".to_string(), param_type: "string".to_string(), description: "所属部门".to_string(), required: true, default_value: None, enum_values: None },
                    ToolParameter { name: "position".to_string(), param_type: "string".to_string(), description: "职位".to_string(), required: true, default_value: None, enum_values: None },
                    ToolParameter { name: "hire_date".to_string(), param_type: "date".to_string(), description: "入职日期".to_string(), required: true, default_value: None, enum_values: None },
                ],
                requires_confirmation: true,
                use_cases: vec!["创建员工档案".to_string(), "新员工入职".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "hr.query_attendance".to_string(),
                name: "查询考勤记录".to_string(),
                description: "查询员工考勤记录、考勤统计".to_string(),
                category: ToolCategory::Query,
                parameters: vec![
                    ToolParameter { name: "employee_id".to_string(), param_type: "string".to_string(), description: "员工ID".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "start_date".to_string(), param_type: "date".to_string(), description: "开始日期".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "end_date".to_string(), param_type: "date".to_string(), description: "结束日期".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "type".to_string(), param_type: "string".to_string(), description: "考勤类型".to_string(), required: false, default_value: None, enum_values: Some(vec!["正常".to_string(), "迟到".to_string(), "早退".to_string(), "旷工".to_string(), "请假".to_string()]) },
                ],
                requires_confirmation: false,
                use_cases: vec!["查询考勤".to_string(), "考勤统计".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "hr.query_leave".to_string(),
                name: "查询请假记录".to_string(),
                description: "查询员工请假记录、请假余额".to_string(),
                category: ToolCategory::Query,
                parameters: vec![
                    ToolParameter { name: "employee_id".to_string(), param_type: "string".to_string(), description: "员工ID".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "leave_type".to_string(), param_type: "string".to_string(), description: "请假类型".to_string(), required: false, default_value: None, enum_values: Some(vec!["年假".to_string(), "病假".to_string(), "事假".to_string(), "婚假".to_string(), "产假".to_string()]) },
                    ToolParameter { name: "status".to_string(), param_type: "string".to_string(), description: "审批状态".to_string(), required: false, default_value: None, enum_values: Some(vec!["待审批".to_string(), "已通过".to_string(), "已拒绝".to_string(), "已取消".to_string()]) },
                ],
                requires_confirmation: false,
                use_cases: vec!["查询请假".to_string(), "请假余额".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "hr.analyze_headcount".to_string(),
                name: "人力分析".to_string(),
                description: "分析人力结构、人员流动、编制情况".to_string(),
                category: ToolCategory::Analysis,
                parameters: vec![
                    ToolParameter { name: "department".to_string(), param_type: "string".to_string(), description: "部门".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "period".to_string(), param_type: "string".to_string(), description: "分析周期".to_string(), required: false, default_value: Some(serde_json::json!("本月")), enum_values: Some(vec!["本月".to_string(), "本季度".to_string(), "本年度".to_string()]) },
                ],
                requires_confirmation: false,
                use_cases: vec!["人力分析".to_string(), "人员流动分析".to_string()],
            },
        ],
        faqs: vec![
            FAQItem { question: "如何查询员工信息？".to_string(), answer: "您可以说\"查询员工张三\"或\"查询研发部员工列表\"，我会帮您查询相关员工信息。".to_string(), keywords: vec!["员工".to_string(), "查询".to_string(), "信息".to_string()], category: "员工管理".to_string() },
            FAQItem { question: "如何申请请假？".to_string(), answer: "您可以说\"我要请假\"，然后告诉我请假类型、开始日期和结束日期，我会帮您创建请假申请。".to_string(), keywords: vec!["请假".to_string(), "申请".to_string(), "休假".to_string()], category: "考勤管理".to_string() },
            FAQItem { question: "如何查看我的考勤记录？".to_string(), answer: "您可以说\"查看我的考勤\"或\"查看本月考勤统计\"，我会帮您查询考勤记录。".to_string(), keywords: vec!["考勤".to_string(), "记录".to_string(), "统计".to_string()], category: "考勤管理".to_string() },
            FAQItem { question: "新员工入职流程是什么？".to_string(), answer: "新员工入职流程包括：创建员工档案、分配部门和职位、设置薪资、办理入职手续、安排培训等。".to_string(), keywords: vec!["入职".to_string(), "新员工".to_string(), "流程".to_string()], category: "员工管理".to_string() },
        ],
        glossary: vec![
            GlossaryTerm { term: "编制".to_string(), definition: "部门或岗位的人员数量定额".to_string(), abbreviation: None, related_terms: vec!["部门".to_string(), "岗位".to_string()] },
            GlossaryTerm { term: "360度评估".to_string(), definition: "由上级、同事、下属、客户等多维度进行的绩效评估方法".to_string(), abbreviation: Some("360评估".to_string()), related_terms: vec!["绩效".to_string(), "评估".to_string()] },
            GlossaryTerm { term: "竞业限制".to_string(), definition: "员工离职后在一定期限内不得从事与原单位有竞争关系的工作".to_string(), abbreviation: None, related_terms: vec!["离职".to_string(), "合同".to_string()] },
        ],
        quick_actions: vec![
            QuickAction { action_id: "hr.query_employee".to_string(), label: "查询员工".to_string(), description: "查询员工信息".to_string(), icon: "users".to_string(), intent: CopilotIntent::Query, preset_prompt: "查询员工信息".to_string() },
            QuickAction { action_id: "hr.attendance".to_string(), label: "考勤统计".to_string(), description: "查看考勤统计".to_string(), icon: "calendar".to_string(), intent: CopilotIntent::Query, preset_prompt: "查看本月考勤统计".to_string() },
            QuickAction { action_id: "hr.leave".to_string(), label: "请假申请".to_string(), description: "申请请假".to_string(), icon: "clipboard".to_string(), intent: CopilotIntent::Create, preset_prompt: "我要申请请假".to_string() },
            QuickAction { action_id: "hr.analysis".to_string(), label: "人力分析".to_string(), description: "分析人力数据".to_string(), icon: "chart".to_string(), intent: CopilotIntent::Analyze, preset_prompt: "分析本月人力数据".to_string() },
        ],
        entities: vec![
            EntityDefinition {
                name: "员工".to_string(),
                description: "企业员工的基本信息".to_string(),
                key_fields: vec![
                    EntityField { name: "员工ID".to_string(), field_type: "string".to_string(), description: "员工唯一标识".to_string(), required: true },
                    EntityField { name: "姓名".to_string(), field_type: "string".to_string(), description: "员工姓名".to_string(), required: true },
                    EntityField { name: "部门".to_string(), field_type: "string".to_string(), description: "所属部门".to_string(), required: true },
                    EntityField { name: "职位".to_string(), field_type: "string".to_string(), description: "工作职位".to_string(), required: true },
                    EntityField { name: "状态".to_string(), field_type: "enum".to_string(), description: "在职/离职/试用期/休假".to_string(), required: true },
                ],
                common_queries: vec!["查询员工".to_string(), "员工详情".to_string()],
            },
        ],
        enabled: true,
    }
}

// ============================================================================
// OA 办公自动化模块配置
// ============================================================================

/// 创建 OA 办公自动化模块配置
pub fn create_oa_config() -> BusinessModuleConfig {
    BusinessModuleConfig {
        module: BusinessModule::OA,
        name: "OA 智能助手".to_string(),
        description: "办公自动化智能助手，帮助处理审批、公文、会议、通知、日程等办公业务".to_string(),
        system_prompt: "你是一个专业的 OA（办公自动化）智能助手。你可以帮助用户处理审批流程、公文管理、会议管理、通知公告、日程安排、任务管理等办公业务。请用专业、简洁的语言回答用户问题，并在需要时提供操作建议。".to_string(),
        welcome_message: "您好！我是 OA 智能助手，可以帮您处理审批、公文、会议、通知、日程等办公业务。请问有什么可以帮您的？".to_string(),
        supported_intents: vec![
            CopilotIntent::Query,
            CopilotIntent::Create,
            CopilotIntent::Update,
            CopilotIntent::Delete,
            CopilotIntent::Approve,
            CopilotIntent::Knowledge,
            CopilotIntent::Guidance,
        ],
        available_tools: vec![
            BusinessToolDefinition {
                tool_id: "oa.query_approval".to_string(),
                name: "查询审批流程".to_string(),
                description: "查询审批流程、待办事项、已办事项".to_string(),
                category: ToolCategory::Query,
                parameters: vec![
                    ToolParameter { name: "type".to_string(), param_type: "string".to_string(), description: "查询类型".to_string(), required: false, default_value: Some(serde_json::json!("todo")), enum_values: Some(vec!["todo".to_string(), "done".to_string(), "all".to_string(), "initiated".to_string()]) },
                    ToolParameter { name: "approval_type".to_string(), param_type: "string".to_string(), description: "审批类型".to_string(), required: false, default_value: None, enum_values: Some(vec!["请假".to_string(), "报销".to_string(), "采购".to_string(), "合同".to_string(), "用印".to_string()]) },
                    ToolParameter { name: "status".to_string(), param_type: "string".to_string(), description: "审批状态".to_string(), required: false, default_value: None, enum_values: Some(vec!["待审批".to_string(), "审批中".to_string(), "已通过".to_string(), "已拒绝".to_string()]) },
                ],
                requires_confirmation: false,
                use_cases: vec!["查询待办".to_string(), "查询审批".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "oa.approve".to_string(),
                name: "审批操作".to_string(),
                description: "同意或拒绝审批申请".to_string(),
                category: ToolCategory::Approval,
                parameters: vec![
                    ToolParameter { name: "approval_id".to_string(), param_type: "string".to_string(), description: "审批ID".to_string(), required: true, default_value: None, enum_values: None },
                    ToolParameter { name: "action".to_string(), param_type: "string".to_string(), description: "审批操作".to_string(), required: true, default_value: None, enum_values: Some(vec!["同意".to_string(), "拒绝".to_string(), "转交".to_string(), "加签".to_string()]) },
                    ToolParameter { name: "comment".to_string(), param_type: "string".to_string(), description: "审批意见".to_string(), required: false, default_value: None, enum_values: None },
                ],
                requires_confirmation: true,
                use_cases: vec!["审批同意".to_string(), "审批拒绝".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "oa.query_document".to_string(),
                name: "查询公文".to_string(),
                description: "查询公文、公告、通知".to_string(),
                category: ToolCategory::Query,
                parameters: vec![
                    ToolParameter { name: "title".to_string(), param_type: "string".to_string(), description: "公文标题".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "type".to_string(), param_type: "string".to_string(), description: "公文类型".to_string(), required: false, default_value: None, enum_values: Some(vec!["通知".to_string(), "公告".to_string(), "决定".to_string(), "请示".to_string(), "报告".to_string()]) },
                    ToolParameter { name: "status".to_string(), param_type: "string".to_string(), description: "公文状态".to_string(), required: false, default_value: None, enum_values: Some(vec!["草稿".to_string(), "审核中".to_string(), "已发布".to_string(), "已归档".to_string()]) },
                ],
                requires_confirmation: false,
                use_cases: vec!["查询公文".to_string(), "查看通知".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "oa.create_meeting".to_string(),
                name: "创建会议".to_string(),
                description: "创建新的会议安排".to_string(),
                category: ToolCategory::Create,
                parameters: vec![
                    ToolParameter { name: "title".to_string(), param_type: "string".to_string(), description: "会议主题".to_string(), required: true, default_value: None, enum_values: None },
                    ToolParameter { name: "date".to_string(), param_type: "date".to_string(), description: "会议日期".to_string(), required: true, default_value: None, enum_values: None },
                    ToolParameter { name: "start_time".to_string(), param_type: "string".to_string(), description: "开始时间".to_string(), required: true, default_value: None, enum_values: None },
                    ToolParameter { name: "end_time".to_string(), param_type: "string".to_string(), description: "结束时间".to_string(), required: true, default_value: None, enum_values: None },
                    ToolParameter { name: "participants".to_string(), param_type: "array".to_string(), description: "参会人员".to_string(), required: true, default_value: None, enum_values: None },
                    ToolParameter { name: "location".to_string(), param_type: "string".to_string(), description: "会议地点".to_string(), required: false, default_value: None, enum_values: None },
                ],
                requires_confirmation: true,
                use_cases: vec!["创建会议".to_string(), "安排会议".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "oa.query_schedule".to_string(),
                name: "查询日程".to_string(),
                description: "查询个人日程、会议安排".to_string(),
                category: ToolCategory::Query,
                parameters: vec![
                    ToolParameter { name: "date".to_string(), param_type: "date".to_string(), description: "查询日期".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "start_date".to_string(), param_type: "date".to_string(), description: "开始日期".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "end_date".to_string(), param_type: "date".to_string(), description: "结束日期".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "type".to_string(), param_type: "string".to_string(), description: "日程类型".to_string(), required: false, default_value: None, enum_values: Some(vec!["会议".to_string(), "任务".to_string(), "提醒".to_string(), "出差".to_string()]) },
                ],
                requires_confirmation: false,
                use_cases: vec!["查询日程".to_string(), "今日安排".to_string()],
            },
        ],
        faqs: vec![
            FAQItem { question: "如何查看我的待办审批？".to_string(), answer: "您可以说\"查看待办\"或\"我的审批\"，我会帮您查询待处理的审批事项。".to_string(), keywords: vec!["待办".to_string(), "审批".to_string(), "查询".to_string()], category: "审批管理".to_string() },
            FAQItem { question: "如何快速审批？".to_string(), answer: "您可以说\"同意审批XXX\"或\"拒绝审批XXX\"，我会帮您完成审批操作。".to_string(), keywords: vec!["审批".to_string(), "同意".to_string(), "拒绝".to_string()], category: "审批管理".to_string() },
            FAQItem { question: "如何创建会议？".to_string(), answer: "您可以说\"创建会议\"，然后告诉我会议主题、时间、参会人员等信息，我会帮您安排会议。".to_string(), keywords: vec!["会议".to_string(), "创建".to_string(), "安排".to_string()], category: "会议管理".to_string() },
            FAQItem { question: "如何查看今日日程？".to_string(), answer: "您可以说\"今日日程\"或\"今天有什么安排\"，我会帮您查询今天的日程安排。".to_string(), keywords: vec!["日程".to_string(), "今日".to_string(), "安排".to_string()], category: "日程管理".to_string() },
        ],
        glossary: vec![
            GlossaryTerm { term: "加签".to_string(), definition: "在审批流程中增加额外的审批人".to_string(), abbreviation: None, related_terms: vec!["审批".to_string(), "流程".to_string()] },
            GlossaryTerm { term: "转交".to_string(), definition: "将审批任务转交给其他人处理".to_string(), abbreviation: None, related_terms: vec!["审批".to_string(), "委托".to_string()] },
            GlossaryTerm { term: "会签".to_string(), definition: "多个审批人同时审批，全部同意才算通过".to_string(), abbreviation: None, related_terms: vec!["审批".to_string(), "多人".to_string()] },
        ],
        quick_actions: vec![
            QuickAction { action_id: "oa.todo".to_string(), label: "待办审批".to_string(), description: "查看待办审批".to_string(), icon: "inbox".to_string(), intent: CopilotIntent::Query, preset_prompt: "查看我的待办审批".to_string() },
            QuickAction { action_id: "oa.new_approval".to_string(), label: "发起审批".to_string(), description: "发起新的审批".to_string(), icon: "send".to_string(), intent: CopilotIntent::Create, preset_prompt: "我要发起审批".to_string() },
            QuickAction { action_id: "oa.new_meeting".to_string(), label: "创建会议".to_string(), description: "创建新会议".to_string(), icon: "video".to_string(), intent: CopilotIntent::Create, preset_prompt: "创建一个会议".to_string() },
            QuickAction { action_id: "oa.schedule".to_string(), label: "今日日程".to_string(), description: "查看今日日程".to_string(), icon: "calendar".to_string(), intent: CopilotIntent::Query, preset_prompt: "查看今日日程".to_string() },
        ],
        entities: vec![
            EntityDefinition {
                name: "审批单".to_string(),
                description: "审批流程的基本单元".to_string(),
                key_fields: vec![
                    EntityField { name: "审批ID".to_string(), field_type: "string".to_string(), description: "审批唯一标识".to_string(), required: true },
                    EntityField { name: "审批类型".to_string(), field_type: "enum".to_string(), description: "请假/报销/采购/合同/用印".to_string(), required: true },
                    EntityField { name: "申请人".to_string(), field_type: "string".to_string(), description: "审批申请人".to_string(), required: true },
                    EntityField { name: "状态".to_string(), field_type: "enum".to_string(), description: "待审批/审批中/已通过/已拒绝".to_string(), required: true },
                ],
                common_queries: vec!["查询审批".to_string(), "审批详情".to_string()],
            },
        ],
        enabled: true,
    }
}

// ============================================================================
// General 通用助手模块配置
// ============================================================================

/// 创建 General 通用助手模块配置
pub fn create_general_config() -> BusinessModuleConfig {
    BusinessModuleConfig {
        module: BusinessModule::General,
        name: "通用智能助手".to_string(),
        description: "通用智能助手，提供跨模块的综合服务、知识问答、操作指导等".to_string(),
        system_prompt: "你是 TOPEMS 企业管理系统的通用智能助手。你可以帮助用户解答系统使用问题、提供操作指导、查询跨模块数据、分析业务情况、生成报表等。如果用户的问题属于特定业务模块（ERP、Finance、CRM、WMS、HR、OA），请建议用户切换到对应的专业助手。请用友好、专业的语言回答用户问题。".to_string(),
        welcome_message: "您好！我是 TOPEMS 通用智能助手，可以帮您解答系统使用问题、提供操作指导、查询数据、生成报表等。请问有什么可以帮您的？".to_string(),
        supported_intents: vec![
            CopilotIntent::Query,
            CopilotIntent::Analyze,
            CopilotIntent::Report,
            CopilotIntent::Knowledge,
            CopilotIntent::Guidance,
        ],
        available_tools: vec![
            BusinessToolDefinition {
                tool_id: "general.search_knowledge".to_string(),
                name: "知识搜索".to_string(),
                description: "搜索系统知识库、帮助文档、操作指南".to_string(),
                category: ToolCategory::Query,
                parameters: vec![
                    ToolParameter { name: "query".to_string(), param_type: "string".to_string(), description: "搜索关键词".to_string(), required: true, default_value: None, enum_values: None },
                    ToolParameter { name: "category".to_string(), param_type: "string".to_string(), description: "知识分类".to_string(), required: false, default_value: None, enum_values: Some(vec!["操作指南".to_string(), "常见问题".to_string(), "系统配置".to_string(), "业务流程".to_string(), "最佳实践".to_string()]) },
                ],
                requires_confirmation: false,
                use_cases: vec!["搜索知识".to_string(), "查找帮助".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "general.get_guidance".to_string(),
                name: "操作指导".to_string(),
                description: "提供系统功能的操作步骤指导".to_string(),
                category: ToolCategory::Query,
                parameters: vec![
                    ToolParameter { name: "function".to_string(), param_type: "string".to_string(), description: "功能名称".to_string(), required: true, default_value: None, enum_values: None },
                    ToolParameter { name: "module".to_string(), param_type: "string".to_string(), description: "所属模块".to_string(), required: false, default_value: None, enum_values: Some(vec!["ERP".to_string(), "Finance".to_string(), "CRM".to_string(), "WMS".to_string(), "HR".to_string(), "OA".to_string()]) },
                ],
                requires_confirmation: false,
                use_cases: vec!["操作指导".to_string(), "如何使用".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "general.query_dashboard".to_string(),
                name: "查询仪表盘".to_string(),
                description: "查询企业综合仪表盘、关键指标".to_string(),
                category: ToolCategory::Query,
                parameters: vec![
                    ToolParameter { name: "dashboard".to_string(), param_type: "string".to_string(), description: "仪表盘名称".to_string(), required: false, default_value: None, enum_values: Some(vec!["综合概览".to_string(), "销售分析".to_string(), "财务概览".to_string(), "运营指标".to_string()]) },
                    ToolParameter { name: "period".to_string(), param_type: "string".to_string(), description: "统计周期".to_string(), required: false, default_value: Some(serde_json::json!("本月")), enum_values: Some(vec!["今日".to_string(), "本周".to_string(), "本月".to_string(), "本季度".to_string(), "本年度".to_string()]) },
                ],
                requires_confirmation: false,
                use_cases: vec!["查看仪表盘".to_string(), "关键指标".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "general.generate_report".to_string(),
                name: "生成报表".to_string(),
                description: "生成跨模块的综合报表".to_string(),
                category: ToolCategory::Report,
                parameters: vec![
                    ToolParameter { name: "report_type".to_string(), param_type: "string".to_string(), description: "报表类型".to_string(), required: true, default_value: None, enum_values: Some(vec!["经营日报".to_string(), "经营周报".to_string(), "经营月报".to_string(), "综合分析".to_string()]) },
                    ToolParameter { name: "start_date".to_string(), param_type: "date".to_string(), description: "开始日期".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "end_date".to_string(), param_type: "date".to_string(), description: "结束日期".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "format".to_string(), param_type: "string".to_string(), description: "输出格式".to_string(), required: false, default_value: Some(serde_json::json!("text")), enum_values: Some(vec!["text".to_string(), "markdown".to_string(), "excel".to_string()]) },
                ],
                requires_confirmation: true,
                use_cases: vec!["生成报表".to_string(), "经营分析".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "general.available_modules".to_string(),
                name: "可用模块查询".to_string(),
                description: "查询系统可用的业务模块和功能".to_string(),
                category: ToolCategory::Query,
                parameters: vec![],
                requires_confirmation: false,
                use_cases: vec!["查看模块".to_string(), "系统功能".to_string()],
            },
        ],
        faqs: vec![
            FAQItem { question: "系统有哪些功能模块？".to_string(), answer: "TOPEMS 系统包含以下业务模块：ERP（企业资源规划）、Finance（财务管理）、CRM（客户关系管理）、WMS（仓库管理）、HR（人力资源）、OA（办公自动化）。您可以切换到对应模块的专业助手获取更专业的服务。".to_string(), keywords: vec!["模块".to_string(), "功能".to_string(), "介绍".to_string()], category: "系统介绍".to_string() },
            FAQItem { question: "如何切换到其他业务模块？".to_string(), answer: "您可以在对话中直接说\"切换到 ERP 助手\"、\"我要找财务助手\"等，或者在界面上选择对应的业务模块标签。".to_string(), keywords: vec!["切换".to_string(), "模块".to_string(), "助手".to_string()], category: "使用指南".to_string() },
            FAQItem { question: "如何获取系统操作帮助？".to_string(), answer: "您可以直接问我\"如何创建采购订单\"、\"报销流程是什么\"等问题，我会为您提供详细的操作指导。也可以使用知识搜索功能查找相关文档。".to_string(), keywords: vec!["帮助".to_string(), "操作".to_string(), "指南".to_string()], category: "使用指南".to_string() },
            FAQItem { question: "可以生成哪些报表？".to_string(), answer: "系统支持生成经营日报、经营周报、经营月报、综合分析等跨模块报表。您也可以在各业务模块中生成专业报表。".to_string(), keywords: vec!["报表".to_string(), "生成".to_string(), "分析".to_string()], category: "报表功能".to_string() },
        ],
        glossary: vec![
            GlossaryTerm { term: "TOPEMS".to_string(), definition: "企业资源规划与管理系统，涵盖 ERP、财务、CRM、WMS、HR、OA 等业务模块".to_string(), abbreviation: None, related_terms: vec!["ERP".to_string(), "企业管理".to_string()] },
            GlossaryTerm { term: "Copilot".to_string(), definition: "智能助手，基于 AI 技术提供业务问答、操作指导、数据分析等服务".to_string(), abbreviation: None, related_terms: vec!["AI".to_string(), "助手".to_string()] },
            GlossaryTerm { term: "KPI".to_string(), definition: "关键绩效指标，用于衡量业务运营效果的核心指标".to_string(), abbreviation: Some("KPI".to_string()), related_terms: vec!["绩效".to_string(), "指标".to_string()] },
        ],
        quick_actions: vec![
            QuickAction { action_id: "general.search".to_string(), label: "知识搜索".to_string(), description: "搜索知识库".to_string(), icon: "search".to_string(), intent: CopilotIntent::Query, preset_prompt: "搜索知识库".to_string() },
            QuickAction { action_id: "general.guidance".to_string(), label: "操作指导".to_string(), description: "获取操作指导".to_string(), icon: "book".to_string(), intent: CopilotIntent::Guidance, preset_prompt: "获取系统操作指导".to_string() },
            QuickAction { action_id: "general.dashboard".to_string(), label: "查看仪表盘".to_string(), description: "查看综合仪表盘".to_string(), icon: "dashboard".to_string(), intent: CopilotIntent::Query, preset_prompt: "查看综合仪表盘".to_string() },
            QuickAction { action_id: "general.report".to_string(), label: "生成报表".to_string(), description: "生成综合报表".to_string(), icon: "file".to_string(), intent: CopilotIntent::Report, preset_prompt: "生成经营月报".to_string() },
        ],
        entities: vec![
            EntityDefinition {
                name: "知识条目".to_string(),
                description: "系统知识库中的知识条目".to_string(),
                key_fields: vec![
                    EntityField { name: "标题".to_string(), field_type: "string".to_string(), description: "知识条目标题".to_string(), required: true },
                    EntityField { name: "分类".to_string(), field_type: "enum".to_string(), description: "操作指南/常见问题/系统配置/业务流程/最佳实践".to_string(), required: true },
                    EntityField { name: "模块".to_string(), field_type: "string".to_string(), description: "所属业务模块".to_string(), required: false },
                    EntityField { name: "更新时间".to_string(), field_type: "datetime".to_string(), description: "最后更新时间".to_string(), required: true },
                ],
                common_queries: vec!["搜索知识".to_string(), "知识详情".to_string()],
            },
        ],
        enabled: true,
    }
}

// ============================================================================
// QMS 质量管理模块配置
// ============================================================================

/// 创建 QMS 质量管理模块配置
pub fn create_qms_config() -> BusinessModuleConfig {
    BusinessModuleConfig {
        module: BusinessModule::QMS,
        name: "QMS 智能助手".to_string(),
        description: "质量管理智能助手，帮助处理质量检验、不合格品处理、质量分析、供应商质量等业务".to_string(),
        system_prompt: "你是一个专业的 QMS（质量管理）智能助手。你可以帮助用户处理质量检验、不合格品处理、质量分析、供应商质量管理、质量文档管理等业务。请用专业、简洁的语言回答用户问题，并在需要时提供操作建议。".to_string(),
        welcome_message: "您好！我是 QMS 智能助手，可以帮您处理质量检验、不合格品、质量分析、供应商质量等业务。请问有什么可以帮您的？".to_string(),
        supported_intents: vec![
            CopilotIntent::Query,
            CopilotIntent::Create,
            CopilotIntent::Update,
            CopilotIntent::Analyze,
            CopilotIntent::Report,
            CopilotIntent::Approve,
            CopilotIntent::Knowledge,
            CopilotIntent::Guidance,
        ],
        available_tools: vec![
            BusinessToolDefinition {
                tool_id: "qms.query_inspection".to_string(),
                name: "查询质量检验".to_string(),
                description: "查询质量检验记录、检验结果".to_string(),
                category: ToolCategory::Query,
                parameters: vec![
                    ToolParameter { name: "inspection_no".to_string(), param_type: "string".to_string(), description: "检验单号".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "status".to_string(), param_type: "string".to_string(), description: "检验状态".to_string(), required: false, default_value: None, enum_values: Some(vec!["待检验".to_string(), "检验中".to_string(), "合格".to_string(), "不合格".to_string()]) },
                    ToolParameter { name: "start_date".to_string(), param_type: "date".to_string(), description: "开始日期".to_string(), required: false, default_value: None, enum_values: None },
                ],
                requires_confirmation: false,
                use_cases: vec!["查询检验记录".to_string(), "检验结果".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "qms.create_nonconformance".to_string(),
                name: "创建不合格品".to_string(),
                description: "创建不合格品记录".to_string(),
                category: ToolCategory::Create,
                parameters: vec![
                    ToolParameter { name: "product".to_string(), param_type: "string".to_string(), description: "产品名称".to_string(), required: true, default_value: None, enum_values: None },
                    ToolParameter { name: "quantity".to_string(), param_type: "number".to_string(), description: "不合格数量".to_string(), required: true, default_value: None, enum_values: None },
                    ToolParameter { name: "defect_type".to_string(), param_type: "string".to_string(), description: "缺陷类型".to_string(), required: true, default_value: None, enum_values: None },
                    ToolParameter { name: "description".to_string(), param_type: "string".to_string(), description: "问题描述".to_string(), required: true, default_value: None, enum_values: None },
                ],
                requires_confirmation: true,
                use_cases: vec!["创建不合格品".to_string(), "质量问题".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "qms.analyze_quality".to_string(),
                name: "质量分析".to_string(),
                description: "分析质量数据、质量趋势、缺陷分布".to_string(),
                category: ToolCategory::Analysis,
                parameters: vec![
                    ToolParameter { name: "period".to_string(), param_type: "string".to_string(), description: "分析周期".to_string(), required: false, default_value: Some(serde_json::json!("本月")), enum_values: Some(vec!["本周".to_string(), "本月".to_string(), "本季度".to_string(), "本年度".to_string()]) },
                    ToolParameter { name: "product".to_string(), param_type: "string".to_string(), description: "产品名称".to_string(), required: false, default_value: None, enum_values: None },
                ],
                requires_confirmation: false,
                use_cases: vec!["质量分析".to_string(), "质量趋势".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "qms.query_supplier_quality".to_string(),
                name: "供应商质量查询".to_string(),
                description: "查询供应商质量评分、来料检验记录".to_string(),
                category: ToolCategory::Query,
                parameters: vec![
                    ToolParameter { name: "supplier".to_string(), param_type: "string".to_string(), description: "供应商名称".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "min_score".to_string(), param_type: "number".to_string(), description: "最低评分".to_string(), required: false, default_value: None, enum_values: None },
                ],
                requires_confirmation: false,
                use_cases: vec!["供应商质量".to_string(), "来料检验".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "qms.generate_quality_report".to_string(),
                name: "生成质量报表".to_string(),
                description: "生成质量统计报表".to_string(),
                category: ToolCategory::Report,
                parameters: vec![
                    ToolParameter { name: "report_type".to_string(), param_type: "string".to_string(), description: "报表类型".to_string(), required: true, default_value: None, enum_values: Some(vec!["质量月报".to_string(), "不合格品统计".to_string(), "供应商质量排名".to_string()]) },
                    ToolParameter { name: "start_date".to_string(), param_type: "date".to_string(), description: "开始日期".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "end_date".to_string(), param_type: "date".to_string(), description: "结束日期".to_string(), required: false, default_value: None, enum_values: None },
                ],
                requires_confirmation: true,
                use_cases: vec!["质量报表".to_string(), "质量统计".to_string()],
            },
        ],
        faqs: vec![
            FAQItem { question: "如何查询质量检验记录？".to_string(), answer: "您可以说\"查询质量检验记录\"或\"查看检验结果\"，我会帮您查询相关检验记录。".to_string(), keywords: vec!["质量检验".to_string(), "查询".to_string()], category: "质量检验".to_string() },
            FAQItem { question: "如何创建不合格品记录？".to_string(), answer: "您可以说\"创建不合格品\"，然后告诉我产品名称、不合格数量、缺陷类型和问题描述，我会帮您创建记录。".to_string(), keywords: vec!["不合格品".to_string(), "创建".to_string()], category: "不合格品".to_string() },
            FAQItem { question: "如何查看质量趋势分析？".to_string(), answer: "您可以说\"质量分析\"或\"查看质量趋势\"，我会帮您分析质量数据和趋势。".to_string(), keywords: vec!["质量分析".to_string(), "趋势".to_string()], category: "质量分析".to_string() },
            FAQItem { question: "如何评估供应商质量？".to_string(), answer: "您可以说\"供应商质量\"或\"查看供应商质量评分\"，我会帮您查询供应商质量评分和来料检验记录。".to_string(), keywords: vec!["供应商".to_string(), "质量".to_string()], category: "供应商质量".to_string() },
        ],
        glossary: vec![
            GlossaryTerm { term: "QC".to_string(), definition: "质量控制，通过检验和测试确保产品符合质量标准".to_string(), abbreviation: Some("QC".to_string()), related_terms: vec!["质量检验".to_string(), "QA".to_string()] },
            GlossaryTerm { term: "QA".to_string(), definition: "质量保证，通过建立和维护质量管理体系确保产品质量".to_string(), abbreviation: Some("QA".to_string()), related_terms: vec!["质量体系".to_string(), "QC".to_string()] },
            GlossaryTerm { term: "8D报告".to_string(), definition: "8 Disciplines，解决质量问题的8个步骤方法".to_string(), abbreviation: None, related_terms: vec!["问题解决".to_string(), "质量改进".to_string()] },
        ],
        quick_actions: vec![
            QuickAction { action_id: "qms.query_inspection".to_string(), label: "检验记录".to_string(), description: "查询质量检验记录".to_string(), icon: "search".to_string(), intent: CopilotIntent::Query, preset_prompt: "查询最近的质量检验记录".to_string() },
            QuickAction { action_id: "qms.create_nc".to_string(), label: "不合格品".to_string(), description: "创建不合格品记录".to_string(), icon: "alert".to_string(), intent: CopilotIntent::Create, preset_prompt: "创建不合格品记录".to_string() },
            QuickAction { action_id: "qms.analyze".to_string(), label: "质量分析".to_string(), description: "分析质量数据".to_string(), icon: "chart".to_string(), intent: CopilotIntent::Analyze, preset_prompt: "分析本月质量数据".to_string() },
            QuickAction { action_id: "qms.supplier".to_string(), label: "供应商质量".to_string(), description: "查询供应商质量".to_string(), icon: "users".to_string(), intent: CopilotIntent::Query, preset_prompt: "查询供应商质量评分".to_string() },
        ],
        entities: vec![
            EntityDefinition {
                name: "质量检验单".to_string(),
                description: "产品质量检验的记录单据".to_string(),
                key_fields: vec![
                    EntityField { name: "检验单号".to_string(), field_type: "string".to_string(), description: "检验单唯一编号".to_string(), required: true },
                    EntityField { name: "产品".to_string(), field_type: "string".to_string(), description: "被检验产品".to_string(), required: true },
                    EntityField { name: "检验状态".to_string(), field_type: "enum".to_string(), description: "待检验/检验中/合格/不合格".to_string(), required: true },
                    EntityField { name: "检验日期".to_string(), field_type: "date".to_string(), description: "检验日期".to_string(), required: true },
                ],
                common_queries: vec!["查询检验单".to_string(), "检验详情".to_string()],
            },
        ],
        enabled: true,
    }
}

// ============================================================================
// SCM 供应链管理模块配置
// ============================================================================

/// 创建 SCM 供应链管理模块配置
pub fn create_scm_config() -> BusinessModuleConfig {
    BusinessModuleConfig {
        module: BusinessModule::SCM,
        name: "SCM 智能助手".to_string(),
        description: "供应链管理智能助手，帮助处理供应商管理、采购协同、物流跟踪、需求计划等业务".to_string(),
        system_prompt: "你是一个专业的 SCM（供应链管理）智能助手。你可以帮助用户处理供应商管理、采购协同、物流跟踪、需求计划、库存优化等供应链业务。请用专业、简洁的语言回答用户问题，并在需要时提供操作建议。".to_string(),
        welcome_message: "您好！我是 SCM 智能助手，可以帮您处理供应商管理、采购协同、物流跟踪、需求计划等业务。请问有什么可以帮您的？".to_string(),
        supported_intents: vec![
            CopilotIntent::Query,
            CopilotIntent::Create,
            CopilotIntent::Update,
            CopilotIntent::Analyze,
            CopilotIntent::Report,
            CopilotIntent::Knowledge,
            CopilotIntent::Guidance,
        ],
        available_tools: vec![
            BusinessToolDefinition {
                tool_id: "scm.query_supplier".to_string(),
                name: "查询供应商".to_string(),
                description: "查询供应商信息、供应商评估".to_string(),
                category: ToolCategory::Query,
                parameters: vec![
                    ToolParameter { name: "supplier_name".to_string(), param_type: "string".to_string(), description: "供应商名称".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "category".to_string(), param_type: "string".to_string(), description: "供应商类别".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "status".to_string(), param_type: "string".to_string(), description: "供应商状态".to_string(), required: false, default_value: None, enum_values: Some(vec!["合格".to_string(), "待评估".to_string(), "暂停".to_string(), "淘汰".to_string()]) },
                ],
                requires_confirmation: false,
                use_cases: vec!["查询供应商".to_string(), "供应商评估".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "scm.track_logistics".to_string(),
                name: "物流跟踪".to_string(),
                description: "跟踪物流状态、运输进度".to_string(),
                category: ToolCategory::Query,
                parameters: vec![
                    ToolParameter { name: "tracking_no".to_string(), param_type: "string".to_string(), description: "物流单号".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "order_no".to_string(), param_type: "string".to_string(), description: "订单号".to_string(), required: false, default_value: None, enum_values: None },
                ],
                requires_confirmation: false,
                use_cases: vec!["物流跟踪".to_string(), "运输进度".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "scm.demand_planning".to_string(),
                name: "需求计划".to_string(),
                description: "制定和分析需求计划".to_string(),
                category: ToolCategory::Analysis,
                parameters: vec![
                    ToolParameter { name: "product".to_string(), param_type: "string".to_string(), description: "产品名称".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "period".to_string(), param_type: "string".to_string(), description: "计划周期".to_string(), required: false, default_value: Some(serde_json::json!("下月")), enum_values: Some(vec!["下周".to_string(), "下月".to_string(), "下季度".to_string()]) },
                ],
                requires_confirmation: false,
                use_cases: vec!["需求计划".to_string(), "需求预测".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "scm.analyze_supply_chain".to_string(),
                name: "供应链分析".to_string(),
                description: "分析供应链绩效、成本、风险".to_string(),
                category: ToolCategory::Analysis,
                parameters: vec![
                    ToolParameter { name: "metric".to_string(), param_type: "string".to_string(), description: "分析指标".to_string(), required: false, default_value: None, enum_values: Some(vec!["成本".to_string(), "交付率".to_string(), "库存周转".to_string(), "风险".to_string()]) },
                    ToolParameter { name: "period".to_string(), param_type: "string".to_string(), description: "分析周期".to_string(), required: false, default_value: Some(serde_json::json!("本月")), enum_values: None },
                ],
                requires_confirmation: false,
                use_cases: vec!["供应链分析".to_string(), "绩效分析".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "scm.generate_report".to_string(),
                name: "生成供应链报表".to_string(),
                description: "生成供应链统计报表".to_string(),
                category: ToolCategory::Report,
                parameters: vec![
                    ToolParameter { name: "report_type".to_string(), param_type: "string".to_string(), description: "报表类型".to_string(), required: true, default_value: None, enum_values: Some(vec!["供应商绩效".to_string(), "采购分析".to_string(), "物流统计".to_string()]) },
                    ToolParameter { name: "start_date".to_string(), param_type: "date".to_string(), description: "开始日期".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "end_date".to_string(), param_type: "date".to_string(), description: "结束日期".to_string(), required: false, default_value: None, enum_values: None },
                ],
                requires_confirmation: true,
                use_cases: vec!["供应链报表".to_string(), "采购分析".to_string()],
            },
        ],
        faqs: vec![
            FAQItem { question: "如何查询供应商信息？".to_string(), answer: "您可以说\"查询供应商\"或\"查看供应商列表\"，我会帮您查询供应商信息和评估结果。".to_string(), keywords: vec!["供应商".to_string(), "查询".to_string()], category: "供应商管理".to_string() },
            FAQItem { question: "如何跟踪物流状态？".to_string(), answer: "您可以说\"物流跟踪\"或\"查看运输进度\"，然后告诉我物流单号或订单号，我会帮您跟踪物流状态。".to_string(), keywords: vec!["物流".to_string(), "跟踪".to_string()], category: "物流管理".to_string() },
            FAQItem { question: "如何制定需求计划？".to_string(), answer: "您可以说\"需求计划\"或\"制定需求预测\"，我会帮您分析历史数据并制定需求计划。".to_string(), keywords: vec!["需求计划".to_string(), "预测".to_string()], category: "需求计划".to_string() },
            FAQItem { question: "如何分析供应链绩效？".to_string(), answer: "您可以说\"供应链分析\"或\"查看供应链绩效\"，我会帮您分析成本、交付率、库存周转等指标。".to_string(), keywords: vec!["供应链".to_string(), "绩效".to_string()], category: "供应链分析".to_string() },
        ],
        glossary: vec![
            GlossaryTerm { term: "SCM".to_string(), definition: "供应链管理，对从供应商到客户的整个供应链进行计划、协调和控制".to_string(), abbreviation: Some("SCM".to_string()), related_terms: vec!["供应链".to_string(), "采购".to_string()] },
            GlossaryTerm { term: "VMI".to_string(), definition: "供应商管理库存，供应商根据客户库存水平自动补货".to_string(), abbreviation: Some("VMI".to_string()), related_terms: vec!["库存".to_string(), "供应商".to_string()] },
            GlossaryTerm { term: "JIT".to_string(), definition: "准时制生产，在需要的时候生产需要的产品，减少库存".to_string(), abbreviation: Some("JIT".to_string()), related_terms: vec!["生产".to_string(), "库存".to_string()] },
        ],
        quick_actions: vec![
            QuickAction { action_id: "scm.query_supplier".to_string(), label: "供应商查询".to_string(), description: "查询供应商信息".to_string(), icon: "users".to_string(), intent: CopilotIntent::Query, preset_prompt: "查询合格供应商列表".to_string() },
            QuickAction { action_id: "scm.track".to_string(), label: "物流跟踪".to_string(), description: "跟踪物流状态".to_string(), icon: "truck".to_string(), intent: CopilotIntent::Query, preset_prompt: "跟踪最近的物流订单".to_string() },
            QuickAction { action_id: "scm.demand".to_string(), label: "需求计划".to_string(), description: "制定需求计划".to_string(), icon: "calendar".to_string(), intent: CopilotIntent::Analyze, preset_prompt: "制定下月需求计划".to_string() },
            QuickAction { action_id: "scm.analyze".to_string(), label: "供应链分析".to_string(), description: "分析供应链绩效".to_string(), icon: "chart".to_string(), intent: CopilotIntent::Analyze, preset_prompt: "分析本月供应链绩效".to_string() },
        ],
        entities: vec![
            EntityDefinition {
                name: "供应商".to_string(),
                description: "供应链中的供应商信息".to_string(),
                key_fields: vec![
                    EntityField { name: "供应商编码".to_string(), field_type: "string".to_string(), description: "供应商唯一编码".to_string(), required: true },
                    EntityField { name: "供应商名称".to_string(), field_type: "string".to_string(), description: "供应商名称".to_string(), required: true },
                    EntityField { name: "类别".to_string(), field_type: "string".to_string(), description: "供应商类别".to_string(), required: true },
                    EntityField { name: "状态".to_string(), field_type: "enum".to_string(), description: "合格/待评估/暂停/淘汰".to_string(), required: true },
                ],
                common_queries: vec!["查询供应商".to_string(), "供应商详情".to_string()],
            },
        ],
        enabled: true,
    }
}

// ============================================================================
// APS 高级计划排程模块配置
// ============================================================================

/// 创建 APS 高级计划排程模块配置
pub fn create_aps_config() -> BusinessModuleConfig {
    BusinessModuleConfig {
        module: BusinessModule::APS,
        name: "APS 智能助手".to_string(),
        description: "高级计划排程智能助手，帮助处理生产计划、工序排程、资源优化、产能规划等业务".to_string(),
        system_prompt: "你是一个专业的 APS（高级计划与排程）智能助手。你可以帮助用户处理生产计划、工序排程、资源优化、产能规划、物料需求计划等业务。请用专业、简洁的语言回答用户问题，并在需要时提供操作建议。".to_string(),
        welcome_message: "您好！我是 APS 智能助手，可以帮您处理生产计划、工序排程、资源优化、产能规划等业务。请问有什么可以帮您的？".to_string(),
        supported_intents: vec![
            CopilotIntent::Query,
            CopilotIntent::Create,
            CopilotIntent::Update,
            CopilotIntent::Analyze,
            CopilotIntent::Report,
            CopilotIntent::Knowledge,
            CopilotIntent::Guidance,
        ],
        available_tools: vec![
            BusinessToolDefinition {
                tool_id: "aps.query_production_plan".to_string(),
                name: "查询生产计划".to_string(),
                description: "查询生产计划、排程结果".to_string(),
                category: ToolCategory::Query,
                parameters: vec![
                    ToolParameter { name: "plan_no".to_string(), param_type: "string".to_string(), description: "计划单号".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "status".to_string(), param_type: "string".to_string(), description: "计划状态".to_string(), required: false, default_value: None, enum_values: Some(vec!["待排程".to_string(), "已排程".to_string(), "执行中".to_string(), "已完成".to_string()]) },
                    ToolParameter { name: "start_date".to_string(), param_type: "date".to_string(), description: "开始日期".to_string(), required: false, default_value: None, enum_values: None },
                ],
                requires_confirmation: false,
                use_cases: vec!["查询生产计划".to_string(), "排程结果".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "aps.create_production_plan".to_string(),
                name: "创建生产计划".to_string(),
                description: "创建新的生产计划".to_string(),
                category: ToolCategory::Create,
                parameters: vec![
                    ToolParameter { name: "product".to_string(), param_type: "string".to_string(), description: "产品名称".to_string(), required: true, default_value: None, enum_values: None },
                    ToolParameter { name: "quantity".to_string(), param_type: "number".to_string(), description: "生产数量".to_string(), required: true, default_value: None, enum_values: None },
                    ToolParameter { name: "due_date".to_string(), param_type: "date".to_string(), description: "交货日期".to_string(), required: true, default_value: None, enum_values: None },
                    ToolParameter { name: "priority".to_string(), param_type: "string".to_string(), description: "优先级".to_string(), required: false, default_value: Some(serde_json::json!("普通")), enum_values: Some(vec!["紧急".to_string(), "高".to_string(), "普通".to_string(), "低".to_string()]) },
                ],
                requires_confirmation: true,
                use_cases: vec!["创建生产计划".to_string(), "新增计划".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "aps.optimize_schedule".to_string(),
                name: "优化排程".to_string(),
                description: "优化生产排程、资源分配".to_string(),
                category: ToolCategory::Analysis,
                parameters: vec![
                    ToolParameter { name: "objective".to_string(), param_type: "string".to_string(), description: "优化目标".to_string(), required: false, default_value: Some(serde_json::json!("交期")), enum_values: Some(vec!["交期".to_string(), "产能".to_string(), "成本".to_string(), "库存".to_string()]) },
                    ToolParameter { name: "period".to_string(), param_type: "string".to_string(), description: "排程周期".to_string(), required: false, default_value: Some(serde_json::json!("本周")), enum_values: None },
                ],
                requires_confirmation: false,
                use_cases: vec!["优化排程".to_string(), "资源优化".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "aps.analyze_capacity".to_string(),
                name: "产能分析".to_string(),
                description: "分析产能负荷、资源利用率".to_string(),
                category: ToolCategory::Analysis,
                parameters: vec![
                    ToolParameter { name: "resource".to_string(), param_type: "string".to_string(), description: "资源名称".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "period".to_string(), param_type: "string".to_string(), description: "分析周期".to_string(), required: false, default_value: Some(serde_json::json!("本月")), enum_values: None },
                ],
                requires_confirmation: false,
                use_cases: vec!["产能分析".to_string(), "资源利用率".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "aps.generate_report".to_string(),
                name: "生成排程报表".to_string(),
                description: "生成生产排程统计报表".to_string(),
                category: ToolCategory::Report,
                parameters: vec![
                    ToolParameter { name: "report_type".to_string(), param_type: "string".to_string(), description: "报表类型".to_string(), required: true, default_value: None, enum_values: Some(vec!["生产计划".to_string(), "产能负荷".to_string(), "交付达成".to_string()]) },
                    ToolParameter { name: "start_date".to_string(), param_type: "date".to_string(), description: "开始日期".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "end_date".to_string(), param_type: "date".to_string(), description: "结束日期".to_string(), required: false, default_value: None, enum_values: None },
                ],
                requires_confirmation: true,
                use_cases: vec!["排程报表".to_string(), "生产统计".to_string()],
            },
        ],
        faqs: vec![
            FAQItem { question: "如何查询生产计划？".to_string(), answer: "您可以说\"查询生产计划\"或\"查看排程结果\"，我会帮您查询生产计划和排程结果。".to_string(), keywords: vec!["生产计划".to_string(), "查询".to_string()], category: "生产计划".to_string() },
            FAQItem { question: "如何创建生产计划？".to_string(), answer: "您可以说\"创建生产计划\"，然后告诉我产品名称、生产数量、交货日期和优先级，我会帮您创建计划。".to_string(), keywords: vec!["生产计划".to_string(), "创建".to_string()], category: "生产计划".to_string() },
            FAQItem { question: "如何优化生产排程？".to_string(), answer: "您可以说\"优化排程\"或\"优化生产计划\"，我会根据您的优化目标（交期、产能、成本、库存）进行排程优化。".to_string(), keywords: vec!["排程".to_string(), "优化".to_string()], category: "排程优化".to_string() },
            FAQItem { question: "如何分析产能负荷？".to_string(), answer: "您可以说\"产能分析\"或\"查看资源利用率\"，我会帮您分析产能负荷和资源利用率。".to_string(), keywords: vec!["产能".to_string(), "分析".to_string()], category: "产能分析".to_string() },
        ],
        glossary: vec![
            GlossaryTerm { term: "APS".to_string(), definition: "高级计划与排程，利用数学算法优化生产计划和资源分配".to_string(), abbreviation: Some("APS".to_string()), related_terms: vec!["排程".to_string(), "生产计划".to_string()] },
            GlossaryTerm { term: "MRP".to_string(), definition: "物料需求计划，根据生产计划计算物料需求时间和数量".to_string(), abbreviation: Some("MRP".to_string()), related_terms: vec!["物料".to_string(), "需求".to_string()] },
            GlossaryTerm { term: "瓶颈工序".to_string(), definition: "产能最低、限制整个生产线产出的工序".to_string(), abbreviation: None, related_terms: vec!["产能".to_string(), "工序".to_string()] },
        ],
        quick_actions: vec![
            QuickAction { action_id: "aps.query_plan".to_string(), label: "生产计划".to_string(), description: "查询生产计划".to_string(), icon: "calendar".to_string(), intent: CopilotIntent::Query, preset_prompt: "查询本周生产计划".to_string() },
            QuickAction { action_id: "aps.create_plan".to_string(), label: "创建计划".to_string(), description: "创建生产计划".to_string(), icon: "plus".to_string(), intent: CopilotIntent::Create, preset_prompt: "创建新的生产计划".to_string() },
            QuickAction { action_id: "aps.optimize".to_string(), label: "优化排程".to_string(), description: "优化生产排程".to_string(), icon: "settings".to_string(), intent: CopilotIntent::Analyze, preset_prompt: "优化本周生产排程".to_string() },
            QuickAction { action_id: "aps.capacity".to_string(), label: "产能分析".to_string(), description: "分析产能负荷".to_string(), icon: "chart".to_string(), intent: CopilotIntent::Analyze, preset_prompt: "分析本月产能负荷".to_string() },
        ],
        entities: vec![
            EntityDefinition {
                name: "生产计划单".to_string(),
                description: "生产计划的记录单据".to_string(),
                key_fields: vec![
                    EntityField { name: "计划单号".to_string(), field_type: "string".to_string(), description: "生产计划唯一编号".to_string(), required: true },
                    EntityField { name: "产品".to_string(), field_type: "string".to_string(), description: "生产产品".to_string(), required: true },
                    EntityField { name: "数量".to_string(), field_type: "number".to_string(), description: "生产数量".to_string(), required: true },
                    EntityField { name: "状态".to_string(), field_type: "enum".to_string(), description: "待排程/已排程/执行中/已完成".to_string(), required: true },
                ],
                common_queries: vec!["查询生产计划".to_string(), "计划详情".to_string()],
            },
        ],
        enabled: true,
    }
}

// ============================================================================
// EHS 环境健康安全模块配置
// ============================================================================

/// 创建 EHS 环境健康安全模块配置
pub fn create_ehs_config() -> BusinessModuleConfig {
    BusinessModuleConfig {
        module: BusinessModule::EHS,
        name: "EHS 智能助手".to_string(),
        description: "环境健康安全智能助手，帮助处理安全检查、事故管理、环保合规、培训管理等业务".to_string(),
        system_prompt: "你是一个专业的 EHS（环境健康安全）智能助手。你可以帮助用户处理安全检查、事故管理、环保合规、职业健康、培训管理等 EHS 业务。请用专业、简洁的语言回答用户问题，并在需要时提供操作建议。安全相关问题请特别谨慎，必要时建议联系专业人员。".to_string(),
        welcome_message: "您好！我是 EHS 智能助手，可以帮您处理安全检查、事故管理、环保合规、培训管理等业务。请问有什么可以帮您的？".to_string(),
        supported_intents: vec![
            CopilotIntent::Query,
            CopilotIntent::Create,
            CopilotIntent::Update,
            CopilotIntent::Analyze,
            CopilotIntent::Report,
            CopilotIntent::Approve,
            CopilotIntent::Knowledge,
            CopilotIntent::Guidance,
        ],
        available_tools: vec![
            BusinessToolDefinition {
                tool_id: "ehs.query_inspection".to_string(),
                name: "查询安全检查".to_string(),
                description: "查询安全检查记录、隐患排查".to_string(),
                category: ToolCategory::Query,
                parameters: vec![
                    ToolParameter { name: "inspection_no".to_string(), param_type: "string".to_string(), description: "检查单号".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "status".to_string(), param_type: "string".to_string(), description: "检查状态".to_string(), required: false, default_value: None, enum_values: Some(vec!["待检查".to_string(), "检查中".to_string(), "已完成".to_string(), "整改中".to_string()]) },
                    ToolParameter { name: "type".to_string(), param_type: "string".to_string(), description: "检查类型".to_string(), required: false, default_value: None, enum_values: Some(vec!["日常检查".to_string(), "专项检查".to_string(), "综合检查".to_string()]) },
                ],
                requires_confirmation: false,
                use_cases: vec!["查询安全检查".to_string(), "隐患排查".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "ehs.create_incident".to_string(),
                name: "创建事故记录".to_string(),
                description: "创建安全事故/事件记录".to_string(),
                category: ToolCategory::Create,
                parameters: vec![
                    ToolParameter { name: "incident_type".to_string(), param_type: "string".to_string(), description: "事故类型".to_string(), required: true, default_value: None, enum_values: Some(vec!["安全事故".to_string(), "环保事件".to_string(), "职业健康".to_string(), "未遂事件".to_string()]) },
                    ToolParameter { name: "location".to_string(), param_type: "string".to_string(), description: "发生地点".to_string(), required: true, default_value: None, enum_values: None },
                    ToolParameter { name: "date".to_string(), param_type: "datetime".to_string(), description: "发生时间".to_string(), required: true, default_value: None, enum_values: None },
                    ToolParameter { name: "description".to_string(), param_type: "string".to_string(), description: "事故描述".to_string(), required: true, default_value: None, enum_values: None },
                    ToolParameter { name: "severity".to_string(), param_type: "string".to_string(), description: "严重程度".to_string(), required: true, default_value: None, enum_values: Some(vec!["一般".to_string(), "较大".to_string(), "重大".to_string(), "特别重大".to_string()]) },
                ],
                requires_confirmation: true,
                use_cases: vec!["创建事故记录".to_string(), "安全事件".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "ehs.query_compliance".to_string(),
                name: "查询环保合规".to_string(),
                description: "查询环保合规状态、排放数据".to_string(),
                category: ToolCategory::Query,
                parameters: vec![
                    ToolParameter { name: "facility".to_string(), param_type: "string".to_string(), description: "设施名称".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "period".to_string(), param_type: "string".to_string(), description: "统计周期".to_string(), required: false, default_value: Some(serde_json::json!("本月")), enum_values: None },
                ],
                requires_confirmation: false,
                use_cases: vec!["环保合规".to_string(), "排放数据".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "ehs.analyze_safety".to_string(),
                name: "安全分析".to_string(),
                description: "分析安全趋势、事故统计、隐患分布".to_string(),
                category: ToolCategory::Analysis,
                parameters: vec![
                    ToolParameter { name: "metric".to_string(), param_type: "string".to_string(), description: "分析指标".to_string(), required: false, default_value: None, enum_values: Some(vec!["事故统计".to_string(), "隐患整改".to_string(), "培训完成率".to_string()]) },
                    ToolParameter { name: "period".to_string(), param_type: "string".to_string(), description: "分析周期".to_string(), required: false, default_value: Some(serde_json::json!("本月")), enum_values: None },
                ],
                requires_confirmation: false,
                use_cases: vec!["安全分析".to_string(), "事故统计".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "ehs.generate_report".to_string(),
                name: "生成EHS报表".to_string(),
                description: "生成EHS统计报表".to_string(),
                category: ToolCategory::Report,
                parameters: vec![
                    ToolParameter { name: "report_type".to_string(), param_type: "string".to_string(), description: "报表类型".to_string(), required: true, default_value: None, enum_values: Some(vec!["安全月报".to_string(), "事故统计".to_string(), "环保报告".to_string(), "培训统计".to_string()]) },
                    ToolParameter { name: "start_date".to_string(), param_type: "date".to_string(), description: "开始日期".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "end_date".to_string(), param_type: "date".to_string(), description: "结束日期".to_string(), required: false, default_value: None, enum_values: None },
                ],
                requires_confirmation: true,
                use_cases: vec!["EHS报表".to_string(), "安全统计".to_string()],
            },
        ],
        faqs: vec![
            FAQItem { question: "如何查询安全检查记录？".to_string(), answer: "您可以说\"查询安全检查\"或\"查看隐患排查\"，我会帮您查询安全检查记录和隐患整改情况。".to_string(), keywords: vec!["安全检查".to_string(), "查询".to_string()], category: "安全检查".to_string() },
            FAQItem { question: "如何报告安全事故？".to_string(), answer: "您可以说\"创建事故记录\"或\"报告安全事故\"，然后告诉我事故类型、发生地点、时间、描述和严重程度，我会帮您创建记录。注意：紧急情况请立即拨打应急电话！".to_string(), keywords: vec!["事故".to_string(), "报告".to_string()], category: "事故管理".to_string() },
            FAQItem { question: "如何查看环保合规状态？".to_string(), answer: "您可以说\"环保合规\"或\"查看排放数据\"，我会帮您查询环保合规状态和排放数据。".to_string(), keywords: vec!["环保".to_string(), "合规".to_string()], category: "环保管理".to_string() },
            FAQItem { question: "如何分析安全趋势？".to_string(), answer: "您可以说\"安全分析\"或\"查看事故统计\"，我会帮您分析安全趋势、事故统计和隐患分布。".to_string(), keywords: vec!["安全分析".to_string(), "趋势".to_string()], category: "安全分析".to_string() },
        ],
        glossary: vec![
            GlossaryTerm { term: "EHS".to_string(), definition: "环境(Environment)、健康(Health)、安全(Safety)管理体系".to_string(), abbreviation: Some("EHS".to_string()), related_terms: vec!["安全".to_string(), "环保".to_string()] },
            GlossaryTerm { term: "未遂事件".to_string(), definition: "未造成人员伤亡或财产损失，但有可能造成事故的事件".to_string(), abbreviation: None, related_terms: vec!["事故".to_string(), "隐患".to_string()] },
            GlossaryTerm { term: "PDCA".to_string(), definition: "计划-执行-检查-改进，持续改进的管理循环".to_string(), abbreviation: Some("PDCA".to_string()), related_terms: vec!["管理".to_string(), "改进".to_string()] },
        ],
        quick_actions: vec![
            QuickAction { action_id: "ehs.query_inspection".to_string(), label: "安全检查".to_string(), description: "查询安全检查".to_string(), icon: "search".to_string(), intent: CopilotIntent::Query, preset_prompt: "查询最近的安全检查记录".to_string() },
            QuickAction { action_id: "ehs.create_incident".to_string(), label: "事故报告".to_string(), description: "创建事故记录".to_string(), icon: "alert".to_string(), intent: CopilotIntent::Create, preset_prompt: "创建安全事故记录".to_string() },
            QuickAction { action_id: "ehs.compliance".to_string(), label: "环保合规".to_string(), description: "查询环保合规".to_string(), icon: "leaf".to_string(), intent: CopilotIntent::Query, preset_prompt: "查询本月环保合规状态".to_string() },
            QuickAction { action_id: "ehs.analyze".to_string(), label: "安全分析".to_string(), description: "分析安全数据".to_string(), icon: "chart".to_string(), intent: CopilotIntent::Analyze, preset_prompt: "分析本月安全数据".to_string() },
        ],
        entities: vec![
            EntityDefinition {
                name: "安全检查单".to_string(),
                description: "安全检查的记录单据".to_string(),
                key_fields: vec![
                    EntityField { name: "检查单号".to_string(), field_type: "string".to_string(), description: "安全检查唯一编号".to_string(), required: true },
                    EntityField { name: "检查类型".to_string(), field_type: "enum".to_string(), description: "日常检查/专项检查/综合检查".to_string(), required: true },
                    EntityField { name: "检查地点".to_string(), field_type: "string".to_string(), description: "检查地点".to_string(), required: true },
                    EntityField { name: "状态".to_string(), field_type: "enum".to_string(), description: "待检查/检查中/已完成/整改中".to_string(), required: true },
                ],
                common_queries: vec!["查询安全检查".to_string(), "检查详情".to_string()],
            },
        ],
        enabled: true,
    }
}

// ============================================================================
// BI 商业智能模块配置
// ============================================================================

/// 创建 BI 商业智能模块配置
pub fn create_bi_config() -> BusinessModuleConfig {
    BusinessModuleConfig {
        module: BusinessModule::BI,
        name: "BI 智能助手".to_string(),
        description: "商业智能智能助手，帮助处理数据报表、仪表盘、数据分析、KPI监控等业务".to_string(),
        system_prompt: "你是一个专业的 BI（商业智能）智能助手。你可以帮助用户处理数据报表、仪表盘创建、数据分析、KPI监控、数据挖掘等业务。请用专业、简洁的语言回答用户问题，并在需要时提供操作建议。".to_string(),
        welcome_message: "您好！我是 BI 智能助手，可以帮您处理数据报表、仪表盘、数据分析、KPI监控等业务。请问有什么可以帮您的？".to_string(),
        supported_intents: vec![
            CopilotIntent::Query,
            CopilotIntent::Create,
            CopilotIntent::Update,
            CopilotIntent::Analyze,
            CopilotIntent::Report,
            CopilotIntent::Knowledge,
            CopilotIntent::Guidance,
        ],
        available_tools: vec![
            BusinessToolDefinition {
                tool_id: "bi.query_report".to_string(),
                name: "查询报表".to_string(),
                description: "查询数据报表、报表数据".to_string(),
                category: ToolCategory::Query,
                parameters: vec![
                    ToolParameter { name: "report_name".to_string(), param_type: "string".to_string(), description: "报表名称".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "category".to_string(), param_type: "string".to_string(), description: "报表分类".to_string(), required: false, default_value: None, enum_values: Some(vec!["销售".to_string(), "财务".to_string(), "运营".to_string(), "人力".to_string()]) },
                    ToolParameter { name: "period".to_string(), param_type: "string".to_string(), description: "统计周期".to_string(), required: false, default_value: Some(serde_json::json!("本月")), enum_values: None },
                ],
                requires_confirmation: false,
                use_cases: vec!["查询报表".to_string(), "报表数据".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "bi.create_dashboard".to_string(),
                name: "创建仪表盘".to_string(),
                description: "创建数据仪表盘".to_string(),
                category: ToolCategory::Create,
                parameters: vec![
                    ToolParameter { name: "name".to_string(), param_type: "string".to_string(), description: "仪表盘名称".to_string(), required: true, default_value: None, enum_values: None },
                    ToolParameter { name: "description".to_string(), param_type: "string".to_string(), description: "仪表盘描述".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "charts".to_string(), param_type: "array".to_string(), description: "图表配置".to_string(), required: true, default_value: None, enum_values: None },
                ],
                requires_confirmation: true,
                use_cases: vec!["创建仪表盘".to_string(), "数据可视化".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "bi.analyze_data".to_string(),
                name: "数据分析".to_string(),
                description: "进行数据分析、趋势分析、对比分析".to_string(),
                category: ToolCategory::Analysis,
                parameters: vec![
                    ToolParameter { name: "data_source".to_string(), param_type: "string".to_string(), description: "数据源".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "analysis_type".to_string(), param_type: "string".to_string(), description: "分析类型".to_string(), required: false, default_value: Some(serde_json::json!("趋势")), enum_values: Some(vec!["趋势".to_string(), "对比".to_string(), "占比".to_string(), "预测".to_string()]) },
                    ToolParameter { name: "metrics".to_string(), param_type: "array".to_string(), description: "分析指标".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "period".to_string(), param_type: "string".to_string(), description: "分析周期".to_string(), required: false, default_value: Some(serde_json::json!("本月")), enum_values: None },
                ],
                requires_confirmation: false,
                use_cases: vec!["数据分析".to_string(), "趋势分析".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "bi.query_kpi".to_string(),
                name: "查询KPI".to_string(),
                description: "查询关键绩效指标、KPI监控".to_string(),
                category: ToolCategory::Query,
                parameters: vec![
                    ToolParameter { name: "kpi_name".to_string(), param_type: "string".to_string(), description: "KPI名称".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "category".to_string(), param_type: "string".to_string(), description: "KPI分类".to_string(), required: false, default_value: None, enum_values: Some(vec!["财务".to_string(), "销售".to_string(), "运营".to_string(), "客户".to_string()]) },
                    ToolParameter { name: "period".to_string(), param_type: "string".to_string(), description: "统计周期".to_string(), required: false, default_value: Some(serde_json::json!("本月")), enum_values: None },
                ],
                requires_confirmation: false,
                use_cases: vec!["查询KPI".to_string(), "KPI监控".to_string()],
            },
            BusinessToolDefinition {
                tool_id: "bi.generate_report".to_string(),
                name: "生成分析报告".to_string(),
                description: "生成数据分析报告".to_string(),
                category: ToolCategory::Report,
                parameters: vec![
                    ToolParameter { name: "report_type".to_string(), param_type: "string".to_string(), description: "报告类型".to_string(), required: true, default_value: None, enum_values: Some(vec!["经营分析".to_string(), "销售分析".to_string(), "财务分析".to_string(), "运营分析".to_string()]) },
                    ToolParameter { name: "start_date".to_string(), param_type: "date".to_string(), description: "开始日期".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "end_date".to_string(), param_type: "date".to_string(), description: "结束日期".to_string(), required: false, default_value: None, enum_values: None },
                    ToolParameter { name: "format".to_string(), param_type: "string".to_string(), description: "输出格式".to_string(), required: false, default_value: Some(serde_json::json!("markdown")), enum_values: Some(vec!["text".to_string(), "markdown".to_string(), "excel".to_string(), "pdf".to_string()]) },
                ],
                requires_confirmation: true,
                use_cases: vec!["分析报告".to_string(), "经营分析".to_string()],
            },
        ],
        faqs: vec![
            FAQItem { question: "如何查询数据报表？".to_string(), answer: "您可以说\"查询报表\"或\"查看销售报表\"，我会帮您查询相关数据报表。".to_string(), keywords: vec!["报表".to_string(), "查询".to_string()], category: "报表管理".to_string() },
            FAQItem { question: "如何创建数据仪表盘？".to_string(), answer: "您可以说\"创建仪表盘\"，然后告诉我仪表盘名称、描述和图表配置，我会帮您创建仪表盘。".to_string(), keywords: vec!["仪表盘".to_string(), "创建".to_string()], category: "仪表盘".to_string() },
            FAQItem { question: "如何进行数据分析？".to_string(), answer: "您可以说\"数据分析\"或\"趋势分析\"，然后告诉我数据源、分析类型、指标和周期，我会帮您进行数据分析。".to_string(), keywords: vec!["数据分析".to_string(), "趋势".to_string()], category: "数据分析".to_string() },
            FAQItem { question: "如何查看KPI指标？".to_string(), answer: "您可以说\"查询KPI\"或\"查看关键指标\"，我会帮您查询关键绩效指标和监控状态。".to_string(), keywords: vec!["KPI".to_string(), "指标".to_string()], category: "KPI监控".to_string() },
        ],
        glossary: vec![
            GlossaryTerm { term: "BI".to_string(), definition: "商业智能，利用数据分析技术支持业务决策".to_string(), abbreviation: Some("BI".to_string()), related_terms: vec!["数据分析".to_string(), "报表".to_string()] },
            GlossaryTerm { term: "KPI".to_string(), definition: "关键绩效指标，衡量业务表现的核心指标".to_string(), abbreviation: Some("KPI".to_string()), related_terms: vec!["指标".to_string(), "绩效".to_string()] },
            GlossaryTerm { term: "OLAP".to_string(), definition: "联机分析处理，支持复杂的多维数据分析".to_string(), abbreviation: Some("OLAP".to_string()), related_terms: vec!["分析".to_string(), "多维".to_string()] },
        ],
        quick_actions: vec![
            QuickAction { action_id: "bi.query_report".to_string(), label: "报表查询".to_string(), description: "查询数据报表".to_string(), icon: "file".to_string(), intent: CopilotIntent::Query, preset_prompt: "查询本月销售报表".to_string() },
            QuickAction { action_id: "bi.create_dashboard".to_string(), label: "创建仪表盘".to_string(), description: "创建数据仪表盘".to_string(), icon: "dashboard".to_string(), intent: CopilotIntent::Create, preset_prompt: "创建销售数据仪表盘".to_string() },
            QuickAction { action_id: "bi.analyze".to_string(), label: "数据分析".to_string(), description: "进行数据分析".to_string(), icon: "chart".to_string(), intent: CopilotIntent::Analyze, preset_prompt: "分析本月销售数据趋势".to_string() },
            QuickAction { action_id: "bi.kpi".to_string(), label: "KPI监控".to_string(), description: "查询KPI指标".to_string(), icon: "target".to_string(), intent: CopilotIntent::Query, preset_prompt: "查询本月核心KPI指标".to_string() },
        ],
        entities: vec![
            EntityDefinition {
                name: "报表".to_string(),
                description: "数据报表的定义".to_string(),
                key_fields: vec![
                    EntityField { name: "报表ID".to_string(), field_type: "string".to_string(), description: "报表唯一标识".to_string(), required: true },
                    EntityField { name: "报表名称".to_string(), field_type: "string".to_string(), description: "报表名称".to_string(), required: true },
                    EntityField { name: "分类".to_string(), field_type: "string".to_string(), description: "报表分类".to_string(), required: true },
                    EntityField { name: "创建时间".to_string(), field_type: "datetime".to_string(), description: "报表创建时间".to_string(), required: true },
                ],
                common_queries: vec!["查询报表".to_string(), "报表详情".to_string()],
            },
        ],
        enabled: true,
    }
}

// ============================================================================
// 业务模块管理器
// ============================================================================

/// 业务模块管理器
#[derive(Clone)]
pub struct BusinessModuleManager {
    /// 模块配置映射
    configs: Arc<Mutex<HashMap<BusinessModule, BusinessModuleConfig>>>,
}

impl BusinessModuleManager {
    /// 创建新的模块管理器
    pub fn new() -> Self {
        let mut configs = HashMap::new();
        configs.insert(BusinessModule::ERP, create_erp_config());
        configs.insert(BusinessModule::Finance, create_finance_config());
        configs.insert(BusinessModule::CRM, create_crm_config());
        configs.insert(BusinessModule::WMS, create_wms_config());
        configs.insert(BusinessModule::HR, create_hr_config());
        configs.insert(BusinessModule::OA, create_oa_config());
        configs.insert(BusinessModule::QMS, create_qms_config());
        configs.insert(BusinessModule::SCM, create_scm_config());
        configs.insert(BusinessModule::APS, create_aps_config());
        configs.insert(BusinessModule::EHS, create_ehs_config());
        configs.insert(BusinessModule::BI, create_bi_config());
        configs.insert(BusinessModule::General, create_general_config());

        Self {
            configs: Arc::new(Mutex::new(configs)),
        }
    }

    /// 使用默认配置创建
    pub fn with_defaults() -> Self {
        Self::new()
    }

    /// 获取模块配置
    pub fn get_config(&self, module: BusinessModule) -> Option<BusinessModuleConfig> {
        self.configs.lock().get(&module).cloned()
    }

    /// 获取所有模块配置
    pub fn get_all_configs(&self) -> Vec<BusinessModuleConfig> {
        self.configs.lock().values().cloned().collect()
    }

    /// 获取已启用的模块
    pub fn get_enabled_modules(&self) -> Vec<BusinessModuleConfig> {
        self.configs
            .lock()
            .values()
            .filter(|c| c.enabled)
            .cloned()
            .collect()
    }

    /// 注册模块配置
    pub fn register_config(&self, config: BusinessModuleConfig) {
        self.configs.lock().insert(config.module, config);
    }

    /// 启用模块
    pub fn enable_module(&self, module: BusinessModule) -> bool {
        let mut configs = self.configs.lock();
        if let Some(config) = configs.get_mut(&module) {
            config.enabled = true;
            true
        } else {
            false
        }
    }

    /// 禁用模块
    pub fn disable_module(&self, module: BusinessModule) -> bool {
        let mut configs = self.configs.lock();
        if let Some(config) = configs.get_mut(&module) {
            config.enabled = false;
            true
        } else {
            false
        }
    }

    /// 获取模块的工具列表
    pub fn get_tools(&self, module: BusinessModule) -> Vec<BusinessToolDefinition> {
        self.configs
            .lock()
            .get(&module)
            .map(|c| c.available_tools.clone())
            .unwrap_or_default()
    }

    /// 获取模块的 FAQ
    pub fn get_faqs(&self, module: BusinessModule) -> Vec<FAQItem> {
        self.configs
            .lock()
            .get(&module)
            .map(|c| c.faqs.clone())
            .unwrap_or_default()
    }

    /// 获取模块的快捷操作
    pub fn get_quick_actions(&self, module: BusinessModule) -> Vec<QuickAction> {
        self.configs
            .lock()
            .get(&module)
            .map(|c| c.quick_actions.clone())
            .unwrap_or_default()
    }

    /// 搜索 FAQ
    pub fn search_faq(&self, module: BusinessModule, query: &str) -> Vec<FAQItem> {
        let configs = self.configs.lock();
        let config = match configs.get(&module) {
            Some(c) => c,
            None => return Vec::new(),
        };

        let query_lower = query.to_lowercase();
        config
            .faqs
            .iter()
            .filter(|faq| {
                faq.question.to_lowercase().contains(&query_lower)
                    || faq.answer.to_lowercase().contains(&query_lower)
                    || faq
                        .keywords
                        .iter()
                        .any(|k| k.to_lowercase().contains(&query_lower))
            })
            .cloned()
            .collect()
    }

    /// 获取模块数量
    pub fn module_count(&self) -> usize {
        self.configs.lock().len()
    }
}

impl Default for BusinessModuleManager {
    fn default() -> Self {
        Self::new()
    }
}

// ============================================================================
// 测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tool_category_as_str() {
        assert_eq!(ToolCategory::Query.as_str(), "query");
        assert_eq!(ToolCategory::Create.as_str(), "create");
        assert_eq!(ToolCategory::Delete.as_str(), "delete");
        assert_eq!(ToolCategory::Analysis.as_str(), "analysis");
    }

    #[test]
    fn test_create_erp_config() {
        let config = create_erp_config();
        assert_eq!(config.module, BusinessModule::ERP);
        assert_eq!(config.name, "ERP 智能助手");
        assert!(config.enabled);
        assert!(!config.available_tools.is_empty());
        assert!(!config.faqs.is_empty());
        assert!(!config.quick_actions.is_empty());
        assert!(!config.entities.is_empty());
    }

    #[test]
    fn test_create_finance_config() {
        let config = create_finance_config();
        assert_eq!(config.module, BusinessModule::Finance);
        assert_eq!(config.name, "财务智能助手");
        assert!(config.enabled);
        assert!(!config.available_tools.is_empty());
        assert!(!config.faqs.is_empty());
    }

    #[test]
    fn test_create_crm_config() {
        let config = create_crm_config();
        assert_eq!(config.module, BusinessModule::CRM);
        assert_eq!(config.name, "CRM 智能助手");
        assert!(config.enabled);
        assert!(!config.available_tools.is_empty());
        assert!(!config.faqs.is_empty());
    }

    #[test]
    fn test_create_wms_config() {
        let config = create_wms_config();
        assert_eq!(config.module, BusinessModule::WMS);
        assert_eq!(config.name, "WMS 智能助手");
        assert!(config.enabled);
        assert!(!config.available_tools.is_empty());
        assert!(!config.faqs.is_empty());
    }

    #[test]
    fn test_business_module_manager_new() {
        let manager = BusinessModuleManager::new();
        assert_eq!(manager.module_count(), 12);
    }

    #[test]
    fn test_business_module_manager_get_config() {
        let manager = BusinessModuleManager::new();

        let erp = manager.get_config(BusinessModule::ERP);
        assert!(erp.is_some());
        assert_eq!(erp.unwrap().module, BusinessModule::ERP);

        let finance = manager.get_config(BusinessModule::Finance);
        assert!(finance.is_some());

        let hr = manager.get_config(BusinessModule::HR);
        assert!(hr.is_some());

        let oa = manager.get_config(BusinessModule::OA);
        assert!(oa.is_some());

        let qms = manager.get_config(BusinessModule::QMS);
        assert!(qms.is_some());

        let scm = manager.get_config(BusinessModule::SCM);
        assert!(scm.is_some());

        let aps = manager.get_config(BusinessModule::APS);
        assert!(aps.is_some());

        let ehs = manager.get_config(BusinessModule::EHS);
        assert!(ehs.is_some());

        let bi = manager.get_config(BusinessModule::BI);
        assert!(bi.is_some());

        let general = manager.get_config(BusinessModule::General);
        assert!(general.is_some());
    }

    #[test]
    fn test_business_module_manager_get_all_configs() {
        let manager = BusinessModuleManager::new();
        let configs = manager.get_all_configs();
        assert_eq!(configs.len(), 12);
    }

    #[test]
    fn test_business_module_manager_get_enabled_modules() {
        let manager = BusinessModuleManager::new();
        let enabled = manager.get_enabled_modules();
        assert_eq!(enabled.len(), 12);
    }

    #[test]
    fn test_business_module_manager_enable_disable() {
        let manager = BusinessModuleManager::new();

        assert!(manager.disable_module(BusinessModule::ERP));
        let enabled = manager.get_enabled_modules();
        assert_eq!(enabled.len(), 11);

        assert!(manager.enable_module(BusinessModule::ERP));
        let enabled = manager.get_enabled_modules();
        assert_eq!(enabled.len(), 12);
    }

    #[test]
    fn test_business_module_manager_get_tools() {
        let manager = BusinessModuleManager::new();
        let tools = manager.get_tools(BusinessModule::ERP);
        assert!(!tools.is_empty());
        assert!(tools.iter().any(|t| t.name.contains("采购")));
    }

    #[test]
    fn test_business_module_manager_get_faqs() {
        let manager = BusinessModuleManager::new();
        let faqs = manager.get_faqs(BusinessModule::Finance);
        assert!(!faqs.is_empty());
    }

    #[test]
    fn test_business_module_manager_get_quick_actions() {
        let manager = BusinessModuleManager::new();
        let actions = manager.get_quick_actions(BusinessModule::CRM);
        assert!(!actions.is_empty());
    }

    #[test]
    fn test_business_module_manager_search_faq() {
        let manager = BusinessModuleManager::new();
        let results = manager.search_faq(BusinessModule::ERP, "采购订单");
        assert!(!results.is_empty());

        let no_results = manager.search_faq(BusinessModule::ERP, "不存在的问题");
        assert!(no_results.is_empty());
    }

    #[test]
    fn test_business_module_manager_register_config() {
        let manager = BusinessModuleManager::new();
        assert_eq!(manager.module_count(), 12);

        // 测试覆盖已存在的模块配置
        let mut hr_config = create_erp_config();
        hr_config.module = BusinessModule::HR;
        hr_config.name = "HR 智能助手（更新）".to_string();
        manager.register_config(hr_config);

        // 模块数量不变（覆盖已存在的模块）
        assert_eq!(manager.module_count(), 12);
        assert!(manager.get_config(BusinessModule::HR).is_some());
        assert_eq!(
            manager.get_config(BusinessModule::HR).unwrap().name,
            "HR 智能助手（更新）"
        );
    }

    #[test]
    fn test_business_tool_definition_structure() {
        let tool = BusinessToolDefinition {
            tool_id: "test.tool".to_string(),
            name: "测试工具".to_string(),
            description: "测试用工具".to_string(),
            category: ToolCategory::Query,
            parameters: vec![],
            requires_confirmation: false,
            use_cases: vec!["测试".to_string()],
        };

        assert_eq!(tool.tool_id, "test.tool");
        assert_eq!(tool.category, ToolCategory::Query);
    }

    #[test]
    fn test_faq_item_structure() {
        let faq = FAQItem {
            question: "测试问题".to_string(),
            answer: "测试答案".to_string(),
            keywords: vec!["测试".to_string()],
            category: "测试".to_string(),
        };

        assert_eq!(faq.question, "测试问题");
        assert!(!faq.keywords.is_empty());
    }

    #[test]
    fn test_glossary_term_structure() {
        let term = GlossaryTerm {
            term: "测试术语".to_string(),
            definition: "测试定义".to_string(),
            abbreviation: Some("TEST".to_string()),
            related_terms: vec![],
        };

        assert_eq!(term.term, "测试术语");
        assert_eq!(term.abbreviation, Some("TEST".to_string()));
    }

    #[test]
    fn test_quick_action_structure() {
        let action = QuickAction {
            action_id: "test.action".to_string(),
            label: "测试操作".to_string(),
            description: "测试描述".to_string(),
            icon: "test".to_string(),
            intent: CopilotIntent::Query,
            preset_prompt: "测试".to_string(),
        };

        assert_eq!(action.action_id, "test.action");
        assert_eq!(action.intent, CopilotIntent::Query);
    }

    #[test]
    fn test_entity_definition_structure() {
        let entity = EntityDefinition {
            name: "测试实体".to_string(),
            description: "测试描述".to_string(),
            key_fields: vec![],
            common_queries: vec!["测试查询".to_string()],
        };

        assert_eq!(entity.name, "测试实体");
        assert!(!entity.common_queries.is_empty());
    }

    #[test]
    fn test_entity_field_structure() {
        let field = EntityField {
            name: "测试字段".to_string(),
            field_type: "string".to_string(),
            description: "测试描述".to_string(),
            required: true,
        };

        assert_eq!(field.name, "测试字段");
        assert!(field.required);
    }

    #[test]
    fn test_tool_parameter_structure() {
        let param = ToolParameter {
            name: "测试参数".to_string(),
            param_type: "string".to_string(),
            description: "测试描述".to_string(),
            required: true,
            default_value: None,
            enum_values: Some(vec!["选项1".to_string(), "选项2".to_string()]),
        };

        assert_eq!(param.name, "测试参数");
        assert!(param.required);
        assert!(param.enum_values.is_some());
    }

    #[test]
    fn test_erp_config_has_purchase_tools() {
        let config = create_erp_config();
        let purchase_tools: Vec<_> = config
            .available_tools
            .iter()
            .filter(|t| t.name.contains("采购"))
            .collect();
        assert!(!purchase_tools.is_empty());
    }

    #[test]
    fn test_finance_config_has_report_tools() {
        let config = create_finance_config();
        let report_tools: Vec<_> = config
            .available_tools
            .iter()
            .filter(|t| t.category == ToolCategory::Report)
            .collect();
        assert!(!report_tools.is_empty());
    }

    #[test]
    fn test_crm_config_has_customer_tools() {
        let config = create_crm_config();
        let customer_tools: Vec<_> = config
            .available_tools
            .iter()
            .filter(|t| t.name.contains("客户"))
            .collect();
        assert!(!customer_tools.is_empty());
    }

    #[test]
    fn test_wms_config_has_inventory_tools() {
        let config = create_wms_config();
        let inventory_tools: Vec<_> = config
            .available_tools
            .iter()
            .filter(|t| t.name.contains("库存"))
            .collect();
        assert!(!inventory_tools.is_empty());
    }
}
