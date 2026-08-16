use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct PurchaseItem {
    pub id: Uuid,
    pub order_id: Uuid,
    pub product_code: Option<String>,
    pub product_name: String,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub quantity: f64,
    pub unit_price: Option<f64>,
    pub amount: Option<f64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreatePurchaseItemRequest {
    pub order_id: Uuid,
    pub product_code: Option<String>,
    pub product_name: String,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub quantity: f64,
    pub unit_price: Option<f64>,
    pub amount: Option<f64>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdatePurchaseItemRequest {
    pub product_code: Option<String>,
    pub product_name: Option<String>,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub quantity: Option<f64>,
    pub unit_price: Option<f64>,
    pub amount: Option<f64>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fixed_uuid() -> Uuid {
        Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap()
    }

    fn fixed_dt() -> DateTime<Utc> {
        DateTime::parse_from_rfc3339("2026-08-15T08:00:00Z")
            .unwrap()
            .with_timezone(&Utc)
    }

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn purchase_item_serde_roundtrip_full() {
        let item = PurchaseItem {
            id: fixed_uuid(),
            order_id: fixed_uuid(),
            product_code: Some("P-100".to_string()),
            product_name: "螺丝".to_string(),
            specification: Some("M6x20".to_string()),
            unit: Some("个".to_string()),
            quantity: 100.0,
            unit_price: Some(0.25),
            amount: Some(25.0),
            created_at: fixed_dt(),
            updated_at: fixed_dt(),
        };
        roundtrip(&item);
    }

    #[test]
    fn purchase_item_serde_roundtrip_minimal() {
        let item = PurchaseItem {
            id: fixed_uuid(),
            order_id: fixed_uuid(),
            product_code: None,
            product_name: "Bare".to_string(),
            specification: None,
            unit: None,
            quantity: 0.0,
            unit_price: None,
            amount: None,
            created_at: fixed_dt(),
            updated_at: fixed_dt(),
        };
        roundtrip(&item);
    }

    #[test]
    fn purchase_item_deserialize_from_json() {
        let raw = r#"{
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "order_id": "550e8400-e29b-41d4-a716-446655440001",
            "product_code": "P-001",
            "product_name": "螺母",
            "specification": "M8",
            "unit": "个",
            "quantity": 50.0,
            "unit_price": 0.5,
            "amount": 25.0,
            "created_at": "2026-08-15T08:00:00Z",
            "updated_at": "2026-08-15T08:00:00Z"
        }"#;
        let item: PurchaseItem = serde_json::from_str(raw).unwrap();
        assert_eq!(item.product_name, "螺母");
        assert_eq!(item.quantity, 50.0);
        assert_eq!(item.unit_price, Some(0.5));
    }

    #[test]
    fn create_purchase_item_request_serde_roundtrip_full() {
        let req = CreatePurchaseItemRequest {
            order_id: fixed_uuid(),
            product_code: Some("P-002".to_string()),
            product_name: "垫片".to_string(),
            specification: Some("D8".to_string()),
            unit: Some("片".to_string()),
            quantity: 200.0,
            unit_price: Some(0.1),
            amount: Some(20.0),
        };
        roundtrip(&req);
    }

    #[test]
    fn create_purchase_item_request_serde_minimal() {
        let req = CreatePurchaseItemRequest {
            order_id: fixed_uuid(),
            product_code: None,
            product_name: "None".to_string(),
            specification: None,
            unit: None,
            quantity: 1.0,
            unit_price: None,
            amount: None,
        };
        roundtrip(&req);
    }

    #[test]
    fn update_purchase_item_request_serde_all_none() {
        let req = UpdatePurchaseItemRequest {
            product_code: None,
            product_name: None,
            specification: None,
            unit: None,
            quantity: None,
            unit_price: None,
            amount: None,
        };
        roundtrip(&req);
    }

    #[test]
    fn update_purchase_item_request_serde_partial() {
        let req = UpdatePurchaseItemRequest {
            product_code: Some("P-003".to_string()),
            product_name: None,
            specification: Some("S2".to_string()),
            unit: None,
            quantity: Some(10.0),
            unit_price: None,
            amount: Some(5.0),
        };
        roundtrip(&req);
    }

    #[test]
    fn purchase_item_clone_preserves_data() {
        let item = PurchaseItem {
            id: fixed_uuid(),
            order_id: fixed_uuid(),
            product_code: Some("P-C".to_string()),
            product_name: "Clonable".to_string(),
            specification: None,
            unit: None,
            quantity: 7.0,
            unit_price: Some(3.5),
            amount: Some(24.5),
            created_at: fixed_dt(),
            updated_at: fixed_dt(),
        };
        let cloned = item.clone();
        assert_eq!(item.id, cloned.id);
        assert_eq!(item.product_name, cloned.product_name);
        assert_eq!(item.quantity, cloned.quantity);
        assert_eq!(item.amount, cloned.amount);
    }
}
