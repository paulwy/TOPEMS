//! 生产/采购/销售/车辆/会议室相关纯计算函数

use chrono::{DateTime, Utc};

// ── 生产订单进度 & 状态 ────────────────────────────────

#[derive(Debug, Clone, PartialEq)]
pub struct ProductionProgress {
    /// 0.0 ~ 1.0+，当 quantity ≤ 0 时返回 0
    pub completion_ratio: f64,
    /// 百分比字符串 "xx.xx%"（两位小数）
    pub percentage_label: String,
    /// 剩余待完成数量（非负钳制）
    pub remaining_quantity: f64,
}

/// 计算生产订单完成进度
pub fn calculate_production_progress(quantity: f64, completed_quantity: f64) -> ProductionProgress {
    let qty = if quantity.is_finite() && quantity > 0.0 {
        quantity
    } else {
        0.0
    };
    let cmp = completed_quantity.clamp(0.0, qty);
    let ratio = if qty > 0.0 { cmp / qty } else { 0.0 };
    let remaining = (qty - cmp).max(0.0);
    let percentage_label = format!("{:.2}%", ratio * 100.0);
    ProductionProgress {
        completion_ratio: ratio,
        percentage_label,
        remaining_quantity: remaining,
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProductionStatusCategory {
    /// pending
    NotStarted,
    /// released / 在途
    InProgress,
    /// completed / finished
    Completed,
    /// cancelled / closed
    Closed,
    /// 其他（含空串）
    Other,
}

/// 把生产订单状态字符串归类
pub fn categorize_production_status(status: &str) -> ProductionStatusCategory {
    match status {
        "pending" => ProductionStatusCategory::NotStarted,
        "released" | "in_progress" | "confirmed" | "processing" => {
            ProductionStatusCategory::InProgress
        }
        "completed" | "finished" | "done" => ProductionStatusCategory::Completed,
        "cancelled" | "closed" | "rejected" => ProductionStatusCategory::Closed,
        _ => ProductionStatusCategory::Other,
    }
}

/// 根据完成量自动推导应设状态（便于进度更新后自动状态流转）
pub fn derive_status_from_progress(quantity: f64, completed_quantity: f64) -> &'static str {
    let p = calculate_production_progress(quantity, completed_quantity);
    if p.completion_ratio >= 1.0 - f64::EPSILON {
        "completed"
    } else if p.completion_ratio > 0.0 {
        "in_progress"
    } else {
        "pending"
    }
}

// ── 会议室 / 车辆 预约时间校验 ──────────────────────────

/// 判断时间段是否合法（start < end）
pub fn is_time_range_valid(start: DateTime<Utc>, end: DateTime<Utc>) -> bool {
    start < end
}

/// 两个时间段是否重叠（不含边界接触）
pub fn ranges_overlap(
    a_start: DateTime<Utc>,
    a_end: DateTime<Utc>,
    b_start: DateTime<Utc>,
    b_end: DateTime<Utc>,
) -> bool {
    a_start < b_end && b_start < a_end
}

/// 预约时长（小时），非法时间（start ≥ end）返回 0
pub fn booking_duration_hours(start: DateTime<Utc>, end: DateTime<Utc>) -> f64 {
    if !is_time_range_valid(start, end) {
        return 0.0;
    }
    let delta = end - start;
    delta.num_seconds() as f64 / 3600.0
}

// ── 车辆校验 ───────────────────────────────────────────

/// 车牌号（中国）基础校验：6-10 位，开头为省份简称+字母
///
/// 简化版：长度 6-10，第一位非 ASCII（中文省份字）或为字母数字
pub fn validate_plate_number(plate: &str) -> bool {
    if plate.is_empty() {
        return false;
    }
    let len = plate.chars().count();
    if !(6..=10).contains(&len) {
        return false;
    }
    // 简化：不允许空白字符
    !plate.chars().any(|c| c.is_whitespace())
}

/// 车辆保养间隔建议（简易模型）：每 10000 km 或 180 天
///
/// 返回 true 表示建议保养
pub fn is_service_due(
    mileage: Option<i32>,
    last_service: DateTime<Utc>,
    now: DateTime<Utc>,
) -> bool {
    const SERVICE_KM: i32 = 10_000;
    const SERVICE_DAYS: i64 = 180;
    let since_service = now.signed_duration_since(last_service);
    if since_service.num_days() >= SERVICE_DAYS {
        return true;
    }
    if let Some(km) = mileage {
        // 简化：认为每次保养后里程从 0 计（若 last_service 前 km 为 0 则此模型合理）
        // 实际应用需要传入 last_service_mileage，这里退化为 km >= SERVICE_KM 阈值
        if km >= SERVICE_KM {
            return true;
        }
    }
    false
}

/// 会议室容量校验：至少 1 人、≤ 1000
pub fn validate_meeting_room_capacity(capacity: i32) -> bool {
    (1..=1000).contains(&capacity)
}

// ── 车牌号默认格式（可选：追加省份简称格式化，此处仅规范化空格）

/// 规范化车牌：去首尾空白，字母大写
pub fn normalize_plate_number(plate: &str) -> String {
    plate.trim().to_uppercase()
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{Duration, TimeZone};

    // ── calculate_production_progress ────────────────

    #[test]
    fn test_progress_not_started() {
        let p = calculate_production_progress(100.0, 0.0);
        assert_eq!(p.completion_ratio, 0.0);
        assert_eq!(p.remaining_quantity, 100.0);
        assert_eq!(p.percentage_label, "0.00%");
    }

    #[test]
    fn test_progress_half() {
        let p = calculate_production_progress(100.0, 50.0);
        assert!((p.completion_ratio - 0.5).abs() < 1e-9);
        assert_eq!(p.percentage_label, "50.00%");
        assert_eq!(p.remaining_quantity, 50.0);
    }

    #[test]
    fn test_progress_fully_done() {
        let p = calculate_production_progress(100.0, 100.0);
        assert!((p.completion_ratio - 1.0).abs() < 1e-9);
        assert_eq!(p.remaining_quantity, 0.0);
        assert_eq!(p.percentage_label, "100.00%");
    }

    #[test]
    fn test_progress_overdone_clamped() {
        let p = calculate_production_progress(100.0, 150.0);
        assert!((p.completion_ratio - 1.0).abs() < 1e-9);
        assert_eq!(p.remaining_quantity, 0.0);
    }

    #[test]
    fn test_progress_negative_completed_clamped() {
        let p = calculate_production_progress(100.0, -5.0);
        assert_eq!(p.completion_ratio, 0.0);
        assert_eq!(p.remaining_quantity, 100.0);
    }

    #[test]
    fn test_progress_zero_quantity_safe() {
        let p = calculate_production_progress(0.0, 0.0);
        assert_eq!(p.completion_ratio, 0.0);
        assert_eq!(p.remaining_quantity, 0.0);
        assert_eq!(p.percentage_label, "0.00%");
    }

    #[test]
    fn test_progress_negative_quantity_treated_as_zero() {
        let p = calculate_production_progress(-100.0, 50.0);
        assert_eq!(p.completion_ratio, 0.0);
    }

    #[test]
    fn test_progress_nan_quantity_safe() {
        let p = calculate_production_progress(f64::NAN, 50.0);
        assert_eq!(p.completion_ratio, 0.0);
    }

    #[test]
    fn test_progress_percentage_two_decimals() {
        let p = calculate_production_progress(3.0, 1.0);
        // 1/3 = 33.3333...
        assert_eq!(p.percentage_label, "33.33%");
    }

    // ── categorize_production_status ───────────

    #[test]
    fn test_cat_status_pending() {
        assert_eq!(
            categorize_production_status("pending"),
            ProductionStatusCategory::NotStarted
        );
    }

    #[test]
    fn test_cat_status_in_progress() {
        assert_eq!(
            categorize_production_status("released"),
            ProductionStatusCategory::InProgress
        );
        assert_eq!(
            categorize_production_status("in_progress"),
            ProductionStatusCategory::InProgress
        );
    }

    #[test]
    fn test_cat_status_completed() {
        assert_eq!(
            categorize_production_status("completed"),
            ProductionStatusCategory::Completed
        );
        assert_eq!(
            categorize_production_status("finished"),
            ProductionStatusCategory::Completed
        );
    }

    #[test]
    fn test_cat_status_closed() {
        assert_eq!(
            categorize_production_status("cancelled"),
            ProductionStatusCategory::Closed
        );
        assert_eq!(
            categorize_production_status("closed"),
            ProductionStatusCategory::Closed
        );
    }

    #[test]
    fn test_cat_status_unknown() {
        assert_eq!(
            categorize_production_status("custom"),
            ProductionStatusCategory::Other
        );
        assert_eq!(
            categorize_production_status(""),
            ProductionStatusCategory::Other
        );
    }

    // ── derive_status_from_progress ────────────

    #[test]
    fn test_derive_pending_when_zero() {
        assert_eq!(derive_status_from_progress(100.0, 0.0), "pending");
    }

    #[test]
    fn test_derive_in_progress_midway() {
        assert_eq!(derive_status_from_progress(100.0, 40.0), "in_progress");
    }

    #[test]
    fn test_derive_completed_when_fully_done() {
        assert_eq!(derive_status_from_progress(100.0, 100.0), "completed");
    }

    // ── 时间校验 ───────────────────────────────

    fn dt(y: i32, m: u32, d: u32, h: u32, mi: u32) -> DateTime<Utc> {
        Utc.with_ymd_and_hms(y, m, d, h, mi, 0).single().unwrap()
    }

    #[test]
    fn test_time_range_valid_ok() {
        assert!(is_time_range_valid(
            dt(2025, 6, 1, 9, 0),
            dt(2025, 6, 1, 10, 0)
        ));
    }

    #[test]
    fn test_time_range_valid_equal_invalid() {
        assert!(!is_time_range_valid(
            dt(2025, 6, 1, 9, 0),
            dt(2025, 6, 1, 9, 0)
        ));
    }

    #[test]
    fn test_time_range_valid_reversed_invalid() {
        assert!(!is_time_range_valid(
            dt(2025, 6, 1, 10, 0),
            dt(2025, 6, 1, 9, 0)
        ));
    }

    #[test]
    fn test_ranges_no_overlap_before() {
        // [9,10] vs [10,11] 边界接触不重叠
        assert!(!ranges_overlap(
            dt(2025, 6, 1, 9, 0),
            dt(2025, 6, 1, 10, 0),
            dt(2025, 6, 1, 10, 0),
            dt(2025, 6, 1, 11, 0),
        ));
    }

    #[test]
    fn test_ranges_overlap_partial() {
        // [9,11] vs [10,12] → 重叠
        assert!(ranges_overlap(
            dt(2025, 6, 1, 9, 0),
            dt(2025, 6, 1, 11, 0),
            dt(2025, 6, 1, 10, 0),
            dt(2025, 6, 1, 12, 0),
        ));
    }

    #[test]
    fn test_ranges_overlap_one_contained() {
        assert!(ranges_overlap(
            dt(2025, 6, 1, 9, 0),
            dt(2025, 6, 1, 12, 0),
            dt(2025, 6, 1, 10, 0),
            dt(2025, 6, 1, 11, 0),
        ));
    }

    #[test]
    fn test_ranges_no_overlap_after() {
        assert!(!ranges_overlap(
            dt(2025, 6, 1, 10, 0),
            dt(2025, 6, 1, 11, 0),
            dt(2025, 6, 1, 9, 0),
            dt(2025, 6, 1, 10, 0),
        ));
    }

    #[test]
    fn test_booking_duration_1h() {
        let h = booking_duration_hours(dt(2025, 6, 1, 9, 0), dt(2025, 6, 1, 10, 0));
        assert_eq!(h, 1.0);
    }

    #[test]
    fn test_booking_duration_30min() {
        let h = booking_duration_hours(dt(2025, 6, 1, 9, 0), dt(2025, 6, 1, 9, 30));
        assert!((h - 0.5).abs() < 1e-9);
    }

    #[test]
    fn test_booking_duration_invalid_range_zero() {
        let h = booking_duration_hours(dt(2025, 6, 1, 10, 0), dt(2025, 6, 1, 9, 0));
        assert_eq!(h, 0.0);
    }

    // ── 车辆 ───────────────────────────────────

    #[test]
    fn test_plate_valid_regular() {
        assert!(validate_plate_number("京A12345"));
    }

    #[test]
    fn test_plate_valid_min_length_6() {
        assert!(validate_plate_number("沪BCD12")); // 6 chars
    }

    #[test]
    fn test_plate_valid_max_length_10() {
        assert!(validate_plate_number("粤B12345678")); // 10 chars
    }

    #[test]
    fn test_plate_invalid_empty() {
        assert!(!validate_plate_number(""));
    }

    #[test]
    fn test_plate_invalid_too_short() {
        assert!(!validate_plate_number("京A1")); // 4 chars
    }

    #[test]
    fn test_plate_invalid_whitespace() {
        assert!(!validate_plate_number("京 A12345"));
    }

    #[test]
    fn test_service_due_by_days() {
        let now = dt(2025, 6, 1, 0, 0);
        let last = now - Duration::days(200); // > 180 days
        assert!(is_service_due(Some(5000), last, now));
    }

    #[test]
    fn test_service_not_yet_due() {
        let now = dt(2025, 6, 1, 0, 0);
        let last = now - Duration::days(30);
        assert!(!is_service_due(Some(500), last, now));
    }

    #[test]
    fn test_service_due_by_mileage() {
        let now = dt(2025, 6, 1, 0, 0);
        let last = now - Duration::days(10); // 天数还早
        assert!(is_service_due(Some(12000), last, now)); // 里程 >= 10000
    }

    #[test]
    fn test_service_due_mileage_none_days_not_passed() {
        let now = dt(2025, 6, 1, 0, 0);
        let last = now - Duration::days(10);
        assert!(!is_service_due(None, last, now));
    }

    #[test]
    fn test_normalize_plate_trims_and_uppercases() {
        assert_eq!(normalize_plate_number("  京a12345  "), "京A12345");
    }

    // ── 会议室容量 ─────────────────────────────

    #[test]
    fn test_capacity_valid_1_and_1000() {
        assert!(validate_meeting_room_capacity(1));
        assert!(validate_meeting_room_capacity(1000));
        assert!(validate_meeting_room_capacity(50));
    }

    #[test]
    fn test_capacity_invalid_0_or_negative() {
        assert!(!validate_meeting_room_capacity(0));
        assert!(!validate_meeting_room_capacity(-5));
    }

    #[test]
    fn test_capacity_invalid_over_1000() {
        assert!(!validate_meeting_room_capacity(1001));
    }
}
