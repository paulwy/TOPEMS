use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct TransferOrder {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub order_number: String,
    pub transfer_type: String,
    pub from_warehouse_id: Uuid,
    pub from_warehouse_name: Option<String>,
    pub from_location_id: Option<Uuid>,
    pub from_location_code: Option<String>,
    pub to_warehouse_id: Uuid,
    pub to_warehouse_name: Option<String>,
    pub to_location_id: Option<Uuid>,
    pub to_location_code: Option<String>,
    pub status: String,
    pub total_quantity: Option<i64>,
    pub total_amount: Option<f64>,
    pub planned_date: Option<String>,
    pub actual_date: Option<String>,
    pub transporter: Option<String>,
    pub tracking_number: Option<String>,
    pub priority: Option<String>,
    pub remarks: Option<String>,
    pub created_by: Option<String>,
    pub approved_by: Option<String>,
    pub approved_at: Option<DateTime<Utc>>,
    pub shipped_by: Option<String>,
    pub shipped_at: Option<DateTime<Utc>>,
    pub received_by: Option<String>,
    pub received_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct TransferOrderItem {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub transfer_id: Uuid,
    pub line_number: i32,
    pub sku: String,
    pub material_name: String,
    pub specification: Option<String>,
    pub batch_number: Option<String>,
    pub unit: String,
    pub planned_quantity: i64,
    pub shipped_quantity: i64,
    pub received_quantity: i64,
    pub unit_price: Option<f64>,
    pub total_amount: Option<f64>,
    pub from_location_id: Option<Uuid>,
    pub to_location_id: Option<Uuid>,
    pub status: String,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateTransferOrderRequest {
    pub transfer_type: Option<String>,
    pub from_warehouse_id: Uuid,
    pub from_location_id: Option<Uuid>,
    pub to_warehouse_id: Uuid,
    pub to_location_id: Option<Uuid>,
    pub planned_date: Option<String>,
    pub transporter: Option<String>,
    pub priority: Option<String>,
    pub remarks: Option<String>,
    pub items: Vec<CreateTransferOrderItemRequest>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateTransferOrderItemRequest {
    pub sku: String,
    pub material_name: String,
    pub specification: Option<String>,
    pub batch_number: Option<String>,
    pub unit: String,
    pub planned_quantity: i64,
    pub unit_price: Option<f64>,
    pub from_location_id: Option<Uuid>,
    pub to_location_id: Option<Uuid>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct TransferOrderQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub transfer_type: Option<String>,
    pub from_warehouse_id: Option<Uuid>,
    pub to_warehouse_id: Option<Uuid>,
    pub status: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    fn sample_transfer_order() -> TransferOrder {
        TransferOrder {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            order_number: "TO-001".into(),
            transfer_type: "warehouse".into(),
            from_warehouse_id: Uuid::new_v4(),
            from_warehouse_name: Some("WH-A".into()),
            from_location_id: Some(Uuid::new_v4()),
            from_location_code: Some("A-01".into()),
            to_warehouse_id: Uuid::new_v4(),
            to_warehouse_name: Some("WH-B".into()),
            to_location_id: Some(Uuid::new_v4()),
            to_location_code: Some("B-01".into()),
            status: "pending".into(),
            total_quantity: Some(100),
            total_amount: Some(5000.0),
            planned_date: Some("2026-08-15".into()),
            actual_date: None,
            transporter: Some("Logistics Co".into()),
            tracking_number: Some("TRK-123".into()),
            priority: Some("high".into()),
            remarks: Some("urgent".into()),
            created_by: Some("user1".into()),
            approved_by: None,
            approved_at: None,
            shipped_by: None,
            shipped_at: None,
            received_by: None,
            received_at: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    fn sample_transfer_order_item() -> TransferOrderItem {
        TransferOrderItem {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            transfer_id: Uuid::new_v4(),
            line_number: 1,
            sku: "SKU-TO".into(),
            material_name: "Transfer Material".into(),
            specification: Some("10mm".into()),
            batch_number: Some("BAT-TO".into()),
            unit: "PCS".into(),
            planned_quantity: 50,
            shipped_quantity: 50,
            received_quantity: 48,
            unit_price: Some(10.0),
            total_amount: Some(500.0),
            from_location_id: Some(Uuid::new_v4()),
            to_location_id: Some(Uuid::new_v4()),
            status: "received".into(),
            remarks: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    #[test]
    fn transfer_order_serde_roundtrip() {
        let to = sample_transfer_order();
        let v = serde_json::to_value(&to).unwrap();
        let back: TransferOrder = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn transfer_order_serde_all_none_optionals() {
        let to = TransferOrder {
            from_warehouse_name: None,
            from_location_id: None,
            from_location_code: None,
            to_warehouse_name: None,
            to_location_id: None,
            to_location_code: None,
            total_quantity: None,
            total_amount: None,
            planned_date: None,
            actual_date: None,
            transporter: None,
            tracking_number: None,
            priority: None,
            remarks: None,
            created_by: None,
            approved_by: None,
            approved_at: None,
            shipped_by: None,
            shipped_at: None,
            received_by: None,
            received_at: None,
            ..sample_transfer_order()
        };
        let v = serde_json::to_value(&to).unwrap();
        let back: TransferOrder = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
        assert!(back.approved_at.is_none());
        assert!(back.total_amount.is_none());
    }

    #[test]
    fn transfer_order_clone_preserves_number_and_status() {
        let to = sample_transfer_order();
        let c = to.clone();
        assert_eq!(to.order_number, c.order_number);
        assert_eq!(to.status, c.status);
    }

    #[test]
    fn transfer_order_item_serde_roundtrip() {
        let item = sample_transfer_order_item();
        let v = serde_json::to_value(&item).unwrap();
        let back: TransferOrderItem = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn transfer_order_item_serde_none_fields() {
        let item = TransferOrderItem {
            specification: None,
            batch_number: None,
            unit_price: None,
            total_amount: None,
            from_location_id: None,
            to_location_id: None,
            remarks: Some("note".into()),
            ..sample_transfer_order_item()
        };
        let v = serde_json::to_value(&item).unwrap();
        let back: TransferOrderItem = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
        assert!(back.unit_price.is_none());
    }

    #[test]
    fn create_transfer_order_request_serde_roundtrip() {
        let req = CreateTransferOrderRequest {
            transfer_type: Some("location".into()),
            from_warehouse_id: Uuid::new_v4(),
            from_location_id: Some(Uuid::new_v4()),
            to_warehouse_id: Uuid::new_v4(),
            to_location_id: None,
            planned_date: Some("2026-09-01".into()),
            transporter: None,
            priority: Some("normal".into()),
            remarks: None,
            items: vec![CreateTransferOrderItemRequest {
                sku: "SKU-1".into(),
                material_name: "M1".into(),
                specification: None,
                batch_number: None,
                unit: "EA".into(),
                planned_quantity: 10,
                unit_price: Some(5.0),
                from_location_id: None,
                to_location_id: None,
                remarks: None,
            }],
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: CreateTransferOrderRequest = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn create_transfer_order_request_empty_items() {
        let req = CreateTransferOrderRequest {
            transfer_type: None,
            from_warehouse_id: Uuid::new_v4(),
            from_location_id: None,
            to_warehouse_id: Uuid::new_v4(),
            to_location_id: None,
            planned_date: None,
            transporter: None,
            priority: None,
            remarks: None,
            items: vec![],
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: CreateTransferOrderRequest = serde_json::from_value(v).unwrap();
        assert!(back.items.is_empty());
    }

    #[test]
    fn create_transfer_order_item_request_serde_roundtrip() {
        let req = CreateTransferOrderItemRequest {
            sku: "SKU-IT".into(),
            material_name: "Item".into(),
            specification: Some("spec".into()),
            batch_number: Some("BAT".into()),
            unit: "KG".into(),
            planned_quantity: 25,
            unit_price: None,
            from_location_id: Some(Uuid::new_v4()),
            to_location_id: None,
            remarks: Some("ok".into()),
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: CreateTransferOrderItemRequest = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn transfer_order_query_params_serde_roundtrip() {
        let params = TransferOrderQueryParams {
            page: Some(1),
            page_size: Some(10),
            transfer_type: Some("warehouse".into()),
            from_warehouse_id: Some(Uuid::new_v4()),
            to_warehouse_id: Some(Uuid::new_v4()),
            status: Some("pending".into()),
        };
        let v = serde_json::to_value(&params).unwrap();
        let back: TransferOrderQueryParams = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn transfer_order_query_params_all_none() {
        let params = TransferOrderQueryParams {
            page: None,
            page_size: None,
            transfer_type: None,
            from_warehouse_id: None,
            to_warehouse_id: None,
            status: None,
        };
        let v = serde_json::to_value(&params).unwrap();
        let back: TransferOrderQueryParams = serde_json::from_value(v).unwrap();
        assert!(back.page.is_none());
        assert!(back.status.is_none());
    }

    #[test]
    fn transfer_order_json_has_expected_keys() {
        let to = sample_transfer_order();
        let v = serde_json::to_value(&to).unwrap();
        let obj = v.as_object().unwrap();
        assert!(obj.contains_key("order_number"));
        assert!(obj.contains_key("transfer_type"));
        assert!(obj.contains_key("from_warehouse_id"));
    }
}
