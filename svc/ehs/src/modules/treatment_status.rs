//! 事故处理（ehs.qa_ehs_treatments / ehs.qa_ehs_treatment_actions）状态唯一集合。
//!
//! 落库列：
//! - `ehs.qa_ehs_treatments.status`（varchar，DB 默认 `in_progress`）
//! - `ehs.qa_ehs_treatment_actions.status`（varchar，DB 默认 `pending`）
//! 本地两表均 0 行；创建处理方案写 in_progress、动作写 pending，完成处理写两表 completed。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TreatmentStatus {
    InProgress,
    Completed,
}

impl TreatmentStatus {
    pub const DEFAULT: Self = Self::InProgress;

    pub const DB_VALUES: &'static [&'static str] = &["in_progress", "completed"];

    #[must_use]
    pub fn as_db_str(self) -> &'static str {
        match self {
            Self::InProgress => "in_progress",
            Self::Completed => "completed",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw {
            "in_progress" => Some(Self::InProgress),
            "completed" => Some(Self::Completed),
            _ => None,
        }
    }

    /// 完成处理只允许从 in_progress 进入；重复完成不再假成功。
    #[must_use]
    pub fn complete_from() -> &'static [Self] {
        &[Self::InProgress]
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TreatmentActionStatus {
    Pending,
    Completed,
}

impl TreatmentActionStatus {
    pub const DEFAULT: Self = Self::Pending;

    pub const DB_VALUES: &'static [&'static str] = &["pending", "completed"];

    #[must_use]
    pub fn as_db_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Completed => "completed",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw {
            "pending" => Some(Self::Pending),
            "completed" => Some(Self::Completed),
            _ => None,
        }
    }

    /// completed 为终态，不允许回退到 pending。
    #[must_use]
    pub fn update_from(target: Self) -> &'static [Self] {
        match target {
            Self::Pending => &[Self::Pending],
            Self::Completed => &[Self::Pending, Self::Completed],
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn treatment_roundtrip() {
        for raw in TreatmentStatus::DB_VALUES {
            let parsed = TreatmentStatus::from_db_str(raw).expect("db value must parse");
            assert_eq!(parsed.as_db_str(), *raw);
        }
        assert_eq!(TreatmentStatus::from_db_str("pending"), None);
        assert_eq!(TreatmentStatus::DEFAULT.as_db_str(), "in_progress");
    }

    #[test]
    fn action_roundtrip_and_no_backward() {
        for raw in TreatmentActionStatus::DB_VALUES {
            let parsed = TreatmentActionStatus::from_db_str(raw).expect("db value must parse");
            assert_eq!(parsed.as_db_str(), *raw);
        }
        assert_eq!(TreatmentActionStatus::from_db_str("done"), None);
        assert_eq!(
            TreatmentActionStatus::update_from(TreatmentActionStatus::Completed),
            &[
                TreatmentActionStatus::Pending,
                TreatmentActionStatus::Completed
            ]
        );
        assert_eq!(TreatmentActionStatus::DEFAULT.as_db_str(), "pending");
    }
}
