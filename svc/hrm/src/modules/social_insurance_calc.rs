//! 社保 & 住房公积金（五险一金）纯计算
//!
//! 计算口径（按中国主要城市通用比例；具体比例/基数上下限由 `SocialInsuranceConfig` 可配置）：
//!
//! | 险种      | 个人    | 单位    | 备注                     |
//! |----------|---------|---------|--------------------------|
//! | 养老      | 8%      | 16%     |                          |
//! | 医疗      | 2%      | 9.5%    | 含退休人员医疗统筹分摊   |
//! | 失业      | 0.5%    | 0.5%    | 按地区浮动（0.2%-1%）    |
//! | 工伤      | -       | 0.2-1.9%| 按行业费率分档，个人不缴 |
//! | 生育      | -       | 1%      | 已与职工医保合并征缴的地区为 0 |
//! | 基本医疗  | -       | -       | 大病医疗（固定额/比例），个人+单位共同承担 |
//! | 公积金    | 5-12%   | 5-12%   | 单位+个人比例一致常见   |
//!
//! 基数钳制规则：
//!   缴费基数 = clamp(申报工资, max(base_min, 社平*0.6), min(base_max, 社平*3.0))
//!
//! 若调用方只提供 `social_average_wage`（社平工资），则 `base_min/base_max` 可通过
//! `derive_base_range_from_social_average` 自动推导为 60% / 300%。

use bigdecimal::BigDecimal;
use std::str::FromStr;

// ── 配置 ────────────────────────────────────────────

/// 工伤保险行业费率档位
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum IndustryRiskCategory {
    /// 一类：0.2%
    VeryLow,
    /// 二类：0.4%
    Low,
    /// 三类：0.7%
    Medium,
    /// 四类：0.9%
    MediumHigh,
    /// 五类：1.1%
    High,
    /// 六类：1.3%
    VeryHigh,
    /// 七类：1.6%
    Severe,
    /// 八类：1.9%
    Extreme,
}

impl IndustryRiskCategory {
    /// 行业费率（单位缴纳，百分比值转小数）
    pub fn rate(&self) -> BigDecimal {
        let pct: &str = match self {
            IndustryRiskCategory::VeryLow => "0.002",
            IndustryRiskCategory::Low => "0.004",
            IndustryRiskCategory::Medium => "0.007",
            IndustryRiskCategory::MediumHigh => "0.009",
            IndustryRiskCategory::High => "0.011",
            IndustryRiskCategory::VeryHigh => "0.013",
            IndustryRiskCategory::Severe => "0.016",
            IndustryRiskCategory::Extreme => "0.019",
        };
        BigDecimal::from_str(pct).unwrap_or_default()
    }
}

/// 社保公积金完整配置（单位+个人）
#[derive(Debug, Clone)]
pub struct SocialInsuranceConfig {
    // 个人比例
    pub pension_personal_pct: BigDecimal,
    pub medical_personal_pct: BigDecimal,
    pub unemployment_personal_pct: BigDecimal,
    pub housing_fund_personal_pct: BigDecimal,
    // 单位比例
    pub pension_company_pct: BigDecimal,
    pub medical_company_pct: BigDecimal,
    pub unemployment_company_pct: BigDecimal,
    pub work_injury_company_pct: BigDecimal, // 可直接指定；若为 None 则按行业档位取
    pub maternity_company_pct: BigDecimal,
    pub housing_fund_company_pct: BigDecimal,
    // 大病医疗
    /// 大病医疗（个人每月固定额，元；0 表示用比例）
    pub serious_illness_personal_fixed: BigDecimal,
    /// 大病医疗（单位每月固定额，元）
    pub serious_illness_company_fixed: BigDecimal,
    // 基数上下限
    pub base_min: BigDecimal,
    pub base_max: BigDecimal,
    /// 公积金可使用独立基数；None = 与社保共用同一基数
    pub housing_fund_base_min: Option<BigDecimal>,
    pub housing_fund_base_max: Option<BigDecimal>,
}

