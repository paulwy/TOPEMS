//! 事故行动（ehs.qa_ehs_incident_actions）状态唯一集合。
//!
//! 落库列：`ehs.qa_ehs_incident_actions.status`（varchar，DB 默认 `pending`）。
//! 本地 232 行全部 pending；创建写 pending，更新只能向前流转。
//! 前端类型已声明 pending / in_progress / completed / verified 四态，后端与之一致。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum IncidentActionStatus {
    Pending,
    InProgress,
    Completed,
    Verified,
}

impl IncidentActionStatus {
    pub const DEFAULT: Self = Self::Pending;

    pub const DB_VALUES: &'static [&'static str] =
        &["pending", "in_progress", "completed", "verified"];

    #[must_use]
    pub fn as_db_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::InProgress => "in_progress",
            Self::Completed => "completed",
            Self::Verified => "verified",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw {
            "pending" => Some(Self::Pending),
            "in_progress" => Some(Self::InProgress),
            "completed" => Some(Self::Completed),
            "verified" => Some(Self::Verified),
            _ => None,
        }
    }

    fn rank(self) -> u8 {
        match self {
            Self::Pending => 0,
            Self::InProgress => 1,
            Self::Completed => 2,
            Self::Verified => 3,
        }
    }

    /// 只允许停留或前进，不允许回退。
    #[must_use]
    pub fn update_from(target: Self) -> &'static [Self] {
        match target {
            Self::Pending => &[Self::Pending],
            Self::InProgress => &[Self::Pending, Self::InProgress],
            Self::Completed => &[Self::Pending, Self::InProgress, Self::Completed],
            Self::Verified => &[
                Self::Pending,
                Self::InProgress,
                Self::Completed,
                Self::Verified,
            ],
        }
    }

    #[must_use]
    pub fn is_forward_from(self, current: Self) -> bool {
        self.rank() >= current.rank()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_all_values() {
        for raw in IncidentActionStatus::DB_VALUES {
            let parsed = IncidentActionStatus::from_db_str(raw).expect("db value must parse");
            assert_eq!(parsed.as_db_str(), *raw);
        }
        assert_eq!(IncidentActionStatus::from_db_str("done"), None);
        assert_eq!(IncidentActionStatus::DEFAULT.as_db_str(), "pending");
    }

    #[test]
    fn never_moves_backward() {
        use IncidentActionStatus::*;
        assert!(Completed.is_forward_from(Pending));
        assert!(!Pending.is_forward_from(Completed));
        assert_eq!(
            IncidentActionStatus::update_from(Completed),
            &[Pending, InProgress, Completed]
        );
        assert_eq!(IncidentActionStatus::update_from(Verified).len(), 4);
    }
}
