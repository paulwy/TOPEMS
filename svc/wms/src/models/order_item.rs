use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct InboundOrderItem {
    pub id: Uuid,
    pub order_id: Uuid,
    pub inventory_item_id: Uuid,
    pub sku: String,
    pub name: String,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub quantity: f64,
    pub unit_price: Option<f64>,
    pub total_price: Option<f64>,
    pub received_quantity: Option<f64>,
    pub status: String,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateInboundOrderItemRequest {
    pub inventory_item_id: Uuid,
    pub sku: String,
    pub name: String,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub quantity: f64,
    pub unit_price: Option<f64>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdateInboundOrderItemRequest {
    pub quantity: Option<f64>,
    pub unit_price: Option<f64>,
    pub received_quantity: Option<f64>,
    pub status: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct OutboundOrderItem {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub order_id: Uuid,
    pub inventory_item_id: Uuid,
    pub sku: String,
    pub name: String,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub quantity: f64,
    pub unit_price: Option<f64>,
    pub total_price: Option<f64>,
    pub shipped_quantity: Option<f64>,
    pub status: String,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateOutboundOrderItemRequest {
    pub inventory_item_id: Uuid,
    pub sku: String,
    pub name: String,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub quantity: f64,
    pub unit_price: Option<f64>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdateOutboundOrderItemRequest {
    pub quantity: Option<f64>,
    pub unit_price: Option<f64>,
    pub shipped_quantity: Option<f64>,
    pub status: Option<String>,
    pub remarks: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    fn sample_inbound_item() -> InboundOrderItem {
        InboundOrderItem {
            id: Uuid::new_v4(),
            order_id: Uuid::new_v4(),
            inventory_item_id: Uuid::new_v4(),
            sku: "SKU-I1".into(),
            name: "Inbound Item".into(),
            specification: Some("spec".into()),
            unit: Some("PCS".into()),
            quantity: 100.0,
            unit_price: Some(10.0),
            total_price: Some(1000.0),
            received_quantity: Some(50.0),
            status: "partial".into(),
            remarks: Some("partial recv".into()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    fn sample_outbound_item() -> OutboundOrderItem {
        OutboundOrderItem {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            order_id: Uuid::new_v4(),
            inventory_item_id: Uuid::new_v4(),
            sku: "SKU-O1".into(),
            name: "Outbound Item".into(),
            specification: Some("ospec".into()),
            unit: Some("BOX".into()),
            quantity: 20.0,
            unit_price: Some(25.0),
            total_price: Some(500.0),
            shipped_quantity: Some(10.0),
            status: "partial".into(),
            remarks: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    #[test]
    fn inbound_order_item_serde_roundtrip() {
        let item = sample_inbound_item();
        let v = serde_json::to_value(&item).unwrap();
        let back: InboundOrderItem = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn inbound_order_item_serde_none_fields() {
        let item = InboundOrderItem {
            specification: None,
            unit: None,
            unit_price: None,
            total_price: None,
            received_quantity: None,
            remarks: None,
            ..sample_inbound_item()
        };
        let v = serde_json::to_value(&item).unwrap();
        let back: InboundOrderItem = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
        assert!(back.unit_price.is_none());
    }

    #[test]
    fn outbound_order_item_serde_roundtrip() {
        let item = sample_outbound_item();
        let v = serde_json::to_value(&item).unwrap();
        let back: OutboundOrderItem = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn outbound_order_item_serde_none_fields() {
        let item = OutboundOrderItem {
            specification: None,
            unit: None,
            unit_price: None,
            total_price: None,
            shipped_quantity: None,
            remarks: Some("note".into()),
            ..sample_outbound_item()
        };
        let v = serde_json::to_value(&item).unwrap();
        let back: OutboundOrderItem = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
        assert!(back.shipped_quantity.is_none());
    }

    #[test]
    fn create_inbound_order_item_request_serde_roundtrip() {
        let req = CreateInboundOrderItemRequest {
            inventory_item_id: Uuid::new_v4(),
            sku: "SKU-NEW".into(),
            name: "New Item".into(),
            specification: Some("10mm".into()),
            unit: Some("EA".into()),
            quantity: 5.0,
            unit_price: Some(3.50),
            remarks: None,
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: CreateInboundOrderItemRequest = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn update_inbound_order_item_request_partial() {
        let req = UpdateInboundOrderItemRequest {
            quantity: Some(10.0),
            unit_price: None,
            received_quantity: Some(10.0),
            status: Some("received".into()),
            remarks: Some("done".into()),
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: UpdateInboundOrderItemRequest = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn create_outbound_order_item_request_serde_roundtrip() {
        let req = CreateOutboundOrderItemRequest {
            inventory_item_id: Uuid::new_v4(),
            sku: "SKU-OUT".into(),
            name: "Out Item".into(),
            specification: None,
            unit: Some("PCS".into()),
            quantity: 8.0,
            unit_price: Some(12.0),
            remarks: Some("note".into()),
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: CreateOutboundOrderItemRequest = serde_json::from_value(v.clone()).unwrap();
        let v2 = serde_json::to_value(&back).unwrap();
        assert_eq!(v, v2);
    }

    #[test]
    fn update_outbound_order_item_request_all_none() {
        let req = UpdateOutboundOrderItemRequest {
            quantity: None,
            unit_price: None,
            shipped_quantity: None,
            status: None,
            remarks: None,
        };
        let v = serde_json::to_value(&req).unwrap();
        let back: UpdateOutboundOrderItemRequest = serde_json::from_value(v).unwrap();
        assert!(back.quantity.is_none());
        assert!(back.status.is_none());
    }

    #[test]
    fn inbound_order_item_clone_preserves_sku() {
        let item = sample_inbound_item();
        let c = item.clone();
        assert_eq!(item.sku, c.sku);
        assert_eq!(item.quantity, c.quantity);
    }

    #[test]
    fn outbound_order_item_json_has_expected_keys() {
        let item = sample_outbound_item();
        let v = serde_json::to_value(&item).unwrap();
        let obj = v.as_object().unwrap();
        assert!(obj.contains_key("shipped_quantity"));
        assert!(obj.contains_key("tenant_id"));
    }
}
