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
    pub warehouse_id: Option<Uuid>,
    pub customer_id: Option<Uuid>,
    pub order_date: DateTime<Utc>,
    pub expected_delivery: Option<DateTime<Utc>>,
    pub actual_delivery: Option<DateTime<Utc>>,
    pub total_amount: Option<f64>,
    pub status: String,
    pub remarks: Option<String>,
    pub sales_order_id: Option<Uuid>,
    pub sales_order_number: Option<String>,
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
            warehouse_id: Some(Uuid::new_v4()),
            customer_id: Some(Uuid::new_v4()),
            order_date: Utc::now(),
            expected_delivery: Some(Utc::now()),
            actual_delivery: None,
            total_amount: Some(2500.0),
            status: "created".into(),
            remarks: Some("outbound test".into()),
            sales_order_id: None,
            sales_order_number: None,
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