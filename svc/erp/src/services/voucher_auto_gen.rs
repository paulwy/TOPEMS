#![allow(dead_code)]

// 凭证自动生成服务
// 根据业务事件自动生成财务凭证

use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use std::str::FromStr;
use uuid::Uuid;

// 凭证来源类型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum VoucherSourceType {
    Expense,   // 费用报销
    Payment,   // 付款单
    Invoice,   // 发票
    Payroll,   // 工资
    Asset,     // 固定资产
    Inventory, // 库存
    Contract,  // 合同结算
    Manual,    // 手动生成
}

// 凭证生成规则
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoucherGenerationRule {
    pub id: Uuid,
    pub source_type: VoucherSourceType,
    pub trigger_event: String,
    pub debit_subject_code: String,
    pub credit_subject_code: String,
    pub summary_template: String,
    pub is_active: bool,
    pub priority: i32,
}

// 业务事件数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BusinessEvent {
    pub event_id: Uuid,
    pub event_type: VoucherSourceType,
    pub event_data: serde_json::Value,
    pub occurred_at: DateTime<Utc>,
    pub department_id: Option<Uuid>,
    pub project_id: Option<Uuid>,
    pub contract_id: Option<Uuid>,
}

// 报销事件数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExpenseEventData {
    pub expense_id: Uuid,
    pub expense_number: String,
    pub applicant_name: String,
    pub expense_type: String,
    pub amount: Decimal,
    pub tax_amount: Option<Decimal>,
    pub description: String,
    pub payment_method: String,
}

// 付款事件数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentEventData {
    pub payment_id: Uuid,
    pub payment_number: String,
    pub payee_name: String,
    pub payment_type: String,
    pub amount: Decimal,
    pub bank_account: Option<String>,
    pub description: String,
}

// 发票事件数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvoiceEventData {
    pub invoice_id: Uuid,
    pub invoice_number: String,
    pub invoice_type: String,
    pub customer_name: String,
    pub amount: Decimal,
    pub tax_amount: Decimal,
    pub is_output: bool, // true: 销项发票, false: 进项发票
}

// 工资事件数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PayrollEventData {
    pub payroll_id: Uuid,
    pub payroll_period: String,
    pub department_id: Uuid,
    pub department_name: String,
    pub total_salary: Decimal,
    pub total_social_security: Decimal,
    pub total_housing_fund: Decimal,
    pub total_tax: Decimal,
    pub employee_count: i32,
}

// 固定资产事件数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetEventData {
    pub asset_id: Uuid,
    pub asset_code: String,
    pub asset_name: String,
    pub asset_type: String,
    pub acquisition_cost: Decimal,
    pub depreciation_method: String,
    pub useful_life_months: i32,
}

// 自动生成凭证请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutoGenerateVoucherRequest {
    pub source_type: VoucherSourceType,
    pub event_data: serde_json::Value,
    pub voucher_date: DateTime<Utc>,
    pub period: String,
    pub maker_id: Option<Uuid>,
    pub maker_name: Option<String>,
}

// 自动生成凭证响应
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutoGenerateVoucherResponse {
    pub success: bool,
    pub voucher_id: Option<Uuid>,
    pub voucher_number: Option<String>,
    pub message: String,
    pub error_details: Option<String>,
    #[serde(default)]
    pub entries: Vec<GeneratedVoucherEntry>,
}

// 生成的凭证条目
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedVoucherEntry {
    pub line_number: i32,
    pub subject_code: String,
    pub subject_name: String,
    pub summary: String,
    pub debit_amount: Decimal,
    pub credit_amount: Decimal,
    pub department_id: Option<Uuid>,
    pub project_id: Option<Uuid>,
}

// 凭证生成器 trait
pub trait VoucherGenerator {
    fn generate(&self, event: BusinessEvent) -> Result<AutoGenerateVoucherResponse, String>;
}

// 费用报销凭证生成器
pub struct ExpenseVoucherGenerator;

// 会计科目名称映射
fn get_subject_name(code: &str) -> &'static str {
    match code {
        "660201" => "差旅费",
        "660202" => "办公费",
        "660203" => "业务招待费",
        "660204" => "培训费",
        "660205" => "通讯费",
        "660206" => "交通费",
        "660299" => "其他费用",
        "100201" => "银行存款-基本户",
        "100202" => "银行存款-一般户",
        "224101" => "其他应付款-社保",
        "222101" => "应交税费-个人所得税",
        "660101" => "工资",
        "600101" => "主营业务收入",
        "222102" => "应交税费-销项税额",
        "222103" => "应交税费-进项税额",
        "140501" => "库存商品",
        "160201" => "固定资产",
        "160202" => "累计折旧",
        _ => "未知科目",
    }
}

