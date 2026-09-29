//! 工单 & 工序 & 报工 纯计算函数
//!
//! 从以下 handler 中提取的内联业务逻辑：
//! - `work_order.rs` — 工单状态流转（原由 SQL WHERE 强制）
//! - `production_record.rs` — 报工状态推导（原内联 `if end_time.is_some()`）
//! - `production_scheduling.rs` — 完成率计算（原内联 `completed / total * 100`）
//! - `models/work_report.rs` — 报工数量汇总（原缺失）

use chrono::{DateTime, Utc, NaiveDateTime};

// ── 完成率 & 进度 ──────────────────────────────────

/// 计算完成率（百分比 0.0 ~ 100.0）
///
/// - total ≤ 0 → 0.0
/// - completed > total → 钳制 100.0
/// - completed < 0 → 0.0
pub fn calculate_completion_rate(completed: f64, total: f64) -> f64 {
    if total <= 0.0 || !total.is_finite() {
        return 0.0;
    }
    let c = if completed < 0.0 { 0.0 } else { completed };
    ((c / total) * 100.0).min(100.0)
}

/// 剩余数量（非负钳制）
pub fn remaining_quantity(planned: f64, completed: f64) -> f64 {
    (planned - completed.max(0.0)).max(0.0)
}

/// 是否已完成（completed >= planned，且 planned > 0）
pub fn is_fully_completed(planned: f64, completed: f64) -> bool {
    planned > 0.0 && completed >= planned
}

// ── 工单状态流转 ───────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WorkOrderStatus {
    Pending,
    InProgress,
    Paused,
    Completed,
    Cancelled,
    Unknown,
}

impl WorkOrderStatus {
    pub fn from_str(s: &str) -> Self {
        match s {
            "pending" => Self::Pending,
            "in_progress" => Self::InProgress,
            "paused" => Self::Paused,
            "completed" => Self::Completed,
            "cancelled" => Self::Cancelled,
            _ => Self::Unknown,
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::InProgress => "in_progress",
            Self::Paused => "paused",
            Self::Completed => "completed",
            Self::Cancelled => "cancelled",
            Self::Unknown => "unknown",
        }
    }
}

/// 校验状态转移是否合法
///
/// 合法路径：
///   pending → in_progress
///   in_progress → paused / completed / cancelled
///   paused → in_progress / cancelled
///   pending → cancelled
///   其他 → 非法
pub fn is_valid_status_transition(from: &str, to: &str) -> bool {
    let f = WorkOrderStatus::from_str(from);
    let t = WorkOrderStatus::from_str(to);
    matches!(
        (f, t),
        (WorkOrderStatus::Pending, WorkOrderStatus::InProgress)
            | (WorkOrderStatus::Pending, WorkOrderStatus::Cancelled)
            | (WorkOrderStatus::InProgress, WorkOrderStatus::Paused)
            | (WorkOrderStatus::InProgress, WorkOrderStatus::Completed)
            | (WorkOrderStatus::InProgress, WorkOrderStatus::Cancelled)
            | (WorkOrderStatus::Paused, WorkOrderStatus::InProgress)
            | (WorkOrderStatus::Paused, WorkOrderStatus::Cancelled)
    )
}

/// 根据完成数量自动推导工单状态
///
/// - completed >= planned 且 planned > 0 → completed
/// - completed > 0 且 < planned → in_progress
/// - 其他 → 保持原状态
pub fn derive_status_from_quantity(
    planned: f64,
    completed: f64,
    current_status: &str,
) -> &'static str {
    if is_fully_completed(planned, completed) {
        return "completed";
    }
    if completed > 0.0 && completed < planned {
        return "in_progress";
    }
    // 保持原状态
    match WorkOrderStatus::from_str(current_status) {
        WorkOrderStatus::Completed => "completed",
        WorkOrderStatus::InProgress => "in_progress",
        WorkOrderStatus::Paused => "paused",
        WorkOrderStatus::Cancelled => "cancelled",
        _ => "pending",
    }
}

// ── 报工状态推导 ───────────────────────────────────

