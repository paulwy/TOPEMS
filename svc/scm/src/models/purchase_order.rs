use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct PurchaseOrder {
    pub id: Uuid,
    pub order_number: String,
    pub supplier_id: Option<Uuid>,
    pub order_date: DateTime<Utc>,
    pub delivery_date: Option<DateTime<Utc>>,
    pub total_amount: Option<f64>,
    pub status: String,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreatePurchaseOrderRequest {
    pub order_number: String,
    pub supplier_id: Option<Uuid>,
    pub order_date: DateTime<Utc>,
    pub delivery_date: Option<DateTime<Utc>>,
    pub total_amount: Option<f64>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdatePurchaseOrderRequest {
    pub supplier_id: Option<Uuid>,
    pub delivery_date: Option<DateTime<Utc>>,
    pub total_amount: Option<f64>,
    pub status: Option<String>,
    pub remarks: Option<String>,
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
    fn purchase_order_serde_roundtrip_full() {
        let po = PurchaseOrder {
            id: fixed_uuid(),
            order_number: "PO-2026-001".to_string(),
            supplier_id: Some(fixed_uuid()),
            order_date: fixed_dt(),
            delivery_date: Some(fixed_dt()),
            total_amount: Some(12345.67),
            status: "approved".to_string(),
            remarks: Some("urgent".to_string()),
            created_at: fixed_dt(),
            updated_at: fixed_dt(),
        };
        roundtrip(&po);
    }

    #[test]
    fn purchase_order_serde_roundtrip_minimal() {
        let po = PurchaseOrder {
            id: fixed_uuid(),
            order_number: "PO-001".to_string(),
            supplier_id: None,
            order_date: fixed_dt(),
            delivery_date: None,
            total_amount: None,
            status: "pending".to_string(),
            remarks: None,
            created_at: fixed_dt(),
            updated_at: fixed_dt(),
        };
        let json = serde_json::to_string(&po).unwrap();
        let back: PurchaseOrder = serde_json::from_str(&json).unwrap();
        assert_eq!(back.order_number, "PO-001");
        assert!(back.supplier_id.is_none());
        assert!(back.delivery_date.is_none());
        assert!(back.total_amount.is_none());
        assert!(back.remarks.is_none());
    }

    #[test]
    fn purchase_order_deserialize_from_json() {
        let raw = r#"{
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "order_number": "PO-JSON",
            "supplier_id": null,
            "order_date": "2026-08-15T08:00:00Z",
            "delivery_date": null,
            "total_amount": null,
            "status": "draft",
            "remarks": null,
            "created_at": "2026-08-15T08:00:00Z",
            "updated_at": "2026-08-15T08:00:00Z"
        }"#;
        let po: PurchaseOrder = serde_json::from_str(raw).unwrap();
        assert_eq!(po.order_number, "PO-JSON");
        assert_eq!(po.status, "draft");
        assert!(po.supplier_id.is_none());
    }

    #[test]
    fn purchase_order_clone_is_equal() {
        let po = PurchaseOrder {
            id: fixed_uuid(),
            order_number: "CL".to_string(),
            supplier_id: Some(fixed_uuid()),
            order_date: fixed_dt(),
            delivery_date: Some(fixed_dt()),
            total_amount: Some(100.0),
            status: "pending".to_string(),
            remarks: Some("r".to_string()),
            created_at: fixed_dt(),
            updated_at: fixed_dt(),
        };
        let cloned = po.clone();
        assert_eq!(cloned.id, po.id);
        assert_eq!(cloned.order_number, po.order_number);
        assert_eq!(cloned.total_amount, po.total_amount);
    }

    #[test]
    fn create_purchase_order_request_roundtrip() {
        let req = CreatePurchaseOrderRequest {
            order_number: "PO-NEW".to_string(),
            supplier_id: Some(fixed_uuid()),
            order_date: fixed_dt(),
            delivery_date: Some(fixed_dt()),
            total_amount: Some(500.0),
            remarks: Some("new order".to_string()),
        };
        roundtrip(&req);
    }

    #[test]
    fn create_purchase_order_request_minimal() {
        let req = CreatePurchaseOrderRequest {
            order_number: "MIN".to_string(),
            supplier_id: None,
            order_date: fixed_dt(),
            delivery_date: None,
            total_amount: None,
            remarks: None,
        };
        let json = serde_json::to_string(&req).unwrap();
        let back: CreatePurchaseOrderRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(back.order_number, "MIN");
        assert!(back.supplier_id.is_none());
    }

    #[test]
    fn update_purchase_order_request_all_none() {
        let req = UpdatePurchaseOrderRequest {
            supplier_id: None,
            delivery_date: None,
            total_amount: None,
            status: None,
            remarks: None,
        };
        roundtrip(&req);
    }

    #[test]
    fn update_purchase_order_request_partial() {
        let req = UpdatePurchaseOrderRequest {
            supplier_id: Some(fixed_uuid()),
            delivery_date: None,
            total_amount: Some(999.0),
            status: Some("approved".to_string()),
            remarks: None,
        };
        let json = serde_json::to_string(&req).unwrap();
        let back: UpdatePurchaseOrderRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(back.supplier_id, req.supplier_id);
        assert!(back.delivery_date.is_none());
        assert_eq!(back.total_amount, Some(999.0));
        assert_eq!(back.status, Some("approved".to_string()));
    }
}