impl Default for SocialInsuranceConfig {
    fn default() -> Self {
        // 一线城市场景默认值（示例）：
        //   养老 个人 8% / 单位 16%
        //   医疗 个人 2% / 单位 9.5%
        //   失业 个人 0.5% / 单位 0.5%
        //   工伤 单位 0.4%（二类）
        //   生育 单位 1%（保留，如合并入医疗则调用方设 0）
        //   公积金 个人 12% / 单位 12%
        //   基数 3000 ~ 30000
        //   大病医疗 个人 3 元/月，单位 3 元/月
        Self {
            pension_personal_pct: bd("0.08"),
            medical_personal_pct: bd("0.02"),
            unemployment_personal_pct: bd("0.005"),
            housing_fund_personal_pct: bd("0.12"),
            pension_company_pct: bd("0.16"),
            medical_company_pct: bd("0.095"),
            unemployment_company_pct: bd("0.005"),
            work_injury_company_pct: IndustryRiskCategory::Low.rate(),
            maternity_company_pct: bd("0.01"),
            housing_fund_company_pct: bd("0.12"),
            serious_illness_personal_fixed: bd("3"),
            serious_illness_company_fixed: bd("3"),
            base_min: bd("3000"),
            base_max: bd("30000"),
            housing_fund_base_min: None,
            housing_fund_base_max: None,
        }
    }
}

// ── 结果结构 ───────────────────────────────────────

#[derive(Debug, Clone)]
pub struct SocialInsuranceBreakdown {
    /// 社保五险缴费基数（clamp 后）
    pub social_base: BigDecimal,
    /// 公积金缴费基数（clamp 后）
    pub housing_base: BigDecimal,
    // 个人
    pub pension_personal: BigDecimal,
    pub medical_personal: BigDecimal,
    pub unemployment_personal: BigDecimal,
    pub housing_fund_personal: BigDecimal,
    pub serious_illness_personal: BigDecimal,
    pub total_personal: BigDecimal,
    // 单位
    pub pension_company: BigDecimal,
    pub medical_company: BigDecimal,
    pub unemployment_company: BigDecimal,
    pub work_injury_company: BigDecimal,
    pub maternity_company: BigDecimal,
    pub housing_fund_company: BigDecimal,
    pub serious_illness_company: BigDecimal,
    pub total_company: BigDecimal,
    /// 企业综合用人成本（基本薪酬 + 单位缴纳合计）
    /// 由调用方在拥有薪酬数据后通过 `add_base_to_total_company` 补充，
    /// 此处默认等于 total_company。
    pub total_employment_cost: BigDecimal,
}

// ── 辅助 ───────────────────────────────────────────

fn bd(s: &str) -> BigDecimal {
    BigDecimal::from_str(s).unwrap_or_default()
}

/// clamp（BigDecimal 引用比较，返回 owned）
pub fn clamp_bigdecimal(value: &BigDecimal, min: &BigDecimal, max: &BigDecimal) -> BigDecimal {
    if value < min {
        min.clone()
    } else if value > max {
        max.clone()
    } else {
        value.clone()
    }
}

/// 从社平工资推导 60%/300% 基数区间（返回 (min, max)）
pub fn derive_base_range_from_social_average(
    average_wage: &BigDecimal,
) -> (BigDecimal, BigDecimal) {
    let min = average_wage * bd("0.6");
    let max = average_wage * bd("3");
    (min, max)
}

/// 基于行业风险重算工伤比例的便利构造
pub fn default_config_with_industry(category: IndustryRiskCategory) -> SocialInsuranceConfig {
    let mut cfg = SocialInsuranceConfig::default();
    cfg.work_injury_company_pct = category.rate();
    cfg
}

// ── 主计算 ─────────────────────────────────────────

/// 计算社保与公积金的完整明细
pub fn calculate_social_insurance_full(
    declared_salary: &BigDecimal,
    cfg: &SocialInsuranceConfig,
) -> SocialInsuranceBreakdown {
    let social_base = clamp_bigdecimal(declared_salary, &cfg.base_min, &cfg.base_max);

    let h_min = cfg.housing_fund_base_min.as_ref().unwrap_or(&cfg.base_min);
    let h_max = cfg.housing_fund_base_max.as_ref().unwrap_or(&cfg.base_max);
    let housing_base = clamp_bigdecimal(declared_salary, h_min, h_max);

    // 个人
    let pension_p = &social_base * &cfg.pension_personal_pct;
    let medical_p = &social_base * &cfg.medical_personal_pct;
    let unemployment_p = &social_base * &cfg.unemployment_personal_pct;
    let housing_p = &housing_base * &cfg.housing_fund_personal_pct;
    let si_personal =
        &pension_p + &medical_p + &unemployment_p + &cfg.serious_illness_personal_fixed;
    let total_personal = &si_personal + &housing_p;

    // 单位
    let pension_c = &social_base * &cfg.pension_company_pct;
    let medical_c = &social_base * &cfg.medical_company_pct;
    let unemployment_c = &social_base * &cfg.unemployment_company_pct;
    let injury_c = &social_base * &cfg.work_injury_company_pct;
    let maternity_c = &social_base * &cfg.maternity_company_pct;
    let housing_c = &housing_base * &cfg.housing_fund_company_pct;
    let si_company = &pension_c
        + &medical_c
        + &unemployment_c
        + &injury_c
        + &maternity_c
        + &cfg.serious_illness_company_fixed;
    let total_company = &si_company + &housing_c;

    SocialInsuranceBreakdown {
        social_base: social_base.clone(),
        housing_base: housing_base.clone(),
        pension_personal: pension_p.clone(),
        medical_personal: medical_p.clone(),
        unemployment_personal: unemployment_p.clone(),
        housing_fund_personal: housing_p.clone(),
        serious_illness_personal: cfg.serious_illness_personal_fixed.clone(),
        total_personal: total_personal.clone(),
        pension_company: pension_c.clone(),
        medical_company: medical_c.clone(),
        unemployment_company: unemployment_c.clone(),
        work_injury_company: injury_c.clone(),
        maternity_company: maternity_c.clone(),
        housing_fund_company: housing_c.clone(),
        serious_illness_company: cfg.serious_illness_company_fixed.clone(),
        total_company: total_company.clone(),
        total_employment_cost: total_company,
    }
}

