use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ProjectApproval {
    pub id: Uuid,
    pub project_id: Uuid,
    pub status: String,
    pub current_step: i32,
    pub total_steps: i32,
    pub approvals: serde_json::Value,
    pub comments: Option<String>,
    pub created_by: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ApprovalRequest {
    pub project_id: Uuid,
    pub action: String,
    pub comment: Option<String>,
    pub approver_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ApprovalStep {
    pub step: i32,
    pub role: String,
    pub approver_id: Option<String>,
    pub approved: bool,
    pub comment: Option<String>,
    pub approved_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ApprovalHistory {
    pub step: i32,
    pub action: String,
    pub approver_id: String,
    pub comment: Option<String>,
    pub timestamp: DateTime<Utc>,
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

    // ---- ProjectApproval ----

    fn sample_approval() -> ProjectApproval {
        ProjectApproval {
            id: uid(),
            project_id: uid(),
            status: "pending".to_string(),
            current_step: 1,
            total_steps: 3,
            approvals: serde_json::json!([{"step": 1, "approved": true}]),
            comments: Some("待审批".to_string()),
            created_by: "user-1".to_string(),
            created_at: now(),
            updated_at: now(),
        }
    }

    #[test]
    fn test_project_approval_serde_roundtrip() {
        let a = sample_approval();
        let s = serde_json::to_string(&a).unwrap();
        let back: ProjectApproval = serde_json::from_str(&s).unwrap();
        assert_eq!(back.id, a.id);
        assert_eq!(back.status, a.status);
        assert_eq!(back.current_step, a.current_step);
        assert_eq!(back.total_steps, a.total_steps);
        assert_eq!(back.approvals, a.approvals);
    }

    #[test]
    fn test_project_approval_clone_preserves_fields() {
        let a = sample_approval();
        let c = a.clone();
        assert_eq!(c.id, a.id);
        assert_eq!(c.status, a.status);
        assert_eq!(c.approvals, a.approvals);
    }

    #[test]
    fn test_project_approval_with_none_comments() {
        let a = ProjectApproval {
            id: uid(),
            project_id: uid(),
            status: "approved".to_string(),
            current_step: 3,
            total_steps: 3,
            approvals: serde_json::json!([]),
            comments: None,
            created_by: "u".to_string(),
            created_at: now(),
            updated_at: now(),
        };
        let s = serde_json::to_string(&a).unwrap();
        let back: ProjectApproval = serde_json::from_str(&s).unwrap();
        assert!(back.comments.is_none());
        assert_eq!(back.current_step, 3);
    }

    #[test]
    fn test_project_approval_zero_steps_roundtrip() {
        let mut a = sample_approval();
        a.current_step = 0;
        a.total_steps = 0;
        let s = serde_json::to_string(&a).unwrap();
        let back: ProjectApproval = serde_json::from_str(&s).unwrap();
        assert_eq!(back.current_step, 0);
        assert_eq!(back.total_steps, 0);
    }

    #[test]
    fn test_project_approval_complex_json_roundtrip() {
        let mut a = sample_approval();
        a.approvals = serde_json::json!({
            "steps": [
                {"step": 1, "approver": "a", "approved": true},
                {"step": 2, "approver": "b", "approved": false, "comment": "needs work"}
            ],
            "metadata": {"version": 2}
        });
        let s = serde_json::to_string(&a).unwrap();
        let back: ProjectApproval = serde_json::from_str(&s).unwrap();
        assert_eq!(back.approvals, a.approvals);
    }

    // ---- ApprovalRequest ----

    #[test]
    fn test_approval_request_roundtrip() {
        let r = ApprovalRequest {
            project_id: uid(),
            action: "approve".to_string(),
            comment: Some("通过".to_string()),
            approver_id: "user-2".to_string(),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: ApprovalRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.project_id, r.project_id);
        assert_eq!(back.action, r.action);
        assert_eq!(back.approver_id, r.approver_id);
    }

    #[test]
    fn test_approval_request_minimal() {
        let r = ApprovalRequest {
            project_id: uid(),
            action: "reject".to_string(),
            comment: None,
            approver_id: "u".to_string(),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: ApprovalRequest = serde_json::from_str(&s).unwrap();
        assert!(back.comment.is_none());
    }

    #[test]
    fn test_approval_request_clone_eq() {
        let r = ApprovalRequest {
            project_id: uid(),
            action: "submit".to_string(),
            comment: Some("c".to_string()),
            approver_id: "a".to_string(),
        };
        let c = r.clone();
        assert_eq!(c.project_id, r.project_id);
        assert_eq!(c.action, r.action);
    }

    // ---- ApprovalStep ----

    #[test]
    fn test_approval_step_roundtrip() {
        let s_step = ApprovalStep {
            step: 2,
            role: "manager".to_string(),
            approver_id: Some("m1".to_string()),
            approved: true,
            comment: Some("同意".to_string()),
            approved_at: Some(now()),
        };
        let s = serde_json::to_string(&s_step).unwrap();
        let back: ApprovalStep = serde_json::from_str(&s).unwrap();
        assert_eq!(back.step, s_step.step);
        assert_eq!(back.role, s_step.role);
        assert_eq!(back.approved, s_step.approved);
    }

    #[test]
    fn test_approval_step_unapproved() {
        let s_step = ApprovalStep {
            step: 1,
            role: "reviewer".to_string(),
            approver_id: None,
            approved: false,
            comment: None,
            approved_at: None,
        };
        let s = serde_json::to_string(&s_step).unwrap();
        let back: ApprovalStep = serde_json::from_str(&s).unwrap();
        assert!(!back.approved);
        assert!(back.approver_id.is_none());
        assert!(back.approved_at.is_none());
    }

    #[test]
    fn test_approval_step_clone_eq() {
        let s_step = ApprovalStep {
            step: 5,
            role: "r".to_string(),
            approver_id: Some("a".to_string()),
            approved: false,
            comment: None,
            approved_at: None,
        };
        let c = s_step.clone();
        assert_eq!(c.step, s_step.step);
        assert_eq!(c.role, s_step.role);
    }

    // ---- ApprovalHistory ----

    #[test]
    fn test_approval_history_roundtrip() {
        let h = ApprovalHistory {
            step: 1,
            action: "approved".to_string(),
            approver_id: "u1".to_string(),
            comment: Some("ok".to_string()),
            timestamp: now(),
        };
        let s = serde_json::to_string(&h).unwrap();
        let back: ApprovalHistory = serde_json::from_str(&s).unwrap();
        assert_eq!(back.step, h.step);
        assert_eq!(back.action, h.action);
        assert_eq!(back.approver_id, h.approver_id);
    }

    #[test]
    fn test_approval_history_no_comment() {
        let h = ApprovalHistory {
            step: 2,
            action: "rejected".to_string(),
            approver_id: "u2".to_string(),
            comment: None,
            timestamp: now(),
        };
        let s = serde_json::to_string(&h).unwrap();
        let back: ApprovalHistory = serde_json::from_str(&s).unwrap();
        assert!(back.comment.is_none());
    }

    #[test]
    fn test_approval_history_clone_eq() {
        let h = ApprovalHistory {
            step: 3,
            action: "a".to_string(),
            approver_id: "u".to_string(),
            comment: Some("c".to_string()),
            timestamp: now(),
        };
        let c = h.clone();
        assert_eq!(c.step, h.step);
        assert_eq!(c.action, h.action);
    }
}
