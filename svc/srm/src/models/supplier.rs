use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Supplier {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub supplier_no: String,
    pub name: String,
    #[serde(default)]
    #[sqlx(default)]
    pub name_en: Option<String>,
    pub legal_name: Option<String>,
    pub category: String,
    pub status: String,
    pub tax_id: Option<String>,
    pub address: Option<String>,
    pub contact_person: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub website: Option<String>,
    pub credit_rating: Option<String>,
    pub risk_level: String,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSupplierRequest {
    pub supplier_no: String,
    pub name: String,
    pub legal_name: Option<String>,
    pub category: String,
    pub status: String,
    pub tax_id: Option<String>,
    pub address: Option<String>,
    pub contact_person: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub website: Option<String>,
    pub credit_rating: Option<String>,
    pub risk_level: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSupplierRequest {
    pub supplier_no: Option<String>,
    pub name: Option<String>,
    pub legal_name: Option<String>,
    pub category: Option<String>,
    pub status: Option<String>,
    pub tax_id: Option<String>,
    pub address: Option<String>,
    pub contact_person: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub website: Option<String>,
    pub credit_rating: Option<String>,
    pub risk_level: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_supplier() -> Supplier {
        Supplier {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            supplier_no: "SUP-001".to_string(),
            name: "Acme Corp".to_string(),
            legal_name: Some("Acme Corporation Ltd".to_string()),
            category: "raw_material".to_string(),
            status: "active".to_string(),
            tax_id: Some("91110000MA02CT357K".to_string()),
            address: Some("No.1 Main St".to_string()),
            contact_person: Some("Zhang San".to_string()),
            phone: Some("13800000000".to_string()),
            email: Some("contact@acme.com".to_string()),
            website: Some("https://acme.com".to_string()),
            credit_rating: Some("AAA".to_string()),
            risk_level: "low".to_string(),
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
    fn test_supplier_serde_roundtrip_full() {
        let s = sample_supplier();
        let json = serde_json::to_string(&s).unwrap();
        let de: Supplier = serde_json::from_str(&json).unwrap();
        assert_eq!(de.id, s.id);
        assert_eq!(de.supplier_no, s.supplier_no);
        assert_eq!(de.name, s.name);
        assert_eq!(de.legal_name, s.legal_name);
        assert_eq!(de.risk_level, s.risk_level);
    }

    #[test]
    fn test_supplier_serde_roundtrip_none_options() {
        let mut s = sample_supplier();
        s.legal_name = None;
        s.tax_id = None;
        s.address = None;
        s.contact_person = None;
        s.phone = None;
        s.email = None;
        s.website = None;
        s.credit_rating = None;
        s.created_by = None;
        let json = serde_json::to_string(&s).unwrap();
        let de: Supplier = serde_json::from_str(&json).unwrap();
        assert_eq!(de.legal_name, None);
        assert_eq!(de.tax_id, None);
        assert_eq!(de.created_by, None);
    }

    #[test]
    fn test_supplier_clone_equal() {
        let s = sample_supplier();
        let cloned = s.clone();
        assert_eq!(cloned.id, s.id);
        assert_eq!(cloned.supplier_no, s.supplier_no);
        assert_eq!(cloned.name, s.name);
    }

    #[test]
    fn test_supplier_json_field_names_snake_case() {
        let s = sample_supplier();
        let json = serde_json::to_value(&s).unwrap();
        let obj = json.as_object().unwrap();
        assert!(obj.contains_key("supplier_no"));
        assert!(obj.contains_key("legal_name"));
        assert!(obj.contains_key("contact_person"));
        assert!(obj.contains_key("credit_rating"));
        assert!(obj.contains_key("risk_level"));
        assert!(obj.contains_key("created_at"));
        assert!(obj.contains_key("tenant_id"));
    }

    #[test]
    fn test_supplier_deserialize_from_json() {
        let json = r#"{
            "id": "00000000-0000-0000-0000-000000000001",
            "tenant_id": "00000000-0000-0000-0000-000000000002",
            "supplier_no": "SUP-002",
            "name": "Beta Inc",
            "legal_name": null,
            "category": "logistics",
            "status": "pending",
            "tax_id": null,
            "address": null,
            "contact_person": null,
            "phone": null,
            "email": null,
            "website": null,
            "credit_rating": null,
            "risk_level": "medium",
            "created_by": null,
            "created_at": "2025-03-01T00:00:00Z",
            "updated_at": "2025-03-02T00:00:00Z"
        }"#;
        let s: Supplier = serde_json::from_str(json).unwrap();
        assert_eq!(s.supplier_no, "SUP-002");
        assert_eq!(s.name, "Beta Inc");
        assert_eq!(s.status, "pending");
        assert_eq!(s.risk_level, "medium");
        assert!(s.legal_name.is_none());
    }

    #[test]
    fn test_supplier_ignores_unknown_fields() {
        let s = sample_supplier();
        let mut json = serde_json::to_value(&s).unwrap();
        json["unknown_field"] = serde_json::json!("ignored");
        let de: Supplier = serde_json::from_value(json).unwrap();
        assert_eq!(de.id, s.id);
    }

    #[test]
    fn test_create_supplier_request_serde_roundtrip() {
        let req = CreateSupplierRequest {
            supplier_no: "SUP-003".to_string(),
            name: "Gamma Ltd".to_string(),
            legal_name: Some("Gamma Limited".to_string()),
            category: "service".to_string(),
            status: "active".to_string(),
            tax_id: Some("TAX123".to_string()),
            address: Some("Addr".to_string()),
            contact_person: Some("Li Si".to_string()),
            phone: Some("13900000000".to_string()),
            email: Some("g@gamma.com".to_string()),
            website: None,
            credit_rating: Some("AA".to_string()),
            risk_level: "low".to_string(),
        };
        let json = serde_json::to_string(&req).unwrap();
        let de: CreateSupplierRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(de.supplier_no, req.supplier_no);
        assert_eq!(de.name, req.name);
        assert_eq!(de.website, None);
        assert_eq!(de.risk_level, req.risk_level);
    }

    #[test]
    fn test_create_supplier_request_clone() {
        let req = CreateSupplierRequest {
            supplier_no: "SUP-004".to_string(),
            name: "Delta".to_string(),
            legal_name: None,
            category: "hardware".to_string(),
            status: "pending".to_string(),
            tax_id: None,
            address: None,
            contact_person: None,
            phone: None,
            email: None,
            website: None,
            credit_rating: None,
            risk_level: "high".to_string(),
        };
        let cloned = req.clone();
        assert_eq!(cloned.supplier_no, req.supplier_no);
        assert_eq!(cloned.risk_level, req.risk_level);
    }

    #[test]
    fn test_create_supplier_request_all_none_options() {
        let json = r#"{
            "supplier_no": "SUP-005",
            "name": "Epsilon",
            "category": "other",
            "status": "pending",
            "risk_level": "medium"
        }"#;
        let req: CreateSupplierRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.supplier_no, "SUP-005");
        assert!(req.legal_name.is_none());
        assert!(req.tax_id.is_none());
        assert!(req.email.is_none());
    }

    #[test]
    fn test_update_supplier_request_all_none() {
        let json = r#"{}"#;
        let req: UpdateSupplierRequest = serde_json::from_str(json).unwrap();
        assert!(req.supplier_no.is_none());
        assert!(req.name.is_none());
        assert!(req.risk_level.is_none());
    }

    #[test]
    fn test_update_supplier_request_partial() {
        let json = r#"{"name": "Updated Name", "risk_level": "high"}"#;
        let req: UpdateSupplierRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.name.as_deref(), Some("Updated Name"));
        assert_eq!(req.risk_level.as_deref(), Some("high"));
        assert!(req.supplier_no.is_none());
    }

    #[test]
    fn test_update_supplier_request_serde_roundtrip_full() {
        let req = UpdateSupplierRequest {
            supplier_no: Some("SUP-006".to_string()),
            name: Some("Zeta".to_string()),
            legal_name: Some("Zeta Ltd".to_string()),
            category: Some("raw_material".to_string()),
            status: Some("active".to_string()),
            tax_id: Some("TAX456".to_string()),
            address: Some("Addr2".to_string()),
            contact_person: Some("Wang Wu".to_string()),
            phone: Some("13700000000".to_string()),
            email: Some("z@zeta.com".to_string()),
            website: Some("https://zeta.com".to_string()),
            credit_rating: Some("A".to_string()),
            risk_level: Some("low".to_string()),
        };
        let json = serde_json::to_string(&req).unwrap();
        let de: UpdateSupplierRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(de.supplier_no, req.supplier_no);
        assert_eq!(de.name, req.name);
        assert_eq!(de.risk_level, req.risk_level);
    }

    #[test]
    fn test_update_supplier_request_clone() {
        let req = UpdateSupplierRequest {
            supplier_no: Some("SUP-007".to_string()),
            name: None,
            legal_name: None,
            category: None,
            status: None,
            tax_id: None,
            address: None,
            contact_person: None,
            phone: None,
            email: None,
            website: None,
            credit_rating: None,
            risk_level: None,
        };
        let cloned = req.clone();
        assert_eq!(cloned.supplier_no, req.supplier_no);
        assert!(cloned.name.is_none());
    }

    #[test]
    fn test_supplier_status_field_values() {
        let mut s = sample_supplier();
        for status in ["active", "pending", "blacklisted", "inactive"] {
            s.status = status.to_string();
            let json = serde_json::to_string(&s).unwrap();
            let de: Supplier = serde_json::from_str(&json).unwrap();
            assert_eq!(de.status, status);
        }
    }

    #[test]
    fn test_supplier_risk_level_field_values() {
        let mut s = sample_supplier();
        for risk in ["low", "medium", "high", "critical"] {
            s.risk_level = risk.to_string();
            let json = serde_json::to_string(&s).unwrap();
            let de: Supplier = serde_json::from_str(&json).unwrap();
            assert_eq!(de.risk_level, risk);
        }
    }

    #[test]
    fn test_supplier_uuid_fields_roundtrip() {
        let s = sample_supplier();
        let json = serde_json::to_string(&s).unwrap();
        let de: Supplier = serde_json::from_str(&json).unwrap();
        assert_eq!(de.id, s.id);
        assert_eq!(de.tenant_id, s.tenant_id);
        assert_eq!(de.created_by, s.created_by);
    }

    #[test]
    fn test_supplier_datetime_fields_roundtrip() {
        let s = sample_supplier();
        let json = serde_json::to_string(&s).unwrap();
        let de: Supplier = serde_json::from_str(&json).unwrap();
        assert_eq!(de.created_at, s.created_at);
        assert_eq!(de.updated_at, s.updated_at);
    }
}
