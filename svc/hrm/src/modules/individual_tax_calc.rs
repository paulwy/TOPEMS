//! 个人所得税纯计算
//!
//! 涵盖：
//! - 月度累计预扣预缴（国家税务总局 2018 年第 61 号公告）
//! - 月度税率表（适用于非居民个人、单独计税的年终奖）
//! - 全年一次性奖金两种计税方式（单独计税 / 并入综合所得）
//! - 解除劳动关系一次性补偿收入计税（当地上年社平 3 倍内免税）
//! - 劳务报酬预扣预缴（三级累进预扣率）

use bigdecimal::{BigDecimal, ToPrimitive};
use std::str::FromStr;

// ── 常量 ──────────────────────────────────────────

/// 基本减除费用（每月 5000 元，起征点）
pub const BASIC_DEDUCTION_MONTHLY: i64 = 5000;

/// 基本减除费用（每年 60000 元）
pub const BASIC_DEDUCTION_ANNUAL: i64 = 60000;

/// 7 级年度综合所得税率表（年度应纳税所得额）
/// (下界元, 税率%, 速算扣除数元)
pub const ANNUAL_COMPREHENSIVE_BRACKETS: [(i64, u32, i64); 7] = [
    (0, 3, 0),
    (36000, 10, 2520),
    (144000, 20, 16920),
    (300000, 25, 31920),
    (420000, 30, 52920),
    (660000, 35, 85920),
    (960000, 45, 181920),
];

/// 月度税率表（用于年终奖单独计税 / 非居民个人）
pub const MONTHLY_TAX_BRACKETS: [(i64, u32, i64); 7] = [
    (0, 3, 0),
    (3000, 10, 210),
    (12000, 20, 1410),
    (25000, 25, 2660),
    (35000, 30, 4410),
    (55000, 35, 7160),
    (80000, 45, 15160),
];

/// 劳务报酬预扣率表（三级，按次/按月）
/// (应纳税所得额下界, 预扣率%, 速算扣除数)
pub const LABOR_SERVICE_BRACKETS: [(i64, u32, i64); 3] =
    [(0, 20, 0), (20000, 30, 2000), (50000, 40, 7000)];

// ── 辅助 ──────────────────────────────────────────

fn bd(s: &str) -> BigDecimal {
    BigDecimal::from_str(s).unwrap_or_default()
}

/// 在给定档位表中计算税额（通用）
fn tax_by_brackets(taxable_yuan: &BigDecimal, brackets: &[(i64, u32, i64)]) -> BigDecimal {
    let income_i64 = match taxable_yuan.to_i64() {
        Some(v) => v,
        None => return bd("0"),
    };
    if income_i64 <= 0 {
        return bd("0");
    }
    for (lower, rate, deduction) in brackets.iter().rev() {
        if income_i64 > *lower {
            let rate_bd = BigDecimal::from(*rate) / bd("100");
            let deduct_bd = BigDecimal::from(*deduction);
            let tax = taxable_yuan * &rate_bd - deduct_bd;
            return tax.max(bd("0"));
        }
    }
    bd("0")
}

// ── 1. 累计预扣预缴（居民个人综合所得月度）───────────

/// 累计预扣单月输入
#[derive(Debug, Clone)]
pub struct CumulativeWithholdingInput {
    /// 截至本月累计税前工资（含加班/奖金等）
    pub cumulative_gross_salary: BigDecimal,
    /// 截至上月累计已预扣预缴税额
    pub cumulative_withheld_tax: BigDecimal,
    /// 累计专项扣除（社保公积金个人部分，每月累加）
    pub cumulative_special_deductions: BigDecimal,
    /// 累计专项附加扣除（子女教育/房贷/赡养老人等，每月累加）
    pub cumulative_additional_special_deductions: BigDecimal,
    /// 其他法定累计扣除（如企业年金/商业健康险/税延养老等）
    pub cumulative_other_deductions: BigDecimal,
    /// 纳税月份（1..12），用于确定累计减除费用 = 5000 * month_index
    pub month_index: u32,
}

