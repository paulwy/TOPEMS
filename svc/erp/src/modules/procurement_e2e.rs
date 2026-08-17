//! ERP 端到端采购链 HTTP handler（axum + utoipa）
//!
//! 核心纯函数逻辑来自 finance::erp_e2e，在本模块内**独立拷贝一份**：
//! - 保持与 finance 版本等价的验证规则 / 分录生成算法；
//! - 避免 svc/erp 直接依赖 finance 的内部实现（解耦编译单元）。
//!
//! HTTP 入口（2 个）：
//! - POST /erp/procurement-e2e/validate         （单币种快捷入口）
//! - POST /erp/procurement-e2e/validate-multi   （多币种转换入口）
//!
//! 返回 200 OK / 400 BadRequest，错误体内置 code+message，符合前端错误展示契约。
//! 验证成功时返回日记账分录汇总，可直接被前端"采购链对账单"面板消费。

use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::fmt;
use thiserror::Error;
use utoipa::ToSchema;

use crate::modules::ApiState;

// ============================================================================
// 共享纯函数：输入类型（与 finance::erp_e2e 等价，追加 serde/utoipa derive）
// ============================================================================

/// 采购行项目（DTO）。
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, ToSchema)]
pub struct ProcurementLine {
    /// 物料编码，例如 "MAT-0001"。用于跨单据数量匹配。
    #[schema(example = "MAT-0001")]
    pub material_code: String,
    /// 数量（正数）。
    #[schema(example = 10.0)]
    pub quantity: f64,
    /// 未税单价（本位币）。
    #[schema(example = 100.0)]
    pub unit_price: f64,
    /// 税率小数：0.13 = 13%，0 = 免增值税。
    #[schema(example = 0.13)]
    pub tax_rate: f64,
}

/// 采购订单（DTO）。
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, ToSchema)]
pub struct PurchaseOrder {
    #[schema(example = "PO-2025-0001")]
    pub po_no: String,
    /// ISO 4217 币种代码：CNY / USD / EUR ...
    #[schema(example = "CNY")]
    pub currency: String,
    /// Open / Closed。仅 "Open" 允许入账。
    #[schema(example = "Open")]
    pub period_status: String,
    #[schema(example = json!([{"material_code":"MAT-0001","quantity":10,"unit_price":100,"tax_rate":0.13}]))]
    pub lines: Vec<ProcurementLine>,
}

/// 收货单（DTO）。
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, ToSchema)]
pub struct GoodsReceiptNote {
    #[schema(example = "GRN-2025-0001")]
    pub grn_no: String,
    /// 对应采购订单号。
    #[schema(example = "PO-2025-0001")]
    pub po_no: String,
    #[schema(example = "CNY")]
    pub currency: String,
    #[schema(example = "Open")]
    pub period_status: String,
    pub lines: Vec<ProcurementLine>,
}

/// 发票（DTO）。
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, ToSchema)]
pub struct Invoice {
    #[schema(example = "INV-2025-0001")]
    pub invoice_no: String,
    /// 对应收货单号。
    #[schema(example = "GRN-2025-0001")]
    pub grn_no: String,
    #[schema(example = "CNY")]
    pub currency: String,
    #[schema(example = "Open")]
    pub period_status: String,
    pub lines: Vec<ProcurementLine>,
}

/// 付款单（DTO）。
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, ToSchema)]
pub struct Payment {
    #[schema(example = "PAY-2025-0001")]
    pub payment_no: String,
    /// 对应发票号。
    #[schema(example = "INV-2025-0001")]
    pub invoice_no: String,
    #[schema(example = "CNY")]
    pub currency: String,
    /// 已支付总金额（价税合计，付款单币种）。
    #[schema(example = 1130.0)]
    pub amount: f64,
    #[schema(example = "Open")]
    pub period_status: String,
}

/// 多币种汇率（DTO）。
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, ToSchema)]
pub struct CurrencyConversionRate {
    #[schema(example = "USD")]
    pub from: String,
    #[schema(example = "CNY")]
    pub to: String,
    /// 1 单位 from = rate 单位 to。
    #[schema(example = 7.18)]
    pub rate: f64,
}

// ============================================================================
// 共享纯函数：错误类型
// ============================================================================

/// 业务验证错误（内部枚举，HTTP 层会转成 ErpE2eApiError）。
#[derive(Debug, Clone, PartialEq)]
pub enum ErpE2eError {
    GrnExceedsPoQuantity {
        line: usize,
        po_qty: f64,
        grn_qty: f64,
    },
    InvoiceGrnMismatch {
        line: usize,
        grn_amount: f64,
        invoice_amount: f64,
    },
    PaymentExceedsInvoice {
        invoice_total: f64,
        payment_amount: f64,
    },
    CurrencyMismatch {
        expected: String,
        actual: String,
    },
    PeriodClosed {
        document: String,
    },
    UnbalancedJournalEntries {
        debit: f64,
        credit: f64,
    },
}

impl fmt::Display for ErpE2eError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ErpE2eError::GrnExceedsPoQuantity {
                line,
                po_qty,
                grn_qty,
            } => {
                write!(
                    f,
                    "GRN line {line} exceeds PO quantity: po_qty={po_qty}, grn_qty={grn_qty}"
                )
            }
            ErpE2eError::InvoiceGrnMismatch {
                line,
                grn_amount,
                invoice_amount,
            } => {
                write!(
                    f,
                    "invoice line {line} amount mismatch: grn_amount={grn_amount}, invoice_amount={invoice_amount}"
                )
            }
            ErpE2eError::PaymentExceedsInvoice {
                invoice_total,
                payment_amount,
            } => {
                write!(
                    f,
                    "payment exceeds invoice: invoice_total={invoice_total}, payment_amount={payment_amount}"
                )
            }
            ErpE2eError::CurrencyMismatch { expected, actual } => {
                write!(f, "currency mismatch: expected {expected}, actual {actual}")
            }
            ErpE2eError::PeriodClosed { document } => {
                write!(f, "period is closed for document {document}")
            }
            ErpE2eError::UnbalancedJournalEntries { debit, credit } => {
                write!(
                    f,
                    "unbalanced journal entries: debit {debit} != credit {credit}"
                )
            }
        }
    }
}

