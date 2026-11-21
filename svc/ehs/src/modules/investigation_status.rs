//! 事故调查（ehs.qa_ehs_investigations）状态唯一集合。
//!
//! 落库列：`ehs.qa_ehs_investigations.status`（varchar，DB 默认 `in_progress`）。
//! 本地 233 行全部 completed；启动调查写 in_progress，完成动作写 completed。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum InvestigationStatus {
    InProgress,
    Completed,
}

impl InvestigationStatus {
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

    /// 完成调查只允许从 in_progress 进入；重复完成不再假成功。
    #[must_use]
    pub fn complete_from() -> &'static [Self] {
        &[Self::InProgress]
    }

    /// 编辑只允许停留或从 in_progress 前进到 completed；completed 终态不可回退。
    #[must_use]
    pub fn update_from(target: Self) -> &'static [Self] {
        match target {
            Self::InProgress => &[Self::InProgress],
            Self::Completed => &[Self::InProgress, Self::Completed],
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_all_values() {
        for raw in InvestigationStatus::DB_VALUES {
            let parsed = InvestigationStatus::from_db_str(raw).expect("db value must parse");
            assert_eq!(parsed.as_db_str(), *raw);
        }
        assert_eq!(InvestigationStatus::from_db_str("pending"), None);
        assert_eq!(InvestigationStatus::from_db_str("关闭"), None);
        assert_eq!(InvestigationStatus::DEFAULT.as_db_str(), "in_progress");
    }

    #[test]
    fn update_never_moves_back() {
        assert_eq!(
            InvestigationStatus::update_from(InvestigationStatus::Completed),
            &[
                InvestigationStatus::InProgress,
                InvestigationStatus::Completed
            ]
        );
        assert_eq!(
            InvestigationStatus::update_from(InvestigationStatus::InProgress),
            &[InvestigationStatus::InProgress]
        );
    }
}
