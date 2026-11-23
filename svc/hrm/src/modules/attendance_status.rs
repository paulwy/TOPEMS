//! HRM 考勤状态：`hrm.attendance_records.status` 的唯一值源。
//!
//! 列定义：varchar(20) NOT NULL DEFAULT 'normal'，本地 5 行均为 `active`。
//!
//! 为什么只有四个值：本列没有任何"状态枚举"来源，值只能从代码证据里取——
//! - `normal`：DB 默认；
//! - `active`：`clock_in` 的 `COALESCE(status, 'active')` 兜底，且本地现存 5 行全是 `active`；
//! - `late` / `early_leave`：`get_attendance_stats` 的 `COUNT(*) FILTER (WHERE status = ...)`。
//!
//! `absent` / `leave` / `overtime` 这类常见考勤态当前**没有任何写入方**（无 API、无定时任务、
//! 无导入脚本），因此不预先写进词表：先堵住自由串，等真正出现写入方再按证据扩展。
//!
//! 同时修掉创建接口的 NULL 写入：`status` 列 NOT NULL，而 `CreateAttendanceRequest.status`
//! 是 `Option<String>` 并被原样绑定，缺省时直接触发 NOT NULL 违反（500）。

/// 考勤记录状态
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AttendanceStatus {
    /// 正常出勤（DB 默认）
    Normal,
    /// 已打卡（clock-in 兜底值，当前存量数据口径）
    Active,
    /// 迟到
    Late,
    /// 早退
    EarlyLeave,
}

impl AttendanceStatus {
    /// 该列允许的唯一集合
    pub const DB_VALUES: &'static [&'static str] = &["normal", "active", "late", "early_leave"];

    /// 默认状态（与 DB 默认一致）
    pub const DEFAULT: Self = Self::Normal;

    /// 严格解析数据库字符串；未知值返回 `None`
    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "normal" => Some(Self::Normal),
            "active" => Some(Self::Active),
            "late" => Some(Self::Late),
            "early_leave" => Some(Self::EarlyLeave),
            _ => None,
        }
    }

    /// 写入该列的唯一字符串形式
    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Normal => "normal",
            Self::Active => "active",
            Self::Late => "late",
            Self::EarlyLeave => "early_leave",
        }
    }

    /// 响应兜底：列 NOT NULL，未知历史值回落 `DEFAULT`
    pub fn normalize(raw: &str) -> &'static str {
        Self::from_db_str(raw).unwrap_or(Self::DEFAULT).as_db_str()
    }

    /// 列表筛选解析：`None` / 空串 / `all` → 不过滤；未知值 → 400
    pub fn parse_filter(raw: Option<&str>) -> Result<Option<Self>, &'static str> {
        match raw.map(str::trim) {
            None => Ok(None),
            Some("") => Ok(None),
            Some(v) if v.eq_ignore_ascii_case("all") => Ok(None),
            Some(v) => Self::from_db_str(v).map(Some).ok_or("unknown_status"),
        }
    }
}

impl std::fmt::Display for AttendanceStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_db_str())
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip() {
        for s in AttendanceStatus::DB_VALUES {
            assert_eq!(
                AttendanceStatus::from_db_str(s).map(|v| v.as_db_str()),
                Some(*s)
            );
        }
        assert_eq!(AttendanceStatus::DB_VALUES.len(), 4);
        assert_eq!(AttendanceStatus::DEFAULT.as_db_str(), "normal");
    }

    #[test]
    fn rejects_unknown() {
        for v in ["absent", "leave", "overtime", "bogus"] {
            assert_eq!(AttendanceStatus::from_db_str(v), None);
        }
        assert_eq!(
            AttendanceStatus::from_db_str("EARLY_LEAVE").map(|v| v.as_db_str()),
            Some("early_leave")
        );
    }

    #[test]
    fn normalize_falls_back() {
        assert_eq!(AttendanceStatus::normalize("active"), "active");
        assert_eq!(AttendanceStatus::normalize("weird"), "normal");
    }

    #[test]
    fn parse_filter_accepts_empty_and_rejects_unknown() {
        assert_eq!(AttendanceStatus::parse_filter(None), Ok(None));
        assert_eq!(AttendanceStatus::parse_filter(Some("")), Ok(None));
        assert_eq!(AttendanceStatus::parse_filter(Some("all")), Ok(None));
        assert_eq!(
            AttendanceStatus::parse_filter(Some("early_leave")),
            Ok(Some(AttendanceStatus::EarlyLeave))
        );
        assert_eq!(
            AttendanceStatus::parse_filter(Some("bogus")),
            Err("unknown_status")
        );
    }
}
