#![allow(dead_code)]

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateWorkReportRequest {
    pub work_order_id: Uuid,
    pub worker_id: Uuid,
    pub worker_name: String,
    pub quantity_good: f64,
    pub quantity_bad: f64,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct UpdateWorkReportRequest {
    pub quantity_good: Option<f64>,
    pub quantity_bad: Option<f64>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct WorkReportResponse {
    pub id: Uuid,
    pub work_order_id: Uuid,
    pub worker_id: Uuid,
    pub worker_name: String,
    pub quantity_good: f64,
    pub quantity_bad: f64,
    pub quantity_total: f64,
    pub status: String,
    pub submitted_at: Option<DateTime<Utc>>,
    pub archived_at: Option<DateTime<Utc>>,
    pub rework_approval_id: Option<Uuid>,
    pub defect_cause: Option<String>,
    pub rework_plan: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::Serialize;
    use serde::de::DeserializeOwned;
    use uuid::Uuid;

    fn uid() -> Uuid {
        Uuid::new_v4()
    }
    fn now() -> chrono::DateTime<Utc> {
        Utc::now()
    }

    fn roundtrip<T: Serialize + DeserializeOwned>(val: &T) {
        let s1 = serde_json::to_string(val).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&s1).unwrap();
        let val2: T = serde_json::from_str(&s1).unwrap();
        let s2 = serde_json::to_string(&val2).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&s2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn test_create_work_report_request_roundtrip() {
        let r = CreateWorkReportRequest {
            work_order_id: uid(),
            worker_id: uid(),
            worker_name: "张三".to_string(),
            quantity_good: 95.0,
            quantity_bad: 5.0,
        };
        roundtrip(&r);
    }
}
