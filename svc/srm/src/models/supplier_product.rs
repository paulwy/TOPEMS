use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct SupplierProduct {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub product_no: String,
    pub supplier_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub unit: Option<String>,
    pub unit_price: Option<f64>,
    pub currency: String,
    pub min_order_qty: Option<i32>,
    pub lead_time_days: Option<i32>,
    pub status: String,
    pub specifications: Option<String>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSupplierProductRequest {
    pub product_no: String,
    pub supplier_id: String,
    pub name: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub unit: Option<String>,
    pub unit_price: Option<f64>,
    pub currency: String,
    pub min_order_qty: Option<i32>,
    pub lead_time_days: Option<i32>,
    pub status: String,
    pub specifications: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSupplierProductRequest {
    pub product_no: Option<String>,
    pub supplier_id: Option<String>,
    pub name: Option<String>,
    pub description: Option<String>,
    pub category: Option<String>,
    pub unit: Option<String>,
    pub unit_price: Option<f64>,
    pub currency: Option<String>,
    pub min_order_qty: Option<i32>,
    pub lead_time_days: Option<i32>,
    pub status: Option<String>,
    pub specifications: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_product() -> SupplierProduct {
        SupplierProduct {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            product_no: "PROD-001".to_string(),
            supplier_id: Uuid::new_v4(),
            name: "Steel Pipe DN100".to_string(),
            description: Some("Carbon steel pipe".to_string()),
            category: Some("raw_material".to_string()),
            unit: Some("meter".to_string()),
            unit_price: Some(45.50),
            currency: "CNY".to_string(),
            min_order_qty: Some(100),
            lead_time_days: Some(15),
            status: "active".to_string(),
            specifications: Some("DN100, thickness 4mm".to_string()),
            created_by: Some(Uuid::new_v4()),
            created_at: DateTime::parse_from_rfc3339("2025-01-01T00:00:00Z")
                .unwrap()
                .with_timezone(&Utc),
            updated_at: DateTime::parse_from_rfc3339("2025-01-02T00:00:00Z")
                .unwrap()
                .with_timezone(&Utc),
        }
    }

    #[test]
    fn test_product_serde_roundtrip_full() {
        let p = sample_product();
        let json = serde_json::to_string(&p).unwrap();
        let de: SupplierProduct = serde_json::from_str(&json).unwrap();
        assert_eq!(de.id, p.id);
        assert_eq!(de.product_no, p.product_no);
        assert_eq!(de.name, p.name);
        assert_eq!(de.unit_price, p.unit_price);
        assert_eq!(de.min_order_qty, p.min_order_qty);
    }

    #[test]
    fn test_product_serde_roundtrip_none_options() {
        let mut p = sample_product();
        p.description = None;
        p.category = None;
        p.unit = None;
        p.unit_price = None;
        p.min_order_qty = None;
        p.lead_time_days = None;
        p.specifications = None;
        p.created_by = None;
        let json = serde_json::to_string(&p).unwrap();
        let de: SupplierProduct = serde_json::from_str(&json).unwrap();
        assert_eq!(de.unit_price, None);
        assert_eq!(de.min_order_qty, None);
        assert_eq!(de.specifications, None);
    }

    #[test]
    fn test_product_clone_equal() {
        let p = sample_product();
        let cloned = p.clone();
        assert_eq!(cloned.id, p.id);
        assert_eq!(cloned.product_no, p.product_no);
    }

    #[test]
    fn test_product_json_field_names() {
        let p = sample_product();
        let json = serde_json::to_value(&p).unwrap();
        let obj = json.as_object().unwrap();
        assert!(obj.contains_key("product_no"));
        assert!(obj.contains_key("supplier_id"));
        assert!(obj.contains_key("unit_price"));
        assert!(obj.contains_key("min_order_qty"));
        assert!(obj.contains_key("lead_time_days"));
        assert!(obj.contains_key("specifications"));
    }

    #[test]
    fn test_product_deserialize_from_json() {
        let json = r#"{
            "id": "00000000-0000-0000-0000-000000000001",
            "tenant_id": "00000000-0000-0000-0000-000000000002",
            "product_no": "PROD-002",
            "supplier_id": "00000000-0000-0000-0000-000000000003",
            "name": "Cable",
            "description": null,
            "category": null,
            "unit": null,
            "unit_price": null,
            "currency": "USD",
            "min_order_qty": null,
            "lead_time_days": null,
            "status": "inactive",
            "specifications": null,
            "created_by": null,
            "created_at": "2025-03-01T00:00:00Z",
            "updated_at": "2025-03-02T00:00:00Z"
        }"#;
        let p: SupplierProduct = serde_json::from_str(json).unwrap();
        assert_eq!(p.product_no, "PROD-002");
        assert_eq!(p.currency, "USD");
        assert_eq!(p.status, "inactive");
        assert!(p.unit_price.is_none());
    }

    #[test]
    fn test_product_ignores_unknown_fields() {
        let p = sample_product();
        let mut json = serde_json::to_value(&p).unwrap();
        json["unknown"] = serde_json::json!(1);
        let de: SupplierProduct = serde_json::from_value(json).unwrap();
        assert_eq!(de.id, p.id);
    }

    #[test]
    fn test_create_product_request_serde_roundtrip() {
        let req = CreateSupplierProductRequest {
            product_no: "PROD-003".to_string(),
            supplier_id: "00000000-0000-0000-0000-000000000001".to_string(),
            name: "Widget".to_string(),
            description: Some("desc".to_string()),
            category: Some("hardware".to_string()),
            unit: Some("piece".to_string()),
            unit_price: Some(9.99),
            currency: "CNY".to_string(),
            min_order_qty: Some(10),
            lead_time_days: Some(7),
            status: "active".to_string(),
            specifications: Some("spec".to_string()),
        };
        let json = serde_json::to_string(&req).unwrap();
        let de: CreateSupplierProductRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(de.product_no, req.product_no);
        assert_eq!(de.unit_price, req.unit_price);
    }

    #[test]
    fn test_create_product_request_clone() {
        let req = CreateSupplierProductRequest {
            product_no: "PROD-004".to_string(),
            supplier_id: "x".to_string(),
            name: "T".to_string(),
            description: None,
            category: None,
            unit: None,
            unit_price: None,
            currency: "USD".to_string(),
            min_order_qty: None,
            lead_time_days: None,
            status: "draft".to_string(),
            specifications: None,
        };
        let cloned = req.clone();
        assert_eq!(cloned.product_no, req.product_no);
        assert_eq!(cloned.currency, req.currency);
    }

    #[test]
    fn test_create_product_request_minimal() {
        let json = r#"{
            "product_no": "PROD-005",
            "supplier_id": "00000000-0000-0000-0000-000000000002",
            "name": "Min",
            "currency": "CNY",
            "status": "active"
        }"#;
        let req: CreateSupplierProductRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.product_no, "PROD-005");
        assert!(req.unit_price.is_none());
    }

    #[test]
    fn test_update_product_request_all_none() {
        let json = r#"{}"#;
        let req: UpdateSupplierProductRequest = serde_json::from_str(json).unwrap();
        assert!(req.name.is_none());
        assert!(req.unit_price.is_none());
    }

    #[test]
    fn test_update_product_request_partial() {
        let json = r#"{"name": "Updated", "unit_price": 19.99}"#;
        let req: UpdateSupplierProductRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.name.as_deref(), Some("Updated"));
        assert_eq!(req.unit_price, Some(19.99));
    }

    #[test]
    fn test_update_product_request_serde_roundtrip_full() {
        let req = UpdateSupplierProductRequest {
            product_no: Some("PROD-006".to_string()),
            supplier_id: Some("00000000-0000-0000-0000-000000000003".to_string()),
            name: Some("Updated".to_string()),
            description: Some("d".to_string()),
            category: Some("c".to_string()),
            unit: Some("u".to_string()),
            unit_price: Some(15.0),
            currency: Some("EUR".to_string()),
            min_order_qty: Some(50),
            lead_time_days: Some(20),
            status: Some("inactive".to_string()),
            specifications: Some("s".to_string()),
        };
        let json = serde_json::to_string(&req).unwrap();
        let de: UpdateSupplierProductRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(de.name, req.name);
        assert_eq!(de.unit_price, req.unit_price);
    }

    #[test]
    fn test_product_status_variants() {
        let mut p = sample_product();
        for status in ["active", "inactive", "discontinued", "out_of_stock"] {
            p.status = status.to_string();
            let json = serde_json::to_string(&p).unwrap();
            let de: SupplierProduct = serde_json::from_str(&json).unwrap();
            assert_eq!(de.status, status);
        }
    }

    #[test]
    fn test_product_unit_price_zero_and_negative() {
        let mut p = sample_product();
        p.unit_price = Some(0.0);
        let json = serde_json::to_string(&p).unwrap();
        let de: SupplierProduct = serde_json::from_str(&json).unwrap();
        assert_eq!(de.unit_price, Some(0.0));

        p.unit_price = Some(-5.0);
        let json = serde_json::to_string(&p).unwrap();
        let de: SupplierProduct = serde_json::from_str(&json).unwrap();
        assert_eq!(de.unit_price, Some(-5.0));
    }

    #[test]
    fn test_product_qty_and_lead_time_extremes() {
        let mut p = sample_product();
        p.min_order_qty = Some(0);
        p.lead_time_days = Some(0);
        let json = serde_json::to_string(&p).unwrap();
        let de: SupplierProduct = serde_json::from_str(&json).unwrap();
        assert_eq!(de.min_order_qty, Some(0));
        assert_eq!(de.lead_time_days, Some(0));

        p.min_order_qty = Some(i32::MAX);
        p.lead_time_days = Some(i32::MAX);
        let json = serde_json::to_string(&p).unwrap();
        let de: SupplierProduct = serde_json::from_str(&json).unwrap();
        assert_eq!(de.min_order_qty, Some(i32::MAX));
    }
}