/// 根据是否有结束时间推导报工记录状态
///
/// 提取自 `production_record.rs:396` 内联逻辑
pub fn derive_record_status(has_end_time: bool) -> &'static str {
    if has_end_time {
        "completed"
    } else {
        "in_progress"
    }
}

// ── 报工数量汇总 ───────────────────────────────────

/// 报工数量汇总
#[derive(Debug, Clone, Copy)]
pub struct WorkReportSummary {
    pub quantity_good: f64,
    pub quantity_bad: f64,
    pub quantity_total: f64,
    pub pass_rate: f64,
    pub defect_rate: f64,
}

/// 计算报工汇总（合格数 + 不合格数 → 总数、合格率、不合格率）
///
/// 提取自 `models/work_report.rs` 缺失的汇总逻辑
pub fn calculate_work_report_summary(quantity_good: f64, quantity_bad: f64) -> WorkReportSummary {
    let good = quantity_good.max(0.0);
    let bad = quantity_bad.max(0.0);
    let total = good + bad;
    let (pass_rate, defect_rate) = if total > 0.0 {
        ((good / total) * 100.0, (bad / total) * 100.0)
    } else {
        (0.0, 0.0)
    };
    WorkReportSummary {
        quantity_good: good,
        quantity_bad: bad,
        quantity_total: total,
        pass_rate,
        defect_rate,
    }
}

// ── 工序时长计算 ───────────────────────────────────

/// 计算工序实际加工时长（分钟）
///
/// - start > end 或任一缺失 → 0
/// - 正常 → (end - start) 分钟
pub fn process_duration_minutes(start: Option<DateTime<Utc>>, end: Option<DateTime<Utc>>) -> i64 {
    match (start, end) {
        (Some(s), Some(e)) if e >= s => (e - s).num_minutes(),
        _ => 0,
    }
}

/// 工序标准工时与实际工时的偏差率（百分比）
///
/// - standard ≤ 0 → 0.0
/// - actual ≤ 0 → 0.0
/// - 偏差率 = (actual - standard) / standard * 100
///   - 正值表示超时，负值表示提前完成
pub fn duration_deviation_rate(standard_minutes: f64, actual_minutes: f64) -> f64 {
    if standard_minutes <= 0.0 || actual_minutes <= 0.0 {
        return 0.0;
    }
    ((actual_minutes - standard_minutes) / standard_minutes) * 100.0
}

// ── DateTime<Utc> 辅助 ─────────────────────────────

/// 将 DateTime<Utc> 视为 UTC 转换为 DateTime<Utc>
pub fn naive_to_utc(ndt: DateTime<Utc>) -> DateTime<Utc> {
    ndt
}

#[cfg(test)]
mod tests {
    use super::*;

    fn dt(y: i32, m: u32, d: u32, h: u32, mi: u32) -> DateTime<Utc> {
        Utc.with_ymd_and_hms(y, m, d, h, mi, 0).single().unwrap()
    }

    // ── calculate_completion_rate ──────────────

    #[test]
    fn test_completion_zero_completed() {
        assert_eq!(calculate_completion_rate(0.0, 100.0), 0.0);
    }

    #[test]
    fn test_completion_half() {
        assert_eq!(calculate_completion_rate(50.0, 100.0), 50.0);
    }

    #[test]
    fn test_completion_full() {
        assert_eq!(calculate_completion_rate(100.0, 100.0), 100.0);
    }

    #[test]
    fn test_completion_overdone_clamped() {
        assert_eq!(calculate_completion_rate(150.0, 100.0), 100.0);
    }

    #[test]
    fn test_completion_negative_completed() {
        assert_eq!(calculate_completion_rate(-10.0, 100.0), 0.0);
    }

    #[test]
    fn test_completion_zero_total_safe() {
        assert_eq!(calculate_completion_rate(50.0, 0.0), 0.0);
    }

    #[test]
    fn test_completion_nan_total_safe() {
        assert_eq!(calculate_completion_rate(50.0, f64::NAN), 0.0);
    }

    #[test]
    fn test_completion_fractional() {
        let r = calculate_completion_rate(1.0, 3.0);
        assert!((r - 33.333333).abs() < 0.001);
    }

