use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum MilestoneStatus {
    #[default]
    Pending,
    Achieved,
    Delayed,
}

impl MilestoneStatus {
    pub const DB_VALUES: [&'static str; 3] = ["pending", "achieved", "delayed"];
    pub const DEFAULT: Self = Self::Pending;

    #[must_use]
    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Achieved => "achieved",
            Self::Delayed => "delayed",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "pending" => Some(Self::Pending),
            "achieved" => Some(Self::Achieved),
            "delayed" => Some(Self::Delayed),
            _ => None,
        }
    }

    #[must_use]
    pub fn normalize(raw: &str) -> Option<&'static str> {
        Self::from_db_str(raw).map(|s| s.as_db_str())
    }

    /// 待达成可标记达成/延期；延期可重新达成或回到待达成；达成后只允许标记延期，
    /// 不允许直接回退为待达成，避免一条状态更新把已交付里程碑抹掉。
    #[must_use]
    pub fn can_transition_to(self, target: Self) -> bool {
        if self == target {
            return true;
        }
        match self {
            Self::Pending => matches!(target, Self::Achieved | Self::Delayed),
            Self::Delayed => matches!(target, Self::Pending | Self::Achieved),
            Self::Achieved => matches!(target, Self::Delayed),
        }
    }
}

impl std::fmt::Display for MilestoneStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_db_str())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ProjectMilestone {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub project_id: Uuid,
    pub phase_id: Option<Uuid>,
    pub name: String,
    pub description: Option<String>,
    pub target_date: DateTime<Utc>,
    pub actual_date: Option<DateTime<Utc>>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,

    // 验收相关字段
    pub deliverable_type: Option<String>,
    pub acceptance_criteria: Option<String>,
    pub acceptance_status: Option<String>,
    pub accepted_by: Option<String>,
    pub accepted_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateMilestoneRequest {
    pub project_id: Uuid,
    pub phase_id: Option<Uuid>,
    pub name: String,
    pub description: Option<String>,
    pub target_date: DateTime<Utc>,

    // 验收相关字段
    pub deliverable_type: Option<String>,
    pub acceptance_criteria: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateMilestoneRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub target_date: Option<DateTime<Utc>>,
    pub actual_date: Option<DateTime<Utc>>,
    pub status: Option<MilestoneStatus>,

    // 验收相关字段
    pub deliverable_type: Option<String>,
    pub acceptance_criteria: Option<String>,
    pub acceptance_status: Option<String>,
    pub accepted_by: Option<String>,
    pub accepted_at: Option<DateTime<Utc>>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn now() -> DateTime<Utc> {
        DateTime::parse_from_rfc3339("2024-06-01T08:00:00Z")
            .unwrap()
            .with_timezone(&Utc)
    }

    #[test]
    fn test_milestone_status_serde_roundtrip() {
        let variants = vec![
            MilestoneStatus::Pending,
            MilestoneStatus::Achieved,
            MilestoneStatus::Delayed,
        ];
        for v in variants {
            let json = serde_json::to_string(&v).unwrap();
            let back: MilestoneStatus = serde_json::from_str(&json).unwrap();
            assert_eq!(v, back);
        }
    }

    #[test]
    fn test_milestone_status_default_is_pending() {
        assert_eq!(MilestoneStatus::default(), MilestoneStatus::Pending);
    }

    #[test]
    fn milestone_status_transitions_are_guarded() {
        use MilestoneStatus::*;
        assert!(Pending.can_transition_to(Achieved));
        assert!(Pending.can_transition_to(Delayed));
        assert!(Delayed.can_transition_to(Achieved));
        assert!(Delayed.can_transition_to(Pending));
        assert!(Achieved.can_transition_to(Delayed));
        assert!(!Achieved.can_transition_to(Pending));
        assert!(Pending.can_transition_to(Pending));
        assert_eq!(MilestoneStatus::normalize(" DELAYED "), Some("delayed"));
    }

    #[test]
    fn test_milestone_status_display() {
        assert_eq!(format!("{}", MilestoneStatus::Pending), "pending");
        assert_eq!(format!("{}", MilestoneStatus::Achieved), "achieved");
        assert_eq!(format!("{}", MilestoneStatus::Delayed), "delayed");
    }

    #[test]
    fn test_project_milestone_serde_roundtrip() {
        let m = ProjectMilestone {
            id: Uuid::nil(),
            tenant_id: Uuid::nil(),
            project_id: Uuid::nil(),
            phase_id: Some(Uuid::nil()),
            name: "里程碑1".to_string(),
            description: Some("关键节点".to_string()),
            target_date: now(),
            actual_date: None,
            status: "pending".to_string(),
            created_at: now(),
            updated_at: now(),
            deliverable_type: Some("报告".to_string()),
            acceptance_criteria: Some("通过评审".to_string()),
            acceptance_status: None,
            accepted_by: None,
            accepted_at: None,
        };
        let json = serde_json::to_string(&m).unwrap();
        let back: ProjectMilestone = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        assert_eq!(json, json2);
        assert_eq!(back.name, "里程碑1");
    }

    #[test]
    fn test_create_milestone_request_roundtrip() {
        let req = CreateMilestoneRequest {
            project_id: Uuid::nil(),
            phase_id: None,
            name: "里程碑2".to_string(),
            description: None,
            target_date: now(),
            deliverable_type: None,
            acceptance_criteria: None,
        };
        let json = serde_json::to_string(&req).unwrap();
        let back: CreateMilestoneRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(back.name, "里程碑2");
        assert!(back.phase_id.is_none());
    }

    #[test]
    fn test_update_milestone_request_all_none_roundtrip() {
        let req = UpdateMilestoneRequest {
            name: None,
            description: None,
            target_date: None,
            actual_date: None,
            status: None,
            deliverable_type: None,
            acceptance_criteria: None,
            acceptance_status: None,
            accepted_by: None,
            accepted_at: None,
        };
        let json = serde_json::to_string(&req).unwrap();
        let back: UpdateMilestoneRequest = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        assert_eq!(json, json2);
    }
}
