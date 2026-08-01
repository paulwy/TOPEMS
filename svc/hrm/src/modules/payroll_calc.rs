//! 薪资计算纯函数模块
//! 参考：国税发〔2018〕164 号《个人所得税法》
//! 21.75 天/月、8 小时/日为国标折算系数（劳社部发〔2008〕3 号）

use bigdecimal::{BigDecimal, ToPrimitive};
use std::str::FromStr;

/// 月度起征点（元）
pub const MONTHLY_THRESHOLD: i64 = 5000;

/// 年度起征点（元）= 5000 × 12
pub const ANNUAL_THRESHOLD: i64 = 60000;

/// 7 级累进税率表（年度综合所得）
/// (应纳税所得额下界元, 税率%, 速算扣除数元)
pub const ANNUAL_TAX_BRACKETS: [(i64, u32, i64); 7] = [
    (0, 3, 0),
    (36000, 10, 2520),
    (144000, 20, 16920),
    (300000, 25, 31920),
    (420000, 30, 52920),
    (660000, 35, 85920),
    (960000, 45, 181920),
];

/// 工作日折算系数（劳社部发〔2008〕3 号）
pub const MONTHLY_WORK_DAYS: f64 = 21.75;
pub const DAILY_WORK_HOURS: f64 = 8.0;

/// 日类型
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DayType {
    /// 工作日 1.5x
    Weekday,
    /// 休息日 2x
    RestDay,
    /// 法定节假日 3x
    StatutoryHoliday,
}

impl DayType {
    /// 加班倍率
    pub fn overtime_multiplier(&self) -> f64 {
        match self {
            DayType::Weekday => 1.5,
            DayType::RestDay => 2.0,
            DayType::StatutoryHoliday => 3.0,
        }
    }
}

/// 扣款策略
#[derive(Debug, Clone)]
pub struct DeductionPolicy {
    /// 迟到免费阈值（分钟）
    pub late_free_minutes: u32,
    /// 迟到扣款（元）
    pub late_fee: BigDecimal,
    /// 早退按日薪比例扣（每分钟比例）
    pub early_leave_per_minute_rate: BigDecimal,
    /// 旷工按日薪倍数扣
    pub absent_daily_multiplier: BigDecimal,
}

impl Default for DeductionPolicy {
    fn default() -> Self {
        Self {
            late_free_minutes: 30,
            late_fee: BigDecimal::from(50),
            early_leave_per_minute_rate: BigDecimal::from_str("0.01").unwrap_or_default(),
            absent_daily_multiplier: BigDecimal::from(3),
        }
    }
}

/// 计算时薪 = 月薪 / 21.75 / 8
pub fn hourly_rate(monthly_salary: &BigDecimal) -> BigDecimal {
    let days = BigDecimal::try_from(MONTHLY_WORK_DAYS).unwrap_or_else(|_| BigDecimal::from(22));
    let hours = BigDecimal::try_from(DAILY_WORK_HOURS).unwrap_or_else(|_| BigDecimal::from(8));
    if days == BigDecimal::from(0) || hours == BigDecimal::from(0) {
        return BigDecimal::from(0);
    }
    monthly_salary / (days * hours)
}

/// 计算日薪 = 月薪 / 21.75
pub fn daily_rate(monthly_salary: &BigDecimal) -> BigDecimal {
    let days = BigDecimal::try_from(MONTHLY_WORK_DAYS).unwrap_or_else(|_| BigDecimal::from(22));
    if days == BigDecimal::from(0) {
        return BigDecimal::from(0);
    }
    monthly_salary / days
}

/// 加班费计算
pub fn overtime_pay(hours: &BigDecimal, hourly_rate: &BigDecimal, day_type: DayType) -> BigDecimal {
    let multiplier = BigDecimal::try_from(day_type.overtime_multiplier())
        .unwrap_or_else(|_| BigDecimal::from(1));
    hours * hourly_rate * multiplier
}

/// 考勤异常扣款
pub fn attendance_deduction(
    late_minutes: u32,
    early_leave_minutes: u32,
    is_absent: bool,
    absent_days: u32,
    daily_salary: &BigDecimal,
    policy: &DeductionPolicy,
) -> BigDecimal {
    let mut total = BigDecimal::from(0);

    // 迟到扣款
    if late_minutes > policy.late_free_minutes {
        total += &policy.late_fee;
    }

    // 早退扣款（按日薪比例）
    if early_leave_minutes > 0 {
        let minutes_bd = BigDecimal::from(early_leave_minutes);
        total += &(&minutes_bd * &policy.early_leave_per_minute_rate * daily_salary);
    }

    // 旷工扣款
    if is_absent && absent_days > 0 {
        let days_bd = BigDecimal::from(absent_days);
        total += &(&days_bd * &policy.absent_daily_multiplier * daily_salary);
    }

    total
}

