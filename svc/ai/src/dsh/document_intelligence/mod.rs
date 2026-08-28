//! 文档智能模块
//!
//! 提供 AI 驱动的文档智能功能：
//! - 合同审阅（条款识别、风险提示、合规检查）
//! - 发票识别（OCR + 结构化数据提取）
//! - 报告生成（业务数据 → 自然语言报告）
//! - 文档分类与标签（自动分类、智能标签）
//! - 文档摘要（长文档智能摘要）

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

/// 文档类型
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum DocumentType {
    /// 合同
    Contract,
    /// 发票
    Invoice,
    /// 报告
    Report,
    /// 邮件
    Email,
    /// 备忘录
    Memo,
    /// 政策文件
    Policy,
    /// 技术文档
    Technical,
    /// 财务报表
    FinancialStatement,
    /// 其他
    Other,
}

/// 文档信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentInfo {
    /// 文档 ID
    pub id: String,
    /// 文档标题
    pub title: String,
    /// 文档类型
    pub document_type: DocumentType,
    /// 文件格式
    pub file_format: String,
    /// 文件大小（字节）
    pub file_size: u64,
    /// 文档内容（文本）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,
    /// 文档元数据
    pub metadata: DocumentMetadata,
    /// 智能标签
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub tags: Vec<String>,
    /// 分类结果
    #[serde(skip_serializing_if = "Option::is_none")]
    pub classification: Option<DocumentClassification>,
    /// 摘要
    #[serde(skip_serializing_if = "Option::is_none")]
    pub summary: Option<DocumentSummary>,
    /// 创建时间
    pub created_at: String,
    /// 更新时间
    pub updated_at: String,
}

/// 文档元数据
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct DocumentMetadata {
    /// 作者
    #[serde(skip_serializing_if = "Option::is_none")]
    pub author: Option<String>,
    /// 创建日期
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_date: Option<String>,
    /// 修改日期
    #[serde(skip_serializing_if = "Option::is_none")]
    pub modified_date: Option<String>,
    /// 页数
    #[serde(skip_serializing_if = "Option::is_none")]
    pub page_count: Option<u32>,
    /// 字数
    #[serde(skip_serializing_if = "Option::is_none")]
    pub word_count: Option<u32>,
    /// 语言
    #[serde(skip_serializing_if = "Option::is_none")]
    pub language: Option<String>,
    /// 自定义元数据
    #[serde(skip_serializing_if = "HashMap::is_empty")]
    pub custom: HashMap<String, String>,
}

/// 文档分类结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentClassification {
    /// 主分类
    pub primary_category: String,
    /// 子分类
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sub_category: Option<String>,
    /// 置信度
    pub confidence: f32,
    /// 所有分类及置信度
    pub all_categories: Vec<CategoryScore>,
}

/// 分类评分
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryScore {
    /// 分类名称
    pub category: String,
    /// 置信度
    pub confidence: f32,
}

/// 文档摘要
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentSummary {
    /// 简短摘要（1-2 句话）
    pub short_summary: String,
    /// 详细摘要（段落）
    pub detailed_summary: String,
    /// 关键要点
    pub key_points: Vec<String>,
    /// 关键词
    pub keywords: Vec<String>,
    /// 摘要长度（字数）
    pub summary_length: u32,
    /// 原文长度（字数）
    pub original_length: u32,
    /// 压缩比
    pub compression_ratio: f32,
}

/// 合同审阅请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContractReviewRequest {
    /// 文档 ID 或内容
    pub document_id: String,
    /// 合同类型
    #[serde(skip_serializing_if = "Option::is_none")]
    pub contract_type: Option<String>,
    /// 审阅重点
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub review_focus: Vec<String>,
    /// 适用法律法规
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub applicable_laws: Vec<String>,
}

/// 合同审阅结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContractReviewResult {
    /// 总体风险等级
    pub overall_risk_level: RiskLevel,
    /// 总体评分
    pub overall_score: f32,
    /// 识别的条款
    pub clauses: Vec<ContractClause>,
    /// 风险提示
    pub risks: Vec<ContractRisk>,
    /// 合规检查结果
    pub compliance_checks: Vec<ComplianceCheck>,
    /// 修改建议
    pub suggestions: Vec<ContractSuggestion>,
    /// 审阅摘要
    pub review_summary: String,
}

/// 风险等级
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum RiskLevel {
    /// 低风险
    Low,
    /// 中风险
    Medium,
    /// 高风险
    High,
    /// 严重风险
    Critical,
}

