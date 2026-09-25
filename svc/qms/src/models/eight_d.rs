//! 8D Report DTOs

use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct EightDQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub severity: Option<String>,
    pub assignee: Option<String>,
    pub search: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ListEightDReportsResponse {
    pub reports: Vec<EightDReport>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct EightDReport {
    pub id: String,
    pub tenant_id: String,
    pub report_no: String,
    pub title: String,
    pub status: Option<String>,
    pub severity: Option<String>,
    pub priority: Option<String>,
    pub related_issue_id: Option<String>,
    pub d1_team: Option<String>,
    pub d1_leader: Option<String>,
    pub d2_problem_description: Option<String>,
    pub d3_containment_action: Option<String>,
    pub d3_implemented_at: Option<DateTime<Utc>>,
    pub d4_root_cause: Option<String>,
    pub d4_cause_analysis: Option<String>,
    pub d5_permanent_action: Option<String>,
    pub d6_verification_result: Option<String>,
    pub d6_verified_at: Option<DateTime<Utc>>,
    pub d7_preventive_action: Option<String>,
    pub d8_congratulations: Option<String>,
    pub d8_closed_at: Option<DateTime<Utc>>,
    pub assignee: Option<String>,
    pub due_date: Option<DateTime<Utc>>,
    pub created_by: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateEightDRequest {
    pub title: String,
    pub severity: Option<String>,
    pub priority: Option<String>,
    pub related_issue_id: Option<String>,
    pub d2_problem_description: Option<String>,
    pub assignee: Option<String>,
    pub due_date: Option<NaiveDate>,
    pub created_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateEightDRequest {
    pub title: Option<String>,
    pub status: Option<String>,
    pub severity: Option<String>,
    pub priority: Option<String>,
    pub d1_team: Option<String>,
    pub d1_leader: Option<String>,
    pub d2_problem_description: Option<String>,
    pub d3_containment_action: Option<String>,
    pub d4_root_cause: Option<String>,
    pub d4_cause_analysis: Option<String>,
    pub d5_permanent_action: Option<String>,
    pub d6_verification_result: Option<String>,
    pub d7_preventive_action: Option<String>,
    pub d8_congratulations: Option<String>,
    pub assignee: Option<String>,
    pub due_date: Option<NaiveDate>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct EightDStepRequest {
    pub content: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct EightDAuditLog {
    pub id: String,
    pub tenant_id: String,
    pub report_id: String,
    pub action: String,
    pub step: Option<String>,
    pub operator: Option<String>,
    pub comment: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
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
    fn test_eight_d_query() {
        roundtrip(&EightDQuery {
            page: Some(1),
            page_size: Some(10),
            status: None,
            severity: None,
            assignee: None,
            search: None,
        });
    }

    #[test]
    fn test_list_eight_d_reports_response() {
        roundtrip(&ListEightDReportsResponse {
            reports: vec![],
            total: 0,
            page: 1,
            page_size: 10,
        });
    }

    #[test]
    fn test_eight_d_report() {
        roundtrip(&EightDReport {
            id: "id".to_string(),
            tenant_id: "t".to_string(),
            report_no: "8D001".to_string(),
            title: "x".to_string(),
            status: None,
            severity: None,
            priority: None,
            related_issue_id: None,
            d1_team: None,
            d1_leader: None,
            d2_problem_description: None,
            d3_containment_action: None,
            d3_implemented_at: None,
            d4_root_cause: None,
            d4_cause_analysis: None,
            d5_permanent_action: None,
            d6_verification_result: None,
            d6_verified_at: None,
            d7_preventive_action: None,
            d8_congratulations: None,
            d8_closed_at: None,
            assignee: None,
            due_date: None,
            created_by: None,
            created_at: None,
            updated_at: None,
        });
    }

    #[test]
    fn test_create_eight_d_request() {
        roundtrip(&CreateEightDRequest {
            title: "x".to_string(),
            severity: None,
            priority: None,
            related_issue_id: None,
            d2_problem_description: None,
            assignee: None,
            due_date: NaiveDate::from_ymd_opt(2025, 1, 1),
            created_by: None,
        });
    }

    #[test]
    fn test_update_eight_d_request() {
        roundtrip(&UpdateEightDRequest {
            title: None,
            status: None,
            severity: None,
            priority: None,
            d1_team: None,
            d1_leader: None,
            d2_problem_description: None,
            d3_containment_action: None,
            d4_root_cause: None,
            d4_cause_analysis: None,
            d5_permanent_action: None,
            d6_verification_result: None,
            d7_preventive_action: None,
            d8_congratulations: None,
            assignee: None,
            due_date: None,
        });
    }

    #[test]
    fn test_eight_d_step_request() {
        roundtrip(&EightDStepRequest { content: None });
    }

    #[test]
    fn test_eight_d_audit_log() {
        roundtrip(&EightDAuditLog {
            id: "id".to_string(),
            tenant_id: "t".to_string(),
            report_id: "r".to_string(),
            action: "ap".to_string(),
            step: None,
            operator: None,
            comment: None,
            created_at: None,
        });
    }

    #[test]
    fn test_eight_d_report_clone_and_debug() {
        let r = EightDReport {
            id: "e1".to_string(),
            tenant_id: "t1".to_string(),
            report_no: "8D-2025-001".to_string(),
            title: "Critical defect 8D".to_string(),
            status: Some("containment".to_string()),
            severity: Some("critical".to_string()),
            priority: Some("high".to_string()),
            related_issue_id: Some("i1".to_string()),
            d1_team: Some("team A".to_string()),
            d1_leader: Some("leader1".to_string()),
            d2_problem_description: Some("desc".to_string()),
            d3_containment_action: Some("ca".to_string()),
            d3_implemented_at: DateTime::from_timestamp(1738368000, 0),
            d4_root_cause: Some("rc".to_string()),
            d4_cause_analysis: Some("ana".to_string()),
            d5_permanent_action: Some("pa".to_string()),
            d6_verification_result: None,
            d6_verified_at: None,
            d7_preventive_action: None,
            d8_congratulations: None,
            d8_closed_at: None,
            assignee: Some("e1".to_string()),
            due_date: DateTime::from_timestamp(1704067200, 0),
            created_by: Some("u1".to_string()),
            created_at: DateTime::from_timestamp(1704067200, 0),
            updated_at: DateTime::from_timestamp(1704067200, 0),
        };
        let r2 = r.clone();
        assert_eq!(r.id, r2.id);
        assert_eq!(r.report_no, r2.report_no);
        assert_eq!(r.severity, r2.severity);
        assert_eq!(r.d1_team, r2.d1_team);
        assert!(!format!("{:?}", r).is_empty());
    }

    #[test]
    fn test_eight_d_query_all_some() {
        roundtrip(&EightDQuery {
            page: Some(2),
            page_size: Some(15),
            status: Some("in_progress".to_string()),
            severity: Some("major".to_string()),
            assignee: Some("eng1".to_string()),
            search: Some("keyword".to_string()),
        });
    }

    #[test]
    fn test_create_eight_d_request_all_some() {
        roundtrip(&CreateEightDRequest {
            title: "New 8D".to_string(),
            severity: Some("critical".to_string()),
            priority: Some("urgent".to_string()),
            related_issue_id: Some("i100".to_string()),
            d2_problem_description: Some("problem desc".to_string()),
            assignee: Some("manager".to_string()),
            due_date: NaiveDate::from_ymd_opt(2025, 12, 31),
            created_by: Some("u1".to_string()),
        });
    }

    #[test]
    fn test_update_eight_d_request_all_some() {
        roundtrip(&UpdateEightDRequest {
            title: Some("Updated 8D".to_string()),
            status: Some("containment".to_string()),
            severity: Some("major".to_string()),
            priority: Some("medium".to_string()),
            d1_team: Some("team".to_string()),
            d1_leader: Some("leader".to_string()),
            d2_problem_description: Some("pd".to_string()),
            d3_containment_action: Some("ca".to_string()),
            d4_root_cause: Some("rc".to_string()),
            d4_cause_analysis: Some("caa".to_string()),
            d5_permanent_action: Some("pa".to_string()),
            d6_verification_result: Some("vr".to_string()),
            d7_preventive_action: Some("pva".to_string()),
            d8_congratulations: Some("congrats".to_string()),
            assignee: Some("a1".to_string()),
            due_date: NaiveDate::from_ymd_opt(2025, 06, 30),
        });
    }
}
