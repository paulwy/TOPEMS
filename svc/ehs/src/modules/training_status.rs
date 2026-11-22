//! EHS 培训域状态唯一集合。
//!
//! - `ehs.training_programs.status`：培训计划
//! - `ehs.qa_ehs_trainings.status`：培训场次
//! - `ehs.qa_ehs_training_certificates.status`：培训证书

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TrainingProgramStatus {
    Draft,
    Active,
    Completed,
    Cancelled,
}

impl TrainingProgramStatus {
    pub const DEFAULT: Self = Self::Draft;

    pub const DB_VALUES: [&'static str; 4] = ["draft", "active", "completed", "cancelled"];

    #[must_use]
    pub fn as_db_str(self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Active => "active",
            Self::Completed => "completed",
            Self::Cancelled => "cancelled",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "draft" => Some(Self::Draft),
            "active" => Some(Self::Active),
            "completed" => Some(Self::Completed),
            "cancelled" | "canceled" => Some(Self::Cancelled),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TrainingSessionStatus {
    Scheduled,
    InProgress,
    Completed,
    Cancelled,
}

impl TrainingSessionStatus {
    pub const DEFAULT: Self = Self::Scheduled;

    pub const DB_VALUES: [&'static str; 4] = ["scheduled", "in_progress", "completed", "cancelled"];

    #[must_use]
    pub fn as_db_str(self) -> &'static str {
        match self {
            Self::Scheduled => "scheduled",
            Self::InProgress => "in_progress",
            Self::Completed => "completed",
            Self::Cancelled => "cancelled",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "scheduled" => Some(Self::Scheduled),
            "in_progress" => Some(Self::InProgress),
            "completed" => Some(Self::Completed),
            "cancelled" | "canceled" => Some(Self::Cancelled),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TrainingRecordStatus {
    Ongoing,
    Completed,
    Failed,
}

impl TrainingRecordStatus {
    pub const DEFAULT: Self = Self::Ongoing;

    pub const DB_VALUES: [&'static str; 3] = ["ongoing", "completed", "failed"];

    #[must_use]
    pub fn as_db_str(self) -> &'static str {
        match self {
            Self::Ongoing => "ongoing",
            Self::Completed => "completed",
            Self::Failed => "failed",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "ongoing" => Some(Self::Ongoing),
            "completed" => Some(Self::Completed),
            "failed" => Some(Self::Failed),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TrainingCertificateStatus {
    Valid,
    Expired,
    Revoked,
}

impl TrainingCertificateStatus {
    pub const DEFAULT: Self = Self::Valid;

    pub const DB_VALUES: [&'static str; 3] = ["valid", "expired", "revoked"];

    #[must_use]
    pub fn as_db_str(self) -> &'static str {
        match self {
            Self::Valid => "valid",
            Self::Expired => "expired",
            Self::Revoked => "revoked",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "valid" => Some(Self::Valid),
            "expired" => Some(Self::Expired),
            "revoked" => Some(Self::Revoked),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn all_roundtrip() {
        for raw in TrainingProgramStatus::DB_VALUES {
            assert_eq!(
                TrainingProgramStatus::from_db_str(raw).unwrap().as_db_str(),
                raw
            );
        }
        for raw in TrainingSessionStatus::DB_VALUES {
            assert_eq!(
                TrainingSessionStatus::from_db_str(raw).unwrap().as_db_str(),
                raw
            );
        }
        for raw in TrainingRecordStatus::DB_VALUES {
            assert_eq!(
                TrainingRecordStatus::from_db_str(raw).unwrap().as_db_str(),
                raw
            );
        }
        for raw in TrainingCertificateStatus::DB_VALUES {
            assert_eq!(
                TrainingCertificateStatus::from_db_str(raw)
                    .unwrap()
                    .as_db_str(),
                raw
            );
        }
        assert_eq!(TrainingProgramStatus::from_db_str("bogus"), None);
        assert_eq!(TrainingSessionStatus::from_db_str("bogus"), None);
        assert_eq!(TrainingRecordStatus::from_db_str("bogus"), None);
        assert_eq!(TrainingCertificateStatus::from_db_str("bogus"), None);
    }

    #[test]
    fn defaults() {
        assert_eq!(TrainingProgramStatus::DEFAULT.as_db_str(), "draft");
        assert_eq!(TrainingSessionStatus::DEFAULT.as_db_str(), "scheduled");
        assert_eq!(TrainingRecordStatus::DEFAULT.as_db_str(), "ongoing");
        assert_eq!(TrainingCertificateStatus::DEFAULT.as_db_str(), "valid");
    }
}