#[derive(Debug, Clone)]
pub struct CumulativeWithholdingResult {
    /// 累计应纳税所得额
    pub cumulative_taxable_income: BigDecimal,
    /// 累计应纳税额
    pub cumulative_tax: BigDecimal,
    /// 当月应预扣预缴税额（非负）
    pub monthly_withholding: BigDecimal,
    // （当月税后实发 = 当月 gross - 当月社保 - 当月 withholding，需调用方补齐）
}

/// 累计预扣预缴（主入口）
///
/// 公式：
///   累计应纳税所得 = 累计工资 - 5000*N - 累计专项扣除 - 累计专项附加扣除 - 其他累计扣除
///   累计应纳税    = 年度税率表(累计应纳税所得)
///   本月预扣      = max(累计应纳税 - 已累计预扣, 0)
pub fn cumulative_withholding(input: &CumulativeWithholdingInput) -> CumulativeWithholdingResult {
    let month = if input.month_index == 0 {
        1
    } else {
        input.month_index.min(12)
    };
    let cumulative_basic = BigDecimal::from(BASIC_DEDUCTION_MONTHLY) * BigDecimal::from(month);

    let cumulative_taxable = (&input.cumulative_gross_salary
        - &cumulative_basic
        - &input.cumulative_special_deductions
        - &input.cumulative_additional_special_deductions
        - &input.cumulative_other_deductions)
        .max(bd("0"));

    let cumulative_tax = tax_by_brackets(&cumulative_taxable, &ANNUAL_COMPREHENSIVE_BRACKETS);

    let monthly = (&cumulative_tax - &input.cumulative_withheld_tax).max(bd("0"));

    CumulativeWithholdingResult {
        cumulative_taxable_income: cumulative_taxable,
        cumulative_tax,
        monthly_withholding: monthly,
    }
}

// ── 2. 全年一次性奖金 ───────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AnnualBonusMethod {
    /// 单独计税（不并入当年综合所得；除以 12 找月度税率表）
    /// 2027-12-31 前政策可继续使用（财政部 税务总局公告 2023 年第 30 号）
    Separate,
    /// 并入当年综合所得
    MergeIntoComprehensive,
}

/// 一次性奖金单独计税
///   步骤：
///     1. quotient = bonus / 12
///     2. 按 quotient 查月度税率表得到 (rate, deduction)
///     3. 税额 = bonus * rate - deduction
fn annual_bonus_separate_tax(bonus: &BigDecimal) -> BigDecimal {
    if *bonus <= bd("0") {
        return bd("0");
    }
    let quotient = bonus / bd("12");
    // 月度税率表用「商数」匹配档位（按分计算实务常见做法：此处保留 BigDecimal 精度）
    // 但查表用 i64 会截断小数，导致 36001/12 = 3000.0833... → 3000 而非 3001，落入错误档位
    // 改为：逐档检查 quotient > lower 时进入该档；用 BigDecimal 比较
    let (rate_pct, deduct) = {
        let mut found = (3u32, 0i64);
        for (lower, rate, ded) in MONTHLY_TAX_BRACKETS.iter().rev() {
            let lower_bd = BigDecimal::from(*lower);
            if quotient > lower_bd {
                found = (*rate, *ded);
                break;
            }
        }
        found
    };

    let tax = bonus * (BigDecimal::from(rate_pct) / bd("100")) - BigDecimal::from(deduct);
    tax.max(bd("0"))
}

#[derive(Debug, Clone)]
pub struct AnnualBonusOutput {
    pub tax: BigDecimal,
    pub net_bonus: BigDecimal,
    pub method: AnnualBonusMethod,
    /// 若为并入方式，返回「综合所得中追加的应纳税所得额」
    pub additional_taxable_for_merge: Option<BigDecimal>,
}

