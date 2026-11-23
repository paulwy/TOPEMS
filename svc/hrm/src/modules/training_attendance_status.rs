//! 培训出勤状态：`hrm.training_records.attendance_status` 的唯一值源。
//!
//! 当前代码只有报名（registered）与已出勤（attended）两个事实来源；
//! attended 为终态，避免已出勤记录被改回未出勤。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TrainingAttendanceStatus {
    Registered,
    Attended,
}

impl TrainingAttendanceStatus {
    /// `hrm.training_records.attendance_status` 允许的唯一集合
    pub const DB_VALUES: [&'static str; 2] = ["registered", "attended"];

    /// 报名/新建记录的初始态
    pub const DEFAULT: Self = Self::Registered;

    /// 严格解析数据库/请求字符串；未知值返回 `None`
    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "registered" | "pending" | "not_attended" => Some(Self::Registered),
            "attended" | "present" | "checked_in" => Some(Self::Attended),
            _ => None,
        }
    }

    /// 写入 `hrm.training_records.attendance_status` 的唯一字符串形式
    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Registered => "registered",
            Self::Attended => "attended",
        }
    }

    /// 归一化：未知值返回 `None`
    pub fn normalize(raw: &str) -> Option<&'static str> {
        Self::from_db_str(raw).map(|v| v.as_db_str())
    }

    /// 是否允许从 `from` 流转到 `self`
    pub fn can_transition_from(&self, from: &str) -> bool {
        let Some(current) = Self::from_db_str(from) else {
            return false;
        };
        if *self == current {
            return true;
        }
        matches!((current, self), (Self::Registered, Self::Attended))
    }

    /// attended 为终态
    pub fn is_terminal(&self) -> bool {
        matches!(self, Self::Attended)
    }
}

impl std::fmt::Display for TrainingAttendanceStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_db_str())
    }
}

impl std::str::FromStr for TrainingAttendanceStatus {
    type Err = ();

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Self::from_db_str(s).ok_or(())
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_all_values() {
        for raw in TrainingAttendanceStatus::DB_VALUES {
            assert_eq!(
                TrainingAttendanceStatus::from_db_str(raw).map(|v| v.as_db_str()),
                Some(raw)
            );
        }
        assert_eq!(TrainingAttendanceStatus::from_db_str("bogus"), None);
        assert_eq!(TrainingAttendanceStatus::DEFAULT.as_db_str(), "registered");
        assert_eq!(
            TrainingAttendanceStatus::normalize("PRESENT"),
            Some("attended")
        );
    }

    #[test]
    fn transitions_are_one_way() {
        assert!(TrainingAttendanceStatus::Attended.can_transition_from("registered"));
        assert!(TrainingAttendanceStatus::Attended.can_transition_from("attended"));
        assert!(!TrainingAttendanceStatus::Registered.can_transition_from("attended"));
        assert!(!TrainingAttendanceStatus::Attended.can_transition_from("bogus"));
        assert!(TrainingAttendanceStatus::Attended.is_terminal());
        assert!(!TrainingAttendanceStatus::Registered.is_terminal());
    }
}
