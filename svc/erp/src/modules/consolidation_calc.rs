//! 合并报表模块纯计算函数
//!
//! 从 `models/consolidation.rs` 及对应 modules 中提取的业务纯逻辑。

use rust_decimal::Decimal;
use std::fmt;

// ── 股权 / 合并比例计算 ────────────────────────────────

/// 规范化合并比例：钳制 [0,1]，非有限数字（NaN/Inf）返回 0
pub fn normalize_percentage(pct: f64) -> f64 {
    if !pct.is_finite() {
        return 0.0;
    }
    pct.clamp(0.0, 1.0)
}

/// 规范化合并比例 (Decimal)：钳制 [0,1]
pub fn normalize_decimal_pct(pct: Decimal) -> Decimal {
    let zero = Decimal::from(0);
    let one = Decimal::from(1);
    if pct < zero {
        zero
    } else if pct > one {
        one
    } else {
        pct
    }
}

/// 从所有权百分比推导合并百分比
///
/// - control_type: "control"(>50%) / "joint"(50%) / "associate"(20-50%) / "subsidiary"(100%) / "minority"(<20%)
/// - 未识别类型：返回 ownership 的规范化值
pub fn derive_consolidation_percentage(ownership: f64, control_type: &str) -> f64 {
    let own = normalize_percentage(ownership);
    match control_type {
        "subsidiary" => 1.0,
        "control" => 1.0,
        "joint" => {
            if own >= 0.2 {
                own
            } else {
                0.5
            }
        }
        "associate" => {
            if own > 0.0 {
                own
            } else {
                0.2
            }
        }
        "minority" => 0.0,
        _ => own,
    }
}

/// 少数股东权益占比 = 1 - consolidation_percentage（归一化后）
pub fn minority_interest_ratio(consolidation_percentage: Decimal) -> Decimal {
    let one = Decimal::from(1);
    let cp = normalize_decimal_pct(consolidation_percentage);
    let diff = one - cp;
    normalize_decimal_pct(diff)
}

// ── 内部交易抵消 ───────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct EliminationCalc {
    pub eliminated_amount: Decimal,
    pub remaining_amount: Decimal,
}

/// 单次抵消计算：在给定 eliminated_limit 上限下，对 amount 做抵消
///
/// - amount / eliminated_limit / prior_eliminated：均非负（负数钳制）
/// - eliminated = min(remaining_potential, eliminated_limit)
/// - remaining = amount - (prior_eliminated + eliminated)
pub fn calculate_elimination_step(
    amount: Decimal,
    prior_eliminated: Decimal,
    eliminated_limit: Decimal,
) -> EliminationCalc {
    let zero = Decimal::from(0);
    let amt = if amount > zero { amount } else { zero.clone() };
    let prior = if prior_eliminated > zero {
        prior_eliminated
    } else {
        zero.clone()
    };
    let limit = if eliminated_limit > zero {
        eliminated_limit
    } else {
        zero.clone()
    };
    let potential = if &amt > &prior {
        amt.clone() - prior
    } else {
        zero.clone()
    };
    let eliminated = if potential < limit { potential } else { limit };
    let remaining = {
        let total_elim = prior + &eliminated;
        if amt > total_elim {
            amt - total_elim
        } else {
            zero
        }
    };
    EliminationCalc {
        eliminated_amount: eliminated,
        remaining_amount: remaining,
    }
}

// ── 合并报表计算 ───────────────────────────────────────

/// 权益法下投资收益 = 被投方净利润 × 持股比例
pub fn equity_method_investment_income(
    investee_profit: Decimal,
    ownership_pct: Decimal,
) -> Decimal {
    let pct = normalize_decimal_pct(ownership_pct);
    investee_profit * pct
}

/// 合并商誉 = 支付对价 - 取得可辨认净资产公允价值 × 持股比例
///
/// 结果为负（负商誉）时返回 0（负商誉计入当期损益，不在账面保留）
pub fn calculate_goodwill(
    consideration_paid: Decimal,
    fair_value_of_net_assets: Decimal,
    ownership_pct: Decimal,
) -> Decimal {
    let zero = Decimal::from(0);
    let pct = normalize_decimal_pct(ownership_pct);
    let acquired = fair_value_of_net_assets * pct;
    let gw = consideration_paid - acquired;
    if gw > zero {
        gw
    } else {
        zero
    }
}

// ── 校验 ───────────────────────────────────────────────