    // ── remaining_quantity ─────────────────────

    #[test]
    fn test_remaining_normal() {
        assert_eq!(remaining_quantity(100.0, 30.0), 70.0);
    }

    #[test]
    fn test_remaining_fully_done() {
        assert_eq!(remaining_quantity(100.0, 100.0), 0.0);
    }

    #[test]
    fn test_remaining_overdone_clamped() {
        assert_eq!(remaining_quantity(100.0, 120.0), 0.0);
    }

    #[test]
    fn test_remaining_negative_completed() {
        assert_eq!(remaining_quantity(100.0, -5.0), 100.0);
    }

    // ── is_fully_completed ─────────────────────

    #[test]
    fn test_fully_completed_true() {
        assert!(is_fully_completed(100.0, 100.0));
        assert!(is_fully_completed(100.0, 105.0));
    }

    #[test]
    fn test_fully_completed_false_partial() {
        assert!(!is_fully_completed(100.0, 50.0));
    }

    #[test]
    fn test_fully_completed_false_zero_planned() {
        assert!(!is_fully_completed(0.0, 0.0));
    }

    // ── is_valid_status_transition ─────────────

    #[test]
    fn test_transition_pending_to_in_progress_ok() {
        assert!(is_valid_status_transition("pending", "in_progress"));
    }

    #[test]
    fn test_transition_in_progress_to_completed_ok() {
        assert!(is_valid_status_transition("in_progress", "completed"));
    }

    #[test]
    fn test_transition_in_progress_to_paused_ok() {
        assert!(is_valid_status_transition("in_progress", "paused"));
    }

    #[test]
    fn test_transition_paused_to_in_progress_ok() {
        assert!(is_valid_status_transition("paused", "in_progress"));
    }

    #[test]
    fn test_transition_pending_to_cancelled_ok() {
        assert!(is_valid_status_transition("pending", "cancelled"));
    }

    #[test]
    fn test_transition_in_progress_to_cancelled_ok() {
        assert!(is_valid_status_transition("in_progress", "cancelled"));
    }

    #[test]
    fn test_transition_completed_to_in_progress_rejected() {
        assert!(!is_valid_status_transition("completed", "in_progress"));
    }

    #[test]
    fn test_transition_paused_to_completed_rejected() {
        // 暂停状态不能直接完成，需先恢复
        assert!(!is_valid_status_transition("paused", "completed"));
    }

    #[test]
    fn test_transition_completed_to_pending_rejected() {
        assert!(!is_valid_status_transition("completed", "pending"));
    }

    #[test]
    fn test_transition_pending_to_paused_rejected() {
        assert!(!is_valid_status_transition("pending", "paused"));
    }

    #[test]
    fn test_transition_unknown_status_rejected() {
        assert!(!is_valid_status_transition("unknown", "in_progress"));
    }

    // ── derive_status_from_quantity ────────────

    #[test]
    fn test_derive_status_completed_when_fully_done() {
        assert_eq!(
            derive_status_from_quantity(100.0, 100.0, "in_progress"),
            "completed"
        );
    }

    #[test]
    fn test_derive_status_in_progress_when_partial() {
        assert_eq!(
            derive_status_from_quantity(100.0, 50.0, "pending"),
            "in_progress"
        );
    }

    #[test]
    fn test_derive_status_keeps_pending_when_zero() {
        assert_eq!(
            derive_status_from_quantity(100.0, 0.0, "pending"),
            "pending"
        );
    }

    #[test]
    fn test_derive_status_keeps_paused_when_no_progress() {
        assert_eq!(derive_status_from_quantity(100.0, 0.0, "paused"), "paused");
    }

    #[test]
    fn test_derive_status_completed_overrides_cancelled() {
        // 即使原状态是 cancelled，如果完成量已达计划量，推导为 completed
        // （这可以检测异常数据）
        assert_eq!(
            derive_status_from_quantity(100.0, 100.0, "cancelled"),
            "completed"
        );
    }

    // ── derive_record_status ───────────────────

    #[test]
    fn test_record_status_with_end_time_is_completed() {
        assert_eq!(derive_record_status(true), "completed");
    }