/// 累进税额计算（基于速算扣除数）
/// 输入：应纳税所得额（元），返回：税额（元）
pub fn progressive_tax(taxable_income: &BigDecimal) -> BigDecimal {
    let income_i64 = taxable_income.to_i64().unwrap_or(0);
    if income_i64 <= 0 {
        return BigDecimal::from(0);
    }

    // 找到对应档位
    for (lower, rate, deduction) in ANNUAL_TAX_BRACKETS.iter().rev() {
        if income_i64 > *lower {
            let rate_bd = BigDecimal::from(*rate) / BigDecimal::from(100);
            let deduction_bd = BigDecimal::from(*deduction);
            let tax = (taxable_income * &rate_bd) - deduction_bd;
            return tax.max(BigDecimal::from(0));
        }
    }
    BigDecimal::from(0)
}

/// 累计预扣预缴个税计算
///
/// # 参数
/// - `cumulative_taxable_income`: 累计应纳税所得额（已减除累计减除费用、专项扣除、专项附加扣除）
/// - `cumulative_withheld_tax`: 截至上月累计已预扣预缴税额
///
/// # 返回
/// - 当月应预扣预缴税额（≥ 0）
pub fn monthly_withholding_tax(
    cumulative_taxable_income: &BigDecimal,
    cumulative_withheld_tax: &BigDecimal,
) -> BigDecimal {
    if *cumulative_taxable_income <= BigDecimal::from(0) {
        return BigDecimal::from(0);
    }

    // 累计应纳税额
    let cumulative_tax = progressive_tax(cumulative_taxable_income);

    // 当月应预扣 = 累计应纳税 - 已预扣
    let withholding = &cumulative_tax - cumulative_withheld_tax;
    withholding.max(BigDecimal::from(0))
}

/// 计算月度应纳税所得额
/// = 月度收入 - 5000（起征点）- 专项扣除（社保公积金个人部分）- 专项附加扣除
pub fn monthly_taxable_income(
    monthly_income: &BigDecimal,
    social_insurance_personal: &BigDecimal,
    housing_fund_personal: &BigDecimal,
    special_deductions: &BigDecimal,
) -> BigDecimal {
    let threshold = BigDecimal::from(MONTHLY_THRESHOLD);
    let total_deductions =
        threshold + social_insurance_personal + housing_fund_personal + special_deductions;
    (monthly_income - total_deductions).max(BigDecimal::from(0))
}

/// 社保公积金计算
#[derive(Debug, Clone)]
pub struct InsuranceConfig {
    /// 养老保险个人比例
    pub pension_personal: BigDecimal,
    /// 医疗保险个人比例
    pub medical_personal: BigDecimal,
    /// 失业保险个人比例
    pub unemployment_personal: BigDecimal,
    /// 公积金个人比例
    pub housing_fund_personal: BigDecimal,
    /// 缴费基数下限
    pub base_min: BigDecimal,
    /// 缴费基数上限
    pub base_max: BigDecimal,
}

impl Default for InsuranceConfig {
    fn default() -> Self {
        // 默认比例（仅示例，实际应按城市配置）
        Self {
            pension_personal: BigDecimal::from_str("0.08").unwrap_or_default(),
            medical_personal: BigDecimal::from_str("0.02").unwrap_or_default(),
            unemployment_personal: BigDecimal::from_str("0.005").unwrap_or_default(),
            housing_fund_personal: BigDecimal::from_str("0.12").unwrap_or_default(),
            base_min: BigDecimal::from(3000),
            base_max: BigDecimal::from(30000),
        }
    }
}

#[derive(Debug, Clone)]
pub struct InsuranceResult {
    /// 缴费基数（clamp 到上下限）
    pub base: BigDecimal,
    /// 养老保险个人
    pub pension: BigDecimal,
    /// 医疗保险个人
    pub medical: BigDecimal,
    /// 失业保险个人
    pub unemployment: BigDecimal,
    /// 公积金个人
    pub housing_fund: BigDecimal,
    /// 个人合计
    pub total_personal: BigDecimal,
}

