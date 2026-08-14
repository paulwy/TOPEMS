use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ProjectMilestone {
    pub id: Uuid,
    pub project_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub date: DateTime<Utc>,
    pub status: String,
    pub phase_id: Option<Uuid>,
    pub acceptance_criteria: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateMilestoneRequest {
    pub name: String,
    pub description: Option<String>,
    pub date: DateTime<Utc>,
    pub phase_id: Option<Uuid>,
    pub acceptance_criteria: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateMilestoneRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub date: Option<DateTime<Utc>>,
    pub status: Option<String>,
    pub phase_id: Option<Uuid>,
    pub acceptance_criteria: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn now() -> DateTime<Utc> {
        Utc::now()
    }

    fn uid() -> Uuid {
        Uuid::parse_str("123e4567-e89b-12d3-a456-426614174000").unwrap()
    }

    // ---- ProjectMilestone ----

    fn sample_milestone() -> ProjectMilestone {
        ProjectMilestone {
            id: uid(),
            project_id: uid(),
            name: "里程碑1".to_string(),
            description: Some("d".to_string()),
            date: now(),
            status: "pending".to_string(),
            phase_id: Some(uid()),
            acceptance_criteria: Some("criteria".to_string()),
            created_at: now(),
            updated_at: now(),
        }
    }

    #[test]
    fn test_project_milestone_serde_roundtrip() {
        let m = sample_milestone();
        let s = serde_json::to_string(&m).unwrap();
        let back: ProjectMilestone = serde_json::from_str(&s).unwrap();
        assert_eq!(back.id, m.id);
        assert_eq!(back.name, m.name);
        assert_eq!(back.status, m.status);
        assert_eq!(back.phase_id, m.phase_id);
    }

    #[test]
    fn test_project_milestone_clone_preserves_fields() {
        let m = sample_milestone();
        let c = m.clone();
        assert_eq!(c.id, m.id);
        assert_eq!(c.name, m.name);
    }

    #[test]
    fn test_project_milestone_with_none_optional() {
        let m = ProjectMilestone {
            id: uid(),
            project_id: uid(),
            name: "n".to_string(),
            description: None,
            date: now(),
            status: "pending".to_string(),
            phase_id: None,
            acceptance_criteria: None,
            created_at: now(),
            updated_at: now(),
        };
        let s = serde_json::to_string(&m).unwrap();
        let back: ProjectMilestone = serde_json::from_str(&s).unwrap();
        assert!(back.description.is_none());
        assert!(back.phase_id.is_none());
    }

    #[test]
    fn test_project_milestone_completed_status_roundtrip() {
        let mut m = sample_milestone();
        m.status = "completed".to_string();
        let s = serde_json::to_string(&m).unwrap();
        let back: ProjectMilestone = serde_json::from_str(&s).unwrap();
        assert_eq!(back.status, "completed");
    }

    // ---- CreateMilestoneRequest ----

    #[test]
    fn test_create_milestone_request_roundtrip() {
        let r = CreateMilestoneRequest {
            name: "新里程碑".to_string(),
            description: Some("d".to_string()),
            date: now(),
            phase_id: Some(uid()),
            acceptance_criteria: Some("c".to_string()),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateMilestoneRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.name, r.name);
        assert_eq!(back.phase_id, r.phase_id);
    }

    #[test]
    fn test_create_milestone_request_minimal() {
        let r = CreateMilestoneRequest {
            name: "n".to_string(),
            description: None,
            date: now(),
            phase_id: None,
            acceptance_criteria: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateMilestoneRequest = serde_json::from_str(&s).unwrap();
        assert!(back.description.is_none());
    }

    #[test]
    fn test_create_milestone_request_clone_eq() {
        let r = CreateMilestoneRequest {
            name: "x".to_string(),
            description: None,
            date: now(),
            phase_id: None,
            acceptance_criteria: None,
        };
        let c = r.clone();
        assert_eq!(c.name, r.name);
    }

    // ---- UpdateMilestoneRequest ----

    #[test]
    fn test_update_milestone_request_all_none() {
        let r = UpdateMilestoneRequest {
            name: None,
            description: None,
            date: None,
            status: None,
            phase_id: None,
            acceptance_criteria: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: UpdateMilestoneRequest = serde_json::from_str(&s).unwrap();
        assert!(back.name.is_none());
        assert!(back.date.is_none());
    }

    #[test]
    fn test_update_milestone_request_with_values() {
        let r = UpdateMilestoneRequest {
            name: Some("updated".to_string()),
            description: Some("d".to_string()),
            date: Some(now()),
            status: Some("completed".to_string()),
            phase_id: Some(uid()),
            acceptance_criteria: Some("c".to_string()),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: UpdateMilestoneRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.name, r.name);
        assert_eq!(back.status, r.status);
    }
}
