use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum PhaseStatus {
    #[default]
    NotStarted,
    InProgress,
    Completed,
    Delayed,
}

impl std::fmt::Display for PhaseStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PhaseStatus::NotStarted => write!(f, "NOT_STARTED"),
            PhaseStatus::InProgress => write!(f, "IN_PROGRESS"),
            PhaseStatus::Completed => write!(f, "COMPLETED"),
            PhaseStatus::Delayed => write!(f, "DELAYED"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ProjectPhase {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub project_id: Uuid,
    pub phase_number: i32,
    pub name: String,
    pub description: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub planned_duration_days: Option<i32>,
    pub actual_duration_days: Option<i32>,
    pub status: String,
    pub progress: i32,
    pub weight: i32,
    pub predecessor_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreatePhaseRequest {
    pub project_id: Uuid,
    pub phase_number: i32,
    pub name: String,
    pub description: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub weight: Option<i32>,
    pub predecessor_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdatePhaseRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub status: Option<PhaseStatus>,
    pub progress: Option<i32>,
    pub weight: Option<i32>,
    pub predecessor_id: Option<Uuid>,
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
    fn test_phase_status_serde_roundtrip() {
        let variants = vec![
            PhaseStatus::NotStarted,
            PhaseStatus::InProgress,
            PhaseStatus::Completed,
            PhaseStatus::Delayed,
        ];
        for v in variants {
            let json = serde_json::to_string(&v).unwrap();
            let back: PhaseStatus = serde_json::from_str(&json).unwrap();
            assert_eq!(v, back);
        }
    }

    #[test]
    fn test_phase_status_default_is_not_started() {
        assert_eq!(PhaseStatus::default(), PhaseStatus::NotStarted);
    }

    #[test]
    fn test_phase_status_display() {
        assert_eq!(format!("{}", PhaseStatus::NotStarted), "NOT_STARTED");
        assert_eq!(format!("{}", PhaseStatus::InProgress), "IN_PROGRESS");
        assert_eq!(format!("{}", PhaseStatus::Completed), "COMPLETED");
        assert_eq!(format!("{}", PhaseStatus::Delayed), "DELAYED");
    }

    #[test]
    fn test_project_phase_serde_roundtrip() {
        let p = ProjectPhase {
            id: Uuid::nil(),
            tenant_id: Uuid::nil(),
            project_id: Uuid::nil(),
            phase_number: 1,
            name: "阶段1".to_string(),
            description: Some("启动阶段".to_string()),
            start_date: Some(now()),
            end_date: None,
            planned_duration_days: Some(30),
            actual_duration_days: None,
            status: "not_started".to_string(),
            progress: 0,
            weight: 1,
            predecessor_id: None,
            created_at: now(),
            updated_at: now(),
        };
        let json = serde_json::to_string(&p).unwrap();
        let back: ProjectPhase = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        assert_eq!(json, json2);
        assert_eq!(back.phase_number, 1);
    }

    #[test]
    fn test_create_phase_request_roundtrip() {
        let req = CreatePhaseRequest {
            project_id: Uuid::nil(),
            phase_number: 2,
            name: "阶段2".to_string(),
            description: None,
            start_date: None,
            end_date: None,
            weight: Some(2),
            predecessor_id: Some(Uuid::nil()),
        };
        let json = serde_json::to_string(&req).unwrap();
        let back: CreatePhaseRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(back.phase_number, 2);
        assert!(back.predecessor_id.is_some());
    }

    #[test]
    fn test_update_phase_request_all_none_roundtrip() {
        let req = UpdatePhaseRequest {
            name: None,
            description: None,
            start_date: None,
            end_date: None,
            status: None,
            progress: None,
            weight: None,
            predecessor_id: None,
        };
        let json = serde_json::to_string(&req).unwrap();
        let back: UpdatePhaseRequest = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        assert_eq!(json, json2);
    }
}
