//! 设备稼动率 & 产能 & 维护周期 纯计算函数
//!
//! 从以下 handler 中提取的内联业务逻辑：
//! - `process_flow.rs::analyze_capacity` — 理论产能 / 有效产能 / 利用率 / 瓶颈识别
//! - `equipment.rs::create_equipment` — 下次维护日期推导
//! - `equipment_oee.rs::get_equipment_efficiency_analysis` — 效率分级（统一阈值）
//!
//! OEE 三因子核心计算复用 `oee_logic.rs`，本模块仅补充产能/利用率/瓶颈/维护等周边逻辑。

use chrono::NaiveDate;

// ── 产能计算 ───────────────────────────────────────

/// 理论产能 = 可用时间 / 单件标准工时
///
/// 提取自 `process_flow.rs:1116`（原 `480.0 / total_time`）
///
/// - available_minutes ≤ 0 或 standard_time_per_unit ≤ 0 → 0.0
pub fn theoretical_capacity(available_minutes: f64, standard_time_per_unit: f64) -> f64 {
    if available_minutes <= 0.0 || standard_time_per_unit <= 0.0 {
        return 0.0;
    }
    available_minutes / standard_time_per_unit
}

/// 有效产能 = 理论产能 × 综合效率系数
///
/// 提取自 `process_flow.rs:1122`（原 `theoretical * 0.85`）
pub fn effective_capacity(theoretical: f64, efficiency_factor: f64) -> f64 {
    if theoretical <= 0.0 || efficiency_factor <= 0.0 {
        return 0.0;
    }
    theoretical * efficiency_factor.min(1.0)
}

/// 利用率 = 实际产出 / 理论产能 × 100
///
/// 提取自 `process_flow.rs:1123`（原 `(flow_capacity / theoretical) * 100`）
pub fn utilization_rate(actual_output: f64, theoretical: f64) -> f64 {
    if theoretical <= 0.0 {
        return 0.0;
    }
    ((actual_output / theoretical) * 100.0).min(100.0)
}

// ── 瓶颈识别 ───────────────────────────────────────

/// 工序步骤产能数据
#[derive(Debug, Clone)]
pub struct StepCapacity {
    pub step_name: String,
    pub standard_time: f64,
    pub capacity: f64,
    pub utilization: f64,
}

/// 瓶颈识别：返回利用率最高的工序步骤
///
/// 提取自 `process_flow.rs:1133-1152`
pub fn find_bottleneck_step(steps: &[StepCapacity]) -> Option<&StepCapacity> {
    steps.iter().max_by(|a, b| {
        a.utilization
            .partial_cmp(&b.utilization)
            .unwrap_or(std::cmp::Ordering::Equal)
    })
}

/// 单步骤产能 = 可用时间 / 单步骤标准工时
pub fn step_capacity(available_minutes: f64, step_standard_time: f64) -> f64 {
    theoretical_capacity(available_minutes, step_standard_time)
}

/// 单步骤利用率 = 流程总产出 / 单步骤产能 × 100
pub fn step_utilization_rate(flow_output: f64, step_cap: f64) -> f64 {
    utilization_rate(flow_output, step_cap)
}

// ── 设备效率分级 ───────────────────────────────────

/// 设备效率等级（统一阈值，解决 `equipment_oee.rs` 与 `oee_logic.rs` 不一致问题）
///
/// 阈值：
///   - OEE ≥ 85% → Excellent
///   - OEE ≥ 75% → Good
///   - OEE ≥ 60% → Fair
///   - OEE <  60% → Poor
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EquipmentEfficiencyLevel {
    Excellent,
    Good,
    Fair,
    Poor,
}

impl EquipmentEfficiencyLevel {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Excellent => "excellent",
            Self::Good => "good",
            Self::Fair => "fair",
            Self::Poor => "poor",
        }
    }
}

