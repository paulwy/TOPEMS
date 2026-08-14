use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ProjectPhase {
    pub id: Uuid,
    pub project_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub sequence_number: i32,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub progress: i32,
    pub status: String,
    pub predecessor_ids: Option<Vec<Uuid>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreatePhaseRequest {
    pub name: String,
    pub description: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub predecessor_ids: Option<Vec<Uuid>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdatePhaseRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub sequence_number: Option<i32>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub progress: Option<i32>,
    pub status: Option<String>,
    pub predecessor_ids: Option<Vec<Uuid>>,
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

    // ---- ProjectPhase ----

    fn sample_phase() -> ProjectPhase {
        ProjectPhase {
            id: uid(),
            project_id: uid(),
            name: "设计阶段".to_string(),
            description: Some("d".to_string()),
            sequence_number: 1,
            start_date: Some(now()),
            end_date: Some(now()),
            progress: 50,
            status: "in_progress".to_string(),
            predecessor_ids: Some(vec![uid(), uid()]),
            created_at: now(),
            updated_at: now(),
        }
    }

    #[test]
    fn test_project_phase_serde_roundtrip() {
        let p = sample_phase();
        let s = serde_json::to_string(&p).unwrap();
        let back: ProjectPhase = serde_json::from_str(&s).unwrap();
        assert_eq!(back.id, p.id);
        assert_eq!(back.name, p.name);
        assert_eq!(back.sequence_number, p.sequence_number);
        assert_eq!(back.progress, p.progress);
        assert_eq!(back.predecessor_ids, p.predecessor_ids);
    }

    #[test]
    fn test_project_phase_clone_preserves_fields() {
        let p = sample_phase();
        let c = p.clone();
        assert_eq!(c.id, p.id);
        assert_eq!(c.predecessor_ids, p.predecessor_ids);
    }

    #[test]
    fn test_project_phase_with_none_optional() {
        let p = ProjectPhase {
            id: uid(),
            project_id: uid(),
            name: "n".to_string(),
            description: None,
            sequence_number: 0,
            start_date: None,
            end_date: None,
            progress: 0,
            status: "pending".to_string(),
            predecessor_ids: None,
            created_at: now(),
            updated_at: now(),
        };
        let s = serde_json::to_string(&p).unwrap();
        let back: ProjectPhase = serde_json::from_str(&s).unwrap();
        assert!(back.description.is_none());
        assert!(back.predecessor_ids.is_none());
    }

    #[test]
    fn test_project_phase_empty_predecessors_roundtrip() {
        let mut p = sample_phase();
        p.predecessor_ids = Some(vec![]);
        let s = serde_json::to_string(&p).unwrap();
        let back: ProjectPhase = serde_json::from_str(&s).unwrap();
        assert_eq!(back.predecessor_ids.as_ref().unwrap().len(), 0);
    }

    #[test]
    fn test_project_phase_full_progress_roundtrip() {
        let mut p = sample_phase();
        p.progress = 100;
        let s = serde_json::to_string(&p).unwrap();
        let back: ProjectPhase = serde_json::from_str(&s).unwrap();
        assert_eq!(back.progress, 100);
    }

    // ---- CreatePhaseRequest ----

    #[test]
    fn test_create_phase_request_roundtrip() {
        let r = CreatePhaseRequest {
            name: "新阶段".to_string(),
            description: Some("d".to_string()),
            start_date: Some(now()),
            end_date: Some(now()),
            predecessor_ids: Some(vec![uid()]),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreatePhaseRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.name, r.name);
        assert_eq!(back.predecessor_ids, r.predecessor_ids);
    }

    #[test]
    fn test_create_phase_request_minimal() {
        let r = CreatePhaseRequest {
            name: "n".to_string(),
            description: None,
            start_date: None,
            end_date: None,
            predecessor_ids: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreatePhaseRequest = serde_json::from_str(&s).unwrap();
        assert!(back.description.is_none());
    }

    // ---- UpdatePhaseRequest ----

    #[test]
    fn test_update_phase_request_all_none() {
        let r = UpdatePhaseRequest {
            name: None,
            description: None,
            sequence_number: None,
            start_date: None,
            end_date: None,
            progress: None,
            status: None,
            predecessor_ids: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: UpdatePhaseRequest = serde_json::from_str(&s).unwrap();
        assert!(back.name.is_none());
        assert!(back.progress.is_none());
    }

    #[test]
    fn test_update_phase_request_with_values() {
        let r = UpdatePhaseRequest {
            name: Some("updated".to_string()),
            description: Some("d".to_string()),
            sequence_number: Some(5),
            start_date: Some(now()),
            end_date: Some(now()),
            progress: Some(75),
            status: Some("completed".to_string()),
            predecessor_ids: Some(vec![uid()]),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: UpdatePhaseRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.name, r.name);
        assert_eq!(back.progress, r.progress);
        assert_eq!(back.sequence_number, r.sequence_number);
    }
}
