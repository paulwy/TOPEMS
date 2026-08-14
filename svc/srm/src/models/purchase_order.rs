use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct PurchaseOrder {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub po_no: String,
    pub supplier_id: Uuid,
    pub order_date: DateTime<Utc>,
    pub expected_date: Option<DateTime<Utc>>,
    pub actual_date: Option<DateTime<Utc>>,
    pub total_amount: Option<f64>,
    pub currency: String,
    pub status: String,
    pub remarks: Option<String>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePurchaseOrderRequest {
    pub po_no: String,
    pub supplier_id: String,
    pub expected_date: Option<String>,
    pub total_amount: Option<f64>,
    pub currency: String,
    pub status: String,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdatePurchaseOrderRequest {
    pub po_no: Option<String>,
    pub supplier_id: Option<String>,
    pub expected_date: Option<DateTime<Utc>>,
    pub actual_date: Option<DateTime<Utc>>,
    pub total_amount: Option<f64>,
    pub currency: Option<String>,
    pub status: Option<String>,
    pub remarks: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_po() -> PurchaseOrder {
        PurchaseOrder {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            po_no: "PO-001".to_string(),
            supplier_id: Uuid::new_v4(),
            order_date: DateTime::parse_from_rfc3339("2025-01-10T00:00:00Z")
                .unwrap()
                .with_timezone(&Utc),
            expected_date: Some(
                DateTime::parse_from_rfc3339("2025-02-10T00:00:00Z")
                    .unwrap()
                    .with_timezone(&Utc),
            ),
            actual_date: Some(
                DateTime::parse_from_rfc3339("2025-02-08T00:00:00Z")
                    .unwrap()
                    .with_timezone(&Utc),
            ),
            total_amount: Some(88_888.88),
            currency: "CNY".to_string(),
            status: "completed".to_string(),
            remarks: Some("Delivered on time".to_string()),
            created_by: Some(Uuid::new_v4()),
            created_at: DateTime::parse_from_rfc3339("2025-01-10T00:00:00Z")
                .unwrap()
                .with_timezone(&Utc),
            updated_at: DateTime::parse_from_rfc3339("2025-02-08T00:00:00Z")
                .unwrap()
                .with_timezone(&Utc),
        }
    }

    #[test]
    fn test_po_serde_roundtrip_full() {
        let p = sample_po();
        let json = serde_json::to_string(&p).unwrap();
        let de: PurchaseOrder = serde_json::from_str(&json).unwrap();
        assert_eq!(de.id, p.id);
        assert_eq!(de.po_no, p.po_no);
        assert_eq!(de.total_amount, p.total_amount);
        assert_eq!(de.expected_date, p.expected_date);
    }

    #[test]
    fn test_po_serde_roundtrip_none_options() {
        let mut p = sample_po();
        p.expected_date = None;
        p.actual_date = None;
        p.total_amount = None;
        p.remarks = None;
        p.created_by = None;
        let json = serde_json::to_string(&p).unwrap();
        let de: PurchaseOrder = serde_json::from_str(&json).unwrap();
        assert_eq!(de.expected_date, None);
        assert_eq!(de.actual_date, None);
        assert_eq!(de.total_amount, None);
    }

    #[test]
    fn test_po_clone_equal() {
        let p = sample_po();
        let cloned = p.clone();
        assert_eq!(cloned.id, p.id);
        assert_eq!(cloned.po_no, p.po_no);
    }

    #[test]
    fn test_po_json_field_names() {
        let p = sample_po();
        let json = serde_json::to_value(&p).unwrap();
        let obj = json.as_object().unwrap();
        assert!(obj.contains_key("po_no"));
        assert!(obj.contains_key("order_date"));
        assert!(obj.contains_key("expected_date"));
        assert!(obj.contains_key("actual_date"));
        assert!(obj.contains_key("total_amount"));
        assert!(obj.contains_key("supplier_id"));
        assert!(obj.contains_key("created_by"));
    }

    #[test]
    fn test_po_deserialize_from_json() {
        let json = r#"{
            "id": "00000000-0000-0000-0000-000000000001",
            "tenant_id": "00000000-0000-0000-0000-000000000002",
            "po_no": "PO-002",
            "supplier_id": "00000000-0000-0000-0000-000000000003",
            "order_date": "2025-03-01T00:00:00Z",
            "expected_date": null,
            "actual_date": null,
            "total_amount": null,
            "currency": "USD",
            "status": "draft",
            "remarks": null,
            "created_by": null,
            "created_at": "2025-03-01T00:00:00Z",
            "updated_at": "2025-03-02T00:00:00Z"
        }"#;
        let p: PurchaseOrder = serde_json::from_str(json).unwrap();
        assert_eq!(p.po_no, "PO-002");
        assert_eq!(p.currency, "USD");
        assert!(p.total_amount.is_none());
    }

    #[test]
    fn test_po_ignores_unknown_fields() {
        let p = sample_po();
        let mut json = serde_json::to_value(&p).unwrap();
        json["unknown"] = serde_json::json!(1);
        let de: PurchaseOrder = serde_json::from_value(json).unwrap();
        assert_eq!(de.id, p.id);
    }

    #[test]
    fn test_create_po_request_serde_roundtrip() {
        let req = CreatePurchaseOrderRequest {
            po_no: "PO-003".to_string(),
            supplier_id: "00000000-0000-0000-0000-000000000001".to_string(),
            expected_date: Some("2025-04-01T00:00:00Z".to_string()),
            total_amount: Some(12_345.67),
            currency: "CNY".to_string(),
            status: "pending".to_string(),
            remarks: Some("rush order".to_string()),
        };
        let json = serde_json::to_string(&req).unwrap();
        let de: CreatePurchaseOrderRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(de.po_no, req.po_no);
        assert_eq!(de.total_amount, req.total_amount);
        assert_eq!(de.status, req.status);
    }

    #[test]
    fn test_create_po_request_clone() {
        let req = CreatePurchaseOrderRequest {
            po_no: "PO-004".to_string(),
            supplier_id: "x".to_string(),
            expected_date: None,
            total_amount: None,
            currency: "USD".to_string(),
            status: "draft".to_string(),
            remarks: None,
        };
        let cloned = req.clone();
        assert_eq!(cloned.po_no, req.po_no);
        assert_eq!(cloned.currency, req.currency);
    }

    #[test]
    fn test_create_po_request_minimal() {
        let json = r#"{
            "po_no": "PO-005",
            "supplier_id": "00000000-0000-0000-0000-000000000002",
            "currency": "CNY",
            "status": "draft"
        }"#;
        let req: CreatePurchaseOrderRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.po_no, "PO-005");
        assert!(req.total_amount.is_none());
    }

    #[test]
    fn test_update_po_request_all_none() {
        let json = r#"{}"#;
        let req: UpdatePurchaseOrderRequest = serde_json::from_str(json).unwrap();
        assert!(req.po_no.is_none());
        assert!(req.status.is_none());
    }

    #[test]
    fn test_update_po_request_partial() {
        let json = r#"{"status": "shipped", "total_amount": 999.0}"#;
        let req: UpdatePurchaseOrderRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.status.as_deref(), Some("shipped"));
        assert_eq!(req.total_amount, Some(999.0));
    }

    #[test]
    fn test_update_po_request_serde_roundtrip_full() {
        let req = UpdatePurchaseOrderRequest {
            po_no: Some("PO-006".to_string()),
            supplier_id: Some("00000000-0000-0000-0000-000000000003".to_string()),
            expected_date: Some(
                DateTime::parse_from_rfc3339("2025-05-01T00:00:00Z")
                    .unwrap()
                    .with_timezone(&Utc),
            ),
            actual_date: Some(
                DateTime::parse_from_rfc3339("2025-05-02T00:00:00Z")
                    .unwrap()
                    .with_timezone(&Utc),
            ),
            total_amount: Some(50_000.0),
            currency: Some("EUR".to_string()),
            status: Some("completed".to_string()),
            remarks: Some("done".to_string()),
        };
        let json = serde_json::to_string(&req).unwrap();
        let de: UpdatePurchaseOrderRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(de.po_no, req.po_no);
        assert_eq!(de.total_amount, req.total_amount);
        assert_eq!(de.actual_date, req.actual_date);
    }

    #[test]
    fn test_po_status_variants() {
        let mut p = sample_po();
        for status in [
            "draft",
            "pending",
            "approved",
            "shipped",
            "completed",
            "cancelled",
        ] {
            p.status = status.to_string();
            let json = serde_json::to_string(&p).unwrap();
            let de: PurchaseOrder = serde_json::from_str(&json).unwrap();
            assert_eq!(de.status, status);
        }
    }

    #[test]
    fn test_po_currency_variants() {
        let mut p = sample_po();
        for cur in ["CNY", "USD", "EUR", "GBP"] {
            p.currency = cur.to_string();
            let json = serde_json::to_string(&p).unwrap();
            let de: PurchaseOrder = serde_json::from_str(&json).unwrap();
            assert_eq!(de.currency, cur);
        }
    }

    #[test]
    fn test_po_total_amount_zero_and_negative() {
        let mut p = sample_po();
        p.total_amount = Some(0.0);
        let json = serde_json::to_string(&p).unwrap();
        let de: PurchaseOrder = serde_json::from_str(&json).unwrap();
        assert_eq!(de.total_amount, Some(0.0));

        p.total_amount = Some(-1.5);
        let json = serde_json::to_string(&p).unwrap();
        let de: PurchaseOrder = serde_json::from_str(&json).unwrap();
        assert_eq!(de.total_amount, Some(-1.5));
    }
}
