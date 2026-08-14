use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct QualityCheck {
    pub id: Uuid,
    pub project_id: Uuid,
    pub check_code: Option<String>,
    pub check_name: String,
    pub check_type: Option<String>,
    pub phase_id: Option<Uuid>,
    pub milestone_id: Option<Uuid>,
    pub check_criteria: Option<String>,
    pub acceptance_standard: Option<String>,
    pub status: String,
    pub check_date: Option<DateTime<Utc>>,
    pub checked_by: Option<String>,
    pub result_details: Option<serde_json::Value>,
    pub nonconformities: Option<serde_json::Value>,
    pub corrective_actions: Option<serde_json::Value>,
    pub follow_up_date: Option<DateTime<Utc>>,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateQualityCheckRequest {
    pub check_code: Option<String>,
    pub check_name: String,
    pub check_type: Option<String>,
    pub phase_id: Option<Uuid>,
    pub milestone_id: Option<Uuid>,
    pub check_criteria: Option<String>,
    pub acceptance_standard: Option<String>,
    pub created_by: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateQualityCheckRequest {
    pub check_name: Option<String>,
    pub check_type: Option<String>,
    pub check_criteria: Option<String>,
    pub acceptance_standard: Option<String>,
    pub status: Option<String>,
    pub check_date: Option<String>,
    pub checked_by: Option<String>,
    pub result_details: Option<serde_json::Value>,
    pub nonconformities: Option<serde_json::Value>,
    pub corrective_actions: Option<serde_json::Value>,
    pub follow_up_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Defect {
    pub id: Uuid,
    pub project_id: Uuid,
    pub check_id: Option<Uuid>,
    pub defect_code: Option<String>,
    pub defect_name: String,
    pub defect_description: Option<String>,
    pub severity: String,
    pub priority: String,
    pub status: String,
    pub assignee: Option<String>,
    pub due_date: Option<DateTime<Utc>>,
    pub resolution: Option<String>,
    pub resolved_at: Option<DateTime<Utc>>,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateDefectRequest {
    pub defect_code: Option<String>,
    pub defect_name: String,
    pub defect_description: Option<String>,
    pub severity: String,
    pub priority: String,
    pub check_id: Option<Uuid>,
    pub assignee: Option<String>,
    pub due_date: Option<String>,
    pub created_by: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateDefectRequest {
    pub defect_name: Option<String>,
    pub defect_description: Option<String>,
    pub severity: Option<String>,
    pub priority: Option<String>,
    pub status: Option<String>,
    pub assignee: Option<String>,
    pub due_date: Option<String>,
    pub resolution: Option<String>,
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

    // ---- QualityCheck ----

    fn sample_quality_check() -> QualityCheck {
        QualityCheck {
            id: uid(),
            project_id: uid(),
            check_code: Some("QC-001".to_string()),
            check_name: "初验".to_string(),
            check_type: Some("acceptance".to_string()),
            phase_id: Some(uid()),
            milestone_id: Some(uid()),
            check_criteria: Some("符合规范".to_string()),
            acceptance_standard: Some("合格率100%".to_string()),
            status: "passed".to_string(),
            check_date: Some(now()),
            checked_by: Some("checker".to_string()),
            result_details: Some(serde_json::json!({"score": 95})),
            nonconformities: Some(serde_json::json!([{"item": "x"}])),
            corrective_actions: Some(serde_json::json!([{"action": "fix"}])),
            follow_up_date: Some(now()),
            created_by: Some("admin".to_string()),
            created_at: now(),
            updated_at: now(),
        }
    }

    #[test]
    fn test_quality_check_serde_roundtrip() {
        let q = sample_quality_check();
        let s = serde_json::to_string(&q).unwrap();
        let back: QualityCheck = serde_json::from_str(&s).unwrap();
        assert_eq!(back.id, q.id);
        assert_eq!(back.check_name, q.check_name);
        assert_eq!(back.status, q.status);
        assert_eq!(back.result_details, q.result_details);
        assert_eq!(back.nonconformities, q.nonconformities);
    }

    #[test]
    fn test_quality_check_clone_preserves_fields() {
        let q = sample_quality_check();
        let c = q.clone();
        assert_eq!(c.id, q.id);
        assert_eq!(c.check_name, q.check_name);
    }

    #[test]
    fn test_quality_check_with_none_optional() {
        let q = QualityCheck {
            id: uid(),
            project_id: uid(),
            check_code: None,
            check_name: "n".to_string(),
            check_type: None,
            phase_id: None,
            milestone_id: None,
            check_criteria: None,
            acceptance_standard: None,
            status: "pending".to_string(),
            check_date: None,
            checked_by: None,
            result_details: None,
            nonconformities: None,
            corrective_actions: None,
            follow_up_date: None,
            created_by: None,
            created_at: now(),
            updated_at: now(),
        };
        let s = serde_json::to_string(&q).unwrap();
        let back: QualityCheck = serde_json::from_str(&s).unwrap();
        assert!(back.check_code.is_none());
        assert!(back.result_details.is_none());
    }

    #[test]
    fn test_quality_check_failed_status_roundtrip() {
        let mut q = sample_quality_check();
        q.status = "failed".to_string();
        let s = serde_json::to_string(&q).unwrap();
        let back: QualityCheck = serde_json::from_str(&s).unwrap();
        assert_eq!(back.status, "failed");
    }

    // ---- CreateQualityCheckRequest ----

    #[test]
    fn test_create_quality_check_request_roundtrip() {
        let r = CreateQualityCheckRequest {
            check_code: Some("NEW-QC-1".to_string()),
            check_name: "新检查".to_string(),
            check_type: Some("process".to_string()),
            phase_id: Some(uid()),
            milestone_id: Some(uid()),
            check_criteria: Some("c".to_string()),
            acceptance_standard: Some("a".to_string()),
            created_by: Some("u".to_string()),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateQualityCheckRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.check_name, r.check_name);
        assert_eq!(back.check_type, r.check_type);
        assert_eq!(back.phase_id, r.phase_id);
    }

    #[test]
    fn test_create_quality_check_request_minimal() {
        let r = CreateQualityCheckRequest {
            check_code: None,
            check_name: "n".to_string(),
            check_type: None,
            phase_id: None,
            milestone_id: None,
            check_criteria: None,
            acceptance_standard: None,
            created_by: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateQualityCheckRequest = serde_json::from_str(&s).unwrap();
        assert!(back.check_code.is_none());
    }

    // ---- UpdateQualityCheckRequest ----

    #[test]
    fn test_update_quality_check_request_all_none() {
        let r = UpdateQualityCheckRequest {
            check_name: None,
            check_type: None,
            check_criteria: None,
            acceptance_standard: None,
            status: None,
            check_date: None,
            checked_by: None,
            result_details: None,
            nonconformities: None,
            corrective_actions: None,
            follow_up_date: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: UpdateQualityCheckRequest = serde_json::from_str(&s).unwrap();
        assert!(back.check_name.is_none());
        assert!(back.result_details.is_none());
    }

    #[test]
    fn test_update_quality_check_request_with_values() {
        let r = UpdateQualityCheckRequest {
            check_name: Some("updated".to_string()),
            check_type: Some("final".to_string()),
            check_criteria: Some("c".to_string()),
            acceptance_standard: Some("a".to_string()),
            status: Some("passed".to_string()),
            check_date: Some("2024-12-31T00:00:00Z".to_string()),
            checked_by: Some("c".to_string()),
            result_details: Some(serde_json::json!({"score": 100})),
            nonconformities: Some(serde_json::json!([])),
            corrective_actions: Some(serde_json::json!(null)),
            follow_up_date: Some("2025-01-15T00:00:00Z".to_string()),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: UpdateQualityCheckRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.check_name, r.check_name);
        assert_eq!(back.result_details, r.result_details);
    }

    // ---- Defect ----

    fn sample_defect() -> Defect {
        Defect {
            id: uid(),
            project_id: uid(),
            check_id: Some(uid()),
            defect_code: Some("D-001".to_string()),
            defect_name: "缺陷1".to_string(),
            defect_description: Some("d".to_string()),
            severity: "major".to_string(),
            priority: "high".to_string(),
            status: "open".to_string(),
            assignee: Some("dev".to_string()),
            due_date: Some(now()),
            resolution: Some("fixed".to_string()),
            resolved_at: Some(now()),
            created_by: Some("tester".to_string()),
            created_at: now(),
            updated_at: now(),
        }
    }

    #[test]
    fn test_defect_serde_roundtrip() {
        let d = sample_defect();
        let s = serde_json::to_string(&d).unwrap();
        let back: Defect = serde_json::from_str(&s).unwrap();
        assert_eq!(back.id, d.id);
        assert_eq!(back.defect_name, d.defect_name);
        assert_eq!(back.severity, d.severity);
        assert_eq!(back.priority, d.priority);
    }

    #[test]
    fn test_defect_clone_preserves_fields() {
        let d = sample_defect();
        let c = d.clone();
        assert_eq!(c.id, d.id);
        assert_eq!(c.defect_name, d.defect_name);
    }

    #[test]
    fn test_defect_with_none_optional() {
        let d = Defect {
            id: uid(),
            project_id: uid(),
            check_id: None,
            defect_code: None,
            defect_name: "n".to_string(),
            defect_description: None,
            severity: "minor".to_string(),
            priority: "low".to_string(),
            status: "open".to_string(),
            assignee: None,
            due_date: None,
            resolution: None,
            resolved_at: None,
            created_by: None,
            created_at: now(),
            updated_at: now(),
        };
        let s = serde_json::to_string(&d).unwrap();
        let back: Defect = serde_json::from_str(&s).unwrap();
        assert!(back.check_id.is_none());
        assert!(back.resolved_at.is_none());
    }

    #[test]
    fn test_defect_closed_status_roundtrip() {
        let mut d = sample_defect();
        d.status = "closed".to_string();
        let s = serde_json::to_string(&d).unwrap();
        let back: Defect = serde_json::from_str(&s).unwrap();
        assert_eq!(back.status, "closed");
    }

    // ---- CreateDefectRequest ----

    #[test]
    fn test_create_defect_request_roundtrip() {
        let r = CreateDefectRequest {
            defect_code: Some("NEW-D-1".to_string()),
            defect_name: "新缺陷".to_string(),
            defect_description: Some("d".to_string()),
            severity: "critical".to_string(),
            priority: "urgent".to_string(),
            check_id: Some(uid()),
            assignee: Some("a".to_string()),
            due_date: Some("2024-12-31T00:00:00Z".to_string()),
            created_by: Some("u".to_string()),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateDefectRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.defect_name, r.defect_name);
        assert_eq!(back.severity, r.severity);
        assert_eq!(back.check_id, r.check_id);
    }

    #[test]
    fn test_create_defect_request_minimal() {
        let r = CreateDefectRequest {
            defect_code: None,
            defect_name: "n".to_string(),
            defect_description: None,
            severity: "minor".to_string(),
            priority: "low".to_string(),
            check_id: None,
            assignee: None,
            due_date: None,
            created_by: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateDefectRequest = serde_json::from_str(&s).unwrap();
        assert!(back.defect_code.is_none());
    }

    // ---- UpdateDefectRequest ----

    #[test]
    fn test_update_defect_request_all_none() {
        let r = UpdateDefectRequest {
            defect_name: None,
            defect_description: None,
            severity: None,
            priority: None,
            status: None,
            assignee: None,
            due_date: None,
            resolution: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: UpdateDefectRequest = serde_json::from_str(&s).unwrap();
        assert!(back.defect_name.is_none());
        assert!(back.resolution.is_none());
    }

    #[test]
    fn test_update_defect_request_with_values() {
        let r = UpdateDefectRequest {
            defect_name: Some("updated".to_string()),
            defect_description: Some("d".to_string()),
            severity: Some("major".to_string()),
            priority: Some("high".to_string()),
            status: Some("in_progress".to_string()),
            assignee: Some("a".to_string()),
            due_date: Some("2024-12-31T00:00:00Z".to_string()),
            resolution: Some("fixed".to_string()),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: UpdateDefectRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.defect_name, r.defect_name);
        assert_eq!(back.resolution, r.resolution);
    }
}