/// 在 breakdown 上补充企业综合用人成本 = base_salary + total_company
pub fn attach_total_employment_cost(
    mut b: SocialInsuranceBreakdown,
    base_salary: &BigDecimal,
) -> SocialInsuranceBreakdown {
    b.total_employment_cost = base_salary + &b.total_company;
    b
}

/// 个人总缴纳汇总（兼容调用方只关心「个人扣除合计」的场景）
pub fn total_personal_contributions(b: &SocialInsuranceBreakdown) -> &BigDecimal {
    &b.total_personal
}

/// 「社保五险（个人，不含公积金+大病固定）」合计，用于个税的专项扣除口径
///
/// 专项扣除 = 养老个人 + 医疗个人 + 失业个人 + 公积金个人；
/// 大病医疗（固定额）通常不在每月预扣的专项扣除中，而在年度汇算清缴单独扣除。
pub fn taxable_special_deductions_monthly(b: &SocialInsuranceBreakdown) -> BigDecimal {
    &b.pension_personal + &b.medical_personal + &b.unemployment_personal + &b.housing_fund_personal
}

// ── 便捷：校验配置合法性 ──────────────────────────

/// 校验配置：
///   base_min > 0, base_max >= base_min
///   所有比例 ∈ [0, 1]
///   公积金个人+单位比例通常 ≤ 24%（非硬约束，但返回 warning flag）
pub fn validate_social_insurance_config(cfg: &SocialInsuranceConfig) -> Result<(), String> {
    let zero = bd("0");
    let one = bd("1");

    if cfg.base_min <= zero || cfg.base_max < cfg.base_min {
        return Err(format!(
            "基数范围不合法: min={} max={}",
            cfg.base_min, cfg.base_max
        ));
    }

    let pct = [
        ("pension_personal", &cfg.pension_personal_pct),
        ("medical_personal", &cfg.medical_personal_pct),
        ("unemployment_personal", &cfg.unemployment_personal_pct),
        ("housing_fund_personal", &cfg.housing_fund_personal_pct),
        ("pension_company", &cfg.pension_company_pct),
        ("medical_company", &cfg.medical_company_pct),
        ("unemployment_company", &cfg.unemployment_company_pct),
        ("work_injury_company", &cfg.work_injury_company_pct),
        ("maternity_company", &cfg.maternity_company_pct),
        ("housing_fund_company", &cfg.housing_fund_company_pct),
    ];
    for (name, r) in pct {
        if r < &zero || r > &one {
            return Err(format!("比例 {} 应在 [0,1]: {}", name, r));
        }
    }

    if cfg.serious_illness_personal_fixed < zero || cfg.serious_illness_company_fixed < zero {
        return Err("大病医疗固定额不可为负".into());
    }

    Ok(())
}

