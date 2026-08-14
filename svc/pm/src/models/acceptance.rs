use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct AcceptancePlan {
    pub id: Uuid,
    pub project_id: Uuid,
    pub plan_code: Option<String>,
    pub plan_name: String,
    pub acceptance_type: String,
    pub milestone_id: Option<Uuid>,
    pub phase_id: Option<Uuid>,
    pub acceptance_criteria: Option<String>,
    pub expected_date: Option<DateTime<Utc>>,
    pub status: String,
    pub participants: Option<serde_json::Value>,
    pub documents_required: Option<serde_json::Value>,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateAcceptancePlanRequest {
    pub plan_code: Option<String>,
    pub plan_name: String,
    pub acceptance_type: String,
    pub milestone_id: Option<Uuid>,
    pub phase_id: Option<Uuid>,
    pub acceptance_criteria: Option<String>,
    pub expected_date: Option<String>,
    pub participants: Option<serde_json::Value>,
    pub documents_required: Option<serde_json::Value>,
    pub created_by: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateAcceptancePlanRequest {
    pub plan_name: Option<String>,
    pub acceptance_type: Option<String>,
    pub acceptance_criteria: Option<String>,
    pub expected_date: Option<String>,
    pub status: Option<String>,
    pub participants: Option<serde_json::Value>,
    pub documents_required: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct AcceptanceRecord {
    pub id: Uuid,
    pub project_id: Uuid,
    pub plan_id: Uuid,
    pub acceptance_date: DateTime<Utc>,
    pub status: String,
    pub conclusion: Option<String>,
    pub score: Option<f64>,
    pub accepted_by: Option<String>,
    pub attendees: Option<serde_json::Value>,
    pub findings: Option<serde_json::Value>,
    pub recommendations: Option<serde_json::Value>,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateAcceptanceRecordRequest {
    pub plan_id: Uuid,
    pub acceptance_date: String,
    pub status: String,
    pub conclusion: Option<String>,
    pub score: Option<f64>,
    pub accepted_by: Option<String>,
    pub attendees: Option<serde_json::Value>,
    pub findings: Option<serde_json::Value>,
    pub recommendations: Option<serde_json::Value>,
    pub created_by: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateAcceptanceRecordRequest {
    pub status: Option<String>,
    pub conclusion: Option<String>,
    pub score: Option<f64>,
    pub attendees: Option<serde_json::Value>,
    pub findings: Option<serde_json::Value>,
    pub recommendations: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct AcceptanceItem {
    pub id: Uuid,
    pub plan_id: Uuid,
    pub item_code: Option<String>,
    pub item_name: String,
    pub item_description: Option<String>,
    pub required_standard: Option<String>,
    pub actual_result: Option<String>,
    pub is_passed: Option<bool>,
    pub comments: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateAcceptanceItemRequest {
    pub item_code: Option<String>,
    pub item_name: String,
    pub item_description: Option<String>,
    pub required_standard: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateAcceptanceItemRequest {
    pub actual_result: Option<String>,
    pub is_passed: Option<bool>,
    pub comments: Option<String>,
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

    // ---- AcceptancePlan ----

    fn sample_plan() -> AcceptancePlan {
        AcceptancePlan {
            id: uid(),
            project_id: uid(),
            plan_code: Some("AP-001".to_string()),
            plan_name: "验收计划1".to_string(),
            acceptance_type: "final".to_string(),
            milestone_id: Some(uid()),
            phase_id: Some(uid()),
            acceptance_criteria: Some("所有功能正常".to_string()),
            expected_date: Some(now()),
            status: "pending".to_string(),
            participants: Some(serde_json::json!(["user1", "user2"])),
            documents_required: Some(serde_json::json!(["doc1", "doc2"])),
            created_by: Some("admin".to_string()),
            created_at: now(),
            updated_at: now(),
        }
    }

    #[test]
    fn test_acceptance_plan_serde_roundtrip() {
        let p = sample_plan();
        let s = serde_json::to_string(&p).unwrap();
        let back: AcceptancePlan = serde_json::from_str(&s).unwrap();
        assert_eq!(back.id, p.id);
        assert_eq!(back.plan_name, p.plan_name);
        assert_eq!(back.acceptance_type, p.acceptance_type);
        assert_eq!(back.status, p.status);
        assert_eq!(back.participants, p.participants);
        assert_eq!(back.documents_required, p.documents_required);
    }

    #[test]
    fn test_acceptance_plan_with_none_optional() {
        let p = AcceptancePlan {
            id: uid(),
            project_id: uid(),
            plan_code: None,
            plan_name: "n".to_string(),
            acceptance_type: "interim".to_string(),
            milestone_id: None,
            phase_id: None,
            acceptance_criteria: None,
            expected_date: None,
            status: "draft".to_string(),
            participants: None,
            documents_required: None,
            created_by: None,
            created_at: now(),
            updated_at: now(),
        };
        let s = serde_json::to_string(&p).unwrap();
        let back: AcceptancePlan = serde_json::from_str(&s).unwrap();
        assert!(back.plan_code.is_none());
        assert!(back.participants.is_none());
        assert!(back.documents_required.is_none());
    }

    #[test]
    fn test_acceptance_plan_status_roundtrip() {
        let mut p = sample_plan();
        p.status = "completed".to_string();
        let s = serde_json::to_string(&p).unwrap();
        let back: AcceptancePlan = serde_json::from_str(&s).unwrap();
        assert_eq!(back.status, "completed");
    }

    #[test]
    fn test_acceptance_plan_complex_participants() {
        let mut p = sample_plan();
        p.participants = Some(serde_json::json!({
            "users": [{"id": "u1", "role": "leader"}, {"id": "u2", "role": "member"}],
            "count": 2
        }));
        let s = serde_json::to_string(&p).unwrap();
        let back: AcceptancePlan = serde_json::from_str(&s).unwrap();
        assert_eq!(back.participants, p.participants);
    }

    // ---- CreateAcceptancePlanRequest ----

    #[test]
    fn test_create_acceptance_plan_request_roundtrip() {
        let r = CreateAcceptancePlanRequest {
            plan_code: Some("AP-002".to_string()),
            plan_name: "新计划".to_string(),
            acceptance_type: "preliminary".to_string(),
            milestone_id: Some(uid()),
            phase_id: None,
            acceptance_criteria: Some("c".to_string()),
            expected_date: Some("2026-12-31".to_string()),
            participants: Some(serde_json::json!(["u1"])),
            documents_required: None,
            created_by: Some("u".to_string()),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateAcceptancePlanRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.plan_name, r.plan_name);
        assert_eq!(back.acceptance_type, r.acceptance_type);
        assert_eq!(back.participants, r.participants);
    }

    #[test]
    fn test_create_acceptance_plan_request_minimal() {
        let r = CreateAcceptancePlanRequest {
            plan_code: None,
            plan_name: "n".to_string(),
            acceptance_type: "final".to_string(),
            milestone_id: None,
            phase_id: None,
            acceptance_criteria: None,
            expected_date: None,
            participants: None,
            documents_required: None,
            created_by: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateAcceptancePlanRequest = serde_json::from_str(&s).unwrap();
        assert!(back.plan_code.is_none());
        assert!(back.participants.is_none());
    }

    // ---- UpdateAcceptancePlanRequest ----

    #[test]
    fn test_update_acceptance_plan_request_all_none() {
        let r = UpdateAcceptancePlanRequest {
            plan_name: None,
            acceptance_type: None,
            acceptance_criteria: None,
            expected_date: None,
            status: None,
            participants: None,
            documents_required: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: UpdateAcceptancePlanRequest = serde_json::from_str(&s).unwrap();
        assert!(back.plan_name.is_none());
        assert!(back.status.is_none());
    }

    #[test]
    fn test_update_acceptance_plan_request_with_values() {
        let r = UpdateAcceptancePlanRequest {
            plan_name: Some("updated".to_string()),
            acceptance_type: Some("final".to_string()),
            acceptance_criteria: Some("c".to_string()),
            expected_date: Some("2026-10-01".to_string()),
            status: Some("approved".to_string()),
            participants: Some(serde_json::json!(["u1"])),
            documents_required: Some(serde_json::json!(["d1"])),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: UpdateAcceptancePlanRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.plan_name, r.plan_name);
        assert_eq!(back.status, r.status);
    }

    // ---- AcceptanceRecord ----

    fn sample_record() -> AcceptanceRecord {
        AcceptanceRecord {
            id: uid(),
            project_id: uid(),
            plan_id: uid(),
            acceptance_date: now(),
            status: "passed".to_string(),
            conclusion: Some("通过".to_string()),
            score: Some(95.5),
            accepted_by: Some("manager".to_string()),
            attendees: Some(serde_json::json!(["u1", "u2"])),
            findings: Some(serde_json::json!({"issues": []})),
            recommendations: Some(serde_json::json!({"suggestions": ["优化流程"]})),
            created_by: Some("admin".to_string()),
            created_at: now(),
            updated_at: now(),
        }
    }

    #[test]
    fn test_acceptance_record_serde_roundtrip() {
        let r = sample_record();
        let s = serde_json::to_string(&r).unwrap();
        let back: AcceptanceRecord = serde_json::from_str(&s).unwrap();
        assert_eq!(back.id, r.id);
        assert_eq!(back.status, r.status);
        assert_eq!(back.score, r.score);
        assert_eq!(back.attendees, r.attendees);
        assert_eq!(back.findings, r.findings);
    }

    #[test]
    fn test_acceptance_record_with_none_optional() {
        let r = AcceptanceRecord {
            id: uid(),
            project_id: uid(),
            plan_id: uid(),
            acceptance_date: now(),
            status: "pending".to_string(),
            conclusion: None,
            score: None,
            accepted_by: None,
            attendees: None,
            findings: None,
            recommendations: None,
            created_by: None,
            created_at: now(),
            updated_at: now(),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: AcceptanceRecord = serde_json::from_str(&s).unwrap();
        assert!(back.conclusion.is_none());
        assert!(back.score.is_none());
    }

    #[test]
    fn test_acceptance_record_failed_status_roundtrip() {
        let mut r = sample_record();
        r.status = "failed".to_string();
        r.score = Some(40.0);
        let s = serde_json::to_string(&r).unwrap();
        let back: AcceptanceRecord = serde_json::from_str(&s).unwrap();
        assert_eq!(back.status, "failed");
        assert_eq!(back.score, Some(40.0));
    }

    // ---- CreateAcceptanceRecordRequest ----

    #[test]
    fn test_create_acceptance_record_request_roundtrip() {
        let r = CreateAcceptanceRecordRequest {
            plan_id: uid(),
            acceptance_date: "2026-08-14".to_string(),
            status: "passed".to_string(),
            conclusion: Some("c".to_string()),
            score: Some(88.0),
            accepted_by: Some("u".to_string()),
            attendees: Some(serde_json::json!(["u1"])),
            findings: None,
            recommendations: None,
            created_by: Some("admin".to_string()),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateAcceptanceRecordRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.status, r.status);
        assert_eq!(back.score, r.score);
    }

    #[test]
    fn test_create_acceptance_record_request_minimal() {
        let r = CreateAcceptanceRecordRequest {
            plan_id: uid(),
            acceptance_date: "2026-08-14".to_string(),
            status: "pending".to_string(),
            conclusion: None,
            score: None,
            accepted_by: None,
            attendees: None,
            findings: None,
            recommendations: None,
            created_by: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateAcceptanceRecordRequest = serde_json::from_str(&s).unwrap();
        assert!(back.conclusion.is_none());
        assert!(back.score.is_none());
    }

    // ---- UpdateAcceptanceRecordRequest ----

    #[test]
    fn test_update_acceptance_record_request_all_none() {
        let r = UpdateAcceptanceRecordRequest {
            status: None,
            conclusion: None,
            score: None,
            attendees: None,
            findings: None,
            recommendations: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: UpdateAcceptanceRecordRequest = serde_json::from_str(&s).unwrap();
        assert!(back.status.is_none());
        assert!(back.score.is_none());
    }

    #[test]
    fn test_update_acceptance_record_request_with_values() {
        let r = UpdateAcceptanceRecordRequest {
            status: Some("passed".to_string()),
            conclusion: Some("c".to_string()),
            score: Some(99.0),
            attendees: Some(serde_json::json!(["u1"])),
            findings: Some(serde_json::json!({"f": 1})),
            recommendations: Some(serde_json::json!({"r": 2})),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: UpdateAcceptanceRecordRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.status, r.status);
        assert_eq!(back.score, r.score);
    }

    // ---- AcceptanceItem ----

    fn sample_item() -> AcceptanceItem {
        AcceptanceItem {
            id: uid(),
            plan_id: uid(),
            item_code: Some("AI-001".to_string()),
            item_name: "功能验收项".to_string(),
            item_description: Some("d".to_string()),
            required_standard: Some("标准A".to_string()),
            actual_result: Some("符合".to_string()),
            is_passed: Some(true),
            comments: Some("无问题".to_string()),
            created_at: now(),
            updated_at: now(),
        }
    }

    #[test]
    fn test_acceptance_item_serde_roundtrip() {
        let i = sample_item();
        let s = serde_json::to_string(&i).unwrap();
        let back: AcceptanceItem = serde_json::from_str(&s).unwrap();
        assert_eq!(back.id, i.id);
        assert_eq!(back.item_name, i.item_name);
        assert_eq!(back.is_passed, i.is_passed);
        assert_eq!(back.required_standard, i.required_standard);
    }

    #[test]
    fn test_acceptance_item_with_none_optional() {
        let i = AcceptanceItem {
            id: uid(),
            plan_id: uid(),
            item_code: None,
            item_name: "n".to_string(),
            item_description: None,
            required_standard: None,
            actual_result: None,
            is_passed: None,
            comments: None,
            created_at: now(),
            updated_at: now(),
        };
        let s = serde_json::to_string(&i).unwrap();
        let back: AcceptanceItem = serde_json::from_str(&s).unwrap();
        assert!(back.item_code.is_none());
        assert!(back.is_passed.is_none());
    }

    #[test]
    fn test_acceptance_item_failed_roundtrip() {
        let mut i = sample_item();
        i.is_passed = Some(false);
        i.comments = Some("不符合标准".to_string());
        let s = serde_json::to_string(&i).unwrap();
        let back: AcceptanceItem = serde_json::from_str(&s).unwrap();
        assert_eq!(back.is_passed, Some(false));
    }

    // ---- CreateAcceptanceItemRequest ----

    #[test]
    fn test_create_acceptance_item_request_roundtrip() {
        let r = CreateAcceptanceItemRequest {
            item_code: Some("AI-002".to_string()),
            item_name: "新项".to_string(),
            item_description: Some("d".to_string()),
            required_standard: Some("s".to_string()),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateAcceptanceItemRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.item_name, r.item_name);
        assert_eq!(back.required_standard, r.required_standard);
    }

    #[test]
    fn test_create_acceptance_item_request_minimal() {
        let r = CreateAcceptanceItemRequest {
            item_code: None,
            item_name: "n".to_string(),
            item_description: None,
            required_standard: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateAcceptanceItemRequest = serde_json::from_str(&s).unwrap();
        assert!(back.item_code.is_none());
        assert!(back.required_standard.is_none());
    }

    // ---- UpdateAcceptanceItemRequest ----

    #[test]
    fn test_update_acceptance_item_request_all_none() {
        let r = UpdateAcceptanceItemRequest {
            actual_result: None,
            is_passed: None,
            comments: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: UpdateAcceptanceItemRequest = serde_json::from_str(&s).unwrap();
        assert!(back.actual_result.is_none());
        assert!(back.is_passed.is_none());
    }

    #[test]
    fn test_update_acceptance_item_request_with_values() {
        let r = UpdateAcceptanceItemRequest {
            actual_result: Some("通过".to_string()),
            is_passed: Some(true),
            comments: Some("ok".to_string()),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: UpdateAcceptanceItemRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.is_passed, r.is_passed);
        assert_eq!(back.comments, r.comments);
    }
}