/// 会计期间校验：格式 `YYYY-MM`
pub fn validate_accounting_period(period: &str) -> bool {
    if period.len() != 7 {
        return false;
    }
    let bytes = period.as_bytes();
    if bytes[4] != b'-' {
        return false;
    }
    let year_ok = bytes[0..4].iter().all(|b| b.is_ascii_digit());
    let month_ok = bytes[5..7].iter().all(|b| b.is_ascii_digit());
    if !year_ok || !month_ok {
        return false;
    }
    // year ≥ 1900，month 01-12
    let y = std::str::from_utf8(&bytes[0..4])
        .ok()
        .and_then(|s| s.parse::<i32>().ok())
        .unwrap_or(0);
    let m = std::str::from_utf8(&bytes[5..7])
        .ok()
        .and_then(|s| s.parse::<u32>().ok())
        .unwrap_or(0);
    y >= 1900 && (1..=12).contains(&m)
}

/// 合并方法校验：`equity` / `cost` / `proportional` / `full`
pub fn validate_consolidation_method(method: &str) -> bool {
    matches!(method, "equity" | "cost" | "proportional" | "full")
}

/// 抵消状态: `pending` / `processing` / `eliminated` / `partial` / `error`
pub fn validate_elimination_status(status: &str) -> bool {
    matches!(
        status,
        "pending" | "processing" | "eliminated" | "partial" | "error"
    )
}

// ── 合并条目校验（业务前置纯函数）─────────────────────

#[derive(Debug, Clone, PartialEq)]
pub enum ConsolidationError {
    EmptyField(&'static str),
    InvalidOwnership(f64),
    InvalidMethod(String),
    InvalidPeriod(String),
    EliminationOverflow {
        amount: Decimal,
        prior: Decimal,
        limit: Decimal,
    },
}

impl fmt::Display for ConsolidationError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ConsolidationError::EmptyField(field) => {
                write!(f, "字段不能为空: {}", field)
            }
            ConsolidationError::InvalidOwnership(val) => {
                write!(f, "所有权必须在 [0,1] 范围内, 实际值: {}", val)
            }
            ConsolidationError::InvalidMethod(val) => {
                write!(
                    f,
                    "无效的合并方法: {}, 允许值: equity/cost/proportional/full",
                    val
                )
            }
            ConsolidationError::InvalidPeriod(val) => {
                write!(
                    f,
                    "无效的会计期间: {}, 格式要求 YYYY-MM (年份≥1900, 月份01-12)",
                    val
                )
            }
            ConsolidationError::EliminationOverflow {
                amount,
                prior,
                limit,
            } => {
                write!(
                    f,
                    "抵消参数不能为负数: amount={}, prior_eliminated={}, eliminated_limit={}",
                    amount, prior, limit
                )
            }
        }
    }
}

pub struct ConsolidationEntry<'a> {
    pub subsidiary_name: &'a str,
    pub parent_name: &'a str,
    pub ownership: f64,
    pub consolidation_method: &'a str,
    pub accounting_period: &'a str,
}

pub fn validate_consolidation_entry(
    entry: &ConsolidationEntry<'_>,
) -> Result<(), ConsolidationError> {
    use ConsolidationError::*;
    if entry.subsidiary_name.trim().is_empty() {
        return Err(EmptyField("subsidiary_name"));
    }
    if entry.parent_name.trim().is_empty() {
        return Err(EmptyField("parent_name"));
    }
    if !(0.0..=1.0).contains(&entry.ownership) {
        return Err(InvalidOwnership(entry.ownership));
    }
    if !validate_consolidation_method(entry.consolidation_method) {
        return Err(InvalidMethod(entry.consolidation_method.to_string()));
    }
    if !validate_accounting_period(entry.accounting_period) {
        return Err(InvalidPeriod(entry.accounting_period.to_string()));
    }
    Ok(())
}

