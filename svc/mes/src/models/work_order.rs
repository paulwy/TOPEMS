#![allow(dead_code)]

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateWorkOrderRequest {
    pub order_id: Uuid,
    pub product_name: String,
    pub product_code: String,
    pub quantity: f64,
    pub equipment_id: Option<Uuid>,
    pub station_id: Option<Uuid>,
    pub planned_start_time: Option<DateTime<Utc>>,
    pub planned_end_time: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct UpdateWorkOrderRequest {
    pub quantity: Option<f64>,
    pub equipment_id: Option<Uuid>,
    pub station_id: Option<Uuid>,
    pub planned_start_time: Option<DateTime<Utc>>,
    pub planned_end_time: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct WorkOrderResponse {
    pub id: Uuid,
    pub order_id: Uuid,
    pub order_number: String,
    pub product_name: String,
    pub product_code: String,
    pub quantity: f64,
    pub completed_quantity: f64,
    pub status: String,
    pub equipment_id: Option<Uuid>,
    pub station_id: Option<Uuid>,
    pub planned_start_time: Option<DateTime<Utc>>,
    pub planned_end_time: Option<DateTime<Utc>>,
    pub actual_start_time: Option<DateTime<Utc>>,
    pub actual_end_time: Option<DateTime<Utc>>,
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
    fn test_create_work_order_request_roundtrip_some() {
        let r = CreateWorkOrderRequest {
            order_id: uid(),
            product_name: "螺丝 M8".to_string(),
            product_code: "SCR-M8".to_string(),
            quantity: 500.0,
            equipment_id: Some(uid()),
            station_id: Some(uid()),
            planned_start_time: Some(now()),
            planned_end_time: Some(now()),
        };
        roundtrip(&r);
    }

    #[test]
    fn test_create_work_order_request_roundtrip_none() {
        let r = CreateWorkOrderRequest {
            order_id: uid(),
            product_name: "螺丝 M8".to_string(),
            product_code: "SCR-M8".to_string(),
            quantity: 500.0,
            equipment_id: None,
            station_id: None,
            planned_start_time: None,
            planned_end_time: None,
        };
        roundtrip(&r);
    }
}
