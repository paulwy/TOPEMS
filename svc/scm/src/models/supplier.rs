use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Supplier {
    pub id: Uuid,
    pub name: String,
    pub short_name: Option<String>,
    pub contact_name: Option<String>,
    pub contact_phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub bank_account: Option<String>,
    pub tax_number: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateSupplierRequest {
    pub name: String,
    pub name_en: Option<String>,
    pub short_name: Option<String>,
    pub contact_name: Option<String>,
    pub contact_phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub bank_account: Option<String>,
    pub tax_number: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateSupplierRequest {
    pub name: Option<String>,
    pub name_en: Option<String>,
    pub short_name: Option<String>,
    pub contact_name: Option<String>,
    pub contact_phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub bank_account: Option<String>,
    pub tax_number: Option<String>,
    pub status: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fixed_uuid() -> Uuid {
        Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap()
    }

    fn fixed_datetime() -> DateTime<Utc> {
        DateTime::parse_from_rfc3339("2026-08-15T08:00:00Z")
            .unwrap()
            .with_timezone(&Utc)
    }

    #[test]
    fn test_supplier_serde_roundtrip_full() {
        let supplier = Supplier {
            id: fixed_uuid(),
            name: "Acme 供应商".to_string(),
            short_name: Some("ACME".to_string()),
            contact_name: Some("张三".to_string()),
            contact_phone: Some("13800000000".to_string()),
            email: Some("acme@example.com".to_string()),
            address: Some("上海市浦东新区".to_string()),
            bank_account: Some("6222020200112345678".to_string()),
            tax_number: Some("91110000600037341R".to_string()),
            status: "active".to_string(),
            created_at: fixed_datetime(),
            updated_at: fixed_datetime(),
        };
        let json = serde_json::to_string(&supplier).unwrap();
        let back: Supplier = serde_json::from_str(&json).unwrap();
        assert_eq!(supplier.id, back.id);
        assert_eq!(supplier.name, back.name);
        assert_eq!(supplier.short_name, back.short_name);
        assert_eq!(supplier.contact_name, back.contact_name);
        assert_eq!(supplier.contact_phone, back.contact_phone);
        assert_eq!(supplier.email, back.email);
        assert_eq!(supplier.address, back.address);
        assert_eq!(supplier.bank_account, back.bank_account);
        assert_eq!(supplier.tax_number, back.tax_number);
        assert_eq!(supplier.status, back.status);
        assert_eq!(supplier.created_at, back.created_at);
        assert_eq!(supplier.updated_at, back.updated_at);
    }

    #[test]
    fn test_supplier_serde_roundtrip_minimal() {
        let supplier = Supplier {
            id: fixed_uuid(),
            name: "Min Supplier".to_string(),
            short_name: None,
            contact_name: None,
            contact_phone: None,
            email: None,
            address: None,
            bank_account: None,
            tax_number: None,
            status: "inactive".to_string(),
            created_at: fixed_datetime(),
            updated_at: fixed_datetime(),
        };
        let json = serde_json::to_string(&supplier).unwrap();
        let back: Supplier = serde_json::from_str(&json).unwrap();
        assert_eq!(supplier.id, back.id);
        assert_eq!(back.short_name, None);
        assert_eq!(back.tax_number, None);
        assert_eq!(back.status, "inactive");
    }

    #[test]
    fn test_supplier_status_field_preserved() {
        let supplier = Supplier {
            id: fixed_uuid(),
            name: "S".to_string(),
            short_name: None,
            contact_name: None,
            contact_phone: None,
            email: None,
            address: None,
            bank_account: None,
            tax_number: None,
            status: "pending".to_string(),
            created_at: fixed_datetime(),
            updated_at: fixed_datetime(),
        };
        let json = serde_json::to_string(&supplier).unwrap();
        let back: Supplier = serde_json::from_str(&json).unwrap();
        assert_eq!(back.status, "pending");
    }

    #[test]
    fn test_create_supplier_request_serde_roundtrip() {
        let req = CreateSupplierRequest {
            name: "NewCo".to_string(),
            name_en: None,
            short_name: Some("NC".to_string()),
            contact_name: Some("李四".to_string()),
            contact_phone: Some("13900000000".to_string()),
            email: Some("newco@example.com".to_string()),
            address: Some("北京市海淀区".to_string()),
            bank_account: Some("6222020200112345699".to_string()),
            tax_number: Some("91310000710929XXX9".to_string()),
        };
        let json = serde_json::to_string(&req).unwrap();
        let back: CreateSupplierRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(req.name, back.name);
        assert_eq!(back.short_name, Some("NC".to_string()));
        assert_eq!(back.tax_number, Some("91310000710929XXX9".to_string()));
    }

    #[test]
    fn test_create_supplier_request_serde_minimal() {
        let req = CreateSupplierRequest {
            name: "Bare".to_string(),
            name_en: None,
            short_name: None,
            contact_name: None,
            contact_phone: None,
            email: None,
            address: None,
            bank_account: None,
            tax_number: None,
        };
        let json = serde_json::to_string(&req).unwrap();
        let back: CreateSupplierRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(back.name, "Bare");
        assert!(back.short_name.is_none());
        assert!(back.email.is_none());
    }

    #[test]
    fn test_update_supplier_request_serde_all_none() {
        let req = UpdateSupplierRequest {
            name: None,
            name_en: None,
            short_name: None,
            contact_name: None,
            contact_phone: None,
            email: None,
            address: None,
            bank_account: None,
            tax_number: None,
            status: None,
        };
        let json = serde_json::to_string(&req).unwrap();
        let back: UpdateSupplierRequest = serde_json::from_str(&json).unwrap();
        assert!(back.name.is_none());
        assert!(back.status.is_none());
    }

    #[test]
    fn test_update_supplier_request_serde_partial() {
        let req = UpdateSupplierRequest {
            name: Some("Updated".to_string()),
            name_en: None,
            short_name: None,
            contact_name: None,
            contact_phone: None,
            email: Some("up@example.com".to_string()),
            address: None,
            bank_account: None,
            tax_number: None,
            status: Some("active".to_string()),
        };
        let json = serde_json::to_string(&req).unwrap();
        let back: UpdateSupplierRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(back.name, Some("Updated".to_string()));
        assert!(back.short_name.is_none());
        assert_eq!(back.email, Some("up@example.com".to_string()));
        assert_eq!(back.status, Some("active".to_string()));
    }

    #[test]
    fn test_supplier_deserialize_from_json_string() {
        let raw = r#"{
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "name": "From JSON",
            "short_name": null,
            "contact_name": null,
            "contact_phone": null,
            "email": "json@example.com",
            "address": null,
            "bank_account": null,
            "tax_number": null,
            "status": "active",
            "created_at": "2026-08-15T08:00:00Z",
            "updated_at": "2026-08-15T08:00:00Z"
        }"#;
        let s: Supplier = serde_json::from_str(raw).unwrap();
        assert_eq!(s.name, "From JSON");
        assert_eq!(s.email, Some("json@example.com".to_string()));
        assert_eq!(s.status, "active");
        assert!(s.short_name.is_none());
    }
}