impl ExpenseVoucherGenerator {
    pub fn new() -> Self {
        ExpenseVoucherGenerator
    }

    pub fn generate_voucher(
        &self,
        data: ExpenseEventData,
        _req: AutoGenerateVoucherRequest,
    ) -> AutoGenerateVoucherResponse {
        // 根据费用类型确定会计科目
        let (debit_subject_code, credit_subject_code) = match data.expense_type.as_str() {
            "travel" => ("660201", "100201"),         // 差旅费 -> 银行存款
            "office" => ("660202", "100201"),         // 办公费 -> 银行存款
            "entertainment" => ("660203", "100201"),  // 业务招待费 -> 银行存款
            "training" => ("660204", "100201"),       // 培训费 -> 银行存款
            "communication" => ("660205", "100201"),  // 通讯费 -> 银行存款
            "transportation" => ("660206", "100201"), // 交通费 -> 银行存款
            "other" => ("660299", "100201"),          // 其他费用 -> 银行存款
            _ => ("660299", "100201"),
        };

        let summary = format!("报销-{}: {}", data.applicant_name, data.description);

        // 生成凭证条目
        let entries = vec![
            GeneratedVoucherEntry {
                line_number: 1,
                subject_code: debit_subject_code.to_string(),
                subject_name: get_subject_name(debit_subject_code).to_string(),
                summary: summary.clone(),
                debit_amount: data.amount,
                credit_amount: Decimal::ZERO,
                department_id: None,
                project_id: None,
            },
            GeneratedVoucherEntry {
                line_number: 2,
                subject_code: credit_subject_code.to_string(),
                subject_name: get_subject_name(credit_subject_code).to_string(),
                summary,
                debit_amount: Decimal::ZERO,
                credit_amount: data.amount,
                department_id: None,
                project_id: None,
            },
        ];

        AutoGenerateVoucherResponse {
            success: true,
            voucher_id: Some(Uuid::new_v4()),
            voucher_number: Some(format!(
                "VD{}{:04}",
                chrono::Utc::now().format("%Y%m%d"),
                rand::random::<u16>() % 10000
            )),
            message: "凭证生成成功".to_string(),
            error_details: None,
            entries,
        }
    }
}

impl Default for ExpenseVoucherGenerator {
    fn default() -> Self {
        Self::new()
    }
}

// 付款凭证生成器
pub struct PaymentVoucherGenerator;

impl PaymentVoucherGenerator {
    pub fn new() -> Self {
        PaymentVoucherGenerator
    }

    pub fn generate_voucher(
        &self,
        data: PaymentEventData,
        _req: AutoGenerateVoucherRequest,
    ) -> AutoGenerateVoucherResponse {
        // 根据付款类型确定会计科目
        let debit_subject_code = match data.payment_type.as_str() {
            "supplier" => "200201", // 应付账款
            "tax" => "222101",      // 应交税费
            "salary" => "660101",   // 工资
            "expense" => "660299",  // 其他应付款
            _ => "660299",
        };

        let credit_subject_code = "100201"; // 银行存款
        let summary = format!("付款-{}: {}", data.payee_name, data.description);

        // 生成凭证条目
        let entries = vec![
            GeneratedVoucherEntry {
                line_number: 1,
                subject_code: debit_subject_code.to_string(),
                subject_name: get_subject_name(debit_subject_code).to_string(),
                summary: summary.clone(),
                debit_amount: data.amount,
                credit_amount: Decimal::ZERO,
                department_id: None,
                project_id: None,
            },
            GeneratedVoucherEntry {
                line_number: 2,
                subject_code: credit_subject_code.to_string(),
                subject_name: get_subject_name(credit_subject_code).to_string(),
                summary,
                debit_amount: Decimal::ZERO,
                credit_amount: data.amount,
                department_id: None,
                project_id: None,
            },
        ];

        AutoGenerateVoucherResponse {
            success: true,
            voucher_id: Some(Uuid::new_v4()),
            voucher_number: Some(format!(
                "VD{}{:04}",
                chrono::Utc::now().format("%Y%m%d"),
                rand::random::<u16>() % 10000
            )),
            message: "凭证生成成功".to_string(),
            error_details: None,
            entries,
        }
    }
}

