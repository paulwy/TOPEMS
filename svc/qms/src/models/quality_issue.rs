//! Quality Issue DTOs

use serde::{Deserialize, Serialize};
use sqlx::types::Uuid;
use sqlx::FromRow;
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct IssueQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub severity: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct QualityIssue {
    pub id: String,
    pub tenant_id: String,
    pub issue_no: String,
    pub title: String,
    pub description: Option<String>,
    pub severity: Option<String>,
    pub status: Option<String>,
    pub source: Option<String>,
    pub related_inspection_id: Option<String>,
    pub created_by: Option<String>,
    pub created_at: Option<String>,
    pub resolved_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct QualityIssueWithWorkflow {
    #[serde(flatten)]
    pub issue: QualityIssue,
    pub approval_workflow_id: Option<String>,
    pub approval_status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateIssueRequest {
    pub title: String,
    pub description: Option<String>,
    pub severity: Option<String>,
    pub source: Option<String>,
    pub related_inspection_id: Option<String>,
    pub created_by: Option<String>,
    pub workflow_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateIssueRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub severity: Option<String>,
    pub status: Option<String>,
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
    fn test_issue_query() {
        roundtrip(&IssueQuery {
            page: Some(1),
            page_size: Some(10),
            status: None,
            severity: None,
        });
    }

    #[test]
    fn test_quality_issue() {
        roundtrip(&QualityIssue {
            id: "id".to_string(),
            tenant_id: "t".to_string(),
            issue_no: "QI001".to_string(),
            title: "x".to_string(),
            description: None,
            severity: None,
            status: None,
            source: None,
            related_inspection_id: None,
            created_by: None,
            created_at: None,
            resolved_at: None,
            updated_at: None,
        });
    }

    #[test]
    fn test_quality_issue_with_workflow() {
        roundtrip(&QualityIssueWithWorkflow {
            issue: QualityIssue {
                id: "id".to_string(),
                tenant_id: "t".to_string(),
                issue_no: "QI001".to_string(),
                title: "x".to_string(),
                description: None,
                severity: None,
                status: None,
                source: None,
                related_inspection_id: None,
                created_by: None,
                created_at: None,
                resolved_at: None,
                updated_at: None,
            },
            approval_workflow_id: None,
            approval_status: None,
        });
    }

    #[test]
    fn test_create_issue_request() {
        roundtrip(&CreateIssueRequest {
            title: "x".to_string(),
            description: None,
            severity: None,
            source: None,
            related_inspection_id: None,
            created_by: None,
            workflow_id: Some(Uuid::new_v4()),
        });
    }

    #[test]
    fn test_update_issue_request() {
        roundtrip(&UpdateIssueRequest {
            title: None,
            description: None,
            severity: None,
            status: None,
        });
    }
}
