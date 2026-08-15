//! ERP 端到端采购链模拟器（纯函数，无 DB，无 async）。
//!
//! 模拟 PO → GRN → Invoice → Payment 采购链，生成日记账分录并校验业务规则。
//! 生成的分录可直接喂入 finance 模块的 `validate_post_entry`、`calculate_trial_balance`
//! 等纯函数，实现跨模块端到端集成测试。

use std::fmt;

// ===== 输入类型 =====

/// 采购行项目。
#[derive(Debug, Clone, PartialEq)]
pub struct ProcurementLine {
    pub material_code: String,
    pub quantity: f64,
    pub unit_price: f64,
    pub tax_rate: f64, // e.g. 0.13 for 13%
}

/// 采购订单。
#[derive(Debug, Clone, PartialEq)]
pub struct PurchaseOrder {
    pub po_no: String,
    pub currency: String,
    pub period_status: String, // "Open" | "Closed"
    pub lines: Vec<ProcurementLine>,
}

/// 收货单。
#[derive(Debug, Clone, PartialEq)]
pub struct GoodsReceiptNote {
    pub grn_no: String,
    pub po_no: String,
    pub currency: String,
    pub period_status: String,
    pub lines: Vec<ProcurementLine>,
}

/// 发票。
#[derive(Debug, Clone, PartialEq)]
pub struct Invoice {
    pub invoice_no: String,
    pub grn_no: String,
    pub currency: String,
    pub period_status: String,
    pub lines: Vec<ProcurementLine>,
}

/// 付款单。
#[derive(Debug, Clone, PartialEq)]
pub struct Payment {
    pub payment_no: String,
    pub invoice_no: String,
    pub currency: String,
    pub amount: f64,
    pub period_status: String,
}

/// 货币转换汇率（用于多币种采购链）。
#[derive(Debug, Clone, PartialEq)]
pub struct CurrencyConversionRate {
    pub from: String,
    pub to: String,
    pub rate: f64,
}

// ===== 错误类型 =====

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
                    "GRN line {} exceeds PO quantity: po_qty={}, grn_qty={}",
                    line, po_qty, grn_qty
                )
            }
            ErpE2eError::InvoiceGrnMismatch {
                line,
                grn_amount,
                invoice_amount,
            } => {
                write!(
                    f,
                    "invoice line {} amount mismatch: grn_amount={}, invoice_amount={}",
                    line, grn_amount, invoice_amount
                )
            }
            ErpE2eError::PaymentExceedsInvoice {
                invoice_total,
                payment_amount,
            } => {
                write!(
                    f,
                    "payment exceeds invoice: invoice_total={}, payment_amount={}",
                    invoice_total, payment_amount
                )
            }
            ErpE2eError::CurrencyMismatch { expected, actual } => {
                write!(
                    f,
                    "currency mismatch: expected {}, actual {}",
                    expected, actual
                )
            }
            ErpE2eError::PeriodClosed { document } => {
                write!(f, "period is closed for document {}", document)
            }
            ErpE2eError::UnbalancedJournalEntries { debit, credit } => {
                write!(
                    f,
                    "unbalanced journal entries: debit {} != credit {}",
                    debit, credit
                )
            }
        }
    }
}

impl std::error::Error for ErpE2eError {}

// ===== 结果类型 =====

/// 采购链校验结果。
#[derive(Debug, Clone, PartialEq)]
pub struct ProcurementChainResult {
    /// 所有日记账分录（GRN + Invoice + Payment 合并）。
    pub journal_entries: Vec<(String, String, f64, f64)>, // (account_code, account_name, debit, credit)
    /// GRN 生成的分录。
    pub grn_entries: Vec<(String, String, f64, f64)>,
    /// Invoice 生成的分录。
    pub invoice_entries: Vec<(String, String, f64, f64)>,
    /// Payment 生成的分录。
    pub payment_entries: Vec<(String, String, f64, f64)>,
    pub total_po: f64,
    pub total_grn: f64,
    pub total_invoice: f64,
    pub total_payment: f64,
}

// ===== 辅助函数 =====

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

/// 校验日记账分录借贷是否平衡（容差 0.01）。
pub fn check_journal_entries_balanced(
    entries: &[(String, String, f64, f64)],
) -> Result<(), ErpE2eError> {
    let total_debit: f64 = entries.iter().map(|(_, _, d, _)| *d).sum();
    let total_credit: f64 = entries.iter().map(|(_, _, _, c)| *c).sum();
    if (total_debit - total_credit).abs() > 0.01 + 1e-9 {
        return Err(ErpE2eError::UnbalancedJournalEntries {
            debit: total_debit,
            credit: total_credit,
        });
    }
    Ok(())
}

// ===== 校验函数 =====

/// 校验采购链（所有单据必须同币种）。
pub fn validate_procurement_chain(
    po: &PurchaseOrder,
    grn: &GoodsReceiptNote,
    invoice: &Invoice,
    payment: &Payment,
) -> Result<ProcurementChainResult, ErpE2eError> {
    validate_procurement_chain_with_rates(po, grn, invoice, payment, &[])
}