/// 年终奖计算（两种方式）
///
/// - `Separate`: 仅依赖 bonus 本身，返回 tax 与 net
/// - `MergeIntoComprehensive`: 把 bonus 加到综合所得中，返回与「税前综合 + 专项附加等扣除」
///   配合使用的 `additional_taxable_for_merge`（= bonus，可作为调用方并入项）；
///   另外返回基于合并档位估算的「税额增量」：
///     `tax_incr = comprehensive_tax(annual + bonus, ...) - comprehensive_tax(annual, ...)`
///   这里我们把年度综合所得相关参数作为 `merge_ctx` 传入。
pub fn calculate_annual_bonus(
    bonus: &BigDecimal,
    method: AnnualBonusMethod,
    merge_ctx: Option<&AnnualComprehensiveContext>,
) -> AnnualBonusOutput {
    match method {
        AnnualBonusMethod::Separate => {
            let tax = annual_bonus_separate_tax(bonus);
            let net = (bonus - &tax).max(bd("0"));
            AnnualBonusOutput {
                tax,
                net_bonus: net,
                method,
                additional_taxable_for_merge: None,
            }
        }
        AnnualBonusMethod::MergeIntoComprehensive => {
            let ctx = merge_ctx.unwrap();
            // 合并前后的年度综合应纳税所得
            let taxable_before = ctx.annual_taxable();
            let taxable_after = (&taxable_before + bonus).max(bd("0"));
            let tax_before = tax_by_brackets(&taxable_before, &ANNUAL_COMPREHENSIVE_BRACKETS);
            let tax_after = tax_by_brackets(&taxable_after, &ANNUAL_COMPREHENSIVE_BRACKETS);
            let incremental = (tax_after - tax_before).max(bd("0"));
            let net = (bonus - &incremental).max(bd("0"));
            AnnualBonusOutput {
                tax: incremental,
                net_bonus: net,
                method,
                additional_taxable_for_merge: Some(bonus.clone()),
            }
        }
    }
}

/// 并入综合所得时调用方给出的「年度综合所得」上下文
#[derive(Debug, Clone)]
pub struct AnnualComprehensiveContext {
    /// 年度工资薪金（不含本次奖金）
    pub annual_gross: BigDecimal,
    /// 年度专项扣除（社保公积金个人累计）
    pub annual_special_deductions: BigDecimal,
    /// 年度专项附加扣除累计
    pub annual_additional_special_deductions: BigDecimal,
    /// 其他扣除累计
    pub annual_other_deductions: BigDecimal,
}

impl AnnualComprehensiveContext {
    /// 年度应纳税所得 = gross - 60000 - 专项扣除 - 专项附加 - 其他
    pub fn annual_taxable(&self) -> BigDecimal {
        (&self.annual_gross
            - BigDecimal::from(BASIC_DEDUCTION_ANNUAL)
            - &self.annual_special_deductions
            - &self.annual_additional_special_deductions
            - &self.annual_other_deductions)
            .max(bd("0"))
    }
}

// ── 3. 解除劳动关系一次性补偿收入 ──────────────────

/// 解除劳动关系一次性补偿收入计税
///
/// 规则：超过「当地上年职工平均工资 3 倍」的部分，不并入当年综合所得，
///   单独适用综合所得税率表计税。
pub fn calculate_severance_tax(
    severance: &BigDecimal,
    local_previous_year_average: &BigDecimal,
) -> BigDecimal {
    if *severance <= bd("0") {
        return bd("0");
    }
    let exempt = local_previous_year_average * bd("3");
    let taxable = (severance - exempt).max(bd("0"));
    tax_by_brackets(&taxable, &ANNUAL_COMPREHENSIVE_BRACKETS)
}

// ── 4. 劳务报酬预扣预缴 ────────────────────────────

/// 劳务报酬预扣预缴（居民个人按次/按月）
///
/// 收入额 =
///   - 每次收入 ≤ 4000：收入 - 800
///   - 每次收入 >  4000：收入 × (1-20%)
/// 应纳税额 = 收入额 × 预扣率 - 速算扣除数
pub fn labor_service_withholding(lump_sum_income: &BigDecimal) -> BigDecimal {
    if *lump_sum_income <= bd("0") {
        return bd("0");
    }
    let income_amount = if *lump_sum_income <= bd("4000") {
        (lump_sum_income - bd("800")).max(bd("0"))
    } else {
        lump_sum_income * bd("0.8")
    };
    tax_by_brackets(&income_amount, &LABOR_SERVICE_BRACKETS)
}

