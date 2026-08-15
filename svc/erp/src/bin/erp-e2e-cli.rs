//! ERP E2E 真实化 CLI。
//!
//! 不依赖 DB，全部在内存里跑 svc/erp 的采购链纯函数，可直接 CI 定时冒烟。
//!
//! 用法：
//!   cargo run --release -p topems-erp --bin erp-e2e-cli          # 默认：跑 5 个 scenario
//!   cargo run --release -p topems-erp --bin erp-e2e-cli <name>   # 单个 scenario
//!
//! 支持的 scenario 名称：
//!   happy | excess_grn | mismatch_inv | period_close | multi_currency
//!
//! Exit code: 全部通过=0；任一失败=1；参数错误=2。

use topems_erp::modules::procurement_e2e::{
    sample_happy_cny, sample_multi_currency_usd_cny, validate_procurement_chain,
    validate_procurement_chain_with_rates, ErpE2eError,
};

fn scenario_happy() -> Result<(), String> {
    let req = sample_happy_cny();
    let r = validate_procurement_chain(&req.po, &req.grn, &req.invoice, &req.payment)
        .map_err(|e| format!("unexpected err: {e}"))?;
    // 检查借贷平衡
    let d: f64 = r.journal_entries.iter().map(|l| l.debit).sum();
    let c: f64 = r.journal_entries.iter().map(|l| l.credit).sum();
    if (d - c).abs() > 0.02 {
        return Err(format!("entries not balanced: debit={d} credit={c}"));
    }
    println!(
        "  ok  totals: PO={} GRN={} INV={} PAY={}",
        r.total_po, r.total_grn, r.total_invoice, r.total_payment
    );
    println!(
        "  ok  entries: GRN={} Invoice={} Payment={} Total={}",
        r.grn_entries.len(),
        r.invoice_entries.len(),
        r.payment_entries.len(),
        r.journal_entries.len()
    );
    Ok(())
}

fn scenario_excess_grn() -> Result<(), String> {
    let mut req = sample_happy_cny();
    req.grn.lines[0].quantity = 15.0; // 超收 50%
    let err = validate_procurement_chain(&req.po, &req.grn, &req.invoice, &req.payment)
        .err()
        .ok_or_else(|| "expected error but validation passed".to_string())?;
    match err {
        ErpE2eError::GrnExceedsPoQuantity {
            line,
            po_qty,
            grn_qty,
        } => {
            assert_eq!(line, 0);
            assert!((po_qty - 10.0).abs() < 1e-9);
            assert!((grn_qty - 15.0).abs() < 1e-9);
            println!(
                "  ok  error code: GRN_EXCEEDS_PO_QTY line={line} delta={}",
                grn_qty - po_qty
            );
            Ok(())
        }
        other => Err(format!("wrong error variant: {other:?}")),
    }
}

fn scenario_mismatch_inv() -> Result<(), String> {
    let mut req = sample_happy_cny();
    req.invoice.lines[0].unit_price = 150.0; // 多开价税合计 15%
    let err = validate_procurement_chain(&req.po, &req.grn, &req.invoice, &req.payment)
        .err()
        .ok_or_else(|| "expected error but validation passed".to_string())?;
    match err {
        ErpE2eError::InvoiceGrnMismatch {
            line,
            grn_amount,
            invoice_amount,
        } => {
            assert_eq!(line, 0);
            assert!((invoice_amount - grn_amount) > 0.0);
            println!(
                "  ok  error code: INVOICE_GRN_MISMATCH line={line} delta={}",
                invoice_amount - grn_amount
            );
            Ok(())
        }
        other => Err(format!("wrong error variant: {other:?}")),
    }
}

fn scenario_period_close() -> Result<(), String> {
    let mut req = sample_happy_cny();
    req.grn.period_status = "Closed".into();
    let err = validate_procurement_chain(&req.po, &req.grn, &req.invoice, &req.payment)
        .err()
        .ok_or_else(|| "expected error but validation passed".to_string())?;
    match err {
        ErpE2eError::PeriodClosed { document } => {
            assert_eq!(document, "GRN:GRN-2025-0001");
            println!("  ok  error code: PERIOD_CLOSED document={document}");
            Ok(())
        }
        other => Err(format!("wrong error variant: {other:?}")),
    }
}

fn scenario_multi_currency() -> Result<(), String> {
    let req = sample_multi_currency_usd_cny();
    let r = validate_procurement_chain_with_rates(
        &req.po,
        &req.grn,
        &req.invoice,
        &req.payment,
        &req.rates,
    )
    .map_err(|e| format!("unexpected err: {e}"))?;
    // 总额: 1130 USD × 7.18 = 8113.4 CNY（付款）
    let expected_payment_cny = 1130.0 * 7.18;
    if (r.total_payment - expected_payment_cny).abs() > 0.02 {
        return Err(format!(
            "expected total_payment={expected_payment_cny} got {}",
            r.total_payment
        ));
    }
    let d: f64 = r.journal_entries.iter().map(|l| l.debit).sum();
    let c: f64 = r.journal_entries.iter().map(|l| l.credit).sum();
    if (d - c).abs() > 0.02 {
        return Err(format!("entries not balanced: debit={d} credit={c}"));
    }
    println!(
        "  ok  USD→CNY totals: PO={:.2} PAY={:.2}",
        r.total_po, r.total_payment
    );
    println!(
        "  ok  entries count: GRN={} Invoice={} Payment={}",
        r.grn_entries.len(),
        r.invoice_entries.len(),
        r.payment_entries.len()
    );
    Ok(())
}

const ALL: &[(&str, fn() -> Result<(), String>)] = &[
    ("happy", scenario_happy as _),
    ("excess_grn", scenario_excess_grn as _),
    ("mismatch_inv", scenario_mismatch_inv as _),
    ("period_close", scenario_period_close as _),
    ("multi_currency", scenario_multi_currency as _),
];

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let to_run: Vec<&str> = if args.is_empty() {
        ALL.iter().map(|(n, _)| *n).collect()
    } else {
        args.iter().map(String::as_str).collect()
    };

    println!("══════════════════════════════════════════════════");
    println!(" ERP E2E 真实化 CLI 冒烟测试");
    println!(" Scenario 总数={}  运行={}", ALL.len(), to_run.len());
    println!("══════════════════════════════════════════════════");

    let mut pass = 0usize;
    let mut fail: Vec<(String, String)> = Vec::new();
    for name in to_run {
        let (_, runner) = match ALL.iter().find(|(n, _)| *n == name) {
            Some(x) => x,
            None => {
                eprintln!("ERROR: unknown scenario '{name}'");
                eprintln!(
                    "  supported: {}",
                    ALL.iter().map(|(n, _)| *n).collect::<Vec<_>>().join(" | ")
                );
                std::process::exit(2);
            }
        };
        print!("▶ scenario {name:<16}  ");
        match runner() {
            Ok(()) => {
                println!("✅ PASS");
                pass += 1;
            }
            Err(msg) => {
                println!("❌ FAIL\n   {msg}");
                fail.push((name.to_string(), msg));
            }
        }
    }

    println!("──────────────────────────────────────────────────");
    println!(" Result: {} passed / {} failed", pass, fail.len());
    if !fail.is_empty() {
        println!("\nFailed scenarios:");
        for (n, m) in &fail {
            println!("  - {n}: {m}");
        }
        std::process::exit(1);
    }
    println!(" ALL GREEN ✨");
}