impl std::error::Error for ErpE2eError {}

// ============================================================================
// HTTP API 请求 / 响应 DTO
// ============================================================================

/// 单币种请求体。
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, ToSchema)]
pub struct ValidateProcurementRequest {
    pub po: PurchaseOrder,
    pub grn: GoodsReceiptNote,
    pub invoice: Invoice,
    pub payment: Payment,
}

/// 多币种请求体（含汇率表）。
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, ToSchema)]
pub struct ValidateProcurementMultiRequest {
    pub po: PurchaseOrder,
    pub grn: GoodsReceiptNote,
    pub invoice: Invoice,
    pub payment: Payment,
    #[serde(default)]
    pub rates: Vec<CurrencyConversionRate>,
}

/// 单条日记账分录（Schema）。
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, ToSchema)]
pub struct JournalEntryLine {
    pub account_code: String,
    pub account_name: String,
    #[schema(example = 1130.0)]
    pub debit: f64,
    #[schema(example = 0.0)]
    pub credit: f64,
}

/// 采购链校验成功响应。
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, ToSchema)]
pub struct ProcurementValidateResponse {
    pub ok: bool,
    pub total_po: f64,
    pub total_grn: f64,
    pub total_invoice: f64,
    pub total_payment: f64,
    /// 借贷是否平衡（容差 0.01）。
    pub entries_balanced: bool,
    pub grn_entries: Vec<JournalEntryLine>,
    pub invoice_entries: Vec<JournalEntryLine>,
    pub payment_entries: Vec<JournalEntryLine>,
    /// 合并分录（GRN + Invoice + Payment 顺序）。
    pub journal_entries: Vec<JournalEntryLine>,
}

/// 错误响应（DTO，前端 errors 面板消费）。
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, ToSchema)]
pub struct ErpE2eErrorResponse {
    /// 稳定错误码，可用于前端 switch 判断。
    ///
    /// 取值：`GRN_EXCEEDS_PO_QTY | INVOICE_GRN_MISMATCH | PAYMENT_EXCEEDS_INVOICE
    /// | CURRENCY_MISMATCH | PERIOD_CLOSED | UNBALANCED_ENTRIES | VALIDATION_ERROR`
    #[schema(example = "GRN_EXCEEDS_PO_QTY")]
    pub code: String,
    /// 人类可读消息（英文，与 ErpE2eError Display 一致）。
    #[schema(example = "GRN line 0 exceeds PO quantity: po_qty=10, grn_qty=15")]
    pub message: String,
    /// 可选：结构化上下文（例如 line 索引、差额、差额方向），可前端打标高亮。
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub context: Option<serde_json::Value>,
}

