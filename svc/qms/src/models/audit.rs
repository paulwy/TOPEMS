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
}
