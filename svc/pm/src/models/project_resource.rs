use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

/// 项目资源行（DB row / 响应体）。
/// 列对齐 pm.project_resources 真库：resource_type/resource_name/quantity/cost/status
/// + 补列(resource_service/start_date/end_date/allocation_percent/created_by)。
/// 代码改名：actual_cost->cost, actual_hours->quantity, role->resource_type, resource_id->resource_name。
#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ProjectResource {
    pub id: Uuid,
    pub project_id: Uuid,
    pub resource_type: String,
    pub resource_name: String,
    pub resource_service: Option<String>,
    pub quantity: Option<f64>,
    pub cost: Option<f64>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub allocation_percent: Option<i32>,
    pub status: Option<String>,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateResourceRequest {
    pub resource_type: String,
    pub resource_name: String,
    pub resource_service: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub allocation_percent: Option<i32>,
    pub created_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateResourceRequest {
    pub resource_type: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub allocation_percent: Option<i32>,
    pub quantity: Option<f64>,
    pub cost: Option<f64>,
    pub status: Option<String>,
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

    // ---- ProjectResource ----

    fn sample_resource() -> ProjectResource {
        ProjectResource {
            id: uid(),
            project_id: uid(),
            resource_type: "human".to_string(),
            resource_name: "张三".to_string(),
            resource_service: Some("iam".to_string()),
            quantity: Some(120.0),
            cost: Some(15_000.0),
            start_date: Some(now()),
            end_date: Some(now()),
            allocation_percent: Some(80),
            status: Some("active".to_string()),
            created_by: Some("admin".to_string()),
            created_at: now(),
            updated_at: now(),
        }
    }

    #[test]
    fn test_project_resource_serde_roundtrip() {
        let r = sample_resource();
        let s = serde_json::to_string(&r).unwrap();
        let back: ProjectResource = serde_json::from_str(&s).unwrap();
        assert_eq!(back.id, r.id);
        assert_eq!(back.resource_type, r.resource_type);
        assert_eq!(back.allocation_percent, r.allocation_percent);
        assert_eq!(back.cost, r.cost);
    }

    #[test]
    fn test_project_resource_clone_preserves_fields() {
        let r = sample_resource();
        let c = r.clone();
        assert_eq!(c.id, r.id);
        assert_eq!(c.resource_type, r.resource_type);
    }

    #[test]
    fn test_project_resource_with_none_optional() {
        let r = ProjectResource {
            id: uid(),
            project_id: uid(),
            resource_type: "equipment".to_string(),
            resource_name: "塔吊".to_string(),
            resource_service: None,
            quantity: None,
            cost: None,
            start_date: None,
            end_date: None,
            allocation_percent: None,
            status: None,
            created_by: None,
            created_at: now(),
            updated_at: now(),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: ProjectResource = serde_json::from_str(&s).unwrap();
        assert!(back.quantity.is_none());
        assert!(back.allocation_percent.is_none());
    }

    #[test]
    fn test_project_resource_zero_allocation_roundtrip() {
        let mut r = sample_resource();
        r.allocation_percent = Some(0);
        let s = serde_json::to_string(&r).unwrap();
        let back: ProjectResource = serde_json::from_str(&s).unwrap();
        assert_eq!(back.allocation_percent, Some(0));
    }

    #[test]
    fn test_project_resource_full_allocation_roundtrip() {
        let mut r = sample_resource();
        r.allocation_percent = Some(100);
        let s = serde_json::to_string(&r).unwrap();
        let back: ProjectResource = serde_json::from_str(&s).unwrap();
        assert_eq!(back.allocation_percent, Some(100));
    }

    // ---- CreateResourceRequest ----

    #[test]
    fn test_create_resource_request_roundtrip() {
        let r = CreateResourceRequest {
            resource_type: "human".to_string(),
            resource_name: "李四".to_string(),
            resource_service: Some("iam".to_string()),
            start_date: Some(now()),
            end_date: Some(now()),
            allocation_percent: Some(50),
            created_by: Some("u".to_string()),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateResourceRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.resource_type, r.resource_type);
        assert_eq!(back.allocation_percent, r.allocation_percent);
    }

    #[test]
    fn test_create_resource_request_minimal() {
        let r = CreateResourceRequest {
            resource_type: "tool".to_string(),
            resource_name: "钻机".to_string(),
            resource_service: None,
            start_date: None,
            end_date: None,
            allocation_percent: None,
            created_by: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateResourceRequest = serde_json::from_str(&s).unwrap();
        assert!(back.resource_service.is_none());
    }

    // ---- UpdateResourceRequest ----

    #[test]
    fn test_update_resource_request_all_none() {
        let r = UpdateResourceRequest {
            resource_type: None,
            start_date: None,
            end_date: None,
            allocation_percent: None,
            quantity: None,
            cost: None,
            status: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: UpdateResourceRequest = serde_json::from_str(&s).unwrap();
        assert!(back.resource_type.is_none());
        assert!(back.cost.is_none());
    }

    #[test]
    fn test_update_resource_request_with_values() {
        let r = UpdateResourceRequest {
            resource_type: Some("human".to_string()),
            start_date: Some(now()),
            end_date: Some(now()),
            allocation_percent: Some(100),
            quantity: Some(200.0),
            cost: Some(25_000.0),
            status: Some("completed".to_string()),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: UpdateResourceRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.resource_type, r.resource_type);
        assert_eq!(back.allocation_percent, r.allocation_percent);
    }
}
