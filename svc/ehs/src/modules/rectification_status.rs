//! 隐患整改（ehs.qa_ehs_hazard_rectifications）状态唯一集合。
//!
//! 落库列：`ehs.qa_ehs_hazard_rectifications.status`（varchar，DB 默认 `pending`）。
//! 本地 78 行均为 `in_progress`；DB 默认 in_progress，创建即进入整改，提交写 submitted。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RectificationStatus {
    Pending,
    InProgress,
    Submitted,
}

impl RectificationStatus {
    pub const DEFAULT: Self = Self::InProgress;

    pub const DB_VALUES: &'static [&'static str] = &["pending", "in_progress", "submitted"];

    #[must_use]
    pub fn as_db_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::InProgress => "in_progress",
            Self::Submitted => "submitted",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw {
            "pending" => Some(Self::Pending),
            "in_progress" => Some(Self::InProgress),
            "submitted" => Some(Self::Submitted),
            _ => None,
        }
    }

    /// 只允许停留或前进；submitted 为终态。
    #[must_use]
    pub fn update_from(target: Self) -> &'static [Self] {
        match target {
            Self::Pending => &[Self::Pending],
            Self::InProgress => &[Self::Pending, Self::InProgress],
            Self::Submitted => &[Self::Pending, Self::InProgress, Self::Submitted],
        }
    }

    /// 提交允许从 pending 或 in_progress 进入；submitted 重复提交返回 409。
    #[must_use]
    pub fn submit_from() -> &'static [Self] {
        &[Self::Pending, Self::InProgress]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_all_values() {
        for raw in RectificationStatus::DB_VALUES {
            let parsed = RectificationStatus::from_db_str(raw).expect("db value must parse");
            assert_eq!(parsed.as_db_str(), *raw);
        }
        assert_eq!(RectificationStatus::from_db_str("completed"), None);
        assert_eq!(RectificationStatus::DEFAULT.as_db_str(), "in_progress");
    }

    #[test]
    fn no_backward_and_submit_start() {
        assert_eq!(
            RectificationStatus::update_from(RectificationStatus::Submitted),
            &[
                RectificationStatus::Pending,
                RectificationStatus::InProgress,
                RectificationStatus::Submitted
            ]
        );
        assert_eq!(RectificationStatus::submit_from().len(), 2);
    }
}
