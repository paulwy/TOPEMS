//! Production Order DTO — 与 apps/web/src/types/mes.ts E-1 1:1 对齐

#![allow(dead_code)]

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateProductionOrderRequest {
    pub product_id: Option<Uuid>,
    pub product_name: String,
    pub product_code: String,
    pub quantity: f64,
    pub planned_start_date: Option<DateTime<Utc>>,
    pub planned_end_date: Option<DateTime<Utc>>,
    pub workshop_id: Option<Uuid>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct UpdateProductionOrderRequest {
    pub product_name: Option<String>,
    pub product_code: Option<String>,
    pub quantity: Option<f64>,
    pub planned_start_date: Option<DateTime<Utc>>,
    pub planned_end_date: Option<DateTime<Utc>>,
    pub workshop_id: Option<Uuid>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct ProductionOrderResponse {
    pub id: Uuid,
    pub order_no: String,
    pub product_id: Option<Uuid>,
    pub product_name: String,
    pub product_code: String,
    pub quantity: f64,
    pub completed_quantity: f64,
    pub status: String,
    pub source: String,
    pub source_order_id: Option<Uuid>,
    pub source_order_number: Option<String>,
    pub planned_start_date: Option<DateTime<Utc>>,
    pub planned_end_date: Option<DateTime<Utc>>,
    pub actual_start_date: Option<DateTime<Utc>>,
    pub actual_end_date: Option<DateTime<Utc>>,
    pub workshop_id: Option<Uuid>,
    pub notes: Option<String>,
    pub approval_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct ListProductionOrdersResponse {
    pub orders: Vec<ProductionOrderResponse>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::de::DeserializeOwned;
    use serde::Serialize;
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
    fn test_create_production_order_request_roundtrip_some() {
        let r = CreateProductionOrderRequest {
            product_id: Some(uid()),
            product_name: "螺丝 M8".to_string(),
            product_code: "SCR-M8".to_string(),
            quantity: 1000.0,
            planned_start_date: Some(now()),
            planned_end_date: Some(now()),
            workshop_id: Some(uid()),
            notes: Some("加急订单".to_string()),
        };
        roundtrip(&r);
    }

    #[test]
    fn test_create_production_order_request_roundtrip_none() {
        let r = CreateProductionOrderRequest {
            product_id: None,
            product_name: "螺丝 M8".to_string(),
            product_code: "SCR-M8".to_string(),
            quantity: 1000.0,
            planned_start_date: None,
            planned_end_date: None,
            workshop_id: None,
            notes: None,
        };
        roundtrip(&r);
    }
}
