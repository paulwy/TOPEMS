//! 实验室样品状态（`public.qa_lab_samples.status`）的唯一集合。
//!
//! 与生命周期阶段同源：received → registered → testing → completed →
//! stored → retrieved → disposed → destroyed。只允许按顺序前进，不跨阶、不回退。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LabSampleStatus {
    Received,
    Registered,
    Testing,
    Completed,
    Stored,
    Retrieved,
    Disposed,
    Destroyed,
}

impl LabSampleStatus {
    pub const DEFAULT: Self = Self::Received;

    pub const DB_VALUES: [&'static str; 8] = [
        "received",
        "registered",
        "testing",
        "completed",
        "stored",
        "retrieved",
        "disposed",
        "destroyed",
    ];

    #[must_use]
    pub fn as_db_str(self) -> &'static str {
        match self {
            Self::Received => "received",
            Self::Registered => "registered",
            Self::Testing => "testing",
            Self::Completed => "completed",
            Self::Stored => "stored",
            Self::Retrieved => "retrieved",
            Self::Disposed => "disposed",
            Self::Destroyed => "destroyed",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "received" => Some(Self::Received),
            "registered" => Some(Self::Registered),
            "testing" => Some(Self::Testing),
            "completed" => Some(Self::Completed),
            "stored" => Some(Self::Stored),
            "retrieved" => Some(Self::Retrieved),
            "disposed" => Some(Self::Disposed),
            "destroyed" => Some(Self::Destroyed),
            _ => None,
        }
    }

    fn rank(self) -> u8 {
        match self {
            Self::Received => 0,
            Self::Registered => 1,
            Self::Testing => 2,
            Self::Completed => 3,
            Self::Stored => 4,
            Self::Retrieved => 5,
            Self::Disposed => 6,
            Self::Destroyed => 7,
        }
    }

    /// 只允许相邻下一阶段，不允许跨阶、回退或同阶空转。
    #[must_use]
    pub fn can_transition_to(self, target: Self) -> bool {
        target.rank() == self.rank() + 1
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_all_values() {
        for raw in LabSampleStatus::DB_VALUES {
            let parsed = LabSampleStatus::from_db_str(raw).expect("db value must parse");
            assert_eq!(parsed.as_db_str(), raw);
        }
        assert_eq!(LabSampleStatus::from_db_str("bogus"), None);
        assert_eq!(LabSampleStatus::from_db_str(""), None);
        assert_eq!(LabSampleStatus::DEFAULT.as_db_str(), "received");
    }

    #[test]
    fn only_next_stage_is_allowed() {
        assert!(LabSampleStatus::Received.can_transition_to(LabSampleStatus::Registered));
        assert!(!LabSampleStatus::Received.can_transition_to(LabSampleStatus::Testing));
        assert!(!LabSampleStatus::Registered.can_transition_to(LabSampleStatus::Received));
        assert!(!LabSampleStatus::Received.can_transition_to(LabSampleStatus::Received));
        assert!(LabSampleStatus::Disposed.can_transition_to(LabSampleStatus::Destroyed));
    }
}