// ── 单元测试 ───────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn bd(s: &str) -> BigDecimal {
        BigDecimal::from_str(s).unwrap_or_default()
    }

    fn approx_eq(a: &BigDecimal, b: &BigDecimal, eps: &str) -> bool {
        (a - b).abs() <= bd(eps)
    }

    // ── 累计预扣：简单单月（1 月）──────

    #[test]
    fn test_cumulative_month_1_typical_10k() {
        // 月工资 10000，1 月：基本减除 5000，专项扣除 2250，专项附加 1000（子女教育）
        let r = cumulative_withholding(&CumulativeWithholdingInput {
            cumulative_gross_salary: bd("10000"),
            cumulative_withheld_tax: bd("0"),
            cumulative_special_deductions: bd("2250"),
            cumulative_additional_special_deductions: bd("1000"),
            cumulative_other_deductions: bd("0"),
            month_index: 1,
        });
        // 应纳税所得 = 10000 - 5000 - 2250 - 1000 = 1750 → 3% 档 → 52.5
        assert!(approx_eq(&r.cumulative_taxable_income, &bd("1750"), "0.01"));
        assert!(approx_eq(&r.monthly_withholding, &bd("52.5"), "0.01"));
    }

    // ── 累计预扣：3 个月累计验证税率跳档前 ──

    #[test]
    fn test_cumulative_month_3_salary_12k_no_additional() {
        // 月薪 12000，社保公积 3000/月，无专项附加
        let r = cumulative_withholding(&CumulativeWithholdingInput {
            cumulative_gross_salary: bd("36000"),
            cumulative_withheld_tax: bd("240"), // 1 月(120) + 2 月(120) = 240
            cumulative_special_deductions: bd("9000"), // 3000 * 3
            cumulative_additional_special_deductions: bd("0"),
            cumulative_other_deductions: bd("0"),
            month_index: 3,
        });
        // 累计应纳税 = 36000 - 15000 - 9000 = 12000 → 12000 * 3% = 360
        // 本月预扣 = 360 - 240 = 120
        assert_eq!(r.cumulative_taxable_income, bd("12000"));
        assert_eq!(r.monthly_withholding, bd("120"));
    }

    // ── 累计预扣：跳档到 10%（36000 以上）──

    #[test]
    fn test_cumulative_jump_to_10_percent_bracket() {
        // 假设累计应纳税所得恰好 40000（跨进第二档）
        // 税率表：40000 * 10% - 2520 = 1480
        let r = cumulative_withholding(&CumulativeWithholdingInput {
            cumulative_gross_salary: bd("100000"),
            cumulative_withheld_tax: bd("1000"),
            cumulative_special_deductions: bd("20000"),
            cumulative_additional_special_deductions: bd("5000"),
            cumulative_other_deductions: bd("0"),
            month_index: 6, // 基本 30000
        });
        // 应纳税所得: 100k - 30k - 20k - 5k = 45000
        // 45000 * 10% - 2520 = 1980; 本月预扣: 1980 - 1000 = 980
        assert_eq!(r.cumulative_taxable_income, bd("45000"));
        assert_eq!(r.monthly_withholding, bd("980"));
    }

    // ── 累计预扣：已预扣过多本月为 0 ──

    #[test]
    fn test_monthly_withholding_capped_at_zero() {
        let r = cumulative_withholding(&CumulativeWithholdingInput {
            cumulative_gross_salary: bd("10000"),
            cumulative_withheld_tax: bd("1000"), // 已预扣过多
            cumulative_special_deductions: bd("2000"),
            cumulative_additional_special_deductions: bd("1000"),
            cumulative_other_deductions: bd("0"),
            month_index: 2, // 基本 10000
        });
        // 应纳税所得: 10000 - 10000 - 2000 - 1000 → 0
        assert_eq!(r.cumulative_taxable_income, bd("0"));
        assert_eq!(r.monthly_withholding, bd("0"));
    }

    // ── 累计预扣：month_index 越界（0→1，>12→12）──

    #[test]
    fn test_month_index_zero_normalized_to_1() {
        let r = cumulative_withholding(&CumulativeWithholdingInput {
            cumulative_gross_salary: bd("10000"),
            cumulative_withheld_tax: bd("0"),
            cumulative_special_deductions: bd("0"),
            cumulative_additional_special_deductions: bd("0"),
            cumulative_other_deductions: bd("0"),
            month_index: 0,
        });
        // 应纳税 = 10000 - 5000 = 5000 → 150
        assert_eq!(r.monthly_withholding, bd("150"));
    }

    #[test]
    fn test_month_index_13_capped_at_12() {
        let r = cumulative_withholding(&CumulativeWithholdingInput {
            cumulative_gross_salary: bd("0"),
            cumulative_withheld_tax: bd("0"),
            cumulative_special_deductions: bd("0"),
            cumulative_additional_special_deductions: bd("0"),
            cumulative_other_deductions: bd("0"),
            month_index: 13,
        });
        // 基本减除 60000
        assert_eq!(r.cumulative_taxable_income, bd("0"));
    }

    // ── 年终奖单独计税：小案例 36000 ──

    #[test]
    fn test_annual_bonus_separate_36000() {
        // 36000 / 12 = 3000 → 档 3%/0 → 税 1080
        let r = calculate_annual_bonus(&bd("36000"), AnnualBonusMethod::Separate, None);
        assert_eq!(r.tax, bd("1080"));
        assert_eq!(r.net_bonus, bd("34920"));
        assert!(matches!(r.method, AnnualBonusMethod::Separate));
    }

    // ── 年终奖单独计税：36001 落入第二档（注意档位跳档）──

    #[test]
    fn test_annual_bonus_separate_36001_bracket_jump() {
        // 36001 / 12 = 3000.08 → 第 2 档 10% / 210
        // 税 = 36001 * 10% - 210 = 3390.1
        let r = calculate_annual_bonus(&bd("36001"), AnnualBonusMethod::Separate, None);
        assert!(approx_eq(&r.tax, &bd("3390.1"), "0.001"));
    }

    // ── 年终奖单独计税：14.4 万 ──

    #[test]
    fn test_annual_bonus_separate_144000() {
        // 144000/12 = 12000 → 10% / 210 = 税 14400 - 210 = 14190
        let r = calculate_annual_bonus(&bd("144000"), AnnualBonusMethod::Separate, None);
        assert_eq!(r.tax, bd("14190"));
    }

    // ── 年终奖并入综合所得：增量计算 ──

    #[test]
    fn test_annual_bonus_merge_into_comprehensive_incremental() {
        // 已综合所得应纳税 100000（已扣完 60k + 专项），奖金 50000
        // before: 100000 → 100000 * 10% - 2520 = 7480
        // after:  150000 → 150000 * 20% - 16920 = 13080
        // 增量 = 13080 - 7480 = 5600
        let ctx = AnnualComprehensiveContext {
            annual_gross: bd("200000"), // 任意 gross
            annual_special_deductions: bd("30000"),
            annual_additional_special_deductions: bd("10000"),
            annual_other_deductions: bd("0"),
            // annual_taxable = 200000 - 60000 - 30000 - 10000 = 100000 ✓
        };
        assert_eq!(ctx.annual_taxable(), bd("100000"));
        let r = calculate_annual_bonus(
            &bd("50000"),
            AnnualBonusMethod::MergeIntoComprehensive,
            Some(&ctx),
        );
        assert_eq!(r.tax, bd("5600"));
        assert_eq!(r.additional_taxable_for_merge, Some(bd("50000")));
    }

    // ── 年终奖 0 或负数防护 ──

    #[test]
    fn test_annual_bonus_zero_or_negative_safe() {
        let r1 = calculate_annual_bonus(&bd("0"), AnnualBonusMethod::Separate, None);
        assert_eq!(r1.tax, bd("0"));
        assert_eq!(r1.net_bonus, bd("0"));
        let r2 = calculate_annual_bonus(&bd("-100"), AnnualBonusMethod::Separate, None);
        assert_eq!(r2.tax, bd("0"));
    }

    // ── 解除劳动关系：低于 3×社平均免税 ──

    #[test]
    fn test_severance_within_exempt_is_zero() {
        // 上年社平 10000 → 3 倍 30000，补偿 25000
        let t = calculate_severance_tax(&bd("25000"), &bd("10000"));
        assert_eq!(t, bd("0"));
    }

    // ── 解除劳动关系：超过部分按综合税率 ──

    #[test]
    fn test_severance_over_exempt_taxed() {
        // 社平 10000，免税额 30000；补偿 150000 → 应税 120000 → 档 10% 2520
        // 120000 * 10% - 2520 = 9480
        let t = calculate_severance_tax(&bd("150000"), &bd("10000"));
        assert_eq!(t, bd("9480"));
    }

    // ── 解除劳动关系：负数防护 ──

    #[test]
    fn test_severance_negative_safe() {
        assert_eq!(calculate_severance_tax(&bd("-100"), &bd("10000")), bd("0"));
    }

    // ── 劳务报酬：≤ 4000 扣 800 ──

    #[test]
    fn test_labor_service_3000_low_band() {
        // 3000 - 800 = 2200 → 2200 * 20% = 440
        assert_eq!(labor_service_withholding(&bd("3000")), bd("440"));
    }

    // ── 劳务报酬：> 4000 打八折，三档 ──

    #[test]
    fn test_labor_service_10000_normal_20pct() {
        // 10000 * 0.8 = 8000 → 20% = 1600
        assert_eq!(labor_service_withholding(&bd("10000")), bd("1600"));
    }

    #[test]
    fn test_labor_service_30000_mid_band_30pct() {
        // 30000 * 0.8 = 24000 → 档 2：30% / 2000
        // 24000 * 30% - 2000 = 5200
        assert_eq!(labor_service_withholding(&bd("30000")), bd("5200"));
    }

    #[test]
    fn test_labor_service_100000_high_band_40pct() {
        // 100000 * 0.8 = 80000 → 档 3：40% / 7000
        // 80000 * 40% - 7000 = 25000
        assert_eq!(labor_service_withholding(&bd("100000")), bd("25000"));
    }

    // ── 劳务报酬：收入为 800 时刚好为 0 ──

    #[test]
    fn test_labor_service_exactly_800_is_zero_tax() {
        assert_eq!(labor_service_withholding(&bd("800")), bd("0"));
    }

    // ── 劳务报酬：负数/0 ──

    #[test]
    fn test_labor_service_negative_safe() {
        assert_eq!(labor_service_withholding(&bd("0")), bd("0"));
        assert_eq!(labor_service_withholding(&bd("-100")), bd("0"));
    }

    // ── 档位表通用：档位下界严格比较（> lower） ──

    #[test]
    fn test_tax_bracket_exactly_lower_uses_prev_tier() {
        // 应税正好 36000 → 3% 档（不含 36000 边界时会落入下一档；我们实现中是 > 36000 才进入下一档）
        // 所以 36000 * 3% = 1080
        assert_eq!(
            tax_by_brackets(&bd("36000"), &ANNUAL_COMPREHENSIVE_BRACKETS),
            bd("1080")
        );
    }

    #[test]
    fn test_tax_bracket_0_or_negative_is_0() {
        assert_eq!(
            tax_by_brackets(&bd("0"), &ANNUAL_COMPREHENSIVE_BRACKETS),
            bd("0")
        );
        assert_eq!(
            tax_by_brackets(&bd("-500"), &ANNUAL_COMPREHENSIVE_BRACKETS),
            bd("0")
        );
    }

    // ── 年终奖：政策"雷区"（多发 1 元少拿数千）演示 ──

    #[test]
    fn test_bonus_trap_144000_vs_144001_demonstrates_regressive() {
        // 144000 → 税 14190（144000*10%-210）→ 净 129810
        // 144001 → 税 144001*20%-1410 = 27390.2 → 净 116610.8（反而少 13199.2）
        let r_a = calculate_annual_bonus(&bd("144000"), AnnualBonusMethod::Separate, None);
        let r_b = calculate_annual_bonus(&bd("144001"), AnnualBonusMethod::Separate, None);
        assert!(approx_eq(&r_a.net_bonus, &bd("129810"), "0.01"));
        assert!(approx_eq(&r_b.tax, &bd("27390.2"), "0.01"));
        assert!(approx_eq(&r_b.net_bonus, &bd("116610.8"), "0.01"));
        // 多发 1 元，税后反而少拿了
        assert!(r_a.net_bonus > r_b.net_bonus);
    }
}
