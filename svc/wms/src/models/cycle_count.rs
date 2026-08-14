use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CycleCountQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub warehouse_id: Option<Uuid>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct CycleCountTask {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub config_id: Option<Uuid>,
    pub warehouse_id: Uuid,
    pub warehouse_name: Option<String>,
    pub location_id: Option<Uuid>,
    pub location_code: Option<String>,
    pub task_number: String,
    pub status: String,
    pub cycle_type: String,
    pub planned_date: Option<DateTime<Utc>>,
    pub actual_date: Option<DateTime<Utc>>,
    pub total_items: i64,
    pub counted_items: i64,
    pub discrepancy_items: i64,
    pub assigned_to: Option<Uuid>,
    pub assigned_user_name: Option<String>,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateCycleCountTaskRequest {
    pub config_id: Option<Uuid>,
    pub warehouse_id: Uuid,
    pub location_id: Option<Uuid>,
    pub cycle_type: Option<String>,
    pub planned_date: Option<DateTime<Utc>>,
    pub assigned_to: Option<Uuid>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdateCycleCountTaskRequest {
    pub status: Option<String>,
    pub actual_date: Option<DateTime<Utc>>,
    pub assigned_to: Option<Uuid>,
    pub remarks: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    fn sample_task() -> CycleCountTask {
        CycleCountTask {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            config_id: Some(Uuid::new_v4()),
            warehouse_id: Uuid::new_v4(),
            warehouse_name: Some("WH-A".into()),
            location_id: Some(Uuid::new_v4()),
            location_code: Some("A-01".into()),
            task_number: "CC-001".into(),
            status: "planned".into(),
            cycle_type: "full".into(),
            planned_date: Some(Utc::now()),
            actual_date: None,
            total_items: 100,
            counted_items: 0,
            discrepancy_items: 0,
            assigned_to: Some(Uuid::new_v4()),
            assigned_user_name: Some("Alice".into()),
            remarks: Some("initial".into()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    #[test]
    fn cycle_count_task_serde_roundtrip() {
        let t = sample_task();
        let v = serde_json::to_value(&t).unwrap();
        let back: CycleCountTask = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn cycle_count_task_serde_none_fields() {
        let t = CycleCountTask {
            config_id: None,
            warehouse_name: None,
            location_id: None,
            location_code: None,
            planned_date: None,
            actual_date: None,
            assigned_to: None,
            assigned_user_name: None,
            remarks: None,
            ..sample_task()
        };
        let v = serde_json::to_value(&t).unwrap();
        let back: CycleCountTask = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
        assert!(back.config_id.is_none());
    }

    #[test]
    fn cycle_count_task_clone_preserves_task_number() {
        let t = sample_task();
        let c = t.clone();
        assert_eq!(t.task_number, c.task_number);
        assert_eq!(t.status, c.status);
    }

    #[test]
    fn cycle_count_query_params_serde_roundtrip() {
        let p = CycleCountQueryParams {
            page: Some(1),
            page_size: Some(20),
            warehouse_id: Some(Uuid::new_v4()),
            is_active: Some(true),
        };
        let v = serde_json::to_value(&p).unwrap();
        let back: CycleCountQueryParams = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn cycle_count_query_params_all_none() {
        let p = CycleCountQueryParams {
            page: None,
            page_size: None,
            warehouse_id: None,
            is_active: None,
        };
        let v = serde_json::to_value(&p).unwrap();
        let back: CycleCountQueryParams = serde_json::from_value(v).unwrap();
        assert!(back.page.is_none());
        assert!(back.is_active.is_none());
    }

    #[test]
    fn create_cycle_count_task_request_serde_roundtrip() {
        let req = CreateCycleCountTaskRequest {
            config_id: Some(Uuid::new_v4()),
            warehouse_id: Uuid::new_v4(),
            location_id: None,
            cycle_type: Some("partial".into()),
            planned_date: Some(Utc::now()),
            assigned_to: Some(Uuid::new_v4()),
            remarks: Some("note".into()),
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: CreateCycleCountTaskRequest = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn create_cycle_count_task_request_minimal() {
        let req = CreateCycleCountTaskRequest {
            config_id: None,
            warehouse_id: Uuid::new_v4(),
            location_id: None,
            cycle_type: None,
            planned_date: None,
            assigned_to: None,
            remarks: None,
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: CreateCycleCountTaskRequest = serde_json::from_value(v).unwrap();
        assert!(back.cycle_type.is_none());
    }

    #[test]
    fn update_cycle_count_task_request_partial() {
        let req = UpdateCycleCountTaskRequest {
            status: Some("in_progress".into()),
            actual_date: Some(Utc::now()),
            assigned_to: None,
            remarks: Some("started".into()),
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: UpdateCycleCountTaskRequest = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn update_cycle_count_task_request_all_none() {
        let req = UpdateCycleCountTaskRequest {
            status: None,
            actual_date: None,
            assigned_to: None,
            remarks: None,
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: UpdateCycleCountTaskRequest = serde_json::from_value(v).unwrap();
        assert!(back.status.is_none());
    }

    #[test]
    fn cycle_count_task_json_has_expected_keys() {
        let t = sample_task();
        let v = serde_json::to_value(&t).unwrap();
        let obj = v.as_object().unwrap();
        assert!(obj.contains_key("task_number"));
        assert!(obj.contains_key("cycle_type"));
        assert!(obj.contains_key("total_items"));
    }
}