impl Default for PaymentVoucherGenerator {
    fn default() -> Self {
        Self::new()
    }
}

// 发票凭证生成器
pub struct InvoiceVoucherGenerator;

impl InvoiceVoucherGenerator {
    pub fn new() -> Self {
        InvoiceVoucherGenerator
    }

    pub fn generate_voucher(
        &self,
        data: InvoiceEventData,
        _req: AutoGenerateVoucherRequest,
    ) -> AutoGenerateVoucherResponse {
        let summary = format!("发票-{}: {}", data.invoice_number, data.customer_name);

        if data.is_output {
            // 销项发票: 应收账款(借) -> 主营业务收入(贷), 应交税费-销项税(贷)
            let tax_rate = Decimal::from_str("0.13").unwrap();
            let tax_amount = data.amount * tax_rate / (Decimal::ONE + tax_rate);
            let revenue_amount = data.amount - tax_amount;

            let entries = vec![
                GeneratedVoucherEntry {
                    line_number: 1,
                    subject_code: "112201".to_string(),
                    subject_name: "应收账款".to_string(),
                    summary: summary.clone(),
                    debit_amount: data.amount,
                    credit_amount: Decimal::ZERO,
                    department_id: None,
                    project_id: None,
                },
                GeneratedVoucherEntry {
                    line_number: 2,
                    subject_code: "600101".to_string(),
                    subject_name: "主营业务收入".to_string(),
                    summary: summary.clone(),
                    debit_amount: Decimal::ZERO,
                    credit_amount: revenue_amount,
                    department_id: None,
                    project_id: None,
                },
                GeneratedVoucherEntry {
                    line_number: 3,
                    subject_code: "222102".to_string(),
                    subject_name: "应交税费-销项税额".to_string(),
                    summary,
                    debit_amount: Decimal::ZERO,
                    credit_amount: tax_amount,
                    department_id: None,
                    project_id: None,
                },
            ];

            AutoGenerateVoucherResponse {
                success: true,
                voucher_id: Some(Uuid::new_v4()),
                voucher_number: Some(format!(
                    "VD{}{:04}",
                    chrono::Utc::now().format("%Y%m%d"),
                    rand::random::<u16>() % 10000
                )),
                message: "销项发票凭证生成成功".to_string(),
                error_details: None,
                entries,
            }
        } else {
            // 进项发票: 原材料/费用(借), 应交税费-进项税(借) -> 应付账款(贷)
            let tax_rate = Decimal::from_str("0.13").unwrap();
            let tax_amount = data.amount * tax_rate / (Decimal::ONE + tax_rate);
            let expense_amount = data.amount - tax_amount;

            let entries = vec![
                GeneratedVoucherEntry {
                    line_number: 1,
                    subject_code: "140501".to_string(),
                    subject_name: "库存商品".to_string(),
                    summary: summary.clone(),
                    debit_amount: expense_amount,
                    credit_amount: Decimal::ZERO,
                    department_id: None,
                    project_id: None,
                },
                GeneratedVoucherEntry {
                    line_number: 2,
                    subject_code: "222103".to_string(),
                    subject_name: "应交税费-进项税额".to_string(),
                    summary: summary.clone(),
                    debit_amount: tax_amount,
                    credit_amount: Decimal::ZERO,
                    department_id: None,
                    project_id: None,
                },
                GeneratedVoucherEntry {
                    line_number: 3,
                    subject_code: "200201".to_string(),
                    subject_name: "应付账款".to_string(),
                    summary,
                    debit_amount: Decimal::ZERO,
                    credit_amount: data.amount,
                    department_id: None,
                    project_id: None,
                },
            ];

            AutoGenerateVoucherResponse {
                success: true,
                voucher_id: Some(Uuid::new_v4()),
                voucher_number: Some(format!(
                    "VD{}{:04}",
                    chrono::Utc::now().format("%Y%m%d"),
                    rand::random::<u16>() % 10000
                )),
                message: "进项发票凭证生成成功".to_string(),
                error_details: None,
                entries,
            }
        }
    }
}

impl Default for InvoiceVoucherGenerator {
    fn default() -> Self {
        Self::new()
    }
}

