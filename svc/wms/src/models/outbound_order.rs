use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct OutboundOrder {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub order_number: String,
    pub order_type: Option<String>,
    pub reference_number: Option<String>,
    pub reference_type: Option<String>,
    pub warehouse_id: Option<Uuid>,
    pub warehouse_name: Option<String>,
    pub customer_id: Option<Uuid>,
    pub customer_name: Option<String>,
    pub customer_code: Option<String>,
    pub sales_order_id: Option<Uuid>,
    pub sales_order_number: Option<String>,
    pub production_order_id: Option<Uuid>,
    pub production_order_number: Option<String>,
    pub transfer_order_id: Option<Uuid>,
    pub transfer_order_number: Option<String>,
    pub destination_warehouse_id: Option<Uuid>,
    pub destination_warehouse_name: Option<String>,
    pub destination_address: Option<String>,
    pub order_date: DateTime<Utc>,
    pub expected_ship_date: Option<DateTime<Utc>>,
    pub actual_ship_date: Option<DateTime<Utc>>,
    pub delivery_date: Option<DateTime<Utc>>,
    pub expected_delivery: Option<DateTime<Utc>>,
    pub actual_delivery: Option<DateTime<Utc>>,
    pub carrier: Option<String>,
    pub carrier_code: Option<String>,
    pub vehicle_number: Option<String>,
    pub driver_name: Option<String>,
    pub driver_phone: Option<String>,
    pub tracking_number: Option<String>,
    pub total_items: Option<i32>,
    pub total_quantity: Option<f64>,
    pub total_weight: Option<f64>,
    pub total_volume: Option<f64>,
    pub total_value: Option<f64>,
    pub total_amount: Option<f64>,
    pub shipping_cost: Option<f64>,
    pub priority: Option<String>,
    pub status: String,
    pub picking_status: Option<String>,
    pub packing_status: Option<String>,
    pub shipping_status: Option<String>,
    pub picked_quantity: Option<i32>,
    pub packed_quantity: Option<i32>,
    pub shipped_quantity: Option<f64>,
    pub picker: Option<String>,
    pub picker_id: Option<Uuid>,
    pub packer: Option<String>,
    pub packer_id: Option<Uuid>,
    pub shipper: Option<String>,
    pub shipper_id: Option<Uuid>,
    pub remarks: Option<String>,
    pub notes: Option<String>,
    pub special_instructions: Option<String>,
    pub shipping_notes: Option<String>,
    pub delivery_notes: Option<String>,
    pub created_by: Option<Uuid>,
    pub updated_by: Option<Uuid>,
    pub approved_by: Option<Uuid>,
    pub approved_at: Option<DateTime<Utc>>,
    pub organization_id: Option<Uuid>,
    pub is_synced_to_crm: Option<bool>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateOutboundOrderRequest {
    pub order_number: String,
    pub warehouse_id: Option<Uuid>,
    pub customer_id: Option<Uuid>,
    pub order_date: DateTime<Utc>,
    pub expected_delivery: Option<DateTime<Utc>>,
    pub total_amount: Option<f64>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdateOutboundOrderRequest {
    pub warehouse_id: Option<Uuid>,
    pub customer_id: Option<Uuid>,
    pub expected_delivery: Option<DateTime<Utc>>,
    pub actual_delivery: Option<DateTime<Utc>>,
    pub total_amount: Option<f64>,
    pub status: Option<String>,
    pub remarks: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    fn sample_outbound_order() -> OutboundOrder {
        OutboundOrder {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            order_number: "OUT-001".into(),
            order_type: Some("standard".into()),
            reference_number: None,
            reference_type: None,
            warehouse_id: Some(Uuid::new_v4()),
            warehouse_name: Some("Main Warehouse".into()),
            customer_id: Some(Uuid::new_v4()),
            customer_name: Some("Test Customer".into()),
            customer_code: None,
            sales_order_id: None,
            sales_order_number: None,
            production_order_id: None,
            production_order_number: None,
            transfer_order_id: None,
            transfer_order_number: None,
            destination_warehouse_id: None,
            destination_warehouse_name: None,
            destination_address: None,
            order_date: Utc::now(),
            expected_ship_date: None,
            actual_ship_date: None,
            delivery_date: None,
            expected_delivery: Some(Utc::now()),
            actual_delivery: None,
            carrier: None,
            carrier_code: None,
            vehicle_number: None,
            driver_name: None,
            driver_phone: None,
            tracking_number: None,
            total_items: None,
            total_quantity: None,
            total_weight: None,
            total_volume: None,
            total_value: None,
            total_amount: Some(2500.0),
            shipping_cost: None,
            priority: Some("normal".into()),
            status: "created".into(),
            picking_status: None,
            packing_status: None,
            shipping_status: None,
            picked_quantity: None,
            packed_quantity: None,
            shipped_quantity: None,
            picker: None,
            picker_id: None,
            packer: None,
            packer_id: None,
            shipper: None,
            shipper_id: None,
            remarks: Some("outbound test".into()),
            notes: None,
            special_instructions: None,
            shipping_notes: None,
            delivery_notes: None,
            created_by: None,
            updated_by: None,
            approved_by: None,
            approved_at: None,
            organization_id: None,
            is_synced_to_crm: Some(false),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    #[test]
    fn outbound_order_serde_roundtrip() {
        let o = sample_outbound_order();
        let v = serde_json::to_value(&o).unwrap();
        let back: OutboundOrder = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn outbound_order_serde_with_none_fields() {
        let o = OutboundOrder {
            warehouse_id: None,
            customer_id: None,
            expected_delivery: None,
            actual_delivery: None,
            total_amount: None,
            remarks: None,
            ..sample_outbound_order()
        };
        let v = serde_json::to_value(&o).unwrap();
        let back: OutboundOrder = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
        assert!(back.customer_id.is_none());
    }

    #[test]
    fn outbound_order_clone_preserves_order_number() {
        let o = sample_outbound_order();
        let c = o.clone();
        assert_eq!(o.order_number, c.order_number);
        assert_eq!(o.status, c.status);
    }

    #[test]
    fn create_outbound_order_request_serde_roundtrip() {
        let req = CreateOutboundOrderRequest {
            order_number: "OUT-NEW".into(),
            warehouse_id: Some(Uuid::new_v4()),
            customer_id: Some(Uuid::new_v4()),
            order_date: Utc::now(),
            expected_delivery: Some(Utc::now()),
            total_amount: Some(800.0),
            remarks: Some("new out".into()),
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: CreateOutboundOrderRequest = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn create_outbound_order_request_minimal() {
        let req = CreateOutboundOrderRequest {
            order_number: "OUT-MIN".into(),
            warehouse_id: None,
            customer_id: None,
            order_date: Utc::now(),
            expected_delivery: None,
            total_amount: None,
            remarks: None,
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: CreateOutboundOrderRequest = serde_json::from_value(v).unwrap();
        assert_eq!(back.order_number, "OUT-MIN");
        assert!(back.customer_id.is_none());
    }

    #[test]
    fn update_outbound_order_request_all_none() {
        let req = UpdateOutboundOrderRequest {
            warehouse_id: None,
            customer_id: None,
            expected_delivery: None,
            actual_delivery: None,
            total_amount: None,
            status: None,
            remarks: None,
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: UpdateOutboundOrderRequest = serde_json::from_value(v).unwrap();
        assert!(back.status.is_none());
        assert!(back.remarks.is_none());
    }

    #[test]
    fn update_outbound_order_request_partial() {
        let req = UpdateOutboundOrderRequest {
            warehouse_id: None,
            customer_id: Some(Uuid::new_v4()),
            expected_delivery: Some(Utc::now()),
            actual_delivery: Some(Utc::now()),
            total_amount: Some(3000.0),
            status: Some("shipping".into()),
            remarks: Some("updated".into()),
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: UpdateOutboundOrderRequest = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn outbound_order_json_has_expected_keys() {
        let o = sample_outbound_order();
        let v = serde_json::to_value(&o).unwrap();
        let obj = v.as_object().unwrap();
        assert!(obj.contains_key("order_number"));
        assert!(obj.contains_key("customer_id"));
        assert!(obj.contains_key("expected_delivery"));
    }

    #[test]
    fn outbound_order_with_actual_delivery() {
        let o = OutboundOrder {
            actual_delivery: Some(Utc::now()),
            ..sample_outbound_order()
        };
        let v = serde_json::to_value(&o).unwrap();
        let back: OutboundOrder = serde_json::from_value(v).unwrap();
        assert!(back.actual_delivery.is_some());
    }
}