/// 根据OEE值判定设备效率等级
///
/// 输入应为 0.0 ~ 100.0 的百分比
/// 统一阈值（修复 `equipment_oee.rs:1060` 用小数 0.85 与 `oee_logic.rs` 用整数 85 的不一致）
pub fn classify_equipment_efficiency(oee_percent: f64) -> EquipmentEfficiencyLevel {
    if oee_percent >= 85.0 {
        EquipmentEfficiencyLevel::Excellent
    } else if oee_percent >= 75.0 {
        EquipmentEfficiencyLevel::Good
    } else if oee_percent >= 60.0 {
        EquipmentEfficiencyLevel::Fair
    } else {
        EquipmentEfficiencyLevel::Poor
    }
}

// ── 设备维护日期 ───────────────────────────────────

/// 计算下次维护日期 = 基准日 + 维护周期天数
///
/// 提取自 `equipment.rs:334-337`
///   原逻辑：`purchase_date + chrono::Duration::days(maintenance_cycle)`
pub fn calculate_next_maintenance_date(
    base_date: NaiveDate,
    maintenance_cycle_days: i64,
) -> NaiveDate {
    if maintenance_cycle_days <= 0 {
        return base_date;
    }
    base_date + chrono::Duration::days(maintenance_cycle_days)
}

/// 计算默认下次维护日期（基准日 + 30 天）
///
/// 提取自 `equipment.rs:585-587`（原硬编码 30 天）
pub fn default_next_maintenance_date(base_date: NaiveDate) -> NaiveDate {
    base_date + chrono::Duration::days(30)
}

/// 判断设备是否需要维护（距上次维护已超过周期）
///
/// 返回 true 表示已过期或今日到期
pub fn is_maintenance_due(
    last_maintenance_date: NaiveDate,
    maintenance_cycle_days: i64,
    today: NaiveDate,
) -> bool {
    if maintenance_cycle_days <= 0 {
        return false;
    }
    let next = calculate_next_maintenance_date(last_maintenance_date, maintenance_cycle_days);
    today >= next
}

// ── 设备停机率 ─────────────────────────────────────

/// 停机率 = 停机时间 / 计划时间 × 100
pub fn downtime_rate(planned_time: f64, downtime: f64) -> f64 {
    if planned_time <= 0.0 {
        return 0.0;
    }
    ((downtime / planned_time) * 100.0).min(100.0)
}

// ── 设备综合效率对比 ───────────────────────────────

/// OEE 对比结果
#[derive(Debug, Clone)]
pub struct OeeComparison {
    pub current_oee: f64,
    pub previous_oee: f64,
    pub delta: f64,
    /// "improving" / "declining" / "stable"（±3.0 阈值）
    pub trend: &'static str,
}

/// 对比两期 OEE 值，返回变化量和趋势
pub fn compare_oee_periods(current: f64, previous: Option<f64>) -> OeeComparison {
    let prev = previous.unwrap_or(current);
    let delta = current - prev;
    let trend = if delta > 3.0 {
        "improving"
    } else if delta < -3.0 {
        "declining"
    } else {
        "stable"
    };
    OeeComparison {
        current_oee: current,
        previous_oee: prev,
        delta,
        trend,
    }
}

