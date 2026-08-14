use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct SupplierContract {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub contract_no: String,
    pub supplier_id: Uuid,
    pub supplier_name: Option<String>,
    pub title: String,
    pub contract_type: String,
    pub total_amount: Option<f64>,
    pub currency: String,
    pub sign_date: Option<DateTime<Utc>>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub status: String,
    pub remarks: Option<String>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSupplierContractRequest {
    pub contract_no: String,
    pub supplier_id: String,
    pub supplier_name: Option<String>,
    pub title: String,
    pub contract_type: String,
    pub total_amount: Option<f64>,
    pub currency: String,
    pub sign_date: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub status: String,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSupplierContractRequest {
    pub contract_no: Option<String>,
    pub supplier_id: Option<String>,
    pub supplier_name: Option<String>,
    pub title: Option<String>,
    pub contract_type: Option<String>,
    pub total_amount: Option<f64>,
    pub currency: Option<String>,
    pub sign_date: Option<DateTime<Utc>>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub status: Option<String>,
    pub remarks: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_contract() -> SupplierContract {
        SupplierContract {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            contract_no: "CT-001".to_string(),
            supplier_id: Uuid::new_v4(),
            supplier_name: Some("Acme Corp".to_string()),
            title: "Annual Supply Agreement".to_string(),
            contract_type: "framework".to_string(),
            total_amount: Some(1_000_000.0),
            currency: "CNY".to_string(),
            sign_date: Some(
                DateTime::parse_from_rfc3339("2025-01-01T00:00:00Z")
                    .unwrap()
                    .with_timezone(&Utc),
            ),
            start_date: Some(
                DateTime::parse_from_rfc3339("2025-02-01T00:00:00Z")
                    .unwrap()
                    .with_timezone(&Utc),
            ),
            end_date: Some(
                DateTime::parse_from_rfc3339("2026-02-01T00:00:00Z")
                    .unwrap()
                    .with_timezone(&Utc),
            ),
            status: "active".to_string(),
            remarks: Some("Standard terms".to_string()),
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
    fn test_contract_serde_roundtrip_full() {
        let c = sample_contract();
        let json = serde_json::to_string(&c).unwrap();
        let de: SupplierContract = serde_json::from_str(&json).unwrap();
        assert_eq!(de.id, c.id);
        assert_eq!(de.contract_no, c.contract_no);
        assert_eq!(de.title, c.title);
        assert_eq!(de.total_amount, c.total_amount);
        assert_eq!(de.end_date, c.end_date);
    }

    #[test]
    fn test_contract_serde_roundtrip_none_options() {
        let mut c = sample_contract();
        c.supplier_name = None;
        c.total_amount = None;
        c.sign_date = None;
        c.start_date = None;
        c.end_date = None;
        c.remarks = None;
        c.created_by = None;
        let json = serde_json::to_string(&c).unwrap();
        let de: SupplierContract = serde_json::from_str(&json).unwrap();
        assert_eq!(de.supplier_name, None);
        assert_eq!(de.total_amount, None);
        assert_eq!(de.end_date, None);
        assert_eq!(de.remarks, None);
    }

    #[test]
    fn test_contract_clone_equal() {
        let c = sample_contract();
        let cloned = c.clone();
        assert_eq!(cloned.id, c.id);
        assert_eq!(cloned.contract_no, c.contract_no);
        assert_eq!(cloned.total_amount, c.total_amount);
    }

    #[test]
    fn test_contract_json_field_names() {
        let c = sample_contract();
        let json = serde_json::to_value(&c).unwrap();
        let obj = json.as_object().unwrap();
        assert!(obj.contains_key("contract_no"));
        assert!(obj.contains_key("supplier_id"));
        assert!(obj.contains_key("supplier_name"));
        assert!(obj.contains_key("contract_type"));
        assert!(obj.contains_key("total_amount"));
        assert!(obj.contains_key("sign_date"));
        assert!(obj.contains_key("end_date"));
    }

    #[test]
    fn test_contract_deserialize_from_json() {
        let json = r#"{
            "id": "00000000-0000-0000-0000-000000000001",
            "tenant_id": "00000000-0000-0000-0000-000000000002",
            "contract_no": "CT-002",
            "supplier_id": "00000000-0000-0000-0000-000000000003",
            "supplier_name": null,
            "title": "Service Contract",
            "contract_type": "service",
            "total_amount": null,
            "currency": "USD",
            "sign_date": null,
            "start_date": null,
            "end_date": null,
            "status": "draft",
            "remarks": null,
            "created_by": null,
            "created_at": "2025-03-01T00:00:00Z",
            "updated_at": "2025-03-02T00:00:00Z"
        }"#;
        let c: SupplierContract = serde_json::from_str(json).unwrap();
        assert_eq!(c.contract_no, "CT-002");
        assert_eq!(c.title, "Service Contract");
        assert_eq!(c.currency, "USD");
        assert_eq!(c.status, "draft");
        assert!(c.total_amount.is_none());
    }

    #[test]
    fn test_contract_ignores_unknown_fields() {
        let c = sample_contract();
        let mut json = serde_json::to_value(&c).unwrap();
        json["extra"] = serde_json::json!("ignored");
        let de: SupplierContract = serde_json::from_value(json).unwrap();
        assert_eq!(de.id, c.id);
    }

    #[test]
    fn test_create_contract_request_serde_roundtrip() {
        let req = CreateSupplierContractRequest {
            contract_no: "CT-003".to_string(),
            supplier_id: "00000000-0000-0000-0000-000000000001".to_string(),
            supplier_name: Some("Beta".to_string()),
            title: "Purchase Agreement".to_string(),
            contract_type: "purchase".to_string(),
            total_amount: Some(500_000.0),
            currency: "CNY".to_string(),
            sign_date: Some("2025-01-01T00:00:00Z".to_string()),
            start_date: Some("2025-02-01T00:00:00Z".to_string()),
            end_date: None,
            status: "active".to_string(),
            remarks: None,
        };
        let json = serde_json::to_string(&req).unwrap();
        let de: CreateSupplierContractRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(de.contract_no, req.contract_no);
        assert_eq!(de.title, req.title);
        assert_eq!(de.end_date, None);
        assert_eq!(de.remarks, None);
    }

    #[test]
    fn test_create_contract_request_clone() {
        let req = CreateSupplierContractRequest {
            contract_no: "CT-004".to_string(),
            supplier_id: "00000000-0000-0000-0000-000000000002".to_string(),
            supplier_name: None,
            title: "T".to_string(),
            contract_type: "service".to_string(),
            total_amount: None,
            currency: "USD".to_string(),
            sign_date: None,
            start_date: None,
            end_date: None,
            status: "draft".to_string(),
            remarks: None,
        };
        let cloned = req.clone();
        assert_eq!(cloned.contract_no, req.contract_no);
        assert_eq!(cloned.currency, req.currency);
    }

    #[test]
    fn test_create_contract_request_minimal() {
        let json = r#"{
            "contract_no": "CT-005",
            "supplier_id": "00000000-0000-0000-0000-000000000003",
            "title": "Min",
            "contract_type": "other",
            "currency": "CNY",
            "status": "draft"
        }"#;
        let req: CreateSupplierContractRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.contract_no, "CT-005");
        assert!(req.total_amount.is_none());
        assert!(req.sign_date.is_none());
    }

    #[test]
    fn test_update_contract_request_all_none() {
        let json = r#"{}"#;
        let req: UpdateSupplierContractRequest = serde_json::from_str(json).unwrap();
        assert!(req.contract_no.is_none());
        assert!(req.title.is_none());
        assert!(req.status.is_none());
    }

    #[test]
    fn test_update_contract_request_partial() {
        let json = r#"{"status": "terminated", "remarks": "done"}"#;
        let req: UpdateSupplierContractRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.status.as_deref(), Some("terminated"));
        assert_eq!(req.remarks.as_deref(), Some("done"));
        assert!(req.title.is_none());
    }

    #[test]
    fn test_update_contract_request_serde_roundtrip_full() {
        let req = UpdateSupplierContractRequest {
            contract_no: Some("CT-006".to_string()),
            supplier_id: Some("00000000-0000-0000-0000-000000000004".to_string()),
            supplier_name: Some("Gamma".to_string()),
            title: Some("Updated Title".to_string()),
            contract_type: Some("framework".to_string()),
            total_amount: Some(123.45),
            currency: Some("EUR".to_string()),
            sign_date: Some(
                DateTime::parse_from_rfc3339("2025-05-01T00:00:00Z")
                    .unwrap()
                    .with_timezone(&Utc),
            ),
            start_date: Some(
                DateTime::parse_from_rfc3339("2025-06-01T00:00:00Z")
                    .unwrap()
                    .with_timezone(&Utc),
            ),
            end_date: Some(
                DateTime::parse_from_rfc3339("2026-06-01T00:00:00Z")
                    .unwrap()
                    .with_timezone(&Utc),
            ),
            status: Some("active".to_string()),
            remarks: Some("updated".to_string()),
        };
        let json = serde_json::to_string(&req).unwrap();
        let de: UpdateSupplierContractRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(de.contract_no, req.contract_no);
        assert_eq!(de.total_amount, req.total_amount);
        assert_eq!(de.end_date, req.end_date);
    }

    #[test]
    fn test_contract_status_variants() {
        let mut c = sample_contract();
        for status in ["draft", "active", "expired", "terminated"] {
            c.status = status.to_string();
            let json = serde_json::to_string(&c).unwrap();
            let de: SupplierContract = serde_json::from_str(&json).unwrap();
            assert_eq!(de.status, status);
        }
    }

    #[test]
    fn test_contract_currency_variants() {
        let mut c = sample_contract();
        for cur in ["CNY", "USD", "EUR", "JPY"] {
            c.currency = cur.to_string();
            let json = serde_json::to_string(&c).unwrap();
            let de: SupplierContract = serde_json::from_str(&json).unwrap();
            assert_eq!(de.currency, cur);
        }
    }

    #[test]
    fn test_contract_total_amount_zero_and_negative() {
        let mut c = sample_contract();
        c.total_amount = Some(0.0);
        let json = serde_json::to_string(&c).unwrap();
        let de: SupplierContract = serde_json::from_str(&json).unwrap();
        assert_eq!(de.total_amount, Some(0.0));

        c.total_amount = Some(-100.0);
        let json = serde_json::to_string(&c).unwrap();
        let de: SupplierContract = serde_json::from_str(&json).unwrap();
        assert_eq!(de.total_amount, Some(-100.0));
    }
}
