use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct ProductionOrder {
    pub id: Uuid,
    pub order_no: String,
    pub product_id: Option<Uuid>,
    pub product_name: String,
    pub product_code: String,
    pub quantity: f64,
    pub completed_quantity: f64,
    pub status: String,
    pub source: String,
    pub source_order_id: Option<String>,
    pub source_order_number: Option<String>,
    pub planned_start_date: Option<DateTime<Utc>>,
    pub planned_end_date: Option<DateTime<Utc>>,
    pub actual_start_date: Option<DateTime<Utc>>,
    pub actual_end_date: Option<DateTime<Utc>>,
    pub workshop_id: Option<Uuid>,
    pub workshop_name: Option<String>,
    pub priority: Option<i32>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateProductionOrderRequest {
    pub product_id: Option<Uuid>,
    pub product_name: String,
    pub product_code: String,
    pub quantity: f64,
    pub planned_start_date: Option<DateTime<Utc>>,
    pub planned_end_date: Option<DateTime<Utc>>,
    pub workshop_id: Option<Uuid>,
    pub workshop_name: Option<String>,
    pub priority: Option<i32>,
    pub source: Option<String>,
    pub source_order_id: Option<Uuid>,
    pub source_order_number: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateProductionOrderRequest {
    pub product_name: Option<String>,
    pub product_code: Option<String>,
    pub quantity: Option<f64>,
    pub planned_start_date: Option<DateTime<Utc>>,
    pub planned_end_date: Option<DateTime<Utc>>,
    pub workshop_id: Option<Uuid>,
    pub workshop_name: Option<String>,
    pub priority: Option<i32>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateProductionProgressRequest {
    pub completed_quantity: Option<f64>,
    pub status: Option<String>,
    pub actual_start_date: Option<DateTime<Utc>>,
    pub actual_end_date: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListProductionOrdersResponse {
    pub orders: Vec<ProductionOrder>,
    pub total: i64,
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    fn sample_uuid() -> Uuid {
        Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap()
    }

    #[test]
    fn test_production_order_serde_full() {
        let po = ProductionOrder {
            id: sample_uuid(),
            order_no: "PO-2025-0001".into(),
            product_id: Some(sample_uuid()),
            product_name: "成品A".into(),
            product_code: "P-001".into(),
            quantity: 1000.0,
            completed_quantity: 350.5,
            status: "in_progress".into(),
            source: "manual".into(),
            source_order_id: Some("SO-123".into()),
            source_order_number: Some("SO-2025-001".into()),
            planned_start_date: Some(Utc::now()),
            planned_end_date: Some(Utc::now()),
            actual_start_date: None,
            actual_end_date: None,
            workshop_id: Some(sample_uuid()),
            workshop_name: Some("一号车间".into()),
            priority: Some(1),
            notes: Some("加急生产".into()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let v = serde_json::to_value(&po).unwrap();
        let po2: ProductionOrder = serde_json::from_value(v).unwrap();
        assert_eq!(po.order_no, po2.order_no);
        assert_eq!(po.quantity, po2.quantity);
        assert_eq!(po.completed_quantity, po2.completed_quantity);
        assert_eq!(po.status, po2.status);
        assert_eq!(po.priority, po2.priority);
    }

    #[test]
    fn test_production_order_minimal() {
        let po = ProductionOrder {
            id: sample_uuid(),
            order_no: "PO-MIN".into(),
            product_id: None,
            product_name: "产品".into(),
            product_code: "PC".into(),
            quantity: 0.0,
            completed_quantity: 0.0,
            status: "draft".into(),
            source: "auto".into(),
            source_order_id: None,
            source_order_number: None,
            planned_start_date: None,
            planned_end_date: None,
            actual_start_date: None,
            actual_end_date: None,
            workshop_id: None,
            workshop_name: None,
            priority: None,
            notes: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let s = serde_json::to_string(&po).unwrap();
        let po2: ProductionOrder = serde_json::from_str(&s).unwrap();
        assert_eq!(po2.quantity, 0.0);
        assert!(po2.product_id.is_none());
        assert!(po2.notes.is_none());
    }

    #[test]
    fn test_production_order_negative_qty() {
        let po = ProductionOrder {
            id: sample_uuid(),
            order_no: "PO-NEG".into(),
            product_id: None,
            product_name: "退货生产".into(),
            product_code: "NEG".into(),
            quantity: -50.0,
            completed_quantity: -25.0,
            status: "cancelled".into(),
            source: "x".into(),
            source_order_id: None,
            source_order_number: None,
            planned_start_date: None,
            planned_end_date: None,
            actual_start_date: Some(Utc::now()),
            actual_end_date: Some(Utc::now()),
            workshop_id: None,
            workshop_name: None,
            priority: Some(-100),
            notes: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let v = serde_json::to_value(&po).unwrap();
        let po2: ProductionOrder = serde_json::from_value(v).unwrap();
        assert_eq!(po2.quantity, -50.0);
        assert_eq!(po2.priority, Some(-100));
    }

    #[test]
    fn test_create_production_order_request() {
        let r = CreateProductionOrderRequest {
            product_id: Some(sample_uuid()),
            product_name: "新产品".into(),
            product_code: "NP-1".into(),
            quantity: 500.0,
            planned_start_date: Some(Utc::now()),
            planned_end_date: None,
            workshop_id: Some(sample_uuid()),
            workshop_name: Some("2号车间".into()),
            priority: Some(5),
            source: Some("mrp".into()),
            source_order_id: Some(sample_uuid()),
            source_order_number: Some("SO-001".into()),
            notes: Some("备注".into()),
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: CreateProductionOrderRequest = serde_json::from_value(v).unwrap();
        assert_eq!(r2.product_name, "新产品");
        assert_eq!(r2.quantity, 500.0);
        assert_eq!(r2.priority, Some(5));
    }

    #[test]
    fn test_update_production_order_request() {
        let r = UpdateProductionOrderRequest {
            product_name: Some("改名".into()),
            product_code: None,
            quantity: Some(999.0),
            planned_start_date: None,
            planned_end_date: Some(Utc::now()),
            workshop_id: None,
            workshop_name: None,
            priority: Some(i32::MAX),
            notes: Some("最大优先级".into()),
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: UpdateProductionOrderRequest = serde_json::from_value(v).unwrap();
        assert_eq!(r2.product_name, Some("改名".into()));
        assert_eq!(r2.priority, Some(i32::MAX));
    }

    #[test]
    fn test_update_production_progress_request() {
        let r = UpdateProductionProgressRequest {
            completed_quantity: Some(777.7),
            status: Some("completed".into()),
            actual_start_date: Some(Utc::now()),
            actual_end_date: Some(Utc::now()),
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: UpdateProductionProgressRequest = serde_json::from_value(v).unwrap();
        assert_eq!(r2.completed_quantity, Some(777.7));
        assert_eq!(r2.status, Some("completed".into()));
    }

    #[test]
    fn test_update_production_progress_all_none() {
        let r = UpdateProductionProgressRequest {
            completed_quantity: None,
            status: None,
            actual_start_date: None,
            actual_end_date: None,
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: UpdateProductionProgressRequest = serde_json::from_value(v).unwrap();
        assert!(r2.completed_quantity.is_none());
        assert!(r2.status.is_none());
    }

    #[test]
    fn test_list_production_orders_response_empty() {
        let resp = ListProductionOrdersResponse {
            orders: vec![],
            total: 0,
        };
        let v = serde_json::to_value(&resp).unwrap();
        let resp2: ListProductionOrdersResponse = serde_json::from_value(v).unwrap();
        assert!(resp2.orders.is_empty());
        assert_eq!(resp2.total, 0);
    }

    #[test]
    fn test_list_production_orders_response_with_items() {
        let po = ProductionOrder {
            id: sample_uuid(),
            order_no: "X".into(),
            product_id: None,
            product_name: "Y".into(),
            product_code: "Z".into(),
            quantity: 1.0,
            completed_quantity: 0.0,
            status: "s".into(),
            source: "src".into(),
            source_order_id: None,
            source_order_number: None,
            planned_start_date: None,
            planned_end_date: None,
            actual_start_date: None,
            actual_end_date: None,
            workshop_id: None,
            workshop_name: None,
            priority: None,
            notes: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let resp = ListProductionOrdersResponse {
            orders: vec![po],
            total: i64::MAX,
        };
        let s = serde_json::to_string(&resp).unwrap();
        let resp2: ListProductionOrdersResponse = serde_json::from_str(&s).unwrap();
        assert_eq!(resp2.orders.len(), 1);
        assert_eq!(resp2.total, i64::MAX);
    }
}