// 工资凭证生成器
pub struct PayrollVoucherGenerator;

impl PayrollVoucherGenerator {
    pub fn new() -> Self {
        PayrollVoucherGenerator
    }

    pub fn generate_voucher(
        &self,
        data: PayrollEventData,
        _req: AutoGenerateVoucherRequest,
    ) -> AutoGenerateVoucherResponse {
        // 工资凭证: 应付职工薪酬(借) -> 银行存款(贷), 应交税费-个人所得税(贷), 社保(贷)
        let summary = format!("发放{}月工资", data.payroll_period);
        let net_salary = data.total_salary
            - data.total_social_security
            - data.total_housing_fund
            - data.total_tax;

        let entries = vec![
            GeneratedVoucherEntry {
                line_number: 1,
                subject_code: "660101".to_string(),
                subject_name: "工资".to_string(),
                summary: summary.clone(),
                debit_amount: data.total_salary,
                credit_amount: Decimal::ZERO,
                department_id: Some(data.department_id),
                project_id: None,
            },
            GeneratedVoucherEntry {
                line_number: 2,
                subject_code: "100201".to_string(),
                subject_name: "银行存款-基本户".to_string(),
                summary: summary.clone(),
                debit_amount: Decimal::ZERO,
                credit_amount: net_salary,
                department_id: None,
                project_id: None,
            },
            GeneratedVoucherEntry {
                line_number: 3,
                subject_code: "222101".to_string(),
                subject_name: "应交税费-个人所得税".to_string(),
                summary: summary.clone(),
                debit_amount: Decimal::ZERO,
                credit_amount: data.total_tax,
                department_id: None,
                project_id: None,
            },
            GeneratedVoucherEntry {
                line_number: 4,
                subject_code: "224101".to_string(),
                subject_name: "其他应付款-社保".to_string(),
                summary,
                debit_amount: Decimal::ZERO,
                credit_amount: data.total_social_security + data.total_housing_fund,
                department_id: None,
                project_id: None,
            },
        ];

        AutoGenerateVoucherResponse {
            success: true,
            voucher_id: Some(Uuid::new_v4()),
            voucher_number: Some(format!(
                "VD{}{:04}",
                chrono::Utc::now().format("%Y%m%d"),
                rand::random::<u16>() % 10000
            )),
            message: "工资凭证生成成功".to_string(),
            error_details: None,
            entries,
        }
    }
}

impl Default for PayrollVoucherGenerator {
    fn default() -> Self {
        Self::new()
    }
}

// 固定资产凭证生成器
pub struct AssetVoucherGenerator;

impl AssetVoucherGenerator {
    pub fn new() -> Self {
        AssetVoucherGenerator
    }

    pub fn generate_voucher(
        &self,
        data: AssetEventData,
        _req: AutoGenerateVoucherRequest,
    ) -> AutoGenerateVoucherResponse {
        // 固定资产入账: 固定资产(借) -> 银行存款/应付账款(贷)
        let summary = format!("购入固定资产: {}", data.asset_name);

        let entries = vec![
            GeneratedVoucherEntry {
                line_number: 1,
                subject_code: "160201".to_string(),
                subject_name: "固定资产".to_string(),
                summary: summary.clone(),
                debit_amount: data.acquisition_cost,
                credit_amount: Decimal::ZERO,
                department_id: None,
                project_id: None,
            },
            GeneratedVoucherEntry {
                line_number: 2,
                subject_code: "100201".to_string(),
                subject_name: "银行存款-基本户".to_string(),
                summary,
                debit_amount: Decimal::ZERO,
                credit_amount: data.acquisition_cost,
                department_id: None,
                project_id: None,
            },
        ];

        AutoGenerateVoucherResponse {
            success: true,
            voucher_id: Some(Uuid::new_v4()),
            voucher_number: Some(format!(
                "VD{}{:04}",
                chrono::Utc::now().format("%Y%m%d"),
                rand::random::<u16>() % 10000
            )),
            message: "固定资产凭证生成成功".to_string(),
            error_details: None,
            entries,
        }
    }
}

impl Default for AssetVoucherGenerator {
    fn default() -> Self {
        Self::new()
    }
}

// 凭证自动生成服务
pub struct VoucherAutoGenerationService {
    expense_generator: ExpenseVoucherGenerator,
    payment_generator: PaymentVoucherGenerator,
    invoice_generator: InvoiceVoucherGenerator,
    payroll_generator: PayrollVoucherGenerator,
    asset_generator: AssetVoucherGenerator,
}