    #[test]
    fn test_record_status_without_end_time_is_in_progress() {
        assert_eq!(derive_record_status(false), "in_progress");
    }

    // ── calculate_work_report_summary ──────────

    #[test]
    fn test_report_summary_normal() {
        let s = calculate_work_report_summary(80.0, 20.0);
        assert_eq!(s.quantity_total, 100.0);
        assert_eq!(s.pass_rate, 80.0);
        assert_eq!(s.defect_rate, 20.0);
    }

    #[test]
    fn test_report_summary_all_good() {
        let s = calculate_work_report_summary(100.0, 0.0);
        assert_eq!(s.quantity_total, 100.0);
        assert_eq!(s.pass_rate, 100.0);
        assert_eq!(s.defect_rate, 0.0);
    }

    #[test]
    fn test_report_summary_all_bad() {
        let s = calculate_work_report_summary(0.0, 50.0);
        assert_eq!(s.quantity_total, 50.0);
        assert_eq!(s.pass_rate, 0.0);
        assert_eq!(s.defect_rate, 100.0);
    }

    #[test]
    fn test_report_summary_zero_both() {
        let s = calculate_work_report_summary(0.0, 0.0);
        assert_eq!(s.quantity_total, 0.0);
        assert_eq!(s.pass_rate, 0.0);
        assert_eq!(s.defect_rate, 0.0);
    }

    #[test]
    fn test_report_summary_negative_clamped() {
        let s = calculate_work_report_summary(-10.0, -5.0);
        assert_eq!(s.quantity_good, 0.0);
        assert_eq!(s.quantity_bad, 0.0);
        assert_eq!(s.quantity_total, 0.0);
    }

    // ── process_duration_minutes ───────────────

    #[test]
    fn test_duration_normal_90_min() {
        let s = dt(2025, 6, 1, 9, 0);
        let e = dt(2025, 6, 1, 10, 30);
        assert_eq!(process_duration_minutes(Some(s), Some(e)), 90);
    }

    #[test]
    fn test_duration_zero_when_missing_start() {
        let e = dt(2025, 6, 1, 10, 0);
        assert_eq!(process_duration_minutes(None, Some(e)), 0);
    }

    #[test]
    fn test_duration_zero_when_missing_end() {
        let s = dt(2025, 6, 1, 9, 0);
        assert_eq!(process_duration_minutes(Some(s), None), 0);
    }

    #[test]
    fn test_duration_zero_when_reversed() {
        let s = dt(2025, 6, 1, 10, 0);
        let e = dt(2025, 6, 1, 9, 0);
        assert_eq!(process_duration_minutes(Some(s), Some(e)), 0);
    }

    // ── duration_deviation_rate ────────────────

    #[test]
    fn test_deviation_on_time() {
        // 实际 = 标准 → 偏差 0%
        assert_eq!(duration_deviation_rate(60.0, 60.0), 0.0);
    }

    #[test]
    fn test_deviation_overtime_positive() {
        // 标准 60 分钟，实际 75 分钟 → 超时 25%
        assert_eq!(duration_deviation_rate(60.0, 75.0), 25.0);
    }

    #[test]
    fn test_deviation_early_negative() {
        // 标准 60 分钟，实际 45 分钟 → 提前 25%
        assert_eq!(duration_deviation_rate(60.0, 45.0), -25.0);
    }

    #[test]
    fn test_deviation_zero_standard_safe() {
        assert_eq!(duration_deviation_rate(0.0, 60.0), 0.0);
    }

    #[test]
    fn test_deviation_zero_actual_safe() {
        assert_eq!(duration_deviation_rate(60.0, 0.0), 0.0);
    }

    // ── WorkOrderStatus from_str / as_str ──────

    #[test]
    fn test_status_roundtrip() {
        for s in &["pending", "in_progress", "paused", "completed", "cancelled"] {
            let st = WorkOrderStatus::from_str(s);
            assert_eq!(st.as_str(), *s);
        }
    }

    #[test]
    fn test_status_unknown_string() {
        assert_eq!(WorkOrderStatus::from_str("xyz").as_str(), "unknown");
    }
}