/// 校验采购链（支持多币种转换汇率）。
pub fn validate_procurement_chain_with_rates(
    po: &PurchaseOrder,
    grn: &GoodsReceiptNote,
    invoice: &Invoice,
    payment: &Payment,
    rates: &[CurrencyConversionRate],
) -> Result<ProcurementChainResult, ErpE2eError> {
    // 规则5：所有单据必须在 "Open" 期间。
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

    // 规则4：币种校验（含转换汇率）。
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

    // 规则1：GRN 行数量 ≤ PO 行数量（按 material_code 匹配，拒绝超收）。
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

    // 规则2：发票行金额匹配 GRN（价税分离，容差 ≤0.01）。
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

    // 计算总额（转换为基准币种）。
    let total_po: f64 = po.lines.iter().map(|l| line_gross(l)).sum();
    let total_grn: f64 = grn.lines.iter().map(|l| line_gross(l) * grn_factor).sum();
    let total_invoice: f64 = invoice
        .lines
        .iter()
        .map(|l| line_gross(l) * invoice_factor)
        .sum();
    let total_payment: f64 = payment.amount * payment_factor;

    // 规则3：付款金额 ≤ 发票总额（部分付款 OK，但总额 ≤ 未付余额）。
    if total_payment > total_invoice + 1e-9 {
        return Err(ErpE2eError::PaymentExceedsInvoice {
            invoice_total: total_invoice,
            payment_amount: total_payment,
        });
    }

    // 规则6：生成日记账分录。
    // GRN: 借 库存商品, 贷 应付暂估
    let mut grn_entries: Vec<(String, String, f64, f64)> = Vec::new();
    for line in &grn.lines {
        let net = round2(line_net(line) * grn_factor);
        grn_entries.push(("1401".to_string(), "库存商品".to_string(), net, 0.0));
        grn_entries.push(("2202".to_string(), "应付暂估".to_string(), 0.0, net));
    }

    // Invoice: 借 应付暂估(冲销GRN), 借 进项税, 贷 应付账款
    let mut invoice_entries: Vec<(String, String, f64, f64)> = Vec::new();
    for line in &invoice.lines {
        let net = round2(line_net(line) * invoice_factor);
        let tax = round2(line_tax(line) * invoice_factor);
        let gross = round2(net + tax);
        invoice_entries.push(("2202".to_string(), "应付暂估".to_string(), net, 0.0));
        if tax > 1e-9 {
            invoice_entries.push((
                "2221".to_string(),
                "应交税费-进项税额".to_string(),
                tax,
                0.0,
            ));
        }
        invoice_entries.push(("2201".to_string(), "应付账款".to_string(), 0.0, gross));
    }

    // Payment: 借 应付账款, 贷 银行存款
    let mut payment_entries: Vec<(String, String, f64, f64)> = Vec::new();
    let pay_amt = round2(total_payment);
    if pay_amt > 1e-9 {
        payment_entries.push(("2201".to_string(), "应付账款".to_string(), pay_amt, 0.0));
        payment_entries.push(("1002".to_string(), "银行存款".to_string(), 0.0, pay_amt));
    }

    let mut journal_entries: Vec<(String, String, f64, f64)> = Vec::new();
    journal_entries.extend(grn_entries.clone());
    journal_entries.extend(invoice_entries.clone());
    journal_entries.extend(payment_entries.clone());

    // 校验生成的分录借贷平衡。
    check_journal_entries_balanced(&journal_entries)?;

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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{JournalEntry, PeriodStatus, VoucherStatus};
    use chrono::Utc;
    use rust_decimal::Decimal;
    use std::str::FromStr;

    use super::super::periods::{validate_children_all_closed, PeriodValidationError};
    use super::super::reversal::{
        validate_reverse_voucher, ReverseJournalEntry, ReversePeriodInput, ReverseableVoucherInput,
    };
    use super::super::trial_balance::{
        calculate_trial_balance, validate_period_close_with_trial_balance,
    };
    use super::super::voucher::{
        validate_post_entry, PostJournalEntry, PostPeriodInput, PostVoucherInput,
    };
    use super::super::year_end::{
        validate_consolidation, validate_year_end_close, ConsolidationConversionRate,
        ConsolidationEntityInput, YearEndAccountSummary, YearEndAccountType, YearEndPeriodInput,
        YearEndVoucherSummary,
    };

    // ===== 测试辅助函数 =====

    fn pl(code: &str, qty: f64, price: f64, tax: f64) -> ProcurementLine {
        ProcurementLine {
            material_code: code.to_string(),
            quantity: qty,
            unit_price: price,
            tax_rate: tax,
        }
    }

    fn po(po_no: &str, currency: &str, lines: Vec<ProcurementLine>) -> PurchaseOrder {
        PurchaseOrder {
            po_no: po_no.to_string(),
            currency: currency.to_string(),
            period_status: "Open".to_string(),
            lines,
        }
    }

    fn grn(
        grn_no: &str,
        po_no: &str,
        currency: &str,
        lines: Vec<ProcurementLine>,
    ) -> GoodsReceiptNote {
        GoodsReceiptNote {
            grn_no: grn_no.to_string(),
            po_no: po_no.to_string(),
            currency: currency.to_string(),
            period_status: "Open".to_string(),
            lines,
        }
    }

    fn inv(invoice_no: &str, grn_no: &str, currency: &str, lines: Vec<ProcurementLine>) -> Invoice {
        Invoice {
            invoice_no: invoice_no.to_string(),
            grn_no: grn_no.to_string(),
            currency: currency.to_string(),
            period_status: "Open".to_string(),
            lines,
        }
    }

    fn pay(payment_no: &str, invoice_no: &str, currency: &str, amount: f64) -> Payment {
        Payment {
            payment_no: payment_no.to_string(),
            invoice_no: invoice_no.to_string(),
            currency: currency.to_string(),
            amount,
            period_status: "Open".to_string(),
        }
    }

    fn rate(from: &str, to: &str, r: f64) -> CurrencyConversionRate {
        CurrencyConversionRate {
            from: from.to_string(),
            to: to.to_string(),
            rate: r,
        }
    }

    /// 构造一条全对齐的采购链：1 行, qty=10, price=100, tax=13%, 全额付款。
    fn aligned_chain() -> (PurchaseOrder, GoodsReceiptNote, Invoice, Payment) {
        let line = pl("M001", 10.0, 100.0, 0.13);
        (
            po("PO001", "CNY", vec![line.clone()]),
            grn("GRN001", "PO001", "CNY", vec![line.clone()]),
            inv("INV001", "GRN001", "CNY", vec![line.clone()]),
            pay("PAY001", "INV001", "CNY", 1130.0),
        )
    }

    fn f64_to_decimal(v: f64) -> Decimal {
        Decimal::from_str(&format!("{:.2}", v)).unwrap_or(Decimal::ZERO)
    }

    fn entries_to_journal(entries: &[(String, String, f64, f64)]) -> Vec<JournalEntry> {
        entries
            .iter()
            .map(|(code, name, debit, credit)| JournalEntry {
                voucher_no: "记2026080001".to_string(),
                voucher_date: Utc::now(),
                account_code: code.clone(),
                account_name: name.clone(),
                description: None,
                debit: f64_to_decimal(*debit),
                credit: f64_to_decimal(*credit),
            })
            .collect()
    }

    fn entries_to_post_voucher(entries: &[(String, String, f64, f64)]) -> PostVoucherInput {
        PostVoucherInput {
            status: VoucherStatus::Approved,
            period_id: "202608".to_string(),
            entries: entries
                .iter()
                .map(|(code, name, debit, credit)| PostJournalEntry {
                    voucher_no: "记2026080001".to_string(),
                    voucher_date: Utc::now(),
                    account_code: code.clone(),
                    account_name: name.clone(),
                    description: None,
                    debit: f64_to_decimal(*debit),
                    credit: f64_to_decimal(*credit),
                })
                .collect(),
        }
    }

    fn open_period() -> PostPeriodInput {
        PostPeriodInput {
            id: "202608".to_string(),
            status: PeriodStatus::Open,
        }
    }

    // =================================================================
    // 规则测试：GrnExceedsPoQuantity (6 tests)
    // =================================================================

    #[test]
    fn test_erp_grn_exceeds_po_by_1() {
        let (po, mut grn, inv, pay) = aligned_chain();
        grn.lines[0].quantity = 11.0; // PO=10, GRN=11
        let r = validate_procurement_chain(&po, &grn, &inv, &pay);
        assert!(r.is_err());
        let e = r.unwrap_err();
        assert!(matches!(
            e,
            ErpE2eError::GrnExceedsPoQuantity {
                line: 0,
                po_qty: 10.0,
                grn_qty: 11.0
            }
        ));
        assert!(format!("{}", e).contains("exceeds PO quantity"));
    }

    #[test]
    fn test_erp_grn_exceeds_po_by_100_percent() {
        let (po, mut grn, inv, pay) = aligned_chain();
        grn.lines[0].quantity = 20.0; // PO=10, GRN=20 (100% over)
        let r = validate_procurement_chain(&po, &grn, &inv, &pay);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ErpE2eError::GrnExceedsPoQuantity {
                po_qty: 10.0,
                grn_qty: 20.0,
                ..
            }
        ));
    }

    #[test]
    fn test_erp_grn_partial_over_receipt_one_line() {
        // 多行 PO，第二行超收
        let l1 = pl("M001", 10.0, 100.0, 0.13);
        let l2 = pl("M002", 5.0, 50.0, 0.13);
        let po = po("PO001", "CNY", vec![l1.clone(), l2.clone()]);
        let grn = grn(
            "GRN001",
            "PO001",
            "CNY",
            vec![l1, pl("M002", 8.0, 50.0, 0.13)],
        );
        let inv = inv(
            "INV001",
            "GRN001",
            "CNY",
            vec![pl("M001", 10.0, 100.0, 0.13), pl("M002", 8.0, 50.0, 0.13)],
        );
        let pay = pay("PAY001", "INV001", "CNY", 9999.0);
        let r = validate_procurement_chain(&po, &grn, &inv, &pay);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ErpE2eError::GrnExceedsPoQuantity {
                line: 1,
                po_qty: 5.0,
                grn_qty: 8.0
            }
        ));
    }

    #[test]
    fn test_erp_grn_exceeds_po_second_line() {
        let l1 = pl("M001", 10.0, 100.0, 0.13);
        let l2 = pl("M002", 5.0, 50.0, 0.13);
        let po = po("PO001", "CNY", vec![l1.clone(), l2.clone()]);
        let grn = grn(
            "GRN001",
            "PO001",
            "CNY",
            vec![l1, pl("M002", 6.0, 50.0, 0.13)],
        );
        let inv = inv("INV001", "GRN001", "CNY", vec![]);
        let pay = pay("PAY001", "INV001", "CNY", 0.0);
        let r = validate_procurement_chain(&po, &grn, &inv, &pay);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ErpE2eError::GrnExceedsPoQuantity { line: 1, .. }
        ));
    }

    #[test]
    fn test_erp_grn_exceeds_po_all_lines() {
        let l1 = pl("M001", 10.0, 100.0, 0.13);
        let l2 = pl("M002", 5.0, 50.0, 0.13);
        let po = po("PO001", "CNY", vec![l1.clone(), l2.clone()]);
        let grn = grn(
            "GRN001",
            "PO001",
            "CNY",
            vec![pl("M001", 15.0, 100.0, 0.13), pl("M002", 10.0, 50.0, 0.13)],
        );
        let inv = inv("INV001", "GRN001", "CNY", vec![]);
        let pay = pay("PAY001", "INV001", "CNY", 0.0);
        let r = validate_procurement_chain(&po, &grn, &inv, &pay);
        assert!(r.is_err());
        // 第一行就超收
        assert!(matches!(
            r.unwrap_err(),
            ErpE2eError::GrnExceedsPoQuantity { line: 0, .. }
        ));
    }

    #[test]
    fn test_erp_grn_exceeds_po_large_amount() {
        let (po, mut grn, inv, pay) = aligned_chain();
        grn.lines[0].quantity = 10000.0; // PO=10, GRN=10000
        let r = validate_procurement_chain(&po, &grn, &inv, &pay);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ErpE2eError::GrnExceedsPoQuantity {
                po_qty: 10.0,
                grn_qty: 10000.0,
                ..
            }
        ));
    }

    // =================================================================
    // 规则测试：InvoiceGrnMismatch (6 tests)
    // =================================================================

    #[test]
    fn test_erp_invoice_grn_mismatch_price_diff() {
        let (po, grn, mut inv, pay) = aligned_chain();
        inv.lines[0].unit_price = 110.0; // 价格不同
        let r = validate_procurement_chain(&po, &grn, &inv, &pay);
        assert!(r.is_err());
        let e = r.unwrap_err();
        assert!(matches!(e, ErpE2eError::InvoiceGrnMismatch { line: 0, .. }));
        assert!(format!("{}", e).contains("mismatch"));
    }

    #[test]
    fn test_erp_invoice_grn_mismatch_qty_diff() {
        let (po, mut grn, mut inv, pay) = aligned_chain();
        grn.lines[0].quantity = 10.0;
        inv.lines[0].quantity = 9.0; // 数量不同
                                     // GRN qty=10 ≤ PO qty=10 OK, but invoice qty=9 → amount mismatch
        let r = validate_procurement_chain(&po, &grn, &inv, &pay);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ErpE2eError::InvoiceGrnMismatch { line: 0, .. }
        ));
    }

    #[test]
    fn test_erp_invoice_grn_mismatch_tax_rate_diff() {
        let (po, grn, mut inv, pay) = aligned_chain();
        inv.lines[0].tax_rate = 0.17; // 税率不同
        let r = validate_procurement_chain(&po, &grn, &inv, &pay);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ErpE2eError::InvoiceGrnMismatch { line: 0, .. }
        ));
    }

    #[test]
    fn test_erp_invoice_grn_mismatch_just_over_0_01() {
        // 用 tax=0, qty=1, price: GRN=113.0, INV=113.02 → 差 0.02 > 0.01
        let l_grn = pl("M001", 1.0, 113.0, 0.0);
        let l_inv = pl("M001", 1.0, 113.02, 0.0);
        let po = po("PO001", "CNY", vec![l_grn.clone()]);
        let grn = grn("GRN001", "PO001", "CNY", vec![l_grn]);
        let inv = inv("INV001", "GRN001", "CNY", vec![l_inv]);
        let pay = pay("PAY001", "INV001", "CNY", 113.02);
        let r = validate_procurement_chain(&po, &grn, &inv, &pay);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ErpE2eError::InvoiceGrnMismatch {
                line: 0,
                grn_amount: 113.0,
                invoice_amount: 113.02
            }
        ));
    }

    #[test]
    fn test_erp_invoice_grn_mismatch_second_line() {
        let l1 = pl("M001", 10.0, 100.0, 0.13);
        let l2 = pl("M002", 5.0, 50.0, 0.13);
        let po = po("PO001", "CNY", vec![l1.clone(), l2.clone()]);
        let grn = grn("GRN001", "PO001", "CNY", vec![l1.clone(), l2.clone()]);
        let inv = inv(
            "INV001",
            "GRN001",
            "CNY",
            vec![l1, pl("M002", 5.0, 60.0, 0.13)], // 第二行价格不同
        );
        let pay = pay("PAY001", "INV001", "CNY", 9999.0);
        let r = validate_procurement_chain(&po, &grn, &inv, &pay);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ErpE2eError::InvoiceGrnMismatch { line: 1, .. }
        ));
    }

    #[test]
    fn test_erp_invoice_grn_mismatch_all_lines() {
        let l1 = pl("M001", 10.0, 100.0, 0.13);
        let l2 = pl("M002", 5.0, 50.0, 0.13);
        let po = po("PO001", "CNY", vec![l1.clone(), l2.clone()]);
        let grn = grn("GRN001", "PO001", "CNY", vec![l1.clone(), l2.clone()]);
        let inv = inv(
            "INV001",
            "GRN001",
            "CNY",
            vec![pl("M001", 10.0, 200.0, 0.13), pl("M002", 5.0, 100.0, 0.13)],
        );
        let pay = pay("PAY001", "INV001", "CNY", 9999.0);
        let r = validate_procurement_chain(&po, &grn, &inv, &pay);
        assert!(r.is_err());
        // 第一行就 mismatch
        assert!(matches!(
            r.unwrap_err(),
            ErpE2eError::InvoiceGrnMismatch { line: 0, .. }
        ));
    }

    // =================================================================
    // 规则测试：PaymentExceedsInvoice (4 tests)
    // =================================================================

    #[test]
    fn test_erp_payment_exceeds_invoice_by_0_01() {
        let (po, grn, inv, mut pay) = aligned_chain();
        // invoice total = 1130.0
        pay.amount = 1130.01;
        let r = validate_procurement_chain(&po, &grn, &inv, &pay);
        assert!(r.is_err());
        let e = r.unwrap_err();
        assert!(matches!(
            e,
            ErpE2eError::PaymentExceedsInvoice {
                invoice_total: 1130.0,
                payment_amount: 1130.01
            }
        ));
        assert!(format!("{}", e).contains("exceeds invoice"));
    }

    #[test]
    fn test_erp_payment_exceeds_invoice_by_100_percent() {
        let (po, grn, inv, mut pay) = aligned_chain();
        pay.amount = 2260.0; // 2x invoice
        let r = validate_procurement_chain(&po, &grn, &inv, &pay);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ErpE2eError::PaymentExceedsInvoice {
                invoice_total: 1130.0,
                payment_amount: 2260.0
            }
        ));
    }

    #[test]
    fn test_erp_payment_exceeds_invoice_half() {
        let (po, grn, inv, mut pay) = aligned_chain();
        pay.amount = 1700.0; // 1130 + 570
        let r = validate_procurement_chain(&po, &grn, &inv, &pay);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ErpE2eError::PaymentExceedsInvoice {
                invoice_total: 1130.0,
                payment_amount: 1700.0
            }
        ));
    }

    #[test]
    fn test_erp_payment_exceeds_invoice_large() {
        let (po, grn, inv, mut pay) = aligned_chain();
        pay.amount = 1000000.0;
        let r = validate_procurement_chain(&po, &grn, &inv, &pay);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ErpE2eError::PaymentExceedsInvoice {
                invoice_total: 1130.0,
                payment_amount: 1000000.0
            }
        ));
    }

    // =================================================================
    // 规则测试：CurrencyMismatch (5 tests)
    // =================================================================

    #[test]
    fn test_erp_currency_mismatch_all_different() {
        let line = pl("M001", 10.0, 100.0, 0.13);
        let po = po("PO001", "CNY", vec![line.clone()]);
        let grn = grn("GRN001", "PO001", "USD", vec![line.clone()]);
        let inv = inv("INV001", "GRN001", "EUR", vec![line.clone()]);
        let pay = pay("PAY001", "INV001", "JPY", 1130.0);
        let r = validate_procurement_chain(&po, &grn, &inv, &pay);
        assert!(r.is_err());
        let e = r.unwrap_err();
        assert!(matches!(
            e,
            ErpE2eError::CurrencyMismatch {
                ref expected,
                ref actual
            } if expected == "CNY" && actual == "USD"
        ));
        assert!(format!("{}", e).contains("currency mismatch"));
    }

    #[test]
    fn test_erp_currency_mismatch_grn_different() {
        let line = pl("M001", 10.0, 100.0, 0.13);
        let po = po("PO001", "CNY", vec![line.clone()]);
        let grn = grn("GRN001", "PO001", "USD", vec![line.clone()]);
        let inv = inv("INV001", "GRN001", "CNY", vec![line.clone()]);
        let pay = pay("PAY001", "INV001", "CNY", 1130.0);
        let r = validate_procurement_chain(&po, &grn, &inv, &pay);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ErpE2eError::CurrencyMismatch {
                ref expected,
                ref actual
            } if expected == "CNY" && actual == "USD"
        ));
    }

    #[test]
    fn test_erp_currency_mismatch_invoice_different() {
        let line = pl("M001", 10.0, 100.0, 0.13);
        let po = po("PO001", "CNY", vec![line.clone()]);
        let grn = grn("GRN001", "PO001", "CNY", vec![line.clone()]);
        let inv = inv("INV001", "GRN001", "EUR", vec![line.clone()]);
        let pay = pay("PAY001", "INV001", "CNY", 1130.0);
        let r = validate_procurement_chain(&po, &grn, &inv, &pay);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ErpE2eError::CurrencyMismatch {
                ref expected,
                ref actual
            } if expected == "CNY" && actual == "EUR"
        ));
    }

    #[test]
    fn test_erp_currency_mismatch_payment_different() {
        let line = pl("M001", 10.0, 100.0, 0.13);
        let po = po("PO001", "CNY", vec![line.clone()]);
        let grn = grn("GRN001", "PO001", "CNY", vec![line.clone()]);
        let inv = inv("INV001", "GRN001", "CNY", vec![line.clone()]);
        let pay = pay("PAY001", "INV001", "GBP", 1130.0);
        let r = validate_procurement_chain(&po, &grn, &inv, &pay);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ErpE2eError::CurrencyMismatch {
                ref expected,
                ref actual
            } if expected == "CNY" && actual == "GBP"
        ));
    }

    #[test]
    fn test_erp_currency_mismatch_missing_rate_wrong_pair() {
        let line = pl("M001", 10.0, 100.0, 0.13);
        let po = po("PO001", "CNY", vec![line.clone()]);
        let grn = grn("GRN001", "PO001", "USD", vec![line.clone()]);
        let inv = inv("INV001", "GRN001", "CNY", vec![line.clone()]);
        let pay = pay("PAY001", "INV001", "CNY", 1130.0);
        // 提供了汇率但币种对不匹配
        let rates = vec![rate("EUR", "CNY", 8.0)];
        let r = validate_procurement_chain_with_rates(&po, &grn, &inv, &pay, &rates);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ErpE2eError::CurrencyMismatch {
                ref expected,
                ref actual
            } if expected == "CNY" && actual == "USD"
        ));
    }

    // =================================================================
    // 规则测试：PeriodClosed (4 tests)
    // =================================================================

    #[test]
    fn test_erp_period_closed_po() {
        let (mut po, grn, inv, pay) = aligned_chain();
        po.period_status = "Closed".to_string();
        let r = validate_procurement_chain(&po, &grn, &inv, &pay);
        assert!(r.is_err());
        let e = r.unwrap_err();
        assert!(matches!(
            e,
            ErpE2eError::PeriodClosed { ref document } if document.contains("PO:PO001")
        ));
        assert!(format!("{}", e).contains("closed"));
    }

    #[test]
    fn test_erp_period_closed_grn() {
        let (po, mut grn, inv, pay) = aligned_chain();
        grn.period_status = "Closed".to_string();
        let r = validate_procurement_chain(&po, &grn, &inv, &pay);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ErpE2eError::PeriodClosed { ref document } if document.contains("GRN:GRN001")
        ));
    }

    #[test]
    fn test_erp_period_closed_invoice() {
        let (po, grn, mut inv, pay) = aligned_chain();
        inv.period_status = "Closed".to_string();
        let r = validate_procurement_chain(&po, &grn, &inv, &pay);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ErpE2eError::PeriodClosed { ref document } if document.contains("Invoice:INV001")
        ));
    }

    #[test]
    fn test_erp_period_closed_payment() {
        let (po, grn, inv, mut pay) = aligned_chain();
        pay.period_status = "Closed".to_string();
        let r = validate_procurement_chain(&po, &grn, &inv, &pay);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ErpE2eError::PeriodClosed { ref document } if document.contains("Payment:PAY001")
        ));
    }

    // =================================================================
    // 规则测试：UnbalancedJournalEntries (5 tests)
    // =================================================================

    #[test]
    fn test_erp_unbalanced_debit_greater() {
        let entries = vec![
            ("1001".to_string(), "现金".to_string(), 1000.0, 0.0),
            ("2001".to_string(), "应付".to_string(), 0.0, 900.0),
        ];
        let r = check_journal_entries_balanced(&entries);
        assert!(r.is_err());
        let e = r.unwrap_err();
        assert!(matches!(
            e,
            ErpE2eError::UnbalancedJournalEntries {
                debit: 1000.0,
                credit: 900.0
            }
        ));
        assert!(format!("{}", e).contains("unbalanced"));
    }

    #[test]
    fn test_erp_unbalanced_credit_greater() {
        let entries = vec![
            ("1001".to_string(), "现金".to_string(), 800.0, 0.0),
            ("2001".to_string(), "应付".to_string(), 0.0, 1200.0),
        ];
        let r = check_journal_entries_balanced(&entries);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ErpE2eError::UnbalancedJournalEntries {
                debit: 800.0,
                credit: 1200.0
            }
        ));
    }

    #[test]
    fn test_erp_unbalanced_single_entry() {
        let entries = vec![("1001".to_string(), "现金".to_string(), 500.0, 0.0)];
        let r = check_journal_entries_balanced(&entries);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ErpE2eError::UnbalancedJournalEntries {
                debit: 500.0,
                credit: 0.0
            }
        ));
    }

    #[test]
    fn test_erp_unbalanced_multi_line() {
        let entries = vec![
            ("1001".to_string(), "现金".to_string(), 100.0, 0.0),
            ("1002".to_string(), "银行".to_string(), 200.0, 0.0),
            ("2001".to_string(), "应付".to_string(), 0.0, 250.0),
        ];
        let r = check_journal_entries_balanced(&entries);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ErpE2eError::UnbalancedJournalEntries {
                debit: 300.0,
                credit: 250.0
            }
        ));
    }

    #[test]
    fn test_erp_unbalanced_three_entries() {
        let entries = vec![
            ("1001".to_string(), "现金".to_string(), 100.0, 0.0),
            ("1002".to_string(), "银行".to_string(), 200.0, 0.0),
            ("2001".to_string(), "应付".to_string(), 0.0, 550.0),
        ];
        let r = check_journal_entries_balanced(&entries);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ErpE2eError::UnbalancedJournalEntries {
                debit: 300.0,
                credit: 550.0
            }
        ));
    }

    // =================================================================
    // Happy Path 测试 (6 tests)
    // =================================================================

    #[test]
    fn test_erp_happy_simple_1line_full_chain() {
        let (po, grn, inv, pay) = aligned_chain();
        let r = validate_procurement_chain(&po, &grn, &inv, &pay);
        assert!(r.is_ok(), "全对齐 1 行采购链应通过");
        let result = r.unwrap();
        assert_eq!(result.total_po, 1130.0);
        assert_eq!(result.total_grn, 1130.0);
        assert_eq!(result.total_invoice, 1130.0);
        assert_eq!(result.total_payment, 1130.0);
        // GRN: 2 entries (debit inventory, credit accrued)
        assert_eq!(result.grn_entries.len(), 2);
        // Invoice: 3 entries (debit accrued, debit tax, credit AP)
        assert_eq!(result.invoice_entries.len(), 3);
        // Payment: 2 entries (debit AP, credit bank)
        assert_eq!(result.payment_entries.len(), 2);
    }

    #[test]
    fn test_erp_happy_multiline_partial_grn_full_invoice_partial_payment() {
        let l1 = pl("M001", 10.0, 100.0, 0.13);
        let l2 = pl("M002", 5.0, 50.0, 0.13);
        let l3 = pl("M003", 20.0, 30.0, 0.13);
        let po = po("PO001", "CNY", vec![l1.clone(), l2.clone(), l3.clone()]);
        // 部分收货：只收 M001 和 M002
        let grn = grn("GRN001", "PO001", "CNY", vec![l1.clone(), l2.clone()]);
        // 全额发票（匹配 GRN 的两行）
        let inv = inv("INV001", "GRN001", "CNY", vec![l1, l2]);
        // total_invoice = (10*100*1.13) + (5*50*1.13) = 1130 + 282.5 = 1412.5
        let pay = pay("PAY001", "INV001", "CNY", 700.0); // 部分付款
        let r = validate_procurement_chain(&po, &grn, &inv, &pay);
        assert!(r.is_ok(), "多行部分收货+全额发票+部分付款应通过");
        let result = r.unwrap();
        assert_eq!(result.total_grn, 1412.5);
        assert_eq!(result.total_invoice, 1412.5);
        assert_eq!(result.total_payment, 700.0);
    }

    #[test]
    fn test_erp_happy_multiline_different_tax_rates() {
        let l1 = pl("M001", 10.0, 100.0, 0.13); // gross = 1130
        let l2 = pl("M002", 10.0, 100.0, 0.06); // gross = 1060
        let l3 = pl("M003", 10.0, 100.0, 0.00); // gross = 1000
        let po = po("PO001", "CNY", vec![l1.clone(), l2.clone(), l3.clone()]);
        let grn = grn(
            "GRN001",
            "PO001",
            "CNY",
            vec![l1.clone(), l2.clone(), l3.clone()],
        );
        let inv = inv("INV001", "GRN001", "CNY", vec![l1, l2, l3]);
        // total = 1130 + 1060 + 1000 = 3190
        let pay = pay("PAY001", "INV001", "CNY", 3190.0);
        let r = validate_procurement_chain(&po, &grn, &inv, &pay);
        assert!(r.is_ok(), "不同税率多行应通过");
        let result = r.unwrap();
        assert_eq!(result.total_po, 3190.0);
        assert_eq!(result.total_grn, 3190.0);
        assert_eq!(result.total_invoice, 3190.0);
        assert_eq!(result.total_payment, 3190.0);
    }

    #[test]
    fn test_erp_happy_0_01_tolerance_boundary() {
        // 发票与 GRN 差额恰好 0.01 → 在容差内 → 通过
        let l_grn = pl("M001", 1.0, 113.0, 0.0); // gross = 113.0
        let l_inv = pl("M001", 1.0, 113.01, 0.0); // gross = 113.01, diff = 0.01
        let po = po("PO001", "CNY", vec![l_grn.clone()]);
        let grn = grn("GRN001", "PO001", "CNY", vec![l_grn]);
        let inv = inv("INV001", "GRN001", "CNY", vec![l_inv]);
        let pay = pay("PAY001", "INV001", "CNY", 113.0); // ≤ 113.01 OK
        let r = validate_procurement_chain(&po, &grn, &inv, &pay);
        assert!(r.is_ok(), "差额 0.01 在容差内应通过");
        let result = r.unwrap();
        assert_eq!(result.total_grn, 113.0);
        assert_eq!(result.total_invoice, 113.01);
    }

    #[test]
    fn test_erp_happy_multicurrency_with_rate() {
        // PO 在 CNY, GRN/Invoice/Payment 在 USD, 汇率 USD→CNY = 2
        let l_po = pl("M001", 10.0, 100.0, 0.13); // CNY gross = 1130
        let l_grn = pl("M001", 10.0, 50.0, 0.13); // USD gross = 565, converted = 1130
        let po = po("PO001", "CNY", vec![l_po]);
        let grn = grn("GRN001", "PO001", "USD", vec![l_grn.clone()]);
        let inv = inv("INV001", "GRN001", "USD", vec![l_grn]);
        let pay = pay("PAY001", "INV001", "USD", 565.0); // converted = 1130
        let rates = vec![rate("USD", "CNY", 2.0)];
        let r = validate_procurement_chain_with_rates(&po, &grn, &inv, &pay, &rates);
        assert!(r.is_ok(), "多币种带汇率应通过");
        let result = r.unwrap();
        assert_eq!(result.total_po, 1130.0);
        assert_eq!(result.total_grn, 1130.0);
        assert_eq!(result.total_invoice, 1130.0);
        assert_eq!(result.total_payment, 1130.0);
    }

    #[test]
    fn test_erp_happy_payment_exact_invoice_total() {
        let (po, grn, inv, pay) = aligned_chain();
        // payment = 1130.0 = invoice total exactly
        let r = validate_procurement_chain(&po, &grn, &inv, &pay);
        assert!(r.is_ok(), "付款恰好等于发票总额应通过");
        let result = r.unwrap();
        assert_eq!(result.total_payment, result.total_invoice);
    }

    // =================================================================
    // Finance 模块集成测试 (10 tests)
    // =================================================================

    #[test]
    fn test_erp_integration_journal_entries_pass_post_validation() {
        // 采购链生成的分录 → 喂入 validate_post_entry → OK
        let (po, grn, inv, pay) = aligned_chain();
        let result = validate_procurement_chain(&po, &grn, &inv, &pay).unwrap();

        // GRN 分录过账
        let grn_voucher = entries_to_post_voucher(&result.grn_entries);
        let p = open_period();
        assert!(
            validate_post_entry(&grn_voucher, &p).is_ok(),
            "GRN 分录应通过过账校验"
        );

        // Invoice 分录过账
        let inv_voucher = entries_to_post_voucher(&result.invoice_entries);
        assert!(
            validate_post_entry(&inv_voucher, &p).is_ok(),
            "Invoice 分录应通过过账校验"
        );

        // Payment 分录过账
        let pay_voucher = entries_to_post_voucher(&result.payment_entries);
        assert!(
            validate_post_entry(&pay_voucher, &p).is_ok(),
            "Payment 分录应通过过账校验"
        );
    }

    #[test]
    fn test_erp_integration_trial_balance_balanced() {
        // 汇总所有分录 → calculate_trial_balance → 平衡
        let (po, grn, inv, pay) = aligned_chain();
        let result = validate_procurement_chain(&po, &grn, &inv, &pay).unwrap();

        let j_entries = entries_to_journal(&result.journal_entries);
        let tb = calculate_trial_balance(&j_entries);
        assert!(tb.is_balanced, "采购链全部分录汇总后试算应平衡");
        assert_eq!(tb.total_debits, tb.total_credits);
    }

    #[test]
    fn test_erp_integration_period_close_ok() {
        // 过账后期间结账校验 → OK（期间开放且试算平衡）
        let (po, grn, inv, pay) = aligned_chain();
        let result = validate_procurement_chain(&po, &grn, &inv, &pay).unwrap();

        let j_entries = entries_to_journal(&result.journal_entries);
        let tb = calculate_trial_balance(&j_entries);
        assert!(tb.is_balanced);

        let close_r = validate_period_close_with_trial_balance(&tb);
        assert!(close_r.is_ok(), "试算平衡应允许结账");
    }

    #[test]
    fn test_erp_integration_period_close_blocked_pending_vouchers() {
        // 过账后尝试关闭期间，但存在 Draft 待处理凭证 → 被阻止
        let (po, grn, inv, pay) = aligned_chain();
        let result = validate_procurement_chain(&po, &grn, &inv, &pay).unwrap();

        // 采购链分录过账 OK
        let p = open_period();
        let grn_voucher = entries_to_post_voucher(&result.grn_entries);
        assert!(validate_post_entry(&grn_voucher, &p).is_ok());

        // 但有一张 Draft 待处理凭证阻止年度结账
        let periods: Vec<YearEndPeriodInput> = (1..=12)
            .map(|m| YearEndPeriodInput {
                id: format!("2026{:02}", m),
                status: PeriodStatus::Closed,
                period_no: m,
            })
            .collect();
        let vouchers = vec![YearEndVoucherSummary {
            status: VoucherStatus::Draft,
            period_id: "202608".to_string(),
        }];
        let accounts = vec![
            YearEndAccountSummary {
                account_code: "1401".to_string(),
                account_type: YearEndAccountType::Asset,
                net_balance: Decimal::new(1000, 0),
            },
            YearEndAccountSummary {
                account_code: "2201".to_string(),
                account_type: YearEndAccountType::Liability,
                net_balance: Decimal::new(-1000, 0),
            },
        ];
        let r = validate_year_end_close(&periods, &vouchers, &accounts);
        assert!(r.is_err(), "存在 Draft 凭证应阻止年度结账");
    }

    #[test]
    fn test_erp_integration_post_reverse_tb_nets_zero() {
        // 过账 → 冲销 → 试算平衡每个账户净额为 0
        let (po, grn, inv, pay) = aligned_chain();
        let result = validate_procurement_chain(&po, &grn, &inv, &pay).unwrap();

        // 使用 Payment 分录做冲销（简单的 2 行借贷）
        let pay_entries = &result.payment_entries;
        let j = entries_to_journal(pay_entries);
        let tb = calculate_trial_balance(&j);
        assert!(tb.is_balanced, "Payment 分录试算应平衡");

        // 构造冲销凭证
        let orig_entries: Vec<ReverseJournalEntry> = pay_entries
            .iter()
            .map(|(code, name, debit, credit)| ReverseJournalEntry {
                account_code: code.clone(),
                account_name: name.clone(),
                debit: f64_to_decimal(*debit),
                credit: f64_to_decimal(*credit),
            })
            .collect();
        let rev_entries: Vec<ReverseJournalEntry> = pay_entries
            .iter()
            .map(|(code, name, debit, credit)| ReverseJournalEntry {
                account_code: code.clone(),
                account_name: name.clone(),
                debit: f64_to_decimal(*credit),
                credit: f64_to_decimal(*debit),
            })
            .collect();
        let orig = ReverseableVoucherInput {
            voucher_no: "记2026080001".to_string(),
            reference_no: None,
            status: VoucherStatus::Posted,
            period_id: "202608".to_string(),
            entries: orig_entries,
        };
        let rev = ReverseableVoucherInput {
            voucher_no: "记2026080002".to_string(),
            reference_no: Some("记2026080001".to_string()),
            status: VoucherStatus::Draft,
            period_id: "202608".to_string(),
            entries: rev_entries,
        };
        let period = ReversePeriodInput {
            id: "202608".to_string(),
            status: PeriodStatus::Open,
        };
        assert!(
            validate_reverse_voucher(&orig, &rev, &period).is_ok(),
            "冲销校验应通过"
        );

        // 合并原始 + 冲销 → 每个账户净额为 0
        let mut combined = entries_to_journal(pay_entries);
        let flipped: Vec<JournalEntry> = pay_entries
            .iter()
            .map(|(code, name, debit, credit)| JournalEntry {
                voucher_no: "记2026080002".to_string(),
                voucher_date: Utc::now(),
                account_code: code.clone(),
                account_name: name.clone(),
                description: None,
                debit: f64_to_decimal(*credit),
                credit: f64_to_decimal(*debit),
            })
            .collect();
        combined.extend(flipped);
        let tb_combined = calculate_trial_balance(&combined);
        assert!(tb_combined.is_balanced, "合并后试算应平衡");
        for acct in &tb_combined.per_account_totals {
            assert_eq!(
                acct.total_debit, acct.total_credit,
                "冲销后每个账户净额应为 0: account={}",
                acct.account_code
            );
        }
    }

    #[test]
    fn test_erp_integration_year_end_close_ok() {
        // 过账 → 年度结账（所有期间已关闭）→ OK
        let (po, grn, inv, pay) = aligned_chain();
        let result = validate_procurement_chain(&po, &grn, &inv, &pay).unwrap();

        // 从采购链分录派生账户净额
        let j = entries_to_journal(&result.journal_entries);
        let tb = calculate_trial_balance(&j);
        assert!(tb.is_balanced);

        let accounts: Vec<YearEndAccountSummary> = tb
            .per_account_totals
            .iter()
            .map(|a| YearEndAccountSummary {
                account_code: a.account_code.clone(),
                account_type: if a.account_code.starts_with('1') {
                    YearEndAccountType::Asset
                } else {
                    YearEndAccountType::Liability
                },
                net_balance: a.total_debit - a.total_credit,
            })
            .collect();

        let periods: Vec<YearEndPeriodInput> = (1..=12)
            .map(|m| YearEndPeriodInput {
                id: format!("2026{:02}", m),
                status: PeriodStatus::Closed,
                period_no: m,
            })
            .collect();
        let vouchers = vec![YearEndVoucherSummary {
            status: VoucherStatus::Posted,
            period_id: "202608".to_string(),
        }];
        let r = validate_year_end_close(&periods, &vouchers, &accounts);
        assert!(
            r.is_ok(),
            "所有期间关闭+试算平衡+Posted 凭证 → 年度结账应通过"
        );
    }

    #[test]
    fn test_erp_integration_consolidation_ic_balanced() {
        // 多主体采购 → validate_consolidation 内部往来平衡 → OK
        let (po, grn, inv, pay) = aligned_chain();
        let result = validate_procurement_chain(&po, &grn, &inv, &pay).unwrap();

        // 模拟两个主体：S1 有 IC 应付，S2 有 IC 应收，金额相等
        let ic_amount = Decimal::from_str(&format!("{:.0}", result.total_payment)).unwrap();
        let entities = vec![
            ConsolidationEntityInput {
                entity_code: "S1".to_string(),
                currency: "CNY".to_string(),
                fiscal_year_end: "12-31".to_string(),
                period_status: PeriodStatus::Closed,
                ic_receivables: Decimal::ZERO,
                ic_payables: ic_amount,
            },
            ConsolidationEntityInput {
                entity_code: "S2".to_string(),
                currency: "CNY".to_string(),
                fiscal_year_end: "12-31".to_string(),
                period_status: PeriodStatus::Closed,
                ic_receivables: ic_amount,
                ic_payables: Decimal::ZERO,
            },
        ];
        let r = validate_consolidation(&entities, &[]);
        assert!(r.is_ok(), "内部往来平衡的合并应通过");
    }

    #[test]
    fn test_erp_integration_consolidation_with_reversal() {
        // 采购 + 冲销 → 跨主体合并 → IC 净额为 0
        let (po, grn, inv, pay) = aligned_chain();
        let result = validate_procurement_chain(&po, &grn, &inv, &pay).unwrap();

        // 冲销后 IC 金额为 0
        let entities = vec![
            ConsolidationEntityInput {
                entity_code: "S1".to_string(),
                currency: "CNY".to_string(),
                fiscal_year_end: "12-31".to_string(),
                period_status: PeriodStatus::Closed,
                ic_receivables: Decimal::ZERO,
                ic_payables: Decimal::ZERO,
            },
            ConsolidationEntityInput {
                entity_code: "S2".to_string(),
                currency: "CNY".to_string(),
                fiscal_year_end: "12-31".to_string(),
                period_status: PeriodStatus::Closed,
                ic_receivables: Decimal::ZERO,
                ic_payables: Decimal::ZERO,
            },
        ];
        let r = validate_consolidation(&entities, &[]);
        assert!(r.is_ok(), "IC 净额为 0 的合并应通过");

        // 同时验证采购链分录试算平衡（冲销前后都平衡）
        let j = entries_to_journal(&result.journal_entries);
        let tb = calculate_trial_balance(&j);
        assert!(tb.is_balanced);
    }

    #[test]
    fn test_erp_integration_payment_exact_invoice_ok() {
        // 付款金额 = 发票总额 → OK
        let (po, grn, inv, pay) = aligned_chain();
        let result = validate_procurement_chain(&po, &grn, &inv, &pay).unwrap();
        assert_eq!(result.total_payment, result.total_invoice);

        // 验证分录可过账
        let pay_voucher = entries_to_post_voucher(&result.payment_entries);
        let p = open_period();
        assert!(validate_post_entry(&pay_voucher, &p).is_ok());
    }

    #[test]
    fn test_erp_integration_overpayment_blocked() {
        // 超额付款 → 被阻止
        let (po, grn, inv, mut pay) = aligned_chain();
        pay.amount = 1130.01; // 超 0.01
        let r = validate_procurement_chain(&po, &grn, &inv, &pay);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            ErpE2eError::PaymentExceedsInvoice { .. }
        ));
    }

    // =================================================================
    // Error trait 测试 (3 tests)
    // =================================================================

    #[test]
    fn test_erp_error_display_contains_amounts() {
        let e = ErpE2eError::GrnExceedsPoQuantity {
            line: 2,
            po_qty: 10.0,
            grn_qty: 15.0,
        };
        let d = format!("{}", e);
        assert!(d.contains("line 2"));
        assert!(d.contains("10"));
        assert!(d.contains("15"));

        let e2 = ErpE2eError::UnbalancedJournalEntries {
            debit: 1000.0,
            credit: 900.0,
        };
        let d2 = format!("{}", e2);
        assert!(d2.contains("1000"));
        assert!(d2.contains("900"));
    }

    #[test]
    fn test_erp_error_clone_partial_eq() {
        let a = ErpE2eError::PeriodClosed {
            document: "PO:PO001".to_string(),
        };
        let b = a.clone();
        assert_eq!(a, b);

        let c = ErpE2eError::CurrencyMismatch {
            expected: "CNY".to_string(),
            actual: "USD".to_string(),
        };
        let d = c.clone();
        assert_eq!(c, d);
        assert_ne!(a, c);
    }

    #[test]
    fn test_erp_error_is_std_error() {
        let err: Box<dyn std::error::Error> = Box::new(ErpE2eError::PeriodClosed {
            document: "PO:TEST".to_string(),
        });
        assert!(err.source().is_none());
    }
}
