//! Audit DTOs (AuditPlan, AuditTask, AuditFinding)

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AuditPlanQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub audit_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AuditTaskQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub plan_id: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AuditFindingQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub plan_id: Option<String>,
    pub severity: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct AuditPlan {
    pub id: String,
    pub tenant_id: String,
    pub plan_no: String,
    pub title: String,
    pub audit_type: String,
    pub scope: Option<String>,
    pub standard_id: Option<String>,
    pub status: Option<String>,
    pub scheduled_start: Option<String>,
    pub scheduled_end: Option<String>,
    pub actual_start: Option<String>,
    pub actual_end: Option<String>,
    pub created_by: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct AuditTask {
    pub id: String,
    pub tenant_id: String,
    pub task_no: String,
    pub plan_id: String,
    pub title: String,
    pub description: Option<String>,
    pub auditor: Option<String>,
    pub status: Option<String>,
    pub completed_at: Option<String>,
    pub finding_count: Option<i32>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct AuditFinding {
    pub id: String,
    pub tenant_id: String,
    pub finding_no: String,
    pub task_id: Option<String>,
    pub plan_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub severity: Option<String>,
    pub category: Option<String>,
    pub status: Option<String>,
    pub recommendation: Option<String>,
    pub responsible: Option<String>,
    pub target_date: Option<String>,
    pub verified_at: Option<String>,
    pub created_by: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateAuditPlanRequest {
    pub title: String,
    pub audit_type: String,
    pub scope: Option<String>,
    pub standard_id: Option<String>,
    pub scheduled_start: Option<String>,
    pub scheduled_end: Option<String>,
    pub created_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateAuditTaskRequest {
    pub title: String,
    pub description: Option<String>,
    pub auditor: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateAuditFindingRequest {
    pub title: String,
    pub description: Option<String>,
    pub severity: Option<String>,
    pub category: Option<String>,
    pub recommendation: Option<String>,
    pub responsible: Option<String>,
    pub target_date: Option<String>,
    pub created_by: Option<String>,
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
    fn test_audit_plan_query() {
        roundtrip(&AuditPlanQuery {
            page: Some(1),
            page_size: Some(10),
            status: None,
            audit_type: None,
        });
    }

    #[test]
    fn test_audit_task_query() {
        roundtrip(&AuditTaskQuery {
            page: Some(1),
            page_size: Some(10),
            plan_id: None,
            status: None,
        });
    }

    #[test]
    fn test_audit_finding_query() {
        roundtrip(&AuditFindingQuery {
            page: Some(1),
            page_size: Some(10),
            plan_id: None,
            severity: None,
            status: None,
        });
    }

    #[test]
    fn test_audit_plan() {
        roundtrip(&AuditPlan {
            id: "id".to_string(),
            tenant_id: "t".to_string(),
            plan_no: "AP001".to_string(),
            title: "x".to_string(),
            audit_type: "at".to_string(),
            scope: None,
            standard_id: None,
            status: None,
            scheduled_start: None,
            scheduled_end: None,
            actual_start: None,
            actual_end: None,
            created_by: None,
            created_at: None,
            updated_at: None,
        });
    }

    #[test]
    fn test_audit_task() {
        roundtrip(&AuditTask {
            id: "id".to_string(),
            tenant_id: "t".to_string(),
            task_no: "AT001".to_string(),
            plan_id: "p".to_string(),
            title: "x".to_string(),
            description: None,
            auditor: None,
            status: None,
            completed_at: None,
            finding_count: None,
            created_at: None,
            updated_at: None,
        });
    }

    #[test]
    fn test_audit_finding() {
        roundtrip(&AuditFinding {
            id: "id".to_string(),
            tenant_id: "t".to_string(),
            finding_no: "AF001".to_string(),
            task_id: None,
            plan_id: None,
            title: "x".to_string(),
            description: None,
            severity: None,
            category: None,
            status: None,
            recommendation: None,
            responsible: None,
            target_date: None,
            verified_at: None,
            created_by: None,
            created_at: None,
            updated_at: None,
        });
    }

    #[test]
    fn test_create_audit_plan_request() {
        roundtrip(&CreateAuditPlanRequest {
            title: "x".to_string(),
            audit_type: "at".to_string(),
            scope: None,
            standard_id: None,
            scheduled_start: None,
            scheduled_end: None,
            created_by: None,
        });
    }

    #[test]
    fn test_create_audit_task_request() {
        roundtrip(&CreateAuditTaskRequest {
            title: "x".to_string(),
            description: None,
            auditor: None,
        });
    }

    #[test]
    fn test_create_audit_finding_request() {
        roundtrip(&CreateAuditFindingRequest {
            title: "x".to_string(),
            description: None,
            severity: None,
            category: None,
            recommendation: None,
            responsible: None,
            target_date: None,
            created_by: None,
        });
    }

    #[test]
    fn test_audit_plan_clone_and_debug() {
        let p = AuditPlan {
            id: "ap1".to_string(),
            tenant_id: "t1".to_string(),
            plan_no: "AP-2025-001".to_string(),
            title: "Annual QMS Audit".to_string(),
            audit_type: "internal".to_string(),
            scope: Some("factory floor".to_string()),
            standard_id: Some("s1".to_string()),
            status: Some("scheduled".to_string()),
            scheduled_start: Some("2025-03-01".to_string()),
            scheduled_end: Some("2025-03-05".to_string()),
            actual_start: None,
            actual_end: None,
            created_by: Some("auditor1".to_string()),
            created_at: Some("c".to_string()),
            updated_at: Some("u".to_string()),
        };
        let p2 = p.clone();
        assert_eq!(p.id, p2.id);
        assert_eq!(p.plan_no, p2.plan_no);
        assert_eq!(p.audit_type, p2.audit_type);
        assert_eq!(p.status, p2.status);
        assert!(!format!("{:?}", p).is_empty());
    }

    #[test]
    fn test_audit_finding_clone_and_debug() {
        let f = AuditFinding {
            id: "af1".to_string(),
            tenant_id: "t1".to_string(),
            finding_no: "AF-001".to_string(),
            task_id: Some("at1".to_string()),
            plan_id: Some("ap1".to_string()),
            title: "Non-conformance A".to_string(),
            description: Some("desc".to_string()),
            severity: Some("major".to_string()),
            category: Some("doc".to_string()),
            status: Some("open".to_string()),
            recommendation: Some("rec".to_string()),
            responsible: Some("mgr1".to_string()),
            target_date: Some("2025-06-30".to_string()),
            verified_at: None,
            created_by: Some("u1".to_string()),
            created_at: Some("c".to_string()),
            updated_at: Some("u".to_string()),
        };
        let f2 = f.clone();
        assert_eq!(f.id, f2.id);
        assert_eq!(f.finding_no, f2.finding_no);
        assert_eq!(f.severity, f2.severity);
        assert!(!format!("{:?}", f).is_empty());
    }

    #[test]
    fn test_audit_task_query_all_some() {
        roundtrip(&AuditTaskQuery {
            page: Some(1),
            page_size: Some(20),
            plan_id: Some("plan-1".to_string()),
            status: Some("in_progress".to_string()),
        });
    }

    #[test]
    fn test_audit_finding_query_all_some() {
        roundtrip(&AuditFindingQuery {
            page: Some(1),
            page_size: Some(20),
            plan_id: Some("plan-1".to_string()),
            severity: Some("critical".to_string()),
            status: Some("open".to_string()),
        });
    }

    #[test]
    fn test_audit_task_all_fields_some() {
        roundtrip(&AuditTask {
            id: "at1".to_string(),
            tenant_id: "t1".to_string(),
            task_no: "AT-001".to_string(),
            plan_id: "plan1".to_string(),
            title: "Audit area A".to_string(),
            description: Some("desc".to_string()),
            auditor: Some("auditor-x".to_string()),
            status: Some("in_progress".to_string()),
            completed_at: Some("2025-04-01".to_string()),
            finding_count: Some(3),
            created_at: Some("c".to_string()),
            updated_at: Some("u".to_string()),
        });
    }
}