/// 合同条款
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContractClause {
    /// 条款 ID
    pub id: String,
    /// 条款标题
    pub title: String,
    /// 条款类型
    pub clause_type: String,
    /// 条款内容
    pub content: String,
    /// 页码
    #[serde(skip_serializing_if = "Option::is_none")]
    pub page_number: Option<u32>,
    /// 是否标准条款
    #[serde(default)]
    pub is_standard: bool,
}

/// 合同风险
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContractRisk {
    /// 风险 ID
    pub id: String,
    /// 风险描述
    pub description: String,
    /// 风险等级
    pub risk_level: RiskLevel,
    /// 相关条款
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub related_clauses: Vec<String>,
    /// 风险影响
    pub impact: String,
    /// 发生概率
    pub probability: f32,
    /// 建议措施
    pub mitigation: String,
}

/// 合规检查
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComplianceCheck {
    /// 检查项
    pub check_item: String,
    /// 是否通过
    pub passed: bool,
    /// 详情
    pub details: String,
    /// 相关法律法规
    #[serde(skip_serializing_if = "Option::is_none")]
    pub regulation: Option<String>,
}

/// 合同修改建议
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContractSuggestion {
    /// 建议 ID
    pub id: String,
    /// 建议类型
    pub suggestion_type: String,
    /// 原始内容
    pub original_content: String,
    /// 建议内容
    pub suggested_content: String,
    /// 建议原因
    pub reason: String,
    /// 优先级
    pub priority: u8,
}

/// 发票识别结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvoiceExtractionResult {
    /// 发票类型
    pub invoice_type: String,
    /// 发票代码
    #[serde(skip_serializing_if = "Option::is_none")]
    pub invoice_code: Option<String>,
    /// 发票号码
    #[serde(skip_serializing_if = "Option::is_none")]
    pub invoice_number: Option<String>,
    /// 开票日期
    #[serde(skip_serializing_if = "Option::is_none")]
    pub invoice_date: Option<String>,
    /// 购买方信息
    pub buyer: InvoiceParty,
    /// 销售方信息
    pub seller: InvoiceParty,
    /// 商品明细
    pub items: Vec<InvoiceItem>,
    /// 合计金额
    pub total_amount: f64,
    /// 合计税额
    pub total_tax: f64,
    /// 价税合计
    pub total_with_tax: f64,
    /// 识别置信度
    pub confidence: f32,
    /// 原始 OCR 文本
    #[serde(skip_serializing_if = "Option::is_none")]
    pub raw_ocr_text: Option<String>,
}

/// 发票方信息
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct InvoiceParty {
    /// 名称
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    /// 纳税人识别号
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tax_id: Option<String>,
    /// 地址
    #[serde(skip_serializing_if = "Option::is_none")]
    pub address: Option<String>,
    /// 电话
    #[serde(skip_serializing_if = "Option::is_none")]
    pub phone: Option<String>,
    /// 开户行
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bank: Option<String>,
    /// 银行账号
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bank_account: Option<String>,
}

/// 发票商品明细
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvoiceItem {
    /// 商品名称
    pub name: String,
    /// 规格型号
    #[serde(skip_serializing_if = "Option::is_none")]
    pub specification: Option<String>,
    /// 单位
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unit: Option<String>,
    /// 数量
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quantity: Option<f64>,
    /// 单价
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unit_price: Option<f64>,
    /// 金额
    pub amount: f64,
    /// 税率
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tax_rate: Option<f64>,
    /// 税额
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tax_amount: Option<f64>,
}

/// 报告生成请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportGenerationRequest {
    /// 报告类型
    pub report_type: String,
    /// 报告标题
    pub title: String,
    /// 业务数据
    pub data: HashMap<String, serde_json::Value>,
    /// 报告周期
    #[serde(skip_serializing_if = "Option::is_none")]
    pub period: Option<String>,
    /// 目标读者
    #[serde(skip_serializing_if = "Option::is_none")]
    pub audience: Option<String>,
    /// 报告长度
    #[serde(skip_serializing_if = "Option::is_none")]
    pub length: Option<ReportLength>,
    /// 额外要求
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub requirements: Vec<String>,
}

/// 报告长度
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ReportLength {
    /// 简短
    Short,
    /// 中等
    Medium,
    /// 详细
    Detailed,
}