/// 计算社保公积金（个人部分）
pub fn calculate_insurance(
    monthly_salary: &BigDecimal,
    config: &InsuranceConfig,
) -> InsuranceResult {
    // 缴费基数 clamp（max(&) / min(&) 在 &BigDecimal 上返回引用，
    // 此处显式比较以产出 owned BigDecimal，便于后续运算与结构体赋值）
    let base = if monthly_salary < &config.base_min {
        config.base_min.clone()
    } else if monthly_salary > &config.base_max {
        config.base_max.clone()
    } else {
        monthly_salary.clone()
    };

    let pension = &base * &config.pension_personal;
    let medical = &base * &config.medical_personal;
    let unemployment = &base * &config.unemployment_personal;
    let housing_fund = &base * &config.housing_fund_personal;

    let total_personal = &pension + &medical + &unemployment + &housing_fund;

    InsuranceResult {
        base,
        pension,
        medical,
        unemployment,
        housing_fund,
        total_personal,
    }
}

/// 完整薪资计算
#[derive(Debug, Clone)]
pub struct PayrollInput {
    pub monthly_salary: BigDecimal,
    pub overtime_hours: BigDecimal,
    pub overtime_day_type: DayType,
    pub late_minutes: u32,
    pub early_leave_minutes: u32,
    pub is_absent: bool,
    pub absent_days: u32,
    pub special_deductions: BigDecimal, // 专项附加扣除（子女教育等）
    pub insurance_config: InsuranceConfig,
    pub deduction_policy: DeductionPolicy,
}

#[derive(Debug, Clone)]
pub struct PayrollResult {
    pub base_salary: BigDecimal,
    pub overtime_pay: BigDecimal,
    pub gross_salary: BigDecimal,
    pub insurance_personal: BigDecimal,
    pub attendance_deduction: BigDecimal,
    pub taxable_income: BigDecimal,
    pub income_tax: BigDecimal,
    pub net_salary: BigDecimal,
}

