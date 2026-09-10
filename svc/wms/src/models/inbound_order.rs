use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct InboundOrder {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub order_number: String,
    pub warehouse_id: Option<Uuid>,
    pub warehouse_name: Option<String>,
    pub supplier_id: Option<Uuid>,
    pub supplier_name: Option<String>,
    pub order_date: DateTime<Utc>,
    pub expected_arrival: Option<DateTime<Utc>>,
    pub actual_arrival: Option<DateTime<Utc>>,
    pub total_amount: Option<f64>,
    pub total_quantity: Option<f64>,
    pub received_quantity: Option<f64>,
    pub status: String,
    pub remarks: Option<String>,
    pub created_by: Option<Uuid>,
    pub approved_by: Option<Uuid>,
    pub approved_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateInboundOrderRequest {
    pub order_number: String,
    pub warehouse_id: Option<Uuid>,
    pub supplier_id: Option<Uuid>,
    pub order_date: DateTime<Utc>,
    pub expected_arrival: Option<DateTime<Utc>>,
    pub total_amount: Option<f64>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdateInboundOrderRequest {
    pub warehouse_id: Option<Uuid>,
    pub supplier_id: Option<Uuid>,
    pub expected_arrival: Option<DateTime<Utc>>,
    pub actual_arrival: Option<DateTime<Utc>>,
    pub total_amount: Option<f64>,
    pub status: Option<String>,
    pub remarks: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    fn sample_inbound_order() -> InboundOrder {
        InboundOrder {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            order_number: "INB-001".into(),
            warehouse_id: Some(Uuid::new_v4()),
            supplier_id: Some(Uuid::new_v4()),
            order_date: Utc::now(),
            expected_arrival: Some(Utc::now()),
            actual_arrival: None,
            total_amount: Some(1500.0),
            status: "created".into(),
            remarks: Some("first order".into()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    #[test]
    fn inbound_order_serde_roundtrip() {
        let o = sample_inbound_order();
        let v = serde_json::to_value(&o).unwrap();
        let back: InboundOrder = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn inbound_order_serde_with_none_fields() {
        let o = InboundOrder {
            warehouse_id: None,
            supplier_id: None,
            expected_arrival: None,
            actual_arrival: None,
            total_amount: None,
            remarks: None,
            ..sample_inbound_order()
        };
        let v = serde_json::to_value(&o).unwrap();
        let back: InboundOrder = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
        assert!(back.warehouse_id.is_none());
        assert!(back.total_amount.is_none());
    }

    #[test]
    fn inbound_order_clone_preserves_order_number() {
        let o = sample_inbound_order();
        let c = o.clone();
        assert_eq!(o.order_number, c.order_number);
        assert_eq!(o.status, c.status);
    }

    #[test]
    fn create_inbound_order_request_serde_roundtrip() {
        let req = CreateInboundOrderRequest {
            order_number: "INB-NEW".into(),
            warehouse_id: Some(Uuid::new_v4()),
            supplier_id: Some(Uuid::new_v4()),
            order_date: Utc::now(),
            expected_arrival: Some(Utc::now()),
            total_amount: Some(999.99),
            remarks: Some("new".into()),
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: CreateInboundOrderRequest = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn create_inbound_order_request_minimal() {
        let req = CreateInboundOrderRequest {
            order_number: "INB-MIN".into(),
            warehouse_id: None,
            supplier_id: None,
            order_date: Utc::now(),
            expected_arrival: None,
            total_amount: None,
            remarks: None,
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: CreateInboundOrderRequest = serde_json::from_value(v).unwrap();
        assert_eq!(back.order_number, "INB-MIN");
        assert!(back.remarks.is_none());
    }

    #[test]
    fn update_inbound_order_request_all_none() {
        let req = UpdateInboundOrderRequest {
            warehouse_id: None,
            supplier_id: None,
            expected_arrival: None,
            actual_arrival: None,
            total_amount: None,
            status: None,
            remarks: None,
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: UpdateInboundOrderRequest = serde_json::from_value(v).unwrap();
        assert!(back.status.is_none());
        assert!(back.total_amount.is_none());
    }

    #[test]
    fn update_inbound_order_request_partial() {
        let req = UpdateInboundOrderRequest {
            warehouse_id: Some(Uuid::new_v4()),
            supplier_id: None,
            expected_arrival: Some(Utc::now()),
            actual_arrival: Some(Utc::now()),
            total_amount: Some(2000.0),
            status: Some("received".into()),
            remarks: None,
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: UpdateInboundOrderRequest = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn inbound_order_json_has_expected_keys() {
        let o = sample_inbound_order();
        let v = serde_json::to_value(&o).unwrap();
        let obj = v.as_object().unwrap();
        assert!(obj.contains_key("order_number"));
        assert!(obj.contains_key("supplier_id"));
        assert!(obj.contains_key("order_date"));
    }

    #[test]
    fn inbound_order_with_actual_arrival() {
        let o = InboundOrder {
            actual_arrival: Some(Utc::now()),
            ..sample_inbound_order()
        };
        let v = serde_json::to_value(&o).unwrap();
        let back: InboundOrder = serde_json::from_value(v).unwrap();
        assert!(back.actual_arrival.is_some());
    }
}
