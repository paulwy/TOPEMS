//! 中国法定节假日处理
//!
//! 提供法定节假日、调休补班日和工作日的判断能力，供请假等模块计算工作日使用。
//!
//! 当前实现为内存版本，硬编码 2025-2026 年国务院办公厅发布的放假调休安排。
//! TODO: 后续可接入数据库 `holidays` 表，支持动态配置多年度节假日数据。

use chrono::{Datelike, NaiveDate, Weekday};
use lazy_static::lazy_static;
use std::collections::HashSet;

lazy_static! {
    /// 法定节假日（含调休拼成的连续假期区间内所有日期）
    ///
    /// 仅记录法定假日当天，周末本身已由 `Weekday` 判断处理，但此处一并收录
    /// 假期区间内的周末日期，便于 `is_holiday` 语义清晰（区间内即为假日）。
    static ref HOLIDAYS: HashSet<NaiveDate> = build_date_set(&HOLIDAY_RANGES);

    /// 调休补班日（因假期调休而需要上班的周末）
    static ref MAKEUP_WORKDAYS: HashSet<NaiveDate> = build_date_set_single(&MAKEUP_WORKDAY_DATES);
}

/// 法定节假日区间（起始年月日, 结束年月日）
const HOLIDAY_RANGES: &[(i32, u32, u32, i32, u32, u32)] = &[
    // ===== 2025 年 =====
    // 元旦
    (2025, 1, 1, 2025, 1, 1),
    // 春节：1月28日(除夕) - 2月4日，共8天
    (2025, 1, 28, 2025, 2, 4),
    // 清明：4月4日 - 4月6日，共3天
    (2025, 4, 4, 2025, 4, 6),
    // 劳动节：5月1日 - 5月5日，共5天
    (2025, 5, 1, 2025, 5, 5),
    // 端午：5月31日 - 6月2日，共3天
    (2025, 5, 31, 2025, 6, 2),
    // 中秋、国庆：10月1日 - 10月8日，共8天
    (2025, 10, 1, 2025, 10, 8),
    // ===== 2026 年 =====
    // 元旦：1月1日 - 1月3日，共3天
    (2026, 1, 1, 2026, 1, 3),
    // 春节：2月15日 - 2月23日，共9天
    (2026, 2, 15, 2026, 2, 23),
    // 清明：4月4日 - 4月6日，共3天
    (2026, 4, 4, 2026, 4, 6),
    // 劳动节：5月1日 - 5月5日，共5天
    (2026, 5, 1, 2026, 5, 5),
    // 端午：6月19日 - 6月21日，共3天
    (2026, 6, 19, 2026, 6, 21),
    // 中秋：9月25日 - 9月27日，共3天
    (2026, 9, 25, 2026, 9, 27),
    // 国庆：10月1日 - 10月7日，共7天
    (2026, 10, 1, 2026, 10, 7),
];

/// 调休补班日（年, 月, 日）
const MAKEUP_WORKDAY_DATES: &[(i32, u32, u32)] = &[
    // ===== 2025 年 =====
    (2025, 1, 26),  // 周日，春节调休
    (2025, 2, 8),   // 周六，春节调休
    (2025, 4, 27),  // 周日，劳动节调休
    (2025, 9, 28),  // 周日，国庆调休
    (2025, 10, 11), // 周六，国庆调休
    // ===== 2026 年 =====
    (2026, 1, 4),  // 周日，元旦调休
    (2026, 2, 14), // 周六，春节调休
    (2026, 2, 28), // 周六，春节调休
    (2026, 5, 9),  // 周六，劳动节调休
];

/// 判断指定日期是否为法定节假日（不含普通周末）
///
/// 返回 `true` 表示该日期在法定假日区间内（元旦/春节/清明/劳动/端午/中秋/国庆）。
/// 注意：周末默认非工作日，由 `is_workday` 统一处理；周末即使落在假期区间内，
/// 此处也会返回 `true`，但语义上不影响工作日计算结果。
pub fn is_holiday(date: NaiveDate) -> bool {
    HOLIDAYS.contains(&date)
}

/// 判断指定日期是否为调休补班日（因假期调休而需上班的周末）
pub fn is_makeup_workday(date: NaiveDate) -> bool {
    MAKEUP_WORKDAYS.contains(&date)
}

/// 判断指定日期是否为工作日
///
/// 判定规则：
/// - 周末（周六/周日）：仅当为调休补班日时为工作日，否则非工作日
/// - 工作日（周一至周五）：排除法定节假日后为工作日
///
/// # 示例
/// ```ignore
/// use chrono::NaiveDate;
/// use topems_erp::modules::holidays::is_workday;
/// // 2025-01-01 元旦（周三，法定假日）→ 非工作日
/// assert!(!is_workday(NaiveDate::from_ymd_opt(2025, 1, 1).unwrap()));
/// // 2025-01-26 周日（春节调休补班）→ 工作日
/// assert!(is_workday(NaiveDate::from_ymd_opt(2025, 1, 26).unwrap()));
/// ```
pub fn is_workday(date: NaiveDate) -> bool {
    let is_weekend = matches!(date.weekday(), Weekday::Sat | Weekday::Sun);
    if is_weekend {
        // 周末：仅调休补班日算工作日
        return is_makeup_workday(date);
    }
    // 工作日：排除法定节假日
    !is_holiday(date)
}

/// 从区间数组构建日期集合
fn build_date_set(ranges: &[(i32, u32, u32, i32, u32, u32)]) -> HashSet<NaiveDate> {
    let mut set = HashSet::new();
    for &(sy, sm, sd, ey, em, ed) in ranges {
        let mut cur = match NaiveDate::from_ymd_opt(sy, sm, sd) {
            Some(d) => d,
            None => continue,
        };
        let end = match NaiveDate::from_ymd_opt(ey, em, ed) {
            Some(d) => d,
            None => continue,
        };
        while cur <= end {
            set.insert(cur);
            cur = match cur.succ_opt() {
                Some(next) => next,
                None => break,
            };
        }
    }
    set
}