impl VoucherAutoGenerationService {
    pub fn new() -> Self {
        VoucherAutoGenerationService {
            expense_generator: ExpenseVoucherGenerator::new(),
            payment_generator: PaymentVoucherGenerator::new(),
            invoice_generator: InvoiceVoucherGenerator::new(),
            payroll_generator: PayrollVoucherGenerator::new(),
            asset_generator: AssetVoucherGenerator::new(),
        }
    }

    pub fn generate_voucher(&self, req: AutoGenerateVoucherRequest) -> AutoGenerateVoucherResponse {
        match req.source_type {
            VoucherSourceType::Expense => {
                if let Ok(data) = serde_json::from_value::<ExpenseEventData>(req.event_data.clone())
                {
                    self.expense_generator.generate_voucher(data, req)
                } else {
                    AutoGenerateVoucherResponse {
                        success: false,
                        voucher_id: None,
                        voucher_number: None,
                        message: "费用数据解析失败".to_string(),
                        error_details: Some("Invalid expense event data".to_string()),
                        entries: vec![],
                    }
                }
            }
            VoucherSourceType::Payment => {
                if let Ok(data) = serde_json::from_value::<PaymentEventData>(req.event_data.clone())
                {
                    self.payment_generator.generate_voucher(data, req)
                } else {
                    AutoGenerateVoucherResponse {
                        success: false,
                        voucher_id: None,
                        voucher_number: None,
                        message: "付款数据解析失败".to_string(),
                        error_details: Some("Invalid payment event data".to_string()),
                        entries: vec![],
                    }
                }
            }
            VoucherSourceType::Invoice => {
                if let Ok(data) = serde_json::from_value::<InvoiceEventData>(req.event_data.clone())
                {
                    self.invoice_generator.generate_voucher(data, req)
                } else {
                    AutoGenerateVoucherResponse {
                        success: false,
                        voucher_id: None,
                        voucher_number: None,
                        message: "发票数据解析失败".to_string(),
                        error_details: Some("Invalid invoice event data".to_string()),
                        entries: vec![],
                    }
                }
            }
            VoucherSourceType::Payroll => {
                if let Ok(data) = serde_json::from_value::<PayrollEventData>(req.event_data.clone())
                {
                    self.payroll_generator.generate_voucher(data, req)
                } else {
                    AutoGenerateVoucherResponse {
                        success: false,
                        voucher_id: None,
                        voucher_number: None,
                        message: "工资数据解析失败".to_string(),
                        error_details: Some("Invalid payroll event data".to_string()),
                        entries: vec![],
                    }
                }
            }
            VoucherSourceType::Asset => {
                if let Ok(data) = serde_json::from_value::<AssetEventData>(req.event_data.clone()) {
                    self.asset_generator.generate_voucher(data, req)
                } else {
                    AutoGenerateVoucherResponse {
                        success: false,
                        voucher_id: None,
                        voucher_number: None,
                        message: "固定资产数据解析失败".to_string(),
                        error_details: Some("Invalid asset event data".to_string()),
                        entries: vec![],
                    }
                }
            }
            _ => AutoGenerateVoucherResponse {
                success: false,
                voucher_id: None,
                voucher_number: None,
                message: "不支持的凭证来源类型".to_string(),
                error_details: None,
                entries: vec![],
            },
        }
    }
}

impl Default for VoucherAutoGenerationService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_expense_voucher_generation() {
        let service = VoucherAutoGenerationService::new();

        let expense_data = ExpenseEventData {
            expense_id: Uuid::new_v4(),
            expense_number: "EXP001".to_string(),
            applicant_name: "张三".to_string(),
            expense_type: "travel".to_string(),
            amount: Decimal::new(1000, 2),
            tax_amount: Some(Decimal::new(100, 2)),
            description: "北京出差".to_string(),
            payment_method: "bank".to_string(),
        };

        let req = AutoGenerateVoucherRequest {
            source_type: VoucherSourceType::Expense,
            event_data: serde_json::to_value(expense_data).unwrap(),
            voucher_date: Utc::now(),
            period: "2024-01".to_string(),
            maker_id: None,
            maker_name: Some("系统".to_string()),
        };

        let response = service.generate_voucher(req);
        assert!(response.success);
    }
}