pub fn validate_elimination_params(
    amount: Decimal,
    prior_eliminated: Decimal,
    eliminated_limit: Decimal,
) -> Result<(), ConsolidationError> {
    let zero = Decimal::from(0);
    if amount < zero || prior_eliminated < zero || eliminated_limit < zero {
        return Err(ConsolidationError::EliminationOverflow {
            amount,
            prior: prior_eliminated,
            limit: eliminated_limit,
        });
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal::prelude::FromPrimitive;

    // ── normalize_percentage ─────────────────────

    #[test]
    fn test_norm_pct_middle() {
        assert_eq!(normalize_percentage(0.45), 0.45);
    }

    #[test]
    fn test_norm_pct_above_1_clamped() {
        assert_eq!(normalize_percentage(1.5), 1.0);
    }

    #[test]
    fn test_norm_pct_negative_clamped() {
        assert_eq!(normalize_percentage(-0.1), 0.0);
    }

    #[test]
    fn test_norm_pct_nan_inf_clamped() {
        assert_eq!(normalize_percentage(f64::NAN), 0.0);
        assert_eq!(normalize_percentage(f64::INFINITY), 0.0);
    }

    // ── normalize_decimal_pct ─────────────────────

    #[test]
    fn test_norm_decimal_pct_middle() {
        let v = Decimal::from_f64(0.35).unwrap();
        assert_eq!(normalize_decimal_pct(v), v);
    }

    #[test]
    fn test_norm_decimal_pct_above_1() {
        let v = Decimal::from(2);
        assert_eq!(normalize_decimal_pct(v), Decimal::from(1));
    }

    #[test]
    fn test_norm_decimal_pct_negative() {
        let v = Decimal::from(-1);
        assert_eq!(normalize_decimal_pct(v), Decimal::from(0));
    }

    // ── derive_consolidation_percentage ─────────

    #[test]
    fn test_cons_pct_subsidiary_always_1() {
        assert_eq!(derive_consolidation_percentage(0.2, "subsidiary"), 1.0);
    }

    #[test]
    fn test_cons_pct_control_always_1() {
        assert_eq!(derive_consolidation_percentage(0.1, "control"), 1.0);
    }

    #[test]
    fn test_cons_pct_joint_low_ownership_default_0_5() {
        // ownership 0.05 太低；joint 至少 0.5
        assert_eq!(derive_consolidation_percentage(0.05, "joint"), 0.5);
    }

    #[test]
    fn test_cons_pct_joint_high_ownership_preserved() {
        assert_eq!(derive_consolidation_percentage(0.7, "joint"), 0.7);
    }

    #[test]
    fn test_cons_pct_associate_ownership_zero_default_0_2() {
        assert_eq!(derive_consolidation_percentage(0.0, "associate"), 0.2);
    }

    #[test]
    fn test_cons_pct_minority_always_0() {
        assert_eq!(derive_consolidation_percentage(0.8, "minority"), 0.0);
    }

    #[test]
    fn test_cons_pct_unknown_type_ownership_preserved() {
        assert_eq!(derive_consolidation_percentage(0.33, "custom"), 0.33);
    }

    #[test]
    fn test_cons_pct_ownership_above_1_clamped() {
        assert_eq!(derive_consolidation_percentage(2.0, "custom"), 1.0);
    }

    // ── minority_interest_ratio ─────────────────

    #[test]
    fn test_minority_interest_full_consolidation() {
        // 100% → MI = 0
        let cp = Decimal::from(1);
        assert_eq!(minority_interest_ratio(cp), Decimal::from(0));
    }

    #[test]
    fn test_minority_interest_80pct_consolidation() {
        // 80% → MI = 20%
        let cp = Decimal::from_f64(0.8).unwrap();
        let expected = Decimal::from_f64(0.2).unwrap();
        assert_eq!(minority_interest_ratio(cp), expected);
    }

    #[test]
    fn test_minority_interest_above_1_clamped() {
        // 150% → clamp 100% → MI 0
        let cp = Decimal::from_f64(1.5).unwrap();
        assert_eq!(minority_interest_ratio(cp), Decimal::from(0));
    }

    // ── calculate_elimination_step ────────────

    #[test]
    fn test_elimination_full() {
        // amount 1000，prior 0，limit 1000 → eliminated 1000，remaining 0
        let r = calculate_elimination_step(1000.into(), 0.into(), 1000.into());
        assert_eq!(r.eliminated_amount, Decimal::from(1000));
        assert_eq!(r.remaining_amount, Decimal::from(0));
    }

    #[test]
    fn test_elimination_partial_due_to_limit() {
        // amount 1000，prior 0，limit 300 → eliminated 300，remaining 700
        let r = calculate_elimination_step(1000.into(), 0.into(), 300.into());
        assert_eq!(r.eliminated_amount, Decimal::from(300));
        assert_eq!(r.remaining_amount, Decimal::from(700));
    }

    #[test]
    fn test_elimination_prior_exists() {
        // amount 1000，prior 400，limit 500 → eliminated 500，remaining 100
        let r = calculate_elimination_step(1000.into(), 400.into(), 500.into());
        assert_eq!(r.eliminated_amount, Decimal::from(500));
        assert_eq!(r.remaining_amount, Decimal::from(100));
    }

    #[test]
    fn test_elimination_already_fully_eliminated() {
        // prior 1000，amount 1000 → 无剩余
        let r = calculate_elimination_step(1000.into(), 1000.into(), 1000.into());
        assert_eq!(r.eliminated_amount, Decimal::from(0));
        assert_eq!(r.remaining_amount, Decimal::from(0));
    }

    #[test]
    fn test_elimination_negative_inputs_clamped() {
        let r = calculate_elimination_step((-500).into(), (-100).into(), (-50).into());
        assert_eq!(r.eliminated_amount, Decimal::from(0));
        assert_eq!(r.remaining_amount, Decimal::from(0));
    }

    // ── equity_method_investment_income ───────

    #[test]
    fn test_equity_method_basic() {
        // 100万 × 30% = 30万
        let p = Decimal::from(1_000_000);
        let r = equity_method_investment_income(p, Decimal::from_f64(0.3).unwrap());
        assert_eq!(r, Decimal::from(300_000));
    }

    #[test]
    fn test_equity_method_loss() {
        let loss = Decimal::from(-500_000);
        let r = equity_method_investment_income(loss, Decimal::from_f64(0.4).unwrap());
        assert_eq!(r, Decimal::from(-200_000));
    }

    #[test]
    fn test_equity_method_zero_ownership() {
        let p = Decimal::from(100);
        let r = equity_method_investment_income(p, Decimal::from(0));
        assert_eq!(r, Decimal::from(0));
    }

    // ── calculate_goodwill ────────────────────

    #[test]
    fn test_goodwill_positive() {
        // 对价 1200，净资产公允 1000，持股 100% → 商誉 200
        let gw = calculate_goodwill(1200.into(), 1000.into(), Decimal::from(1));
        assert_eq!(gw, Decimal::from(200));
    }

    #[test]
    fn test_goodwill_partial_ownership() {
        // 对价 800，净资产 1000，持股 70% → 800 - 700 = 100
        let pct = Decimal::from_f64(0.7).unwrap();
        let gw = calculate_goodwill(800.into(), 1000.into(), pct);
        assert_eq!(gw, Decimal::from(100));
    }

    #[test]
    fn test_goodwill_negative_returns_zero() {
        // 对价 500，净资产 1000，持股 100% → 负商誉 = 0
        let gw = calculate_goodwill(500.into(), 1000.into(), Decimal::from(1));
        assert_eq!(gw, Decimal::from(0));
    }

    // ── validate_accounting_period ────────────

    #[test]
    fn test_period_valid_normal() {
        assert!(validate_accounting_period("2025-06"));
    }

    #[test]
    fn test_period_wrong_length() {
        assert!(!validate_accounting_period("2025-6")); // 6 chars
        assert!(!validate_accounting_period("2025-006")); // 8 chars
    }

    #[test]
    fn test_period_no_dash() {
        assert!(!validate_accounting_period("2025/06"));
    }

    #[test]
    fn test_period_month_00_invalid() {
        assert!(!validate_accounting_period("2025-00"));
    }

    #[test]
    fn test_period_month_13_invalid() {
        assert!(!validate_accounting_period("2025-13"));
    }

    #[test]
    fn test_period_year_before_1900_invalid() {
        assert!(!validate_accounting_period("1899-06"));
    }

    #[test]
    fn test_period_year_1900_valid() {
        assert!(validate_accounting_period("1900-01"));
    }

    #[test]
    fn test_period_non_digits_invalid() {
        assert!(!validate_accounting_period("20XX-01"));
        assert!(!validate_accounting_period("2025-XX"));
    }

    // ── 状态类校验 ─────────────────────────────

    #[test]
    fn test_consolidation_method_all_valid() {
        for m in ["equity", "cost", "proportional", "full"].iter() {
            assert!(validate_consolidation_method(m), "expected {m} valid");
        }
    }

    #[test]
    fn test_consolidation_method_invalid() {
        assert!(!validate_consolidation_method("equity_"));
        assert!(!validate_consolidation_method(""));
    }

    #[test]
    fn test_elimination_status_all_valid() {
        for s in ["pending", "processing", "eliminated", "partial", "error"].iter() {
            assert!(validate_elimination_status(s));
        }
    }

    #[test]
    fn test_elimination_status_invalid() {
        assert!(!validate_elimination_status("done"));
        assert!(!validate_elimination_status(""));
    }

    // ── validate_accounting_period 补充边界用例 ─────────

    #[test]
    fn test_period_boundary_valid() {
        assert!(validate_accounting_period("2026-08"));
        assert!(validate_accounting_period("1900-01"));
        assert!(validate_accounting_period("2099-12"));
    }

    #[test]
    fn test_period_boundary_invalid() {
        assert!(!validate_accounting_period("2026-13"));
        assert!(!validate_accounting_period("2026-00"));
        assert!(!validate_accounting_period("2026"));
        assert!(!validate_accounting_period("2026-8"));
        assert!(!validate_accounting_period("1899-12"));
        assert!(!validate_accounting_period("2026/08"));
    }

    // ── validate_consolidation_entry ──────────────

    #[test]
    fn test_validate_entry_ok() {
        let entry = ConsolidationEntry {
            subsidiary_name: "子公司A",
            parent_name: "母公司B",
            ownership: 0.7,
            consolidation_method: "equity",
            accounting_period: "2026-08",
        };
        assert!(validate_consolidation_entry(&entry).is_ok());
    }

    #[test]
    fn test_validate_entry_empty_subsidiary() {
        let entry = ConsolidationEntry {
            subsidiary_name: "",
            parent_name: "母公司B",
            ownership: 0.7,
            consolidation_method: "equity",
            accounting_period: "2026-08",
        };
        let r = validate_consolidation_entry(&entry);
        assert!(matches!(
            r,
            Err(ConsolidationError::EmptyField("subsidiary_name"))
        ));
    }

    #[test]
    fn test_validate_entry_empty_parent() {
        let entry = ConsolidationEntry {
            subsidiary_name: "子公司A",
            parent_name: "   ",
            ownership: 0.7,
            consolidation_method: "equity",
            accounting_period: "2026-08",
        };
        let r = validate_consolidation_entry(&entry);
        assert!(matches!(
            r,
            Err(ConsolidationError::EmptyField("parent_name"))
        ));
    }

    #[test]
    fn test_validate_entry_ownership_negative() {
        let entry = ConsolidationEntry {
            subsidiary_name: "子公司A",
            parent_name: "母公司B",
            ownership: -0.1,
            consolidation_method: "equity",
            accounting_period: "2026-08",
        };
        let r = validate_consolidation_entry(&entry);
        assert!(matches!(r, Err(ConsolidationError::InvalidOwnership(-0.1))));
    }

    #[test]
    fn test_validate_entry_ownership_above_1() {
        let entry = ConsolidationEntry {
            subsidiary_name: "子公司A",
            parent_name: "母公司B",
            ownership: 1.1,
            consolidation_method: "equity",
            accounting_period: "2026-08",
        };
        let r = validate_consolidation_entry(&entry);
        assert!(matches!(r, Err(ConsolidationError::InvalidOwnership(1.1))));
    }

    #[test]
    fn test_validate_entry_ownership_boundary_ok() {
        let entry0 = ConsolidationEntry {
            subsidiary_name: "子公司A",
            parent_name: "母公司B",
            ownership: 0.0,
            consolidation_method: "equity",
            accounting_period: "2026-08",
        };
        assert!(validate_consolidation_entry(&entry0).is_ok());

        let entry1 = ConsolidationEntry {
            subsidiary_name: "子公司A",
            parent_name: "母公司B",
            ownership: 1.0,
            consolidation_method: "equity",
            accounting_period: "2026-08",
        };
        assert!(validate_consolidation_entry(&entry1).is_ok());
    }

    #[test]
    fn test_validate_entry_invalid_method() {
        let entry = ConsolidationEntry {
            subsidiary_name: "子公司A",
            parent_name: "母公司B",
            ownership: 0.5,
            consolidation_method: "bad_method",
            accounting_period: "2026-08",
        };
        let r = validate_consolidation_entry(&entry);
        assert!(matches!(r, Err(ConsolidationError::InvalidMethod(ref s)) if s == "bad_method"));
    }

    #[test]
    fn test_validate_entry_invalid_period() {
        let entry = ConsolidationEntry {
            subsidiary_name: "子公司A",
            parent_name: "母公司B",
            ownership: 0.5,
            consolidation_method: "equity",
            accounting_period: "2026/08",
        };
        let r = validate_consolidation_entry(&entry);
        assert!(matches!(r, Err(ConsolidationError::InvalidPeriod(ref s)) if s == "2026/08"));
    }

    // ── validate_elimination_params ──────────────

    #[test]
    fn test_validate_elimination_params_ok() {
        let r = validate_elimination_params(1000.into(), 0.into(), 1000.into());
        assert!(r.is_ok());
    }

    #[test]
    fn test_validate_elimination_params_negative_amount() {
        let r = validate_elimination_params((-100).into(), 0.into(), 1000.into());
        assert!(matches!(
            r,
            Err(ConsolidationError::EliminationOverflow { .. })
        ));
    }

    #[test]
    fn test_validate_elimination_params_negative_prior() {
        let r = validate_elimination_params(1000.into(), (-50).into(), 1000.into());
        assert!(matches!(
            r,
            Err(ConsolidationError::EliminationOverflow { .. })
        ));
    }

    #[test]
    fn test_validate_elimination_params_negative_limit() {
        let r = validate_elimination_params(1000.into(), 0.into(), (-10).into());
        assert!(matches!(
            r,
            Err(ConsolidationError::EliminationOverflow { .. })
        ));
    }

    // ── ConsolidationError Display 验证 ─────────

    #[test]
    fn test_consolidation_error_display() {
        let e1 = ConsolidationError::EmptyField("subsidiary_name");
        assert!(format!("{}", e1).contains("subsidiary_name"));

        let e2 = ConsolidationError::InvalidOwnership(-0.5);
        assert!(format!("{}", e2).contains("-0.5"));

        let e3 = ConsolidationError::InvalidMethod("xyz".to_string());
        assert!(format!("{}", e3).contains("xyz"));

        let e4 = ConsolidationError::InvalidPeriod("bad".to_string());
        assert!(format!("{}", e4).contains("bad"));

        let e5 = ConsolidationError::EliminationOverflow {
            amount: (-1).into(),
            prior: 0.into(),
            limit: 100.into(),
        };
        assert!(format!("{}", e5).contains("抵消参数不能为负数"));
    }

    // ================================================================
    // 追加 A~E 组深度边界测试 (共 25+ 断言)
    // ================================================================

    // ── A 组：derive_consolidation_percentage 深度边界 (8 assertions) ──

    #[test]
    fn test_cons_pct_joint_ownership_exactly_0_2_boundary() {
        assert_eq!(derive_consolidation_percentage(0.2, "joint"), 0.2);
    }

    #[test]
    fn test_cons_pct_associate_tiny_positive_ownership_preserved() {
        assert_eq!(derive_consolidation_percentage(0.0001, "associate"), 0.0001);
    }

    #[test]
    fn test_cons_pct_minority_below_20pct_boundary_returns_zero() {
        assert_eq!(derive_consolidation_percentage(0.199, "minority"), 0.0);
    }

    #[test]
    fn test_cons_pct_custom_type_zero_ownership_returns_zero() {
        assert_eq!(derive_consolidation_percentage(0.0, "custom"), 0.0);
    }

    #[test]
    fn test_cons_pct_custom_type_nan_ownership_normalized_to_zero() {
        assert_eq!(derive_consolidation_percentage(f64::NAN, "custom"), 0.0);
    }

    #[test]
    fn test_cons_pct_custom_type_infinity_ownership_normalized_to_zero() {
        assert_eq!(
            derive_consolidation_percentage(f64::INFINITY, "custom"),
            0.0
        );
    }

    #[test]
    fn test_cons_pct_subsidiary_zero_ownership_still_1() {
        assert_eq!(derive_consolidation_percentage(0.0, "subsidiary"), 1.0);
    }

    #[test]
    fn test_cons_pct_control_negative_ownership_forces_1() {
        assert_eq!(derive_consolidation_percentage(-0.3, "control"), 1.0);
    }

    // ── B 组：minority_interest_ratio 边界 (3 assertions) ──

    #[test]
    fn test_minority_interest_zero_consolidation_gives_100pct_mi() {
        let cp = Decimal::from(0);
        assert_eq!(minority_interest_ratio(cp), Decimal::from(1));
    }

    #[test]
    fn test_minority_interest_half_consolidation_gives_half_mi() {
        let cp = Decimal::from_f64(0.5).unwrap();
        let expected = Decimal::from_f64(0.5).unwrap();
        assert_eq!(minority_interest_ratio(cp), expected);
    }

    #[test]
    fn test_minority_interest_negative_consolidation_normalized_to_1() {
        let cp = Decimal::from(-5);
        assert_eq!(minority_interest_ratio(cp), Decimal::from(1));
    }

    // ── C 组：calculate_elimination_step 极端值 (7 sub-asserts, 5 test fn) ──

    #[test]
    fn test_elimination_prior_exceeds_amount_extreme() {
        let r = calculate_elimination_step(1000.into(), 1500.into(), 500.into());
        assert_eq!(r.eliminated_amount, Decimal::from(0));
        assert_eq!(r.remaining_amount, Decimal::from(0));
    }

    #[test]
    fn test_elimination_zero_limit_never_eliminates() {
        let r = calculate_elimination_step(1000.into(), 0.into(), 0.into());
        assert_eq!(r.eliminated_amount, Decimal::from(0));
        assert_eq!(r.remaining_amount, Decimal::from(1000));
    }

    #[test]
    fn test_elimination_all_zeros_extreme() {
        let r = calculate_elimination_step(0.into(), 0.into(), 0.into());
        assert_eq!(r.eliminated_amount, Decimal::from(0));
        assert_eq!(r.remaining_amount, Decimal::from(0));
    }

    #[test]
    fn test_elimination_prior_plus_limit_exactly_amount_boundary() {
        let r = calculate_elimination_step(500.into(), 200.into(), 300.into());
        assert_eq!(r.eliminated_amount, Decimal::from(300));
        assert_eq!(r.remaining_amount, Decimal::from(0));
    }

    #[test]
    fn test_elimination_large_amount_no_overflow() {
        let big = Decimal::from(99_999_999_999i64);
        let prior = Decimal::from(100);
        let limit = Decimal::from(500);
        let r = calculate_elimination_step(big, prior, limit);
        assert_eq!(r.eliminated_amount, Decimal::from(500));
    }

    // ── D 组：calculate_goodwill 边界 (4 assertions) ──

    #[test]
    fn test_goodwill_exactly_zero_boundary() {
        let consideration = Decimal::from(700);
        let fvna = Decimal::from(1000);
        let pct = Decimal::from_f64(0.7).unwrap();
        assert_eq!(
            calculate_goodwill(consideration, fvna, pct),
            Decimal::from(0)
        );
    }

    #[test]
    fn test_goodwill_negative_ownership_normalized_to_zero() {
        let consideration = Decimal::from(500);
        let fvna = Decimal::from(1000);
        let pct = Decimal::from_f64(-0.1).unwrap();
        assert_eq!(
            calculate_goodwill(consideration, fvna, pct),
            Decimal::from(500)
        );
    }

    #[test]
    fn test_goodwill_large_values_precision() {
        let consideration = Decimal::from(10_000_000i64);
        let fvna = Decimal::from(5_000_000i64);
        let pct = Decimal::from(1);
        assert_eq!(
            calculate_goodwill(consideration, fvna, pct),
            Decimal::from(5_000_000i64)
        );
    }

    #[test]
    fn test_goodwill_ownership_above_1_clamped_to_1() {
        let consideration = Decimal::from(800);
        let fvna = Decimal::from(500);
        let pct = Decimal::from(2);
        assert_eq!(
            calculate_goodwill(consideration, fvna, pct),
            Decimal::from(300)
        );
    }

    // ── E 组：equity_method_investment_income 补充 (3 assertions) ──

    #[test]
    fn test_equity_method_ownership_above_1_clamped_to_1() {
        let profit = Decimal::from(1000);
        let pct = Decimal::from_f64(1.5).unwrap();
        assert_eq!(
            equity_method_investment_income(profit, pct),
            Decimal::from(1000)
        );
    }

    #[test]
    fn test_equity_method_negative_ownership_normalized_to_zero() {
        let profit = Decimal::from(1000);
        let pct = Decimal::from_f64(-0.3).unwrap();
        assert_eq!(
            equity_method_investment_income(profit, pct),
            Decimal::from(0)
        );
    }

    #[test]
    fn test_equity_method_zero_profit_always_zero() {
        let profit = Decimal::from(0);
        let pct = Decimal::from_f64(0.5).unwrap();
        assert_eq!(
            equity_method_investment_income(profit, pct),
            Decimal::from(0)
        );
    }
}