/// 完整薪资计算（单月，不累计）
pub fn calculate_monthly_payroll(input: &PayrollInput) -> PayrollResult {
    let hourly = hourly_rate(&input.monthly_salary);
    let daily = daily_rate(&input.monthly_salary);

    // 加班费
    let ot_pay = overtime_pay(&input.overtime_hours, &hourly, input.overtime_day_type);

    // 应发工资 = 基本工资 + 加班费
    let gross = &input.monthly_salary + &ot_pay;

    // 社保公积金（个人）
    let insurance = calculate_insurance(&input.monthly_salary, &input.insurance_config);

    // 考勤扣款
    let deduction = attendance_deduction(
        input.late_minutes,
        input.early_leave_minutes,
        input.is_absent,
        input.absent_days,
        &daily,
        &input.deduction_policy,
    );

    // 应纳税所得额 = 月收入 - 5000 - 社保公积金个人 - 专项附加扣除
    let taxable = monthly_taxable_income(
        &gross,
        &insurance.total_personal,
        &BigDecimal::from(0), // 公积金已在 insurance 中
        &input.special_deductions,
    );

    // 个税（单月简化版，非累计预扣）
    let tax = progressive_tax(&taxable);

    // 实发 = 应发 - 社保个人 - 考勤扣款 - 个税
    let net = &gross - &insurance.total_personal - &deduction - &tax;

    PayrollResult {
        base_salary: input.monthly_salary.clone(),
        overtime_pay: ot_pay,
        gross_salary: gross,
        insurance_personal: insurance.total_personal,
        attendance_deduction: deduction,
        taxable_income: taxable,
        income_tax: tax,
        net_salary: net,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn bd(s: &str) -> BigDecimal {
        BigDecimal::from_str(s).unwrap()
    }

    // ========== 时薪/日薪 ==========

    #[test]
    fn test_hourly_rate_normal() {
        let r = hourly_rate(&bd("10000"));
        // 10000 / 21.75 / 8 ≈ 57.47
        let f = r.to_f64().unwrap();
        assert!((f - 57.47).abs() < 0.01);
    }

    #[test]
    fn test_daily_rate_normal() {
        let r = daily_rate(&bd("10000"));
        // 10000 / 21.75 ≈ 459.77
        let f = r.to_f64().unwrap();
        assert!((f - 459.77).abs() < 0.01);
    }

    #[test]
    fn test_hourly_rate_zero_salary() {
        let r = hourly_rate(&bd("0"));
        assert_eq!(r, BigDecimal::from(0));
    }

    // ========== 加班费 ==========

    #[test]
    fn test_overtime_weekday_2_hours() {
        let rate = bd("50");
        let pay = overtime_pay(&bd("2"), &rate, DayType::Weekday);
        // 2 × 50 × 1.5 = 150
        assert_eq!(pay, bd("150"));
    }

    #[test]
    fn test_overtime_restday_8_hours() {
        let rate = bd("50");
        let pay = overtime_pay(&bd("8"), &rate, DayType::RestDay);
        // 8 × 50 × 2 = 800
        assert_eq!(pay, bd("800"));
    }

    #[test]
    fn test_overtime_holiday_1_hour() {
        let rate = bd("50");
        let pay = overtime_pay(&bd("1"), &rate, DayType::StatutoryHoliday);
        // 1 × 50 × 3 = 150
        assert_eq!(pay, bd("150"));
    }

    #[test]
    fn test_overtime_zero_hours() {
        let rate = bd("50");
        let pay = overtime_pay(&bd("0"), &rate, DayType::Weekday);
        assert_eq!(pay, BigDecimal::from(0));
    }

    // ========== 考勤扣款 ==========

    #[test]
    fn test_attendance_late_within_free_threshold() {
        let daily = bd("460");
        let policy = DeductionPolicy::default();
        let deduction = attendance_deduction(29, 0, false, 0, &daily, &policy);
        assert_eq!(deduction, BigDecimal::from(0));
    }

    #[test]
    fn test_attendance_late_exceeds_threshold() {
        let daily = bd("460");
        let policy = DeductionPolicy::default();
        let deduction = attendance_deduction(31, 0, false, 0, &daily, &policy);
        assert_eq!(deduction, BigDecimal::from(50));
    }

    #[test]
    fn test_attendance_absent_1_day() {
        let daily = bd("460");
        let policy = DeductionPolicy::default();
        // 旷工 1 天 × 3 倍 = 1380
        let deduction = attendance_deduction(0, 0, true, 1, &daily, &policy);
        let f = deduction.to_f64().unwrap();
        assert!((f - 1380.0).abs() < 0.01);
    }

    #[test]
    fn test_attendance_no_issues() {
        let daily = bd("460");
        let policy = DeductionPolicy::default();
        let deduction = attendance_deduction(0, 0, false, 0, &daily, &policy);
        assert_eq!(deduction, BigDecimal::from(0));
    }

    // ========== 累进税 ==========

    #[test]
    fn test_progressive_tax_zero_income() {
        assert_eq!(progressive_tax(&bd("0")), BigDecimal::from(0));
    }

    #[test]
    fn test_progressive_tax_first_bracket() {
        // 36000 × 3% - 0 = 1080
        let tax = progressive_tax(&bd("36000"));
        let f = tax.to_f64().unwrap();
        assert!((f - 1080.0).abs() < 0.01);
    }

    #[test]
    fn test_progressive_tax_second_bracket() {
        // 144000 × 10% - 2520 = 11880
        let tax = progressive_tax(&bd("144000"));
        let f = tax.to_f64().unwrap();
        assert!((f - 11880.0).abs() < 0.01);
    }

    #[test]
    fn test_progressive_tax_top_bracket() {
        // 1000000 × 45% - 181920 = 268080
        let tax = progressive_tax(&bd("1000000"));
        let f = tax.to_f64().unwrap();
        assert!((f - 268080.0).abs() < 1.0);
    }

    #[test]
    fn test_progressive_tax_negative_returns_zero() {
        assert_eq!(progressive_tax(&bd("-100")), BigDecimal::from(0));
    }

    // ========== 月度应纳税所得额 ==========

    #[test]
    fn test_monthly_taxable_income_below_threshold() {
        // 月薪 4000 < 5000 起征点
        let taxable = monthly_taxable_income(&bd("4000"), &bd("0"), &bd("0"), &bd("0"));
        assert_eq!(taxable, BigDecimal::from(0));
    }

    #[test]
    fn test_monthly_taxable_income_with_deductions() {
        // 10000 - 5000 - 2000(社保) - 0 - 1000(专项附加) = 2000
        let taxable = monthly_taxable_income(&bd("10000"), &bd("2000"), &bd("0"), &bd("1000"));
        assert_eq!(taxable, bd("2000"));
    }

    // ========== 累计预扣 ==========

    #[test]
    fn test_withholding_tax_first_month() {
        // 1月：累计应纳税所得额 = 3000，已预扣 = 0
        // 累计税额 = 3000 × 3% = 90
        // 当月预扣 = 90 - 0 = 90
        let tax = monthly_withholding_tax(&bd("3000"), &bd("0"));
        let f = tax.to_f64().unwrap();
        assert!((f - 90.0).abs() < 0.01);
    }

    #[test]
    fn test_withholding_tax_cumulative() {
        // 2月：累计应纳税所得额 = 6000，1月已预扣 = 90
        // 累计税额 = 6000 × 3% = 180
        // 当月预扣 = 180 - 90 = 90
        let tax = monthly_withholding_tax(&bd("6000"), &bd("90"));
        let f = tax.to_f64().unwrap();
        assert!((f - 90.0).abs() < 0.01);
    }

    #[test]
    fn test_withholding_tax_already_withheld_exceeds() {
        // 已预扣 ≥ 应纳税 → 当月补 0
        let tax = monthly_withholding_tax(&bd("3000"), &bd("200"));
        assert_eq!(tax, BigDecimal::from(0));
    }

    // ========== 社保公积金 ==========

    #[test]
    fn test_insurance_normal_salary() {
        let config = InsuranceConfig::default();
        let r = calculate_insurance(&bd("10000"), &config);
        // 基数 = 10000（在 3000-30000 范围内）
        assert_eq!(r.base, bd("10000"));
        // 养老 = 10000 × 8% = 800
        let pension = r.pension.to_f64().unwrap();
        assert!((pension - 800.0).abs() < 0.01);
        // 合计 = 800 + 200 + 50 + 1200 = 2250
        let total = r.total_personal.to_f64().unwrap();
        assert!((total - 2250.0).abs() < 0.01);
    }

    #[test]
    fn test_insurance_below_min_base() {
        let config = InsuranceConfig::default();
        let r = calculate_insurance(&bd("2000"), &config);
        // 基数应为下限 3000
        assert_eq!(r.base, bd("3000"));
    }

    #[test]
    fn test_insurance_above_max_base() {
        let config = InsuranceConfig::default();
        let r = calculate_insurance(&bd("50000"), &config);
        // 基数应为上限 30000
        assert_eq!(r.base, bd("30000"));
    }

    // ========== 完整薪资计算 ==========

    #[test]
    fn test_full_payroll_low_salary() {
        let input = PayrollInput {
            monthly_salary: bd("4000"),
            overtime_hours: bd("0"),
            overtime_day_type: DayType::Weekday,
            late_minutes: 0,
            early_leave_minutes: 0,
            is_absent: false,
            absent_days: 0,
            special_deductions: bd("0"),
            insurance_config: InsuranceConfig::default(),
            deduction_policy: DeductionPolicy::default(),
        };
        let result = calculate_monthly_payroll(&input);
        // 月薪 4000 < 5000 起征点 → 个税 = 0
        assert_eq!(result.income_tax, BigDecimal::from(0));
        // 实发 = 4000 - 社保 - 0 - 0
        let net = result.net_salary.to_f64().unwrap();
        // 社保基数 = 4000（在 3000-30000 范围内，不触发 clamp）
        // 养老 4000×8%=320, 医疗 4000×2%=80, 失业 4000×0.5%=20, 公积金 4000×12%=480
        // 合计 = 900
        assert!((net - (4000.0 - 900.0)).abs() < 0.5);
    }

    #[test]
    fn test_full_payroll_with_overtime() {
        let input = PayrollInput {
            monthly_salary: bd("10000"),
            overtime_hours: bd("10"),
            overtime_day_type: DayType::Weekday,
            late_minutes: 0,
            early_leave_minutes: 0,
            is_absent: false,
            absent_days: 0,
            special_deductions: bd("1000"),
            insurance_config: InsuranceConfig::default(),
            deduction_policy: DeductionPolicy::default(),
        };
        let result = calculate_monthly_payroll(&input);
        // 时薪 = 10000/21.75/8 ≈ 57.47
        // 加班费 = 10 × 57.47 × 1.5 ≈ 862.07
        let ot = result.overtime_pay.to_f64().unwrap();
        assert!((ot - 862.07).abs() < 1.0);
        // 应发 = 10000 + 862.07 = 10862.07
        let gross = result.gross_salary.to_f64().unwrap();
        assert!((gross - 10862.07).abs() < 1.0);
    }
}
