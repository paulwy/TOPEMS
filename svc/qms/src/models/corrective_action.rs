//! Corrective Action DTOs

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ActionQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub issue_id: Option<String>,
    pub search: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ListActionsResponse {
    pub actions: Vec<CorrectiveAction>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct CorrectiveAction {
    pub id: String,
    pub tenant_id: String,
    pub action_no: String,
    pub issue_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub root_cause: Option<String>,
    pub action_type: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub assignee: Option<String>,
    pub target_date: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub created_by: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ActionItem {
    pub id: String,
    pub tenant_id: String,
    pub action_id: String,
    pub item_name: String,
    pub responsible: Option<String>,
    pub due_date: Option<DateTime<Utc>>,
    pub status: Option<String>,
    pub completed_at: Option<DateTime<Utc>>,
    pub remark: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateActionRequest {
    pub issue_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub root_cause: Option<String>,
    pub action_type: Option<String>,
    pub priority: Option<String>,
    pub assignee: Option<String>,
    pub target_date: Option<String>,
    pub created_by: Option<String>,
    pub items: Option<Vec<CreateActionItemRequest>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateActionItemRequest {
    pub item_name: String,
    pub responsible: Option<String>,
    pub due_date: Option<String>,
    pub remark: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateActionRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub root_cause: Option<String>,
    pub action_type: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub assignee: Option<String>,
    pub target_date: Option<String>,
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
    fn test_action_query() {
        roundtrip(&ActionQuery {
            page: Some(1),
            page_size: Some(10),
            status: None,
            priority: None,
            issue_id: None,
            search: None,
        });
    }

    #[test]
    fn test_list_actions_response() {
        roundtrip(&ListActionsResponse {
            actions: vec![],
            total: 0,
            page: 1,
            page_size: 10,
        });
    }

    #[test]
    fn test_corrective_action() {
        roundtrip(&CorrectiveAction {
            id: "id".to_string(),
            tenant_id: "t".to_string(),
            action_no: "CA001".to_string(),
            issue_id: None,
            title: "x".to_string(),
            description: None,
            root_cause: None,
            action_type: None,
            status: None,
            priority: None,
            assignee: None,
            target_date: None,
            completed_at: None,
            created_by: None,
            created_at: None,
            updated_at: None,
        });
    }

    #[test]
    fn test_action_item() {
        roundtrip(&ActionItem {
            id: "id".to_string(),
            tenant_id: "t".to_string(),
            action_id: "a".to_string(),
            item_name: "n".to_string(),
            responsible: None,
            due_date: None,
            status: None,
            completed_at: None,
            remark: None,
            created_at: None,
        });
    }

    #[test]
    fn test_create_action_request() {
        roundtrip(&CreateActionRequest {
            issue_id: None,
            title: "x".to_string(),
            description: None,
            root_cause: None,
            action_type: None,
            priority: None,
            assignee: None,
            target_date: None,
            created_by: None,
            items: Some(vec![CreateActionItemRequest {
                item_name: "it".to_string(),
                responsible: None,
                due_date: None,
                remark: None,
            }]),
        });
    }

    #[test]
    fn test_create_action_item_request() {
        roundtrip(&CreateActionItemRequest {
            item_name: "it".to_string(),
            responsible: None,
            due_date: None,
            remark: None,
        });
    }

    #[test]
    fn test_update_action_request() {
        roundtrip(&UpdateActionRequest {
            title: None,
            description: None,
            root_cause: None,
            action_type: None,
            status: None,
            priority: None,
            assignee: None,
            target_date: None,
        });
    }

    #[test]
    fn test_corrective_action_clone_and_debug() {
        let a = CorrectiveAction {
            id: "a1".to_string(),
            tenant_id: "t1".to_string(),
            action_no: "CA-001".to_string(),
            issue_id: Some("i1".to_string()),
            title: "Fix scratch issue".to_string(),
            description: Some("desc".to_string()),
            root_cause: Some("rc".to_string()),
            action_type: Some("preventive".to_string()),
            status: Some("in_progress".to_string()),
            priority: Some("high".to_string()),
            assignee: Some("eng1".to_string()),
            target_date: DateTime::from_timestamp(1704067200, 0),
            completed_at: None,
            created_by: Some("u1".to_string()),
            created_at: DateTime::from_timestamp(1704067200, 0),
            updated_at: DateTime::from_timestamp(1704067200, 0),
        };
        let a2 = a.clone();
        assert_eq!(a.id, a2.id);
        assert_eq!(a.action_no, a2.action_no);
        assert_eq!(a.issue_id, a2.issue_id);
        assert_eq!(a.priority, a2.priority);
        assert!(!format!("{:?}", a).is_empty());
    }

    #[test]
    fn test_action_query_all_some() {
        roundtrip(&ActionQuery {
            page: Some(3),
            page_size: Some(25),
            status: Some("pending".to_string()),
            priority: Some("high".to_string()),
            issue_id: Some("i-xyz".to_string()),
            search: Some("keyword".to_string()),
        });
    }

    #[test]
    fn test_action_item_all_fields_some() {
        roundtrip(&ActionItem {
            id: "id".to_string(),
            tenant_id: "t".to_string(),
            action_id: "a".to_string(),
            item_name: "task 1".to_string(),
            responsible: Some("resp".to_string()),
            due_date: DateTime::from_timestamp(1704067200, 0),
            status: Some("completed".to_string()),
            completed_at: DateTime::from_timestamp(1704067200, 0),
            remark: Some("ok".to_string()),
            created_at: DateTime::from_timestamp(1704067200, 0),
        });
    }

    #[test]
    fn test_create_action_request_all_some() {
        roundtrip(&CreateActionRequest {
            issue_id: Some("i1".to_string()),
            title: "Action A".to_string(),
            description: Some("d".to_string()),
            root_cause: Some("rc".to_string()),
            action_type: Some("correction".to_string()),
            priority: Some("medium".to_string()),
            assignee: Some("a1".to_string()),
            target_date: Some("2025-01-01".to_string()),
            created_by: Some("u1".to_string()),
            items: Some(vec![
                CreateActionItemRequest {
                    item_name: "i1".to_string(),
                    responsible: Some("r1".to_string()),
                    due_date: Some("2025-01-01".to_string()),
                    remark: Some("ok".to_string()),
                },
                CreateActionItemRequest {
                    item_name: "i2".to_string(),
                    responsible: None,
                    due_date: None,
                    remark: None,
                },
            ]),
        });
    }
}