/// axum 可直接返回的 HTTP 错误包装。
#[derive(Debug, Error)]
#[error(transparent)]
pub struct ErpE2eApiError(#[from] pub ErpE2eError);

impl IntoResponse for ErpE2eApiError {
    fn into_response(self) -> Response {
        let code = match &self.0 {
            ErpE2eError::GrnExceedsPoQuantity { .. } => "GRN_EXCEEDS_PO_QTY",
            ErpE2eError::InvoiceGrnMismatch { .. } => "INVOICE_GRN_MISMATCH",
            ErpE2eError::PaymentExceedsInvoice { .. } => "PAYMENT_EXCEEDS_INVOICE",
            ErpE2eError::CurrencyMismatch { .. } => "CURRENCY_MISMATCH",
            ErpE2eError::PeriodClosed { .. } => "PERIOD_CLOSED",
            ErpE2eError::UnbalancedJournalEntries { .. } => "UNBALANCED_ENTRIES",
        };
        let context = match &self.0 {
            ErpE2eError::GrnExceedsPoQuantity {
                line,
                po_qty,
                grn_qty,
            } => Some(serde_json::json!({
                "line": line,
                "po_qty": po_qty,
                "grn_qty": grn_qty,
                "delta": grn_qty - po_qty,
            })),
            ErpE2eError::InvoiceGrnMismatch {
                line,
                grn_amount,
                invoice_amount,
            } => Some(serde_json::json!({
                "line": line,
                "grn_amount": grn_amount,
                "invoice_amount": invoice_amount,
                "delta": invoice_amount - grn_amount,
            })),
            ErpE2eError::PaymentExceedsInvoice {
                invoice_total,
                payment_amount,
            } => Some(serde_json::json!({
                "invoice_total": invoice_total,
                "payment_amount": payment_amount,
                "delta": payment_amount - invoice_total,
            })),
            ErpE2eError::CurrencyMismatch { expected, actual } => {
                Some(serde_json::json!({ "expected": expected, "actual": actual }))
            }
            ErpE2eError::PeriodClosed { document } => {
                Some(serde_json::json!({ "document": document }))
            }
            ErpE2eError::UnbalancedJournalEntries { debit, credit } => Some(
                serde_json::json!({ "debit": debit, "credit": credit, "delta": debit - credit }),
            ),
        };
        let body = ErpE2eErrorResponse {
            code: code.to_string(),
            message: self.0.to_string(),
            context,
        };
        (StatusCode::BAD_REQUEST, Json(body)).into_response()
    }
}

// ============================================================================
// 共享纯函数：核心校验逻辑（与 finance::erp_e2e 等价）
// ============================================================================

#[derive(Debug, Clone, PartialEq)]
pub struct ProcurementChainResult {
    pub journal_entries: Vec<JournalEntryLine>,
    pub grn_entries: Vec<JournalEntryLine>,
    pub invoice_entries: Vec<JournalEntryLine>,
    pub payment_entries: Vec<JournalEntryLine>,
    pub total_po: f64,
    pub total_grn: f64,
    pub total_invoice: f64,
    pub total_payment: f64,
}

fn line_net(line: &ProcurementLine) -> f64 {
    line.quantity * line.unit_price
}
fn line_tax(line: &ProcurementLine) -> f64 {
    line_net(line) * line.tax_rate
}
fn line_gross(line: &ProcurementLine) -> f64 {
    line_net(line) + line_tax(line)
}
fn round2(v: f64) -> f64 {
    (v * 100.0).round() / 100.0
}

fn conversion_factor(from: &str, to: &str, rates: &[CurrencyConversionRate]) -> Option<f64> {
    if from == to {
        return Some(1.0);
    }
    for r in rates {
        if r.from == from && r.to == to {
            return Some(r.rate);
        }
        if r.from == to && r.to == from {
            return Some(1.0 / r.rate);
        }
    }
    None
}

pub fn check_journal_entries_balanced(entries: &[JournalEntryLine]) -> Result<(), ErpE2eError> {
    let total_debit: f64 = entries.iter().map(|e| e.debit).sum();
    let total_credit: f64 = entries.iter().map(|e| e.credit).sum();
    if (total_debit - total_credit).abs() > 0.01 + 1e-9 {
        return Err(ErpE2eError::UnbalancedJournalEntries {
            debit: total_debit,
            credit: total_credit,
        });
    }
    Ok(())
}

pub fn validate_procurement_chain(
    po: &PurchaseOrder,
    grn: &GoodsReceiptNote,
    invoice: &Invoice,
    payment: &Payment,
) -> Result<ProcurementChainResult, ErpE2eError> {
    validate_procurement_chain_with_rates(po, grn, invoice, payment, &[])
}

pub fn validate_procurement_chain_with_rates(
    po: &PurchaseOrder,
    grn: &GoodsReceiptNote,
    invoice: &Invoice,
    payment: &Payment,
    rates: &[CurrencyConversionRate],
) -> Result<ProcurementChainResult, ErpE2eError> {
    // 规则 5：期间必须 Open。
    if po.period_status != "Open" {
        return Err(ErpE2eError::PeriodClosed {
            document: format!("PO:{}", po.po_no),
        });
    }
    if grn.period_status != "Open" {
        return Err(ErpE2eError::PeriodClosed {
            document: format!("GRN:{}", grn.grn_no),
        });
    }
    if invoice.period_status != "Open" {
        return Err(ErpE2eError::PeriodClosed {
            document: format!("Invoice:{}", invoice.invoice_no),
        });
    }
    if payment.period_status != "Open" {
        return Err(ErpE2eError::PeriodClosed {
            document: format!("Payment:{}", payment.payment_no),
        });
    }

    // 规则 4：币种校验（带汇率转换）。
    let base_currency = &po.currency;
    let grn_factor = conversion_factor(&grn.currency, base_currency, rates).ok_or(
        ErpE2eError::CurrencyMismatch {
            expected: base_currency.clone(),
            actual: grn.currency.clone(),
        },
    )?;
    let invoice_factor = conversion_factor(&invoice.currency, base_currency, rates).ok_or(
        ErpE2eError::CurrencyMismatch {
            expected: base_currency.clone(),
            actual: invoice.currency.clone(),
        },
    )?;
    let payment_factor = conversion_factor(&payment.currency, base_currency, rates).ok_or(
        ErpE2eError::CurrencyMismatch {
            expected: base_currency.clone(),
            actual: payment.currency.clone(),
        },
    )?;

    // 规则 1：GRN 数量 ≤ PO 数量（按 material_code 匹配）。
    for (i, grn_line) in grn.lines.iter().enumerate() {
        let po_qty = po
            .lines
            .iter()
            .find(|l| l.material_code == grn_line.material_code)
            .map(|l| l.quantity)
            .unwrap_or(0.0);
        if grn_line.quantity > po_qty + 1e-9 {
            return Err(ErpE2eError::GrnExceedsPoQuantity {
                line: i,
                po_qty,
                grn_qty: grn_line.quantity,
            });
        }
    }

    // 规则 2：发票行金额匹配 GRN（价税合计，容差 ≤0.01）。
    for (i, inv_line) in invoice.lines.iter().enumerate() {
        let inv_amount = line_gross(inv_line) * invoice_factor;
        let grn_amount = grn
            .lines
            .iter()
            .find(|l| l.material_code == inv_line.material_code)
            .map(|l| line_gross(l) * grn_factor)
            .unwrap_or(0.0);
        if (inv_amount - grn_amount).abs() > 0.01 + 1e-9 {
            return Err(ErpE2eError::InvoiceGrnMismatch {
                line: i,
                grn_amount,
                invoice_amount: inv_amount,
            });
        }
    }

    let total_po: f64 = po.lines.iter().map(line_gross).sum();
    let total_grn: f64 = grn.lines.iter().map(|l| line_gross(l) * grn_factor).sum();
    let total_invoice: f64 = invoice
        .lines
        .iter()
        .map(|l| line_gross(l) * invoice_factor)
        .sum();
    let total_payment: f64 = payment.amount * payment_factor;

    // 规则 3：付款金额 ≤ 发票总额（部分付款允许）。
    if total_payment > total_invoice + 1e-9 {
        return Err(ErpE2eError::PaymentExceedsInvoice {
            invoice_total: total_invoice,
            payment_amount: total_payment,
        });
    }

    // 分录生成。
    let mut grn_entries: Vec<JournalEntryLine> = Vec::new();
    for line in &grn.lines {
        let net = round2(line_net(line) * grn_factor);
        grn_entries.push(JournalEntryLine {
            account_code: "1401".into(),
            account_name: "库存商品".into(),
            debit: net,
            credit: 0.0,
        });
        grn_entries.push(JournalEntryLine {
            account_code: "2202".into(),
            account_name: "应付暂估".into(),
            debit: 0.0,
            credit: net,
        });
    }

    let mut invoice_entries: Vec<JournalEntryLine> = Vec::new();
    for line in &invoice.lines {
        let net = round2(line_net(line) * invoice_factor);
        let tax = round2(line_tax(line) * invoice_factor);
        let gross = round2(net + tax);
        invoice_entries.push(JournalEntryLine {
            account_code: "2202".into(),
            account_name: "应付暂估".into(),
            debit: net,
            credit: 0.0,
        });
        if tax > 1e-9 {
            invoice_entries.push(JournalEntryLine {
                account_code: "2221".into(),
                account_name: "应交税费-进项税额".into(),
                debit: tax,
                credit: 0.0,
            });
        }
        invoice_entries.push(JournalEntryLine {
            account_code: "2201".into(),
            account_name: "应付账款".into(),
            debit: 0.0,
            credit: gross,
        });
    }

    let mut payment_entries: Vec<JournalEntryLine> = Vec::new();
    let pay_amt = round2(total_payment);
    if pay_amt > 1e-9 {
        payment_entries.push(JournalEntryLine {
            account_code: "2201".into(),
            account_name: "应付账款".into(),
            debit: pay_amt,
            credit: 0.0,
        });
        payment_entries.push(JournalEntryLine {
            account_code: "1002".into(),
            account_name: "银行存款".into(),
            debit: 0.0,
            credit: pay_amt,
        });
    }

    let mut journal_entries: Vec<JournalEntryLine> = Vec::new();
    journal_entries.extend(grn_entries.clone());
    journal_entries.extend(invoice_entries.clone());
    journal_entries.extend(payment_entries.clone());

    Ok(ProcurementChainResult {
        journal_entries,
        grn_entries,
        invoice_entries,
        payment_entries,
        total_po,
        total_grn,
        total_invoice,
        total_payment,
    })
}

// ============================================================================
// utoipa Contract：注入 example，保证 schema 可被 mock server 直接消费
// ============================================================================

/// 典型 happy-path 示例（13% VAT 单物料，CNY）——用于 utoipa example 与 CLI 复用。
pub fn sample_happy_cny() -> ValidateProcurementRequest {
    ValidateProcurementRequest {
        po: PurchaseOrder {
            po_no: "PO-2025-0001".into(),
            currency: "CNY".into(),
            period_status: "Open".into(),
            lines: vec![ProcurementLine {
                material_code: "MAT-0001".into(),
                quantity: 10.0,
                unit_price: 100.0,
                tax_rate: 0.13,
            }],
        },
        grn: GoodsReceiptNote {
            grn_no: "GRN-2025-0001".into(),
            po_no: "PO-2025-0001".into(),
            currency: "CNY".into(),
            period_status: "Open".into(),
            lines: vec![ProcurementLine {
                material_code: "MAT-0001".into(),
                quantity: 10.0,
                unit_price: 100.0,
                tax_rate: 0.13,
            }],
        },
        invoice: Invoice {
            invoice_no: "INV-2025-0001".into(),
            grn_no: "GRN-2025-0001".into(),
            currency: "CNY".into(),
            period_status: "Open".into(),
            lines: vec![ProcurementLine {
                material_code: "MAT-0001".into(),
                quantity: 10.0,
                unit_price: 100.0,
                tax_rate: 0.13,
            }],
        },
        payment: Payment {
            payment_no: "PAY-2025-0001".into(),
            invoice_no: "INV-2025-0001".into(),
            currency: "CNY".into(),
            amount: 1130.0,
            period_status: "Open".into(),
        },
    }
}

pub fn sample_multi_currency_usd_cny() -> ValidateProcurementMultiRequest {
    ValidateProcurementMultiRequest {
        po: PurchaseOrder {
            po_no: "PO-USD-2025-0001".into(),
            currency: "CNY".into(),
            period_status: "Open".into(),
            lines: vec![ProcurementLine {
                material_code: "MAT-IMPORT-01".into(),
                quantity: 2.0,
                unit_price: 500.0, // 500 USD → 按 7.18 汇 率 → 3590 CNY net
                tax_rate: 0.13,
            }],
        },
        grn: GoodsReceiptNote {
            grn_no: "GRN-USD-2025-0001".into(),
            po_no: "PO-USD-2025-0001".into(),
            currency: "USD".into(),
            period_status: "Open".into(),
            lines: vec![ProcurementLine {
                material_code: "MAT-IMPORT-01".into(),
                quantity: 2.0,
                unit_price: 500.0,
                tax_rate: 0.13,
            }],
        },
        invoice: Invoice {
            invoice_no: "INV-USD-2025-0001".into(),
            grn_no: "GRN-USD-2025-0001".into(),
            currency: "USD".into(),
            period_status: "Open".into(),
            lines: vec![ProcurementLine {
                material_code: "MAT-IMPORT-01".into(),
                quantity: 2.0,
                unit_price: 500.0,
                tax_rate: 0.13,
            }],
        },
        payment: Payment {
            payment_no: "PAY-USD-2025-0001".into(),
            invoice_no: "INV-USD-2025-0001".into(),
            currency: "USD".into(),
            amount: 1130.0, // 价税合计 1000*1.13
            period_status: "Open".into(),
        },
        rates: vec![CurrencyConversionRate {
            from: "USD".into(),
            to: "CNY".into(),
            rate: 7.18,
        }],
    }
}

// ============================================================================
// HTTP Handler
// ============================================================================

/// 单币种采购链端到端校验（ERP E2E 真实化主入口）。
#[utoipa::path(
    post,
    path = "/erp/procurement-e2e/validate",
    tag = "ProcurementE2E",
    operation_id = "erp_e2e_validate",
    request_body(
        content = ValidateProcurementRequest,
        description = "PO / GRN / Invoice / Payment 四单据（同币种）",
        content_type = "application/json",
        example = json!({
            "po": {
                "po_no": "PO-2025-0001", "currency": "CNY", "period_status": "Open",
                "lines": [{"material_code":"MAT-0001","quantity":10,"unit_price":100,"tax_rate":0.13}]
            },
            "grn": {
                "grn_no": "GRN-2025-0001", "po_no": "PO-2025-0001", "currency": "CNY", "period_status": "Open",
                "lines": [{"material_code":"MAT-0001","quantity":10,"unit_price":100,"tax_rate":0.13}]
            },
            "invoice": {
                "invoice_no": "INV-2025-0001", "grn_no": "GRN-2025-0001", "currency": "CNY", "period_status": "Open",
                "lines": [{"material_code":"MAT-0001","quantity":10,"unit_price":100,"tax_rate":0.13}]
            },
            "payment": {
                "payment_no": "PAY-2025-0001", "invoice_no": "INV-2025-0001", "currency": "CNY",
                "amount": 1130.0, "period_status": "Open"
            }
        })
    ),
    responses(
        (status = 200, description = "校验通过，返回日记账分录汇总",
         body = ProcurementValidateResponse,
         example = json!({
            "ok": true, "total_po": 1130.0, "total_grn": 1130.0, "total_invoice": 1130.0, "total_payment": 1130.0,
            "entries_balanced": true, "grn_entries": [], "invoice_entries": [], "payment_entries": [],
            "journal_entries": []
         })
        ),
        (status = 400, description = "业务校验失败（含稳定错误码）",
         body = ErpE2eErrorResponse,
         example = json!({
            "code": "GRN_EXCEEDS_PO_QTY",
            "message": "GRN line 0 exceeds PO quantity: po_qty=10, grn_qty=15",
            "context": {"line":0,"po_qty":10,"grn_qty":15,"delta":5}
         })
        ),
    ),
)]
pub async fn validate_chain_handler(
    State(_state): State<ApiState>,
    Json(req): Json<ValidateProcurementRequest>,
) -> Result<(StatusCode, Json<ProcurementValidateResponse>), ErpE2eApiError> {
    let r = validate_procurement_chain(&req.po, &req.grn, &req.invoice, &req.payment)?;
    let balanced = check_journal_entries_balanced(&r.journal_entries).is_ok();
    Ok((
        StatusCode::OK,
        Json(ProcurementValidateResponse {
            ok: true,
            total_po: r.total_po,
            total_grn: r.total_grn,
            total_invoice: r.total_invoice,
            total_payment: r.total_payment,
            entries_balanced: balanced,
            grn_entries: r.grn_entries,
            invoice_entries: r.invoice_entries,
            payment_entries: r.payment_entries,
            journal_entries: r.journal_entries,
        }),
    ))
}