/// 从单日数组构建日期集合
fn build_date_set_single(dates: &[(i32, u32, u32)]) -> HashSet<NaiveDate> {
    dates
        .iter()
        .filter_map(|&(y, m, d)| NaiveDate::from_ymd_opt(y, m, d))
        .collect()
}

// ============ 单元测试 ============

#[cfg(test)]
mod tests {
    use super::*;

    // ===== is_holiday 测试 =====

    #[test]
    fn test_yuan_dan_2025_is_holiday() {
        // 2025-01-01 元旦（周三）
        let d = NaiveDate::from_ymd_opt(2025, 1, 1).unwrap();
        assert!(is_holiday(d));
    }

    #[test]
    fn test_spring_festival_2025_range() {
        // 2025-01-28 除夕 到 2025-02-04 都是假日
        assert!(is_holiday(NaiveDate::from_ymd_opt(2025, 1, 28).unwrap()));
        assert!(is_holiday(NaiveDate::from_ymd_opt(2025, 2, 4).unwrap()));
        // 2月5日不是假日
        assert!(!is_holiday(NaiveDate::from_ymd_opt(2025, 2, 5).unwrap()));
    }

    #[test]
    fn test_national_day_2025_range() {
        // 2025-10-01 到 10-08 都是假日（中秋+国庆）
        assert!(is_holiday(NaiveDate::from_ymd_opt(2025, 10, 1).unwrap()));
        assert!(is_holiday(NaiveDate::from_ymd_opt(2025, 10, 8).unwrap()));
        // 10月9日不是假日
        assert!(!is_holiday(NaiveDate::from_ymd_opt(2025, 10, 9).unwrap()));
    }

    #[test]
    fn test_normal_weekday_not_holiday() {
        // 2025-03-03 周一，普通工作日，非假日
        let d = NaiveDate::from_ymd_opt(2025, 3, 3).unwrap();
        assert!(!is_holiday(d));
    }

    #[test]
    fn test_2026_spring_festival() {
        // 2026-02-15 到 02-23 春节
        assert!(is_holiday(NaiveDate::from_ymd_opt(2026, 2, 15).unwrap()));
        assert!(is_holiday(NaiveDate::from_ymd_opt(2026, 2, 23).unwrap()));
        assert!(!is_holiday(NaiveDate::from_ymd_opt(2026, 2, 24).unwrap()));
    }

    // ===== is_makeup_workday 测试 =====

    #[test]
    fn test_makeup_workday_2025_jan_26() {
        // 2025-01-26 周日，春节调休补班
        let d = NaiveDate::from_ymd_opt(2025, 1, 26).unwrap();
        assert!(is_makeup_workday(d));
        assert_eq!(d.weekday(), Weekday::Sun);
    }

    #[test]
    fn test_makeup_workday_2025_oct_11() {
        // 2025-10-11 周六，国庆调休补班
        let d = NaiveDate::from_ymd_opt(2025, 10, 11).unwrap();
        assert!(is_makeup_workday(d));
        assert_eq!(d.weekday(), Weekday::Sat);
    }

    #[test]
    fn test_normal_weekend_not_makeup() {
        // 2025-03-08 周六，普通周末（非调休补班）
        let d = NaiveDate::from_ymd_opt(2025, 3, 8).unwrap();
        assert!(!is_makeup_workday(d));
    }

    // ===== is_workday 综合测试 =====

    #[test]
    fn test_holiday_weekday_is_not_workday() {
        // 2025-01-01 元节（周三，法定假日）→ 非工作日
        let d = NaiveDate::from_ymd_opt(2025, 1, 1).unwrap();
        assert!(!is_workday(d));
    }

    #[test]
    fn test_normal_weekday_is_workday() {
        // 2025-03-03 周一，普通工作日 → 工作日
        let d = NaiveDate::from_ymd_opt(2025, 3, 3).unwrap();
        assert!(is_workday(d));
    }

    #[test]
    fn test_normal_weekend_is_not_workday() {
        // 2025-03-08 周六，普通周末 → 非工作日
        let d = NaiveDate::from_ymd_opt(2025, 3, 8).unwrap();
        assert!(!is_workday(d));
        // 2025-03-09 周日
        let d = NaiveDate::from_ymd_opt(2025, 3, 9).unwrap();
        assert!(!is_workday(d));
    }

    #[test]
    fn test_makeup_workday_is_workday() {
        // 2025-01-26 周日（春节调休补班）→ 工作日
        let d = NaiveDate::from_ymd_opt(2025, 1, 26).unwrap();
        assert!(is_workday(d));
        // 2025-02-08 周六（春节调休补班）→ 工作日
        let d = NaiveDate::from_ymd_opt(2025, 2, 8).unwrap();
        assert!(is_workday(d));
    }

    #[test]
    fn test_holiday_on_weekend_not_workday() {
        // 2025-02-01 周六（在春节假期区间内）→ 非工作日
        let d = NaiveDate::from_ymd_opt(2025, 2, 1).unwrap();
        assert!(!is_workday(d));
    }

    #[test]
    fn test_2026_yuan_dan_makeup() {
        // 2026-01-01 周四（元旦假日）→ 非工作日
        assert!(!is_workday(NaiveDate::from_ymd_opt(2026, 1, 1).unwrap()));
        // 2026-01-04 周日（元旦调休补班）→ 工作日
        assert!(is_workday(NaiveDate::from_ymd_opt(2026, 1, 4).unwrap()));
    }
}