/// 生成的报告
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedReport {
    /// 报告 ID
    pub id: String,
    /// 报告标题
    pub title: String,
    /// 报告类型
    pub report_type: String,
    /// 执行摘要
    pub executive_summary: String,
    /// 报告章节
    pub sections: Vec<ReportSection>,
    /// 关键指标
    pub key_metrics: Vec<KeyMetric>,
    /// 结论与建议
    pub conclusions: Vec<String>,
    /// 附录
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub appendices: Vec<ReportAppendix>,
    /// 生成时间
    pub generated_at: String,
}

/// 报告章节
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportSection {
    /// 章节标题
    pub title: String,
    /// 章节级别
    pub level: u8,
    /// 章节内容
    pub content: String,
    /// 子章节
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub subsections: Vec<ReportSection>,
    /// 图表
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub charts: Vec<ReportChart>,
}

/// 报告图表
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportChart {
    /// 图表标题
    pub title: String,
    /// 图表类型
    pub chart_type: String,
    /// 图表数据
    pub data: serde_json::Value,
    /// 图表说明
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}

/// 关键指标
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyMetric {
    /// 指标名称
    pub name: String,
    /// 指标值
    pub value: String,
    /// 单位
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unit: Option<String>,
    /// 同比变化
    #[serde(skip_serializing_if = "Option::is_none")]
    pub yoy_change: Option<f64>,
    /// 环比变化
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mom_change: Option<f64>,
    /// 趋势
    #[serde(skip_serializing_if = "Option::is_none")]
    pub trend: Option<String>,
}

/// 报告附录
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportAppendix {
    /// 附录标题
    pub title: String,
    /// 附录内容
    pub content: String,
}

/// 文档分类请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentClassificationRequest {
    /// 文档内容
    pub content: String,
    /// 文档标题
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    /// 已知的文档类型（用于微调）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub known_type: Option<DocumentType>,
}

/// 文档摘要请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentSummaryRequest {
    /// 文档内容
    pub content: String,
    /// 摘要长度
    #[serde(skip_serializing_if = "Option::is_none")]
    pub summary_length: Option<SummaryLength>,
    /// 摘要语言
    #[serde(skip_serializing_if = "Option::is_none")]
    pub language: Option<String>,
    /// 重点关注
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub focus_areas: Vec<String>,
}

/// 摘要长度
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum SummaryLength {
    /// 简短（1-2 句）
    Brief,
    /// 中等（1 段）
    Medium,
    /// 详细（多段）
    Detailed,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_document_type_serialization() {
        let contract = DocumentType::Contract;
        let json = serde_json::to_string(&contract).unwrap();
        assert_eq!(json, "\"contract\"");

        let invoice = DocumentType::Invoice;
        let json = serde_json::to_string(&invoice).unwrap();
        assert_eq!(json, "\"invoice\"");
    }

    #[test]
    fn test_risk_level_ordering() {
        let low = RiskLevel::Low;
        let medium = RiskLevel::Medium;
        let high = RiskLevel::High;
        let critical = RiskLevel::Critical;

        assert_ne!(low, medium);
        assert_ne!(medium, high);
        assert_ne!(high, critical);
    }

    #[test]
    fn test_invoice_extraction_result() {
        let result = InvoiceExtractionResult {
            invoice_type: "增值税专用发票".to_string(),
            invoice_code: Some("1100201230".to_string()),
            invoice_number: Some("12345678".to_string()),
            invoice_date: Some("2026-08-28".to_string()),
            buyer: InvoiceParty::default(),
            seller: InvoiceParty::default(),
            items: vec![],
            total_amount: 1000.0,
            total_tax: 130.0,
            total_with_tax: 1130.0,
            confidence: 0.95,
            raw_ocr_text: None,
        };

        assert_eq!(result.total_amount, 1000.0);
        assert_eq!(result.total_with_tax, 1130.0);
        assert_eq!(result.confidence, 0.95);
    }

    #[test]
    fn test_generated_report() {
        let report = GeneratedReport {
            id: Uuid::new_v4().to_string(),
            title: "月度销售报告".to_string(),
            report_type: "sales_monthly".to_string(),
            executive_summary: "本月销售额同比增长 15%".to_string(),
            sections: vec![],
            key_metrics: vec![],
            conclusions: vec!["继续保持增长势头".to_string()],
            appendices: vec![],
            generated_at: chrono::Utc::now().to_rfc3339(),
        };

        assert_eq!(report.title, "月度销售报告");
        assert_eq!(report.conclusions.len(), 1);
    }
}
