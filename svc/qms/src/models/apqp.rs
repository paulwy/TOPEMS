//! APQP (Advanced Product Quality Planning) DTOs

use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ApqpProjectQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub product_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ApqpProject {
    pub id: String,
    pub tenant_id: String,
    pub project_no: String,
    pub project_name: String,
    pub product_id: Option<String>,
    pub product_name: Option<String>,
    pub customer: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub current_phase: Option<String>,
    pub leader: Option<String>,
    pub team: Option<String>,
    pub start_date: Option<String>,
    pub target_date: Option<String>,
    pub actual_end_date: Option<String>,
    pub progress: Option<i32>,
    pub risk_level: Option<String>,
    pub created_by: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateApqpProjectRequest {
    pub project_name: String,
    pub product_id: Option<String>,
    pub product_name: Option<String>,
    pub customer: Option<String>,
    pub description: Option<String>,
    pub leader: Option<String>,
    pub team: Option<String>,
    pub start_date: Option<NaiveDate>,
    pub target_date: Option<NaiveDate>,
    pub created_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateApqpProjectRequest {
    pub project_name: Option<String>,
    pub product_id: Option<String>,
    pub product_name: Option<String>,
    pub customer: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub current_phase: Option<String>,
    pub leader: Option<String>,
    pub team: Option<String>,
    pub start_date: Option<NaiveDate>,
    pub target_date: Option<NaiveDate>,
    pub actual_end_date: Option<NaiveDate>,
    pub progress: Option<i32>,
    pub risk_level: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ApqpPhase {
    pub id: String,
    pub tenant_id: String,
    pub project_id: String,
    pub phase_code: String,
    pub phase_name: String,
    pub description: Option<String>,
    pub status: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub actual_start_date: Option<String>,
    pub actual_end_date: Option<String>,
    pub progress: Option<i32>,
    pub sort_order: Option<i32>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateApqpPhaseRequest {
    pub project_id: String,
    pub phase_code: String,
    pub phase_name: String,
    pub description: Option<String>,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateApqpPhaseRequest {
    pub phase_name: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
    pub actual_start_date: Option<NaiveDate>,
    pub actual_end_date: Option<NaiveDate>,
    pub progress: Option<i32>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ApqpTask {
    pub id: String,
    pub tenant_id: String,
    pub project_id: String,
    pub phase_id: String,
    pub task_name: String,
    pub description: Option<String>,
    pub task_type: Option<String>,
    pub deliverable: Option<String>,
    pub status: Option<String>,
    pub assignee: Option<String>,
    pub due_date: Option<String>,
    pub completed_at: Option<String>,
    pub sort_order: Option<i32>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ApqpTaskQuery {
    pub project_id: Option<String>,
    pub phase_id: Option<String>,
    pub status: Option<String>,
    pub assignee: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateApqpTaskRequest {
    pub project_id: String,
    pub phase_id: String,
    pub task_name: String,
    pub description: Option<String>,
    pub task_type: Option<String>,
    pub deliverable: Option<String>,
    pub assignee: Option<String>,
    pub due_date: Option<NaiveDate>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateApqpTaskRequest {
    pub task_name: Option<String>,
    pub description: Option<String>,
    pub task_type: Option<String>,
    pub deliverable: Option<String>,
    pub status: Option<String>,
    pub assignee: Option<String>,
    pub due_date: Option<NaiveDate>,
    pub completed_at: Option<NaiveDate>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ApqpRisk {
    pub id: String,
    pub tenant_id: String,
    pub project_id: String,
    pub risk_name: String,
    pub description: Option<String>,
    pub risk_category: Option<String>,
    pub severity: Option<i32>,
    pub occurrence: Option<i32>,
    pub detection: Option<i32>,
    pub rpn: Option<i32>,
    pub status: Option<String>,
    pub mitigation_plan: Option<String>,
    pub responsible: Option<String>,
    pub target_date: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ApqpRiskQuery {
    pub project_id: Option<String>,
    pub status: Option<String>,
    pub min_rpn: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateApqpRiskRequest {
    pub project_id: String,
    pub risk_name: String,
    pub description: Option<String>,
    pub risk_category: Option<String>,
    pub severity: i32,
    pub occurrence: i32,
    pub detection: i32,
    pub mitigation_plan: Option<String>,
    pub responsible: Option<String>,
    pub target_date: Option<NaiveDate>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateApqpRiskRequest {
    pub risk_name: Option<String>,
    pub description: Option<String>,
    pub risk_category: Option<String>,
    pub severity: Option<i32>,
    pub occurrence: Option<i32>,
    pub detection: Option<i32>,
    pub status: Option<String>,
    pub mitigation_plan: Option<String>,
    pub responsible: Option<String>,
    pub target_date: Option<NaiveDate>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ApqpProgressStatistics {
    pub total_phases: i64,
    pub completed_phases: i64,
    pub total_tasks: i64,
    pub completed_tasks: i64,
    pub overall_progress: f64,
    pub phase_progress: Vec<PhaseProgress>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct PhaseProgress {
    pub phase_id: String,
    pub phase_name: String,
    pub phase_code: String,
    pub total_tasks: i64,
    pub completed_tasks: i64,
    pub progress: f64,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct StatusTransitionRequest {
    pub target_status: String,
    pub operator: String,
    pub comment: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ApqpApproval {
    pub id: String,
    pub tenant_id: String,
    pub project_id: String,
    pub approval_type: String,
    pub status: Option<String>,
    pub applicant: Option<String>,
    pub approver: Option<String>,
    pub comment: Option<String>,
    pub submitted_at: Option<String>,
    pub approved_at: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateApqpApprovalRequest {
    pub project_id: String,
    pub approval_type: String,
    pub applicant: Option<String>,
    pub comment: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ProcessApprovalRequest {
    pub approver: String,
    pub approved: bool,
    pub comment: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::{Deserialize, Serialize};

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn test_apqp_project_query() {
        roundtrip(&ApqpProjectQuery {
            page: Some(1),
            page_size: Some(10),
            status: Some("active".to_string()),
            product_name: None,
        });
    }

    #[test]
    fn test_apqp_project() {
        roundtrip(&ApqpProject {
            id: "id".to_string(),
            tenant_id: "t".to_string(),
            project_no: "P001".to_string(),
            project_name: "x".to_string(),
            product_id: None,
            product_name: None,
            customer: None,
            description: None,
            status: None,
            current_phase: None,
            leader: None,
            team: None,
            start_date: None,
            target_date: None,
            actual_end_date: None,
            progress: Some(0),
            risk_level: None,
            created_by: None,
            created_at: None,
            updated_at: None,
        });
    }

    #[test]
    fn test_create_apqp_project_request() {
        roundtrip(&CreateApqpProjectRequest {
            project_name: "x".to_string(),
            product_id: None,
            product_name: None,
            customer: None,
            description: None,
            leader: None,
            team: None,
            start_date: NaiveDate::from_ymd_opt(2025, 1, 1),
            target_date: NaiveDate::from_ymd_opt(2025, 12, 31),
            created_by: None,
        });
    }

    #[test]
    fn test_update_apqp_project_request() {
        roundtrip(&UpdateApqpProjectRequest {
            project_name: Some("x".to_string()),
            product_id: None,
            product_name: None,
            customer: None,
            description: None,
            status: None,
            current_phase: None,
            leader: None,
            team: None,
            start_date: None,
            target_date: None,
            actual_end_date: None,
            progress: None,
            risk_level: None,
        });
    }

    #[test]
    fn test_apqp_phase() {
        roundtrip(&ApqpPhase {
            id: "id".to_string(),
            tenant_id: "t".to_string(),
            project_id: "p".to_string(),
            phase_code: "PH1".to_string(),
            phase_name: "x".to_string(),
            description: None,
            status: None,
            start_date: None,
            end_date: None,
            actual_start_date: None,
            actual_end_date: None,
            progress: Some(0),
            sort_order: Some(1),
            created_at: None,
            updated_at: None,
        });
    }

    #[test]
    fn test_create_apqp_phase_request() {
        roundtrip(&CreateApqpPhaseRequest {
            project_id: "p".to_string(),
            phase_code: "PH1".to_string(),
            phase_name: "x".to_string(),
            description: None,
            start_date: None,
            end_date: None,
            sort_order: Some(1),
        });
    }

    #[test]
    fn test_update_apqp_phase_request() {
        roundtrip(&UpdateApqpPhaseRequest {
            phase_name: Some("x".to_string()),
            description: None,
            status: None,
            start_date: None,
            end_date: None,
            actual_start_date: None,
            actual_end_date: None,
            progress: None,
            sort_order: None,
        });
    }

    #[test]
    fn test_apqp_task() {
        roundtrip(&ApqpTask {
            id: "id".to_string(),
            tenant_id: "t".to_string(),
            project_id: "p".to_string(),
            phase_id: "ph".to_string(),
            task_name: "x".to_string(),
            description: None,
            task_type: None,
            deliverable: None,
            status: None,
            assignee: None,
            due_date: None,
            completed_at: None,
            sort_order: Some(1),
            created_at: None,
            updated_at: None,
        });
    }

    #[test]
    fn test_apqp_task_query() {
        roundtrip(&ApqpTaskQuery {
            project_id: None,
            phase_id: None,
            status: None,
            assignee: None,
        });
    }

    #[test]
    fn test_create_apqp_task_request() {
        roundtrip(&CreateApqpTaskRequest {
            project_id: "p".to_string(),
            phase_id: "ph".to_string(),
            task_name: "x".to_string(),
            description: None,
            task_type: None,
            deliverable: None,
            assignee: None,
            due_date: None,
            sort_order: None,
        });
    }

    #[test]
    fn test_update_apqp_task_request() {
        roundtrip(&UpdateApqpTaskRequest {
            task_name: Some("x".to_string()),
            description: None,
            task_type: None,
            deliverable: None,
            status: None,
            assignee: None,
            due_date: None,
            completed_at: None,
            sort_order: None,
        });
    }

    #[test]
    fn test_apqp_risk() {
        roundtrip(&ApqpRisk {
            id: "id".to_string(),
            tenant_id: "t".to_string(),
            project_id: "p".to_string(),
            risk_name: "x".to_string(),
            description: None,
            risk_category: None,
            severity: Some(1),
            occurrence: Some(1),
            detection: Some(1),
            rpn: Some(1),
            status: None,
            mitigation_plan: None,
            responsible: None,
            target_date: None,
            created_at: None,
            updated_at: None,
        });
    }

    #[test]
    fn test_apqp_risk_query() {
        roundtrip(&ApqpRiskQuery {
            project_id: None,
            status: None,
            min_rpn: None,
        });
    }

    #[test]
    fn test_create_apqp_risk_request() {
        roundtrip(&CreateApqpRiskRequest {
            project_id: "p".to_string(),
            risk_name: "x".to_string(),
            description: None,
            risk_category: None,
            severity: 1,
            occurrence: 1,
            detection: 1,
            mitigation_plan: None,
            responsible: None,
            target_date: None,
        });
    }

    #[test]
    fn test_update_apqp_risk_request() {
        roundtrip(&UpdateApqpRiskRequest {
            risk_name: Some("x".to_string()),
            description: None,
            risk_category: None,
            severity: None,
            occurrence: None,
            detection: None,
            status: None,
            mitigation_plan: None,
            responsible: None,
            target_date: None,
        });
    }

    #[test]
    fn test_apqp_progress_statistics() {
        roundtrip(&ApqpProgressStatistics {
            total_phases: 0,
            completed_phases: 0,
            total_tasks: 0,
            completed_tasks: 0,
            overall_progress: 0.0,
            phase_progress: vec![PhaseProgress {
                phase_id: "id".to_string(),
                phase_name: "n".to_string(),
                phase_code: "c".to_string(),
                total_tasks: 0,
                completed_tasks: 0,
                progress: 0.0,
                status: "s".to_string(),
            }],
        });
    }

    #[test]
    fn test_status_transition_request() {
        roundtrip(&StatusTransitionRequest {
            target_status: "x".to_string(),
            operator: "op".to_string(),
            comment: None,
        });
    }

    #[test]
    fn test_apqp_approval() {
        roundtrip(&ApqpApproval {
            id: "id".to_string(),
            tenant_id: "t".to_string(),
            project_id: "p".to_string(),
            approval_type: "at".to_string(),
            status: None,
            applicant: None,
            approver: None,
            comment: None,
            submitted_at: None,
            approved_at: None,
            created_at: None,
        });
    }

    #[test]
    fn test_create_apqp_approval_request() {
        roundtrip(&CreateApqpApprovalRequest {
            project_id: "p".to_string(),
            approval_type: "at".to_string(),
            applicant: None,
            comment: None,
        });
    }

    #[test]
    fn test_process_approval_request() {
        roundtrip(&ProcessApprovalRequest {
            approver: "a".to_string(),
            approved: true,
            comment: None,
        });
    }

    #[test]
    fn test_apqp_project_clone_and_debug() {
        let p = ApqpProject {
            id: "ap1".to_string(),
            tenant_id: "t1".to_string(),
            project_no: "APQP-001".to_string(),
            project_name: "New Product X Launch".to_string(),
            product_id: Some("p1".to_string()),
            product_name: Some("Prod X".to_string()),
            customer: Some("Cust A".to_string()),
            description: Some("full project desc".to_string()),
            status: Some("in_design".to_string()),
            current_phase: Some("Phase 2".to_string()),
            leader: Some("pm1".to_string()),
            team: Some("team list".to_string()),
            start_date: Some("2025-01-01".to_string()),
            target_date: Some("2025-12-31".to_string()),
            actual_end_date: None,
            progress: Some(25),
            risk_level: Some("medium".to_string()),
            created_by: Some("admin".to_string()),
            created_at: Some("c".to_string()),
            updated_at: Some("u".to_string()),
        };
        let p2 = p.clone();
        assert_eq!(p.id, p2.id);
        assert_eq!(p.project_no, p2.project_no);
        assert_eq!(p.status, p2.status);
        assert_eq!(p.progress, p2.progress);
        assert!(!format!("{:?}", p).is_empty());
    }

    #[test]
    fn test_apqp_risk_clone_and_rpn() {
        let r = ApqpRisk {
            id: "r1".to_string(),
            tenant_id: "t1".to_string(),
            project_id: "p1".to_string(),
            risk_name: "Supply chain delay".to_string(),
            description: Some("risk desc".to_string()),
            risk_category: Some("logistics".to_string()),
            severity: Some(7),
            occurrence: Some(5),
            detection: Some(6),
            rpn: Some(210),
            status: Some("mitigating".to_string()),
            mitigation_plan: Some("dual source".to_string()),
            responsible: Some("mgr1".to_string()),
            target_date: Some("2025-06-30".to_string()),
            created_at: Some("c".to_string()),
            updated_at: Some("u".to_string()),
        };
        let r2 = r.clone();
        assert_eq!(r.id, r2.id);
        assert_eq!(r.risk_name, r2.risk_name);
        assert_eq!(r.rpn, r2.rpn);
        assert_eq!(r.severity, r2.severity);
        assert!(!format!("{:?}", r).is_empty());
    }

    #[test]
    fn test_apqp_task_all_fields_some() {
        roundtrip(&ApqpTask {
            id: "task1".to_string(),
            tenant_id: "t1".to_string(),
            project_id: "p1".to_string(),
            phase_id: "ph1".to_string(),
            task_name: "Design FMEA".to_string(),
            description: Some("complete design fmea".to_string()),
            task_type: Some("deliverable".to_string()),
            deliverable: Some("FMEA report".to_string()),
            status: Some("in_progress".to_string()),
            assignee: Some("eng1".to_string()),
            due_date: Some("2025-04-30".to_string()),
            completed_at: None,
            sort_order: Some(3),
            created_at: Some("c".to_string()),
            updated_at: Some("u".to_string()),
        });
    }

    #[test]
    fn test_apqp_phase_all_some() {
        roundtrip(&ApqpPhase {
            id: "ph1".to_string(),
            tenant_id: "t1".to_string(),
            project_id: "p1".to_string(),
            phase_code: "PH2".to_string(),
            phase_name: "Product Design".to_string(),
            description: Some("phase desc".to_string()),
            status: Some("in_progress".to_string()),
            start_date: Some("2025-02-01".to_string()),
            end_date: Some("2025-05-31".to_string()),
            actual_start_date: Some("2025-02-05".to_string()),
            actual_end_date: None,
            progress: Some(40),
            sort_order: Some(2),
            created_at: Some("c".to_string()),
            updated_at: Some("u".to_string()),
        });
    }

    #[test]
    fn test_apqp_progress_statistics_complex() {
        roundtrip(&ApqpProgressStatistics {
            total_phases: 4,
            completed_phases: 1,
            total_tasks: 20,
            completed_tasks: 7,
            overall_progress: 35.0,
            phase_progress: vec![
                PhaseProgress {
                    phase_id: "ph1".to_string(),
                    phase_name: "Planning".to_string(),
                    phase_code: "PH1".to_string(),
                    total_tasks: 5,
                    completed_tasks: 5,
                    progress: 100.0,
                    status: "completed".to_string(),
                },
                PhaseProgress {
                    phase_id: "ph2".to_string(),
                    phase_name: "Design".to_string(),
                    phase_code: "PH2".to_string(),
                    total_tasks: 7,
                    completed_tasks: 2,
                    progress: 28.57,
                    status: "in_progress".to_string(),
                },
            ],
        });
    }
}