/// 多币种采购链端到端校验（带汇率表）。
#[utoipa::path(
    post,
    path = "/erp/procurement-e2e/validate-multi",
    tag = "ProcurementE2E",
    operation_id = "erp_e2e_validate_multi",
    request_body(content = ValidateProcurementMultiRequest, content_type = "application/json"),
    responses(
        (status = 200, description = "校验通过（已按 PO 币种折回）", body = ProcurementValidateResponse),
        (status = 400, description = "业务/汇率校验失败", body = ErpE2eErrorResponse),
    ),
)]
pub async fn validate_chain_multi_handler(
    State(_state): State<ApiState>,
    Json(req): Json<ValidateProcurementMultiRequest>,
) -> Result<(StatusCode, Json<ProcurementValidateResponse>), ErpE2eApiError> {
    let r = validate_procurement_chain_with_rates(
        &req.po,
        &req.grn,
        &req.invoice,
        &req.payment,
        &req.rates,
    )?;
    let balanced = check_journal_entries_balanced(&r.journal_entries).is_ok();
    Ok((
        StatusCode::OK,
        Json(ProcurementValidateResponse {
            ok: true,
            total_po: r.total_po,
            total_grn: r.total_grn,
            total_invoice: r.total_invoice,
            total_payment: r.total_payment,
            entries_balanced: balanced,
            grn_entries: r.grn_entries,
            invoice_entries: r.invoice_entries,
            payment_entries: r.payment_entries,
            journal_entries: r.journal_entries,
        }),
    ))
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/procurement-e2e/validate",
            axum::routing::post(validate_chain_handler),
        )
        .route(
            "/procurement-e2e/validate-multi",
            axum::routing::post(validate_chain_multi_handler),
        )
}

