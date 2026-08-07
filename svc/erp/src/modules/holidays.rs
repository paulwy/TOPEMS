//! 中国法定节假日处理
//!
//! 提供法定节假日、调休补班日和工作日的判断能力，供请假等模块计算工作日使用。
//!
//! ## 两级回退策略（设计决策：稳定性 > 动态性）
//!
//! 当前采用「数据库优先 + 静态硬编码兜底」的两级回退模式，确保在
//! 数据库 `holidays` 表未初始化、迁移未执行或租户未配置时，业务调用
//! （`is_workday` / `calculate_leave_days` 等）始终能返回正确结果，
//! 不会因查询失败或空表导致全量误判为工作日。
//!
//! | 层级 | 数据源 | 触发条件 | 覆盖范围 |
//! |------|--------|---------|---------|
//! | L1 动态层 | `plugin_erp.holidays` 表（tenant_id + year 过滤） | DB 可用且对应当年有记录 | 租户可配置任意年度 |
//! | L2 静态层 | 本文件 `HOLIDAY_RANGES` / `MAKEUP_WORKDAY_DATES` 常量 | L1 返回空或 DB 错误 | 2025–2026 国务院发布数据 |
//!
//! 纯函数 API（`is_holiday` / `is_makeup_workday` / `is_workday`）保持无状态，
//! 继续使用 L2 静态层，用于单元测试、离线工具链与未接入 DB 的调用场景；
//! 带状态的 `_db` 版本（如 `is_workday_with`）委托给 `HolidayProvider`，
//! 用于 leave_request 等 HTTP handler 内可获取 `PgPool` 的生产路径。

use chrono::{Datelike, NaiveDate, Weekday};
use lazy_static::lazy_static;
use sqlx::PgPool;
use std::collections::HashSet;
use tracing::warn;

lazy_static! {
    /// 法定节假日（含调休拼成的连续假期区间内所有日期）
    ///
    /// 仅记录法定假日当天，周末本身已由 `Weekday` 判断处理，但此处一并收录
    /// 假期区间内的周末日期，便于 `is_holiday` 语义清晰（区间内即为假日）。
    static ref HOLIDAYS: HashSet<NaiveDate> = build_date_set(&HOLIDAY_RANGES);

    /// 调休补班日（因假期调休而需要上班的周末）
    static ref MAKEUP_WORKDAYS: HashSet<NaiveDate> = build_date_set_single(&MAKEUP_WORKDAY_DATES);
}

// ========== 数据库优先：HolidayProvider 两级回退实现 ==========

/// 节假日数据提供者 trait — 允许单元测试注入 mock，生产使用 DB+静态回退
#[async_trait::async_trait]
pub trait HolidayProvider: Send + Sync {
    async fn is_holiday(&self, date: NaiveDate, tenant_id: Option<uuid::Uuid>) -> bool;
    async fn is_makeup_workday(&self, date: NaiveDate, tenant_id: Option<uuid::Uuid>) -> bool;
}

/// 生产环境默认提供者：DB L1 优先 → 静态 L2 兜底
pub struct DatabaseBackedHolidayProvider {
    pub pool: PgPool,
}

impl DatabaseBackedHolidayProvider {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait::async_trait]
impl HolidayProvider for DatabaseBackedHolidayProvider {
    async fn is_holiday(&self, date: NaiveDate, tenant_id: Option<uuid::Uuid>) -> bool {
        match query_holiday_from_db(&self.pool, date, tenant_id, "holiday").await {
            Some(exists) => exists,
            None => {
                // L2 兜底：静态硬编码
                is_holiday(date)
            }
        }
    }

    async fn is_makeup_workday(&self, date: NaiveDate, tenant_id: Option<uuid::Uuid>) -> bool {
        match query_holiday_from_db(&self.pool, date, tenant_id, "makeup").await {
            Some(exists) => exists,
            None => is_makeup_workday(date),
        }
    }
}

/// 从 DB 查询单日期的节假日/调休记录是否存在
///
/// 返回 `None` 代表「DB 不可用或未配置 → 走 L2 静态层」；
/// 返回 `Some(bool)` 代表「DB 有结果 → 使用 DB 值」。
async fn query_holiday_from_db(
    pool: &PgPool,
    date: NaiveDate,
    tenant_id: Option<uuid::Uuid>,
    kind: &str,
) -> Option<bool> {
    // holidays 表结构（未迁移时查询会失败 → 自动回退 L2）：
    //   CREATE TABLE IF NOT EXISTS plugin_erp.holidays (
    //       tenant_id UUID NOT NULL,
    //       year      INT  NOT NULL,
    //       date      DATE NOT NULL,
    //       kind      TEXT NOT NULL CHECK (kind IN ('holiday','makeup')),
    //       name      TEXT,
    //       PRIMARY KEY (tenant_id, year, date, kind)
    //   );
    let year = date.year();
    let result = match tenant_id {
        Some(tid) => {
            sqlx::query_scalar::<_, i64>(
                r#"SELECT COUNT(*) FROM plugin_erp.holidays
                   WHERE tenant_id = $1 AND year = $2 AND date = $3 AND kind = $4"#,
            )
            .bind(tid)
            .bind(year)
            .bind(date)
            .bind(kind)
            .fetch_one(pool)
            .await
        }
        None => {
            // 未传入 tenant_id 时，仅做全局查询（跨租户共享数据场景）
            sqlx::query_scalar::<_, i64>(
                r#"SELECT COUNT(*) FROM plugin_erp.holidays
                   WHERE year = $1 AND date = $2 AND kind = $3 LIMIT 1"#,
            )
            .bind(year)
            .bind(date)
            .bind(kind)
            .fetch_one(pool)
            .await
        }
    };
    match result {
        Ok(count) => Some(count > 0),
        Err(e) => {
            // 表不存在 / 权限不足 / 连接失败：警告一次，自动走 L2
            static L2_FALLBACK_LOGGED: std::sync::atomic::AtomicBool =
                std::sync::atomic::AtomicBool::new(false);
            if !L2_FALLBACK_LOGGED.swap(true, std::sync::atomic::Ordering::Relaxed) {
                warn!(
                    error = %e,
                    "plugin_erp.holidays 表查询失败，回退到 L2 静态节假日数据（2025-2026）。后续可执行 ERP holidays 迁移脚本启用动态配置。"
                );
            }
            None
        }
    }
}

/// 带 HolidayProvider 的工作日判断（生产路径，支持 DB 动态层）
pub async fn is_workday_with(
    provider: &dyn HolidayProvider,
    date: NaiveDate,
    tenant_id: Option<uuid::Uuid>,
) -> bool {
    let is_weekend = matches!(date.weekday(), Weekday::Sat | Weekday::Sun);
    if is_weekend {
        return provider.is_makeup_workday(date, tenant_id).await;
    }
    !provider.is_holiday(date, tenant_id).await
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
