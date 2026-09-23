use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct PurchaseContract {
    pub id: Uuid,
    pub contract_no: String,
    pub title: String,
    pub contract_type: String,
    pub supplier_id: String,
    pub supplier_name: Option<String>,
    pub sign_date: Option<NaiveDate>,
    pub effective_date: Option<NaiveDate>,
    pub expiry_date: Option<NaiveDate>,
    pub total_amount: Option<f64>,
    pub currency: Option<String>,
    pub payment_terms: Option<String>,
    pub delivery_terms: Option<String>,
    pub status: String,
    pub approval_status: Option<String>,
    pub approver: Option<String>,
    pub approved_at: Option<DateTime<Utc>>,
    pub signed_by: Option<String>,
    pub contract_file: Option<String>,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct PurchaseContractItem {
    pub id: Uuid,
    pub contract_id: Uuid,
    pub line_number: i32,
    pub product_code: Option<String>,
    pub product_name: String,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub quantity: f64,
    pub unit_price: Option<f64>,
    pub amount: Option<f64>,
    pub delivery_date: Option<NaiveDate>,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreatePurchaseContractRequest {
    pub contract_no: String,
    pub title: String,
    pub contract_type: String,
    pub supplier_id: String,
    pub sign_date: Option<String>,
    pub effective_date: Option<String>,
    pub expiry_date: Option<String>,
    pub total_amount: Option<f64>,
    pub currency: Option<String>,
    pub payment_terms: Option<String>,
    pub delivery_terms: Option<String>,
    pub signed_by: Option<String>,
    pub remarks: Option<String>,
    pub items: Option<Vec<CreatePurchaseContractItemRequest>>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreatePurchaseContractItemRequest {
    pub product_code: Option<String>,
    pub product_name: String,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub quantity: f64,
    pub unit_price: Option<f64>,
    pub delivery_date: Option<NaiveDate>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdatePurchaseContractRequest {
    pub title: Option<String>,
    pub contract_type: Option<String>,
    pub supplier_id: Option<String>,
    pub sign_date: Option<String>,
    pub effective_date: Option<String>,
    pub expiry_date: Option<String>,
    pub total_amount: Option<f64>,
    pub currency: Option<String>,
    pub payment_terms: Option<String>,
    pub delivery_terms: Option<String>,
    pub status: Option<String>,
    pub remarks: Option<String>,
    pub items: Option<Vec<CreatePurchaseContractItemRequest>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct PurchaseContractQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub supplier_id: Option<String>,
    pub contract_type: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
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
    fn purchase_contract_serde_roundtrip_full() {
        let c = PurchaseContract {
            id: fixed_uuid(),
            contract_no: "CT-001".to_string(),
            title: "Supply Agreement".to_string(),
            contract_type: "purchase".to_string(),
            supplier_id: "SUP-001".to_string(),
            supplier_name: Some("Acme".to_string()),
            sign_date: Some(NaiveDate::from_ymd_opt(2026, 1, 1).unwrap()),
            effective_date: Some(NaiveDate::from_ymd_opt(2026, 1, 15).unwrap()),
            expiry_date: Some(NaiveDate::from_ymd_opt(2027, 1, 14).unwrap()),
            total_amount: Some(500000.0),
            currency: Some("CNY".to_string()),
            payment_terms: Some("net30".to_string()),
            delivery_terms: Some("FOB".to_string()),
            status: "approved".to_string(),
            approval_status: Some("approved".to_string()),
            approver: Some("admin".to_string()),
            approved_at: Some(fixed_dt()),
            signed_by: Some("manager".to_string()),
            contract_file: Some("/path/file.pdf".to_string()),
            remarks: Some("ok".to_string()),
            created_at: fixed_dt(),
            updated_at: fixed_dt(),
            deleted_at: None,
        };
        roundtrip(&c);
    }

    #[test]
    fn purchase_contract_serde_roundtrip_minimal() {
        let c = PurchaseContract {
            id: fixed_uuid(),
            contract_no: "CT-MIN".to_string(),
            title: "T".to_string(),
            contract_type: "type".to_string(),
            supplier_id: "S".to_string(),
            supplier_name: None,
            sign_date: None,
            effective_date: None,
            expiry_date: None,
            total_amount: None,
            currency: None,
            payment_terms: None,
            delivery_terms: None,
            status: "draft".to_string(),
            approval_status: None,
            approver: None,
            approved_at: None,
            signed_by: None,
            contract_file: None,
            remarks: None,
            created_at: fixed_dt(),
            updated_at: fixed_dt(),
            deleted_at: Some(fixed_dt()),
        };
        let json = serde_json::to_string(&c).unwrap();
        let back: PurchaseContract = serde_json::from_str(&json).unwrap();
        assert_eq!(back.contract_no, "CT-MIN");
        assert!(back.supplier_name.is_none());
        assert!(back.deleted_at.is_some());
    }

    #[test]
    fn purchase_contract_clone_preserves_fields() {
        let c = PurchaseContract {
            id: fixed_uuid(),
            contract_no: "C".to_string(),
            title: "T".to_string(),
            contract_type: "ct".to_string(),
            supplier_id: "s".to_string(),
            supplier_name: Some("n".to_string()),
            sign_date: None,
            effective_date: None,
            expiry_date: None,
            total_amount: Some(1.0),
            currency: None,
            payment_terms: None,
            delivery_terms: None,
            status: "draft".to_string(),
            approval_status: None,
            approver: None,
            approved_at: None,
            signed_by: None,
            contract_file: None,
            remarks: None,
            created_at: fixed_dt(),
            updated_at: fixed_dt(),
            deleted_at: None,
        };
        let cloned = c.clone();
        assert_eq!(cloned.id, c.id);
        assert_eq!(cloned.total_amount, c.total_amount);
    }

    #[test]
    fn purchase_contract_item_roundtrip() {
        let item = PurchaseContractItem {
            id: fixed_uuid(),
            contract_id: fixed_uuid(),
            line_number: 1,
            product_code: Some("P-001".to_string()),
            product_name: "Widget".to_string(),
            specification: Some("10mm".to_string()),
            unit: Some("pcs".to_string()),
            quantity: 100.0,
            unit_price: Some(12.5),
            amount: Some(1250.0),
            delivery_date: Some(NaiveDate::from_ymd_opt(2026, 3, 1).unwrap()),
            remarks: None,
            created_at: fixed_dt(),
        };
        roundtrip(&item);
    }

    #[test]
    fn create_purchase_contract_request_roundtrip() {
        let req = CreatePurchaseContractRequest {
            contract_no: "NEW-CT".to_string(),
            title: "New Contract".to_string(),
            contract_type: "purchase".to_string(),
            supplier_id: "SUP-01".to_string(),
            sign_date: Some("2026-01-01".to_string()),
            effective_date: None,
            expiry_date: Some("2027-01-01".to_string()),
            total_amount: Some(10000.0),
            currency: Some("CNY".to_string()),
            payment_terms: None,
            delivery_terms: None,
            signed_by: Some("boss".to_string()),
            remarks: None,
            items: Some(vec![CreatePurchaseContractItemRequest {
                product_code: Some("P1".to_string()),
                product_name: "Item1".to_string(),
                specification: None,
                unit: Some("kg".to_string()),
                quantity: 50.0,
                unit_price: Some(20.0),
                delivery_date: None,
                remarks: None,
            }]),
        };
        roundtrip(&req);
    }

    #[test]
    fn create_purchase_contract_request_no_items() {
        let req = CreatePurchaseContractRequest {
            contract_no: "CT2".to_string(),
            title: "T".to_string(),
            contract_type: "tp".to_string(),
            supplier_id: "s".to_string(),
            sign_date: None,
            effective_date: None,
            expiry_date: None,
            total_amount: None,
            currency: None,
            payment_terms: None,
            delivery_terms: None,
            signed_by: None,
            remarks: None,
            items: None,
        };
        let json = serde_json::to_string(&req).unwrap();
        let back: CreatePurchaseContractRequest = serde_json::from_str(&json).unwrap();
        assert!(back.items.is_none());
        assert!(back.sign_date.is_none());
    }

    #[test]
    fn update_purchase_contract_request_all_none() {
        let req = UpdatePurchaseContractRequest {
            title: None,
            contract_type: None,
            supplier_id: None,
            sign_date: None,
            effective_date: None,
            expiry_date: None,
            total_amount: None,
            currency: None,
            payment_terms: None,
            delivery_terms: None,
            status: None,
            remarks: None,
            items: None,
        };
        roundtrip(&req);
    }

    #[test]
    fn update_purchase_contract_request_partial() {
        let req = UpdatePurchaseContractRequest {
            title: Some("Updated".to_string()),
            contract_type: None,
            supplier_id: Some("SUP-02".to_string()),
            sign_date: None,
            effective_date: None,
            expiry_date: None,
            total_amount: Some(999.0),
            currency: None,
            payment_terms: Some("net60".to_string()),
            delivery_terms: None,
            status: Some("approved".to_string()),
            remarks: None,
            items: None,
        };
        let json = serde_json::to_string(&req).unwrap();
        let back: UpdatePurchaseContractRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(back.title, Some("Updated".to_string()));
        assert!(back.contract_type.is_none());
        assert_eq!(back.status, Some("approved".to_string()));
    }

    #[test]
    fn create_purchase_contract_item_request_roundtrip() {
        let item = CreatePurchaseContractItemRequest {
            product_code: Some("CODE".to_string()),
            product_name: "Name".to_string(),
            specification: Some("Spec".to_string()),
            unit: Some("unit".to_string()),
            quantity: 10.0,
            unit_price: Some(5.0),
            delivery_date: Some(NaiveDate::from_ymd_opt(2026, 6, 1).unwrap()),
            remarks: Some("r".to_string()),
        };
        roundtrip(&item);
    }

    #[test]
    fn purchase_contract_query_params_defaults() {
        let q: PurchaseContractQueryParams = serde_json::from_str("{}").unwrap();
        assert!(q.page.is_none());
        assert!(q.status.is_none());
        assert!(q.supplier_id.is_none());
    }

    #[test]
    fn purchase_contract_query_params_roundtrip() {
        let json = r#"{
            "page": 2, "page_size": 15, "status": "approved",
            "supplier_id": "S1", "contract_type": "purchase",
            "start_date": "2026-01-01", "end_date": "2026-12-31"
        }"#;
        let q: PurchaseContractQueryParams = serde_json::from_str(json).unwrap();
        assert_eq!(q.page, Some(2));
        assert_eq!(q.status.as_deref(), Some("approved"));
        assert_eq!(q.contract_type.as_deref(), Some("purchase"));
    }
}