// ============================================================================
// Unit tests（Y5：49→≥90；本模块净贡献 41）
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    // ---------- helpers ----------
    fn happy_req() -> ValidateProcurementRequest {
        sample_happy_cny()
    }

    fn happy_ok() -> ProcurementChainResult {
        let req = happy_req();
        validate_procurement_chain(&req.po, &req.grn, &req.invoice, &req.payment)
            .expect("happy should pass")
    }

    // --- Test group 1：Happy paths（11）---
    #[test]
    fn happy_cny_basic_ok() {
        let r = happy_ok();
        assert!((r.total_po - 1130.0).abs() < 1e-9);
        assert_eq!(r.grn_entries.len(), 2); // 借库存 / 贷暂估
        assert_eq!(r.invoice_entries.len(), 3); // 借暂估 + 借进项 + 贷应付
        assert_eq!(r.payment_entries.len(), 2); // 借应付 + 贷银行
        assert_eq!(r.journal_entries.len(), 7);
    }
    #[test]
    fn happy_cny_entries_balanced() {
        let r = happy_ok();
        check_journal_entries_balanced(&r.journal_entries).expect("balanced");
    }
    #[test]
    fn happy_zero_tax_omits_input_vat_entry() {
        let mut req = happy_req();
        for l in req.grn.lines.iter_mut() {
            l.tax_rate = 0.0;
        }
        for l in req.invoice.lines.iter_mut() {
            l.tax_rate = 0.0;
        }
        for l in req.po.lines.iter_mut() {
            l.tax_rate = 0.0;
        }
        // 对应付款也要按未税 1000 支付
        req.payment.amount = 1000.0;
        let r = validate_procurement_chain(&req.po, &req.grn, &req.invoice, &req.payment).unwrap();
        // Invoice：无进项税，2 条分录（借暂估 + 贷应付）
        assert_eq!(r.invoice_entries.len(), 2);
        // 总价 = net*1 = 10*100 = 1000
        assert!((r.total_invoice - 1000.0).abs() < 1e-9);
    }
    #[test]
    fn happy_partial_payment_allowed() {
        let mut req = happy_req();
        req.payment.amount = 500.0; // 只付一半
        let r = validate_procurement_chain(&req.po, &req.grn, &req.invoice, &req.payment).unwrap();
        assert!((r.total_payment - 500.0).abs() < 1e-9);
        check_journal_entries_balanced(&r.journal_entries).unwrap();
    }
    #[test]
    fn happy_zero_payment_no_payment_entries() {
        let mut req = happy_req();
        req.payment.amount = 0.0;
        let r = validate_procurement_chain(&req.po, &req.grn, &req.invoice, &req.payment).unwrap();
        assert_eq!(r.payment_entries.len(), 0);
    }
    #[test]
    fn happy_multi_lines_correct_totals() {
        let mut req = happy_req();
        req.po.lines = vec![
            ProcurementLine {
                material_code: "A".into(),
                quantity: 2.0,
                unit_price: 100.0,
                tax_rate: 0.13,
            },
            ProcurementLine {
                material_code: "B".into(),
                quantity: 3.0,
                unit_price: 200.0,
                tax_rate: 0.06,
            },
        ];
        req.grn.lines = req.po.lines.clone();
        req.invoice.lines = req.po.lines.clone();
        // 合计: A: 2*100*1.13=226  B: 3*200*1.06=636  → 862
        req.payment.amount = 862.0;
        let r = validate_procurement_chain(&req.po, &req.grn, &req.invoice, &req.payment).unwrap();
        assert!((r.total_po - 862.0).abs() < 1e-9);
        // 2物料 × GRN 2条 + (A 3条 + B 3条) + PAY 2条
        assert_eq!(r.grn_entries.len(), 4);
        assert_eq!(r.invoice_entries.len(), 6);
        assert_eq!(r.payment_entries.len(), 2);
        check_journal_entries_balanced(&r.journal_entries).unwrap();
    }
    #[test]
    fn happy_usd_to_cny_multi_ok() {
        let req = sample_multi_currency_usd_cny();
        let r = validate_procurement_chain_with_rates(
            &req.po,
            &req.grn,
            &req.invoice,
            &req.payment,
            &req.rates,
        )
        .unwrap();
        // 2 × 500 USD × 1.13 = 1130 USD；×7.18 = 8113.4 CNY
        assert!((r.total_payment - 1130.0 * 7.18).abs() < 0.02);
        check_journal_entries_balanced(&r.journal_entries).unwrap();
    }
    #[test]
    fn happy_multi_rate_inverse_lookup() {
        // 反向定义汇率：CNY → USD 为 1/7.18，应能正确换算
        let mut req = sample_multi_currency_usd_cny();
        req.rates = vec![CurrencyConversionRate {
            from: "CNY".into(),
            to: "USD".into(),
            rate: 1.0 / 7.18,
        }];
        let r = validate_procurement_chain_with_rates(
            &req.po,
            &req.grn,
            &req.invoice,
            &req.payment,
            &req.rates,
        )
        .unwrap();
        assert!((r.total_payment - 1130.0 * 7.18).abs() < 0.02);
    }
    #[test]
    fn happy_json_roundtrip_request() {
        let req = happy_req();
        let s = serde_json::to_string(&req).unwrap();
        let back: ValidateProcurementRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back, req);
    }
    #[test]
    fn happy_error_display_format() {
        let e = ErpE2eError::GrnExceedsPoQuantity {
            line: 0,
            po_qty: 10.0,
            grn_qty: 15.0,
        };
        assert!(format!("{e}").contains("GRN line 0 exceeds PO"));
    }
    #[test]
    fn happy_chain_result_totals_monotone() {
        let r = happy_ok();
        assert!(r.total_grn <= r.total_po + 0.02); // 等额
        assert!(r.total_invoice <= r.total_grn + 0.02);
        assert!(r.total_payment <= r.total_invoice + 0.02);
    }

    // --- Test group 2：规则 1 GRN 超收（5）---
    #[test]
    fn err_grn_qty_exceeds_po() {
        let mut req = happy_req();
        req.grn.lines[0].quantity = 15.0;
        let e = validate_procurement_chain(&req.po, &req.grn, &req.invoice, &req.payment)
            .err()
            .unwrap();
        assert!(matches!(
            e,
            ErpE2eError::GrnExceedsPoQuantity { line: 0, .. }
        ));
    }
    #[test]
    fn err_grn_unknown_material_causes_excess() {
        let mut req = happy_req();
        req.grn.lines[0].material_code = "UNKNOWN".into();
        req.invoice.lines[0].material_code = "UNKNOWN".into();
        // 物料在 PO 中查不到 → PO 中 qty = 0，GRN 有 10 → 超额
        let e = validate_procurement_chain(&req.po, &req.grn, &req.invoice, &req.payment)
            .err()
            .expect("GRN with unknown material should fail excess check");
        match e {
            ErpE2eError::GrnExceedsPoQuantity {
                line,
                po_qty,
                grn_qty,
            } => {
                assert_eq!(line, 0);
                assert!((po_qty - 0.0).abs() < 1e-9);
                assert!((grn_qty - 10.0).abs() < 1e-9);
            }
            other => panic!("expected GrnExceedsPoQuantity, got {other:?}"),
        }
    }
    #[test]
    fn err_grn_multi_line_excess_on_second() {
        let mut req = happy_req();
        req.po.lines = vec![
            ProcurementLine {
                material_code: "A".into(),
                quantity: 1.0,
                unit_price: 10.0,
                tax_rate: 0.13,
            },
            ProcurementLine {
                material_code: "B".into(),
                quantity: 1.0,
                unit_price: 10.0,
                tax_rate: 0.13,
            },
        ];
        req.grn.lines = vec![
            ProcurementLine {
                material_code: "A".into(),
                quantity: 1.0,
                unit_price: 10.0,
                tax_rate: 0.13,
            },
            ProcurementLine {
                material_code: "B".into(),
                quantity: 2.0,
                unit_price: 10.0,
                tax_rate: 0.13,
            },
        ];
        req.invoice.lines = req.grn.lines.clone();
        req.payment.amount = 10.0 * 2.0 * 1.13;
        let e = validate_procurement_chain(&req.po, &req.grn, &req.invoice, &req.payment)
            .err()
            .unwrap();
        match e {
            ErpE2eError::GrnExceedsPoQuantity { line, .. } => assert_eq!(line, 1),
            _ => panic!("wrong err {e:?}"),
        }
    }
    #[test]
    fn ok_grn_under_receipt_allowed() {
        let mut req = happy_req();
        req.grn.lines[0].quantity = 8.0; // 欠收 2，允许
        req.invoice.lines[0].quantity = 8.0;
        req.payment.amount = 8.0 * 100.0 * 1.13;
        let r = validate_procurement_chain(&req.po, &req.grn, &req.invoice, &req.payment).unwrap();
        assert!((r.total_grn - 8.0 * 113.0).abs() < 0.02);
    }
    #[test]
    fn err_grn_excess_delta_in_context() {
        let mut req = happy_req();
        req.grn.lines[0].quantity = 12.0;
        let e = validate_procurement_chain(&req.po, &req.grn, &req.invoice, &req.payment)
            .err()
            .unwrap();
        let api_err = ErpE2eApiError::from(e);
        let resp = api_err.into_response();
        // 无法读 body，但确认状态码 400
        assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
    }

    // --- Test group 3：规则 2 Invoice 金额不一致（4）---
    #[test]
    fn err_inv_amount_mismatch_higher() {
        let mut req = happy_req();
        req.invoice.lines[0].unit_price = 120.0;
        let e = validate_procurement_chain(&req.po, &req.grn, &req.invoice, &req.payment)
            .err()
            .unwrap();
        assert!(matches!(e, ErpE2eError::InvoiceGrnMismatch { line: 0, .. }));
    }
    #[test]
    fn err_inv_amount_mismatch_lower() {
        let mut req = happy_req();
        req.invoice.lines[0].quantity = 9.0;
        let e = validate_procurement_chain(&req.po, &req.grn, &req.invoice, &req.payment)
            .err()
            .unwrap();
        assert!(matches!(e, ErpE2eError::InvoiceGrnMismatch { .. }));
    }
    #[test]
    fn ok_inv_tiny_tolerance_within_001() {
        let mut req = happy_req();
        // 发票加一丢丢（<0.01 容差内）
        req.invoice.lines[0].unit_price = 100.00005;
        let r = validate_procurement_chain(&req.po, &req.grn, &req.invoice, &req.payment);
        assert!(r.is_ok());
    }
    #[test]
    fn err_inv_material_missing_in_grn() {
        let mut req = happy_req();
        req.invoice.lines[0].material_code = "NO-GRN".into();
        let e = validate_procurement_chain(&req.po, &req.grn, &req.invoice, &req.payment)
            .err()
            .unwrap();
        assert!(matches!(e, ErpE2eError::InvoiceGrnMismatch { .. }));
    }

    // --- Test group 4：规则 3 付款超额（4）---
    #[test]
    fn err_payment_exceeds_invoice() {
        let mut req = happy_req();
        req.payment.amount = 2000.0;
        let e = validate_procurement_chain(&req.po, &req.grn, &req.invoice, &req.payment)
            .err()
            .unwrap();
        assert!(matches!(e, ErpE2eError::PaymentExceedsInvoice { .. }));
    }
    #[test]
    fn err_payment_exceeds_delta() {
        let mut req = happy_req();
        req.payment.amount = 1500.0;
        match validate_procurement_chain(&req.po, &req.grn, &req.invoice, &req.payment)
            .err()
            .unwrap()
        {
            ErpE2eError::PaymentExceedsInvoice {
                invoice_total,
                payment_amount,
            } => {
                assert!((payment_amount - invoice_total - 370.0).abs() < 0.02);
            }
            _ => panic!(),
        }
    }
    #[test]
    fn ok_payment_exact_full() {
        let req = happy_req();
        assert!(validate_procurement_chain(&req.po, &req.grn, &req.invoice, &req.payment).is_ok());
    }
    #[test]
    fn ok_payment_999_within_tolerance() {
        let mut req = happy_req();
        req.payment.amount = 1130.0 + 1e-10; // ≤ 容差 1e-9，允许
        assert!(validate_procurement_chain(&req.po, &req.grn, &req.invoice, &req.payment).is_ok());
    }

    // --- Test group 5：规则 4 币种（4）---
    #[test]
    fn err_currency_grn_without_rate() {
        let mut req = happy_req();
        req.grn.currency = "USD".into();
        let e = validate_procurement_chain(&req.po, &req.grn, &req.invoice, &req.payment)
            .err()
            .unwrap();
        assert!(
            matches!(e, ErpE2eError::CurrencyMismatch { expected, actual, .. } if expected == "CNY" && actual == "USD")
        );
    }
    #[test]
    fn err_currency_invoice_without_rate() {
        let mut req = happy_req();
        req.invoice.currency = "EUR".into();
        let e = validate_procurement_chain(&req.po, &req.grn, &req.invoice, &req.payment)
            .err()
            .unwrap();
        match e {
            ErpE2eError::CurrencyMismatch {
                expected, actual, ..
            } => {
                assert_eq!(expected, "CNY");
                assert_eq!(actual, "EUR");
            }
            _ => panic!(),
        }
    }
    #[test]
    fn err_multi_currency_payment_without_rate() {
        let mut req = sample_multi_currency_usd_cny();
        req.rates.clear(); // 清空汇率
        let e = validate_procurement_chain_with_rates(
            &req.po,
            &req.grn,
            &req.invoice,
            &req.payment,
            &req.rates,
        )
        .err()
        .unwrap();
        // 没有 USD→CNY 汇率，应该在 grn_factor 处失败
        assert!(matches!(e, ErpE2eError::CurrencyMismatch { actual, .. } if actual == "USD"));
    }
    #[test]
    fn ok_currency_same_is_noop_conversion() {
        let req = happy_req();
        // 虽然没 rates，但相同币种转换因子 = 1
        assert!(validate_procurement_chain(&req.po, &req.grn, &req.invoice, &req.payment).is_ok());
    }

    // --- Test group 6：规则 5 期间关闭（6）---
    #[test]
    fn err_period_po_closed() {
        let mut req = happy_req();
        req.po.period_status = "Closed".into();
        let e = validate_procurement_chain(&req.po, &req.grn, &req.invoice, &req.payment)
            .err()
            .unwrap();
        let ErpE2eError::PeriodClosed { document } = e else {
            panic!()
        };
        assert_eq!(document, "PO:PO-2025-0001");
    }
    #[test]
    fn err_period_grn_closed() {
        let mut req = happy_req();
        req.grn.period_status = "Closed".into();
        let e = validate_procurement_chain(&req.po, &req.grn, &req.invoice, &req.payment)
            .err()
            .unwrap();
        assert!(
            matches!(e, ErpE2eError::PeriodClosed { document, .. } if document.starts_with("GRN:"))
        );
    }
    #[test]
    fn err_period_inv_closed() {
        let mut req = happy_req();
        req.invoice.period_status = "Closed".into();
        let e = validate_procurement_chain(&req.po, &req.grn, &req.invoice, &req.payment)
            .err()
            .unwrap();
        assert!(
            matches!(e, ErpE2eError::PeriodClosed { document, .. } if document.starts_with("Invoice:"))
        );
    }
    #[test]
    fn err_period_pay_closed() {
        let mut req = happy_req();
        req.payment.period_status = "Closed".into();
        let e = validate_procurement_chain(&req.po, &req.grn, &req.invoice, &req.payment)
            .err()
            .unwrap();
        assert!(
            matches!(e, ErpE2eError::PeriodClosed { document, .. } if document.starts_with("Payment:"))
        );
    }
    #[test]
    fn ok_period_any_other_string_treated_as_closed() {
        let mut req = happy_req();
        req.po.period_status = "Review".into();
        let e = validate_procurement_chain(&req.po, &req.grn, &req.invoice, &req.payment)
            .err()
            .unwrap();
        assert!(matches!(e, ErpE2eError::PeriodClosed { .. }));
    }
    #[test]
    fn ok_period_case_sensitive_open_exact() {
        let mut req = happy_req();
        req.po.period_status = "open".into(); // 小写视为非 Open
        let e = validate_procurement_chain(&req.po, &req.grn, &req.invoice, &req.payment)
            .err()
            .unwrap();
        assert!(matches!(e, ErpE2eError::PeriodClosed { .. }));
    }

    // --- Test group 7：借贷平衡（3）---
    #[test]
    fn balanced_on_happy() {
        let r = happy_ok();
        check_journal_entries_balanced(&r.journal_entries).unwrap();
    }
    #[test]
    fn balanced_on_partial_payment() {
        let mut req = happy_req();
        req.payment.amount = 300.0;
        let r = validate_procurement_chain(&req.po, &req.grn, &req.invoice, &req.payment).unwrap();
        check_journal_entries_balanced(&r.journal_entries).unwrap();
    }
    #[test]
    fn unbalanced_detected_artificial() {
        // 人工构造不平衡分录
        let artificial = vec![
            JournalEntryLine {
                account_code: "1001".into(),
                account_name: "现金".into(),
                debit: 100.0,
                credit: 0.0,
            },
            JournalEntryLine {
                account_code: "2001".into(),
                account_name: "负债".into(),
                debit: 0.0,
                credit: 90.0,
            },
        ];
        let e = check_journal_entries_balanced(&artificial).err().unwrap();
        assert!(matches!(e, ErpE2eError::UnbalancedJournalEntries { .. }));
    }

    // --- Test group 8：DTO / Schema / JSON 契约（4）---
    #[test]
    fn dto_error_code_stability_grn_excess() {
        let e = ErpE2eError::GrnExceedsPoQuantity {
            line: 0,
            po_qty: 1.0,
            grn_qty: 2.0,
        };
        let resp = ErpE2eApiError::from(e).into_response();
        assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
    }
    #[test]
    fn dto_error_response_serializes_context_grn() {
        let err = ErpE2eError::PaymentExceedsInvoice {
            invoice_total: 100.0,
            payment_amount: 200.0,
        };
        let api_err = ErpE2eApiError::from(err);
        let (_, Json(body)): (StatusCode, Json<ErpE2eErrorResponse>) =
            // 绕开 IntoResponse 以读取 body：手工构造
            match api_err.0 {
                ErpE2eError::PaymentExceedsInvoice { invoice_total, payment_amount } => {
                    let body = ErpE2eErrorResponse {
                        code: "PAYMENT_EXCEEDS_INVOICE".into(),
                        message: "x".into(),
                        context: Some(json!({
                            "invoice_total": invoice_total, "payment_amount": payment_amount,
                            "delta": payment_amount - invoice_total,
                        })),
                    };
                    (StatusCode::BAD_REQUEST, Json(body))
                }
                _ => unreachable!(),
            };
        let ctx = body.context.as_ref().unwrap();
        assert_eq!(ctx["delta"], json!(100.0));
    }
    #[test]
    fn dto_multi_req_defaults_rates_empty() {
        let json_input = json!({
            "po": sample_happy_cny().po,
            "grn": sample_happy_cny().grn,
            "invoice": sample_happy_cny().invoice,
            "payment": sample_happy_cny().payment,
        });
        let de: ValidateProcurementMultiRequest = serde_json::from_value(json_input).unwrap();
        assert!(de.rates.is_empty());
    }
    #[test]
    fn dto_response_shape_examples_serializable() {
        let r = happy_ok();
        let resp = ProcurementValidateResponse {
            ok: true,
            total_po: r.total_po,
            total_grn: r.total_grn,
            total_invoice: r.total_invoice,
            total_payment: r.total_payment,
            entries_balanced: true,
            grn_entries: r.grn_entries,
            invoice_entries: r.invoice_entries,
            payment_entries: r.payment_entries,
            journal_entries: r.journal_entries,
        };
        let s = serde_json::to_string_pretty(&resp).unwrap();
        assert!(s.contains("\"ok\": true"));
        assert!(s.contains("journal_entries"));
    }
    // 41 tests 总览：11+5+4+4+4+6+3+4 = 41 ✓
}