// ── 单元测试 ───────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // ── theoretical_capacity ───────────────────

    #[test]
    fn test_theoretical_capacity_480_div_2() {
        assert_eq!(theoretical_capacity(480.0, 2.0), 240.0);
    }

    #[test]
    fn test_theoretical_capacity_zero_time_safe() {
        assert_eq!(theoretical_capacity(0.0, 2.0), 0.0);
    }

    #[test]
    fn test_theoretical_capacity_zero_standard_safe() {
        assert_eq!(theoretical_capacity(480.0, 0.0), 0.0);
    }

    #[test]
    fn test_theoretical_capacity_negative_safe() {
        assert_eq!(theoretical_capacity(-100.0, 2.0), 0.0);
    }

    // ── effective_capacity ─────────────────────

    #[test]
    fn test_effective_capacity_85pct() {
        assert_eq!(effective_capacity(240.0, 0.85), 204.0);
    }

    #[test]
    fn test_effective_capacity_factor_over_1_clamped() {
        // 系数 > 1 钳制为 1.0
        assert_eq!(effective_capacity(240.0, 1.5), 240.0);
    }

    #[test]
    fn test_effective_capacity_zero_theoretical() {
        assert_eq!(effective_capacity(0.0, 0.85), 0.0);
    }

    // ── utilization_rate ───────────────────────

    #[test]
    fn test_utilization_normal() {
        assert_eq!(utilization_rate(180.0, 240.0), 75.0);
    }

    #[test]
    fn test_utilization_full() {
        assert_eq!(utilization_rate(240.0, 240.0), 100.0);
    }

    #[test]
    fn test_utilization_over_theoretical_clamped() {
        assert_eq!(utilization_rate(300.0, 240.0), 100.0);
    }

    #[test]
    fn test_utilization_zero_theoretical_safe() {
        assert_eq!(utilization_rate(100.0, 0.0), 0.0);
    }

    // ── bottleneck ─────────────────────────────

    #[test]
    fn test_bottleneck_finds_highest_utilization() {
        let steps = vec![
            StepCapacity {
                step_name: "step1".into(),
                standard_time: 2.0,
                capacity: 240.0,
                utilization: 50.0,
            },
            StepCapacity {
                step_name: "step2".into(),
                standard_time: 3.0,
                capacity: 160.0,
                utilization: 90.0,
            },
            StepCapacity {
                step_name: "step3".into(),
                standard_time: 1.0,
                capacity: 480.0,
                utilization: 30.0,
            },
        ];
        let b = find_bottleneck_step(&steps).unwrap();
        assert_eq!(b.step_name, "step2");
        assert_eq!(b.utilization, 90.0);
    }

    #[test]
    fn test_bottleneck_empty_returns_none() {
        assert!(find_bottleneck_step(&[]).is_none());
    }

    #[test]
    fn test_bottleneck_single_step() {
        let steps = vec![StepCapacity {
            step_name: "only".into(),
            standard_time: 1.0,
            capacity: 100.0,
            utilization: 50.0,
        }];
        assert_eq!(find_bottleneck_step(&steps).unwrap().step_name, "only");
    }

    // ── step_capacity & step_utilization ───────

    #[test]
    fn test_step_capacity_normal() {
        assert_eq!(step_capacity(480.0, 4.0), 120.0);
    }

    #[test]
    fn test_step_utilization_normal() {
        assert_eq!(step_utilization_rate(60.0, 120.0), 50.0);
    }

    // ── classify_equipment_efficiency ──────────

    #[test]
    fn test_efficiency_excellent_85() {
        assert_eq!(
            classify_equipment_efficiency(85.0),
            EquipmentEfficiencyLevel::Excellent
        );
    }

    #[test]
    fn test_efficiency_excellent_95() {
        assert_eq!(
            classify_equipment_efficiency(95.0),
            EquipmentEfficiencyLevel::Excellent
        );
    }

    #[test]
    fn test_efficiency_good_75() {
        assert_eq!(
            classify_equipment_efficiency(75.0),
            EquipmentEfficiencyLevel::Good
        );
    }

    #[test]
    fn test_efficiency_good_80() {
        assert_eq!(
            classify_equipment_efficiency(80.0),
            EquipmentEfficiencyLevel::Good
        );
    }

    #[test]
    fn test_efficiency_fair_60() {
        assert_eq!(
            classify_equipment_efficiency(60.0),
            EquipmentEfficiencyLevel::Fair
        );
    }

    #[test]
    fn test_efficiency_fair_65() {
        assert_eq!(
            classify_equipment_efficiency(65.0),
            EquipmentEfficiencyLevel::Fair
        );
    }

    #[test]
    fn test_efficiency_poor_below_60() {
        assert_eq!(
            classify_equipment_efficiency(59.9),
            EquipmentEfficiencyLevel::Poor
        );
    }

    #[test]
    fn test_efficiency_poor_zero() {
        assert_eq!(
            classify_equipment_efficiency(0.0),
            EquipmentEfficiencyLevel::Poor
        );
    }

    #[test]
    fn test_efficiency_level_as_str() {
        assert_eq!(EquipmentEfficiencyLevel::Excellent.as_str(), "excellent");
        assert_eq!(EquipmentEfficiencyLevel::Poor.as_str(), "poor");
    }

    // ── maintenance dates ──────────────────────

    #[test]
    fn test_next_maintenance_90_days() {
        let base = NaiveDate::from_ymd_opt(2025, 1, 1).unwrap();
        let next = calculate_next_maintenance_date(base, 90);
        assert_eq!(next, NaiveDate::from_ymd_opt(2025, 4, 1).unwrap());
    }

    #[test]
    fn test_next_maintenance_zero_cycle_returns_base() {
        let base = NaiveDate::from_ymd_opt(2025, 6, 1).unwrap();
        assert_eq!(calculate_next_maintenance_date(base, 0), base);
    }

    #[test]
    fn test_next_maintenance_negative_cycle_returns_base() {
        let base = NaiveDate::from_ymd_opt(2025, 6, 1).unwrap();
        assert_eq!(calculate_next_maintenance_date(base, -30), base);
    }

    #[test]
    fn test_default_next_maintenance_30_days() {
        let base = NaiveDate::from_ymd_opt(2025, 6, 1).unwrap();
        let next = default_next_maintenance_date(base);
        assert_eq!(next, NaiveDate::from_ymd_opt(2025, 7, 1).unwrap());
    }

    #[test]
    fn test_maintenance_due_overdue() {
        let last = NaiveDate::from_ymd_opt(2025, 1, 1).unwrap();
        let today = NaiveDate::from_ymd_opt(2025, 4, 15).unwrap(); // > 90 天
        assert!(is_maintenance_due(last, 90, today));
    }

    #[test]
    fn test_maintenance_due_today_is_due() {
        let last = NaiveDate::from_ymd_opt(2025, 1, 1).unwrap();
        let today = NaiveDate::from_ymd_opt(2025, 4, 1).unwrap(); // 恰好 90 天
        assert!(is_maintenance_due(last, 90, today));
    }

    #[test]
    fn test_maintenance_not_yet_due() {
        let last = NaiveDate::from_ymd_opt(2025, 1, 1).unwrap();
        let today = NaiveDate::from_ymd_opt(2025, 2, 1).unwrap(); // 仅 31 天
        assert!(!is_maintenance_due(last, 90, today));
    }

    #[test]
    fn test_maintenance_zero_cycle_never_due() {
        let last = NaiveDate::from_ymd_opt(2025, 1, 1).unwrap();
        let today = NaiveDate::from_ymd_opt(2030, 1, 1).unwrap();
        assert!(!is_maintenance_due(last, 0, today));
    }

    // ── downtime_rate ──────────────────────────

    #[test]
    fn test_downtime_rate_normal() {
        assert_eq!(downtime_rate(480.0, 60.0), 12.5);
    }

    #[test]
    fn test_downtime_rate_zero_planned_safe() {
        assert_eq!(downtime_rate(0.0, 60.0), 0.0);
    }

    #[test]
    fn test_downtime_rate_exceeds_planned_clamped() {
        assert_eq!(downtime_rate(100.0, 200.0), 100.0);
    }

    // ── compare_oee_periods ────────────────────

    #[test]
    fn test_oee_comparison_improving() {
        let c = compare_oee_periods(80.0, Some(70.0));
        assert_eq!(c.delta, 10.0);
        assert_eq!(c.trend, "improving");
    }

    #[test]
    fn test_oee_comparison_declining() {
        let c = compare_oee_periods(60.0, Some(75.0));
        assert_eq!(c.delta, -15.0);
        assert_eq!(c.trend, "declining");
    }

    #[test]
    fn test_oee_comparison_stable_within_threshold() {
        let c = compare_oee_periods(72.0, Some(70.0));
        assert_eq!(c.delta, 2.0);
        assert_eq!(c.trend, "stable");
    }

    #[test]
    fn test_oee_comparison_no_previous_defaults_to_stable() {
        let c = compare_oee_periods(80.0, None);
        assert_eq!(c.delta, 0.0);
        assert_eq!(c.trend, "stable");
    }

    #[test]
    fn test_oee_comparison_exact_3_threshold_stable() {
        // delta == 3.0 不超过阈值 → stable
        let c = compare_oee_periods(73.0, Some(70.0));
        assert_eq!(c.trend, "stable");
    }

    #[test]
    fn test_oee_comparison_exact_neg3_threshold_stable() {
        let c = compare_oee_periods(67.0, Some(70.0));
        assert_eq!(c.trend, "stable");
    }
}