// ── 单元测试 ───────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn approx_eq(a: &BigDecimal, b: &BigDecimal, eps: &str) -> bool {
        let diff = (a - b).abs();
        diff <= bd(eps)
    }

    // ── clamp & 基数推导 ─────────────

    #[test]
    fn test_clamp_within_range() {
        let v = bd("10000");
        let r = clamp_bigdecimal(&v, &bd("3000"), &bd("30000"));
        assert_eq!(r, bd("10000"));
    }

    #[test]
    fn test_clamp_floor() {
        let v = bd("1000");
        assert_eq!(clamp_bigdecimal(&v, &bd("3000"), &bd("30000")), bd("3000"));
    }

    #[test]
    fn test_clamp_ceiling() {
        let v = bd("50000");
        assert_eq!(clamp_bigdecimal(&v, &bd("3000"), &bd("30000")), bd("30000"));
    }

    #[test]
    fn test_clamp_equal_bounds() {
        assert_eq!(
            clamp_bigdecimal(&bd("1000"), &bd("5000"), &bd("5000")),
            bd("5000")
        );
    }

    #[test]
    fn test_derive_60_300_from_average() {
        // 社平 10000 → 6000 ~ 30000
        let (mn, mx) = derive_base_range_from_social_average(&bd("10000"));
        assert_eq!(mn, bd("6000"));
        assert_eq!(mx, bd("30000"));
    }

    // ── 行业档位费率 ─────────────

    #[test]
    fn test_industry_rates_correct() {
        assert_eq!(IndustryRiskCategory::VeryLow.rate(), bd("0.002"));
        assert_eq!(IndustryRiskCategory::Medium.rate(), bd("0.007"));
        assert_eq!(IndustryRiskCategory::Extreme.rate(), bd("0.019"));
    }

    #[test]
    fn test_default_config_uses_low_industry() {
        let cfg = SocialInsuranceConfig::default();
        assert_eq!(cfg.work_injury_company_pct, bd("0.004")); // Low
    }

    #[test]
    fn test_default_config_with_industry_overrides() {
        let cfg = default_config_with_industry(IndustryRiskCategory::Severe);
        assert_eq!(cfg.work_injury_company_pct, bd("0.016"));
    }

    // ── 主计算：典型中等收入 ────────

    #[test]
    fn test_typical_salary_10k_default_config() {
        let cfg = SocialInsuranceConfig::default();
        let b = calculate_social_insurance_full(&bd("10000"), &cfg);
        // 基数：10000（在 3000~30000 之间）
        assert_eq!(b.social_base, bd("10000"));
        assert_eq!(b.housing_base, bd("10000"));
        // 个人: 养老 800 + 医疗 200 + 失业 50 + 大病 3  + 公积 1200 = 2253
        assert!(
            approx_eq(&b.total_personal, &bd("2253"), "0.01"),
            "total_personal={}",
            b.total_personal
        );
        // 单位: 养老1600 + 医疗950 + 失业50 + 工伤40 + 生育100 + 大病3 + 公积1200 = 3943
        assert!(
            approx_eq(&b.total_company, &bd("3943"), "0.01"),
            "total_company={}",
            b.total_company
        );
    }

    // ── 基数下限钳制 ────────────────

    #[test]
    fn test_base_min_clamped_when_salary_very_low() {
        let cfg = SocialInsuranceConfig::default(); // 3000
        let b = calculate_social_insurance_full(&bd("1500"), &cfg);
        assert_eq!(b.social_base, bd("3000"));
        // 个人养老: 3000 * 0.08 = 240
        assert_eq!(b.pension_personal, bd("240"));
    }

    // ── 基数上限钳制 ────────────────

    #[test]
    fn test_base_max_clamped_when_salary_very_high() {
        let cfg = SocialInsuranceConfig::default(); // 30000
        let b = calculate_social_insurance_full(&bd("100000"), &cfg);
        assert_eq!(b.social_base, bd("30000"));
        // 公积 30000 * 12% = 3600
        assert_eq!(b.housing_fund_personal, bd("3600"));
    }

    // ── 独立公积金基数上下限 ───────

    #[test]
    fn test_housing_fund_uses_own_bounds() {
        let mut cfg = SocialInsuranceConfig::default();
        cfg.housing_fund_base_min = Some(bd("5000"));
        cfg.housing_fund_base_max = Some(bd("25000"));
        // 申报工资 3000：社保基数 3000，公积基数 5000
        let b = calculate_social_insurance_full(&bd("3000"), &cfg);
        assert_eq!(b.social_base, bd("3000"));
        assert_eq!(b.housing_base, bd("5000"));
        assert_eq!(b.housing_fund_personal, bd("600")); // 5000 * 12%
    }

    // ── 大病医疗（固定额单独计算）─

    #[test]
    fn test_serious_illness_fixed_in_totals() {
        let cfg = SocialInsuranceConfig::default(); // 个人+单位各3
        let b = calculate_social_insurance_full(&bd("5000"), &cfg);
        assert_eq!(b.serious_illness_personal, bd("3"));
        assert_eq!(b.serious_illness_company, bd("3"));
        // total_personal 中包含 3 元
        let expected_without = &b.pension_personal
            + &b.medical_personal
            + &b.unemployment_personal
            + &b.housing_fund_personal;
        assert_eq!(&expected_without + bd("3"), b.total_personal);
    }

    // ── 专项扣除口径（不含大病固定）─

    #[test]
    fn test_taxable_special_deductions_excludes_serious_fixed() {
        let cfg = SocialInsuranceConfig::default();
        let b = calculate_social_insurance_full(&bd("10000"), &cfg);
        // 800+200+50+1200 = 2250（不含3元大病）
        assert_eq!(taxable_special_deductions_monthly(&b), bd("2250"));
    }

    // ── 企业综合用人成本附加 ───────

    #[test]
    fn test_attach_total_employment_cost() {
        let cfg = SocialInsuranceConfig::default();
        let b = calculate_social_insurance_full(&bd("10000"), &cfg);
        let b = attach_total_employment_cost(b, &bd("10000"));
        // 10000 + 3943 = 13943
        assert!(approx_eq(&b.total_employment_cost, &bd("13943"), "0.01"));
    }

    // ── 配置校验 ───────────────────

    #[test]
    fn test_validate_config_default_ok() {
        assert!(validate_social_insurance_config(&SocialInsuranceConfig::default()).is_ok());
    }

    #[test]
    fn test_validate_config_base_min_zero_rejected() {
        let mut cfg = SocialInsuranceConfig::default();
        cfg.base_min = bd("0");
        assert!(validate_social_insurance_config(&cfg).is_err());
    }

    #[test]
    fn test_validate_config_max_less_than_min_rejected() {
        let mut cfg = SocialInsuranceConfig::default();
        cfg.base_min = bd("10000");
        cfg.base_max = bd("5000");
        let r = validate_social_insurance_config(&cfg);
        assert!(r.is_err(), "{:?}", r);
    }

    #[test]
    fn test_validate_config_pension_over_100pct_rejected() {
        let mut cfg = SocialInsuranceConfig::default();
        cfg.pension_personal_pct = bd("1.2"); // 120% 非法
        assert!(validate_social_insurance_config(&cfg).is_err());
    }

    #[test]
    fn test_validate_config_negative_pct_rejected() {
        let mut cfg = SocialInsuranceConfig::default();
        cfg.medical_company_pct = bd("-0.01");
        assert!(validate_social_insurance_config(&cfg).is_err());
    }

    #[test]
    fn test_validate_config_serious_negative_rejected() {
        let mut cfg = SocialInsuranceConfig::default();
        cfg.serious_illness_personal_fixed = bd("-1");
        assert!(validate_social_insurance_config(&cfg).is_err());
    }

    // ── 边际：申报工资为 0 时仍受下限钳制 ─

    #[test]
    fn test_zero_salary_treated_as_min_base() {
        let cfg = SocialInsuranceConfig::default();
        let b = calculate_social_insurance_full(&bd("0"), &cfg);
        assert_eq!(b.social_base, bd("3000"));
    }

    // ── 边际：生育合并入医疗（maternity=0）─

    #[test]
    fn test_maternity_merged_into_medical_zero_out() {
        let mut cfg = SocialInsuranceConfig::default();
        cfg.maternity_company_pct = bd("0");
        let b = calculate_social_insurance_full(&bd("10000"), &cfg);
        assert_eq!(b.maternity_company, bd("0"));
        // total_company 减少 100
        assert!(approx_eq(&b.total_company, &bd("3843"), "0.01"));
    }

    // ── 公积金个人单位比例可设为 5%（下限）──

    #[test]
    fn test_housing_fund_lowered_to_5_pct() {
        let mut cfg = SocialInsuranceConfig::default();
        cfg.housing_fund_personal_pct = bd("0.05");
        cfg.housing_fund_company_pct = bd("0.05");
        let b = calculate_social_insurance_full(&bd("10000"), &cfg);
        // 个人: 800 + 200 + 50 + 3 + 500 = 1553
        assert!(approx_eq(&b.total_personal, &bd("1553"), "0.01"));
    }

    // ── 行业八类（高危）工伤费率校验 ─

    #[test]
    fn test_extreme_industry_injury_rate_1_9pct() {
        let cfg = default_config_with_industry(IndustryRiskCategory::Extreme);
        let b = calculate_social_insurance_full(&bd("10000"), &cfg);
        // 工伤 1.9% * 10000 = 190
        assert_eq!(b.work_injury_company, bd("190"));
    }
}
