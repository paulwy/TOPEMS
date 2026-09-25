use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct SupplierAdmission {
    pub id: Uuid,
    pub admission_no: String,
    pub supplier_name: String,
    pub short_name: Option<String>,
    pub contact_person: Option<String>,
    pub contact_phone: Option<String>,
    pub contact_email: Option<String>,
    pub address: Option<String>,
    pub business_license: Option<String>,
    pub tax_registration: Option<String>,
    pub organization_code: Option<String>,
    pub legal_representative: Option<String>,
    pub registered_capital: Option<String>,
    pub established_date: Option<chrono::NaiveDate>,
    pub business_scope: Option<String>,
    pub supplier_category: Option<String>,
    pub risk_level: Option<String>,
    pub status: String,
    pub approval_status: Option<String>,
    pub approver: Option<String>,
    pub approved_at: Option<DateTime<Utc>>,
    pub applicant: Option<String>,
    pub application_date: Option<NaiveDate>,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct SupplierAdmissionAuditItem {
    pub id: Uuid,
    pub admission_id: Uuid,
    pub audit_item: String,
    pub audit_result: Option<String>,
    pub auditor: Option<String>,
    pub audit_date: Option<DateTime<Utc>>,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateSupplierAdmissionRequest {
    pub admission_no: String,
    pub supplier_name: String,
    pub short_name: Option<String>,
    pub contact_person: Option<String>,
    pub contact_phone: Option<String>,
    pub contact_email: Option<String>,
    pub address: Option<String>,
    pub business_license: Option<String>,
    pub tax_registration: Option<String>,
    pub organization_code: Option<String>,
    pub legal_representative: Option<String>,
    pub registered_capital: Option<String>,
    pub established_date: Option<String>,
    pub business_scope: Option<String>,
    pub supplier_category: Option<String>,
    pub applicant: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateSupplierAdmissionRequest {
    pub supplier_name: Option<String>,
    pub short_name: Option<String>,
    pub contact_person: Option<String>,
    pub contact_phone: Option<String>,
    pub contact_email: Option<String>,
    pub address: Option<String>,
    pub business_license: Option<String>,
    pub tax_registration: Option<String>,
    pub organization_code: Option<String>,
    pub legal_representative: Option<String>,
    pub registered_capital: Option<String>,
    pub established_date: Option<String>,
    pub business_scope: Option<String>,
    pub supplier_category: Option<String>,
    pub risk_level: Option<String>,
    pub status: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SupplierAdmissionQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub approval_status: Option<String>,
    pub supplier_category: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AuditRequest {
    pub audit_items: Vec<AuditItem>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AuditItem {
    pub audit_item: String,
    pub audit_result: String,
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
    fn supplier_admission_serde_roundtrip_full() {
        let a = SupplierAdmission {
            id: fixed_uuid(),
            admission_no: "ADM-001".to_string(),
            supplier_name: "Acme 供应商".to_string(),
            short_name: Some("ACME".to_string()),
            contact_person: Some("张三".to_string()),
            contact_phone: Some("13800000000".to_string()),
            contact_email: Some("acme@example.com".to_string()),
            address: Some("上海市浦东新区".to_string()),
            business_license: Some("BL-001".to_string()),
            tax_registration: Some("TR-001".to_string()),
            organization_code: Some("OC-001".to_string()),
            legal_representative: Some("李四".to_string()),
            registered_capital: Some("1000万".to_string()),
            established_date: Some("2000-01-01".parse().unwrap()),
            business_scope: Some("制造".to_string()),
            supplier_category: Some("raw_material".to_string()),
            risk_level: Some("low".to_string()),
            status: "approved".to_string(),
            approval_status: Some("approved".to_string()),
            approver: Some("admin".to_string()),
            approved_at: Some(fixed_dt()),
            applicant: Some("u-001".to_string()),
            application_date: NaiveDate::from_ymd_opt(2026, 8, 1),
            remarks: Some("备注".to_string()),
            created_at: fixed_dt(),
            updated_at: fixed_dt(),
            deleted_at: None,
        };
        roundtrip(&a);
    }

    #[test]
    fn supplier_admission_serde_roundtrip_minimal() {
        let a = SupplierAdmission {
            id: fixed_uuid(),
            admission_no: "ADM-002".to_string(),
            supplier_name: "Min".to_string(),
            short_name: None,
            contact_person: None,
            contact_phone: None,
            contact_email: None,
            address: None,
            business_license: None,
            tax_registration: None,
            organization_code: None,
            legal_representative: None,
            registered_capital: None,
            established_date: None,
            business_scope: None,
            supplier_category: None,
            risk_level: None,
            status: "pending".to_string(),
            approval_status: None,
            approver: None,
            approved_at: None,
            applicant: None,
            application_date: None,
            remarks: None,
            created_at: fixed_dt(),
            updated_at: fixed_dt(),
            deleted_at: None,
        };
        roundtrip(&a);
    }

    #[test]
    fn supplier_admission_serde_roundtrip_with_deleted_at() {
        let a = SupplierAdmission {
            id: fixed_uuid(),
            admission_no: "ADM-003".to_string(),
            supplier_name: "Deleted".to_string(),
            short_name: None,
            contact_person: None,
            contact_phone: None,
            contact_email: None,
            address: None,
            business_license: None,
            tax_registration: None,
            organization_code: None,
            legal_representative: None,
            registered_capital: None,
            established_date: None,
            business_scope: None,
            supplier_category: None,
            risk_level: None,
            status: "rejected".to_string(),
            approval_status: Some("rejected".to_string()),
            approver: Some("admin".to_string()),
            approved_at: None,
            applicant: Some("u-002".to_string()),
            application_date: NaiveDate::from_ymd_opt(2026, 8, 2),
            remarks: None,
            created_at: fixed_dt(),
            updated_at: fixed_dt(),
            deleted_at: Some(fixed_dt()),
        };
        roundtrip(&a);
    }

    #[test]
    fn supplier_admission_audit_item_serde_roundtrip_full() {
        let item = SupplierAdmissionAuditItem {
            id: fixed_uuid(),
            admission_id: fixed_uuid(),
            audit_item: "营业执照".to_string(),
            audit_result: Some("pass".to_string()),
            auditor: Some("admin".to_string()),
            audit_date: Some(fixed_dt()),
            remarks: Some("合格".to_string()),
            created_at: fixed_dt(),
        };
        roundtrip(&item);
    }

    #[test]
    fn supplier_admission_audit_item_serde_roundtrip_minimal() {
        let item = SupplierAdmissionAuditItem {
            id: fixed_uuid(),
            admission_id: fixed_uuid(),
            audit_item: "税务登记".to_string(),
            audit_result: None,
            auditor: None,
            audit_date: None,
            remarks: None,
            created_at: fixed_dt(),
        };
        roundtrip(&item);
    }

    #[test]
    fn create_supplier_admission_request_serde_roundtrip() {
        let req = CreateSupplierAdmissionRequest {
            admission_no: "ADM-NEW-001".to_string(),
            supplier_name: "NewCo".to_string(),
            short_name: Some("NC".to_string()),
            contact_person: Some("王五".to_string()),
            contact_phone: Some("13900000000".to_string()),
            contact_email: Some("nc@example.com".to_string()),
            address: Some("北京市".to_string()),
            business_license: Some("BL-002".to_string()),
            tax_registration: Some("TR-002".to_string()),
            organization_code: Some("OC-002".to_string()),
            legal_representative: Some("赵六".to_string()),
            registered_capital: Some("500万".to_string()),
            established_date: Some("2010-05-05".parse().unwrap()),
            business_scope: Some("零售".to_string()),
            supplier_category: Some("finished_goods".to_string()),
            applicant: Some("u-003".to_string()),
            remarks: Some("备注".to_string()),
        };
        roundtrip(&req);
    }

    #[test]
    fn create_supplier_admission_request_serde_minimal() {
        let req = CreateSupplierAdmissionRequest {
            admission_no: "ADM-NEW-002".to_string(),
            supplier_name: "Bare".to_string(),
            short_name: None,
            contact_person: None,
            contact_phone: None,
            contact_email: None,
            address: None,
            business_license: None,
            tax_registration: None,
            organization_code: None,
            legal_representative: None,
            registered_capital: None,
            established_date: None,
            business_scope: None,
            supplier_category: None,
            applicant: None,
            remarks: None,
        };
        roundtrip(&req);
    }

    #[test]
    fn update_supplier_admission_request_serde_all_none() {
        let req = UpdateSupplierAdmissionRequest {
            supplier_name: None,
            short_name: None,
            contact_person: None,
            contact_phone: None,
            contact_email: None,
            address: None,
            business_license: None,
            tax_registration: None,
            organization_code: None,
            legal_representative: None,
            registered_capital: None,
            established_date: None,
            business_scope: None,
            supplier_category: None,
            risk_level: None,
            status: None,
            remarks: None,
        };
        roundtrip(&req);
    }

    #[test]
    fn update_supplier_admission_request_serde_partial() {
        let req = UpdateSupplierAdmissionRequest {
            supplier_name: Some("Updated".to_string()),
            short_name: None,
            contact_person: None,
            contact_phone: Some("13900000001".to_string()),
            contact_email: None,
            address: None,
            business_license: None,
            tax_registration: None,
            organization_code: None,
            legal_representative: None,
            registered_capital: None,
            established_date: None,
            business_scope: None,
            supplier_category: Some("raw_material".to_string()),
            risk_level: Some("medium".to_string()),
            status: Some("approved".to_string()),
            remarks: None,
        };
        roundtrip(&req);
    }

    #[test]
    fn supplier_admission_query_params_deserialize_full() {
        let raw = r#"{
            "page": 1,
            "page_size": 20,
            "status": "approved",
            "approval_status": "approved",
            "supplier_category": "raw_material",
            "start_date": "2026-08-01",
            "end_date": "2026-08-31"
        }"#;
        let q: SupplierAdmissionQueryParams = serde_json::from_str(raw).unwrap();
        assert_eq!(q.page, Some(1));
        assert_eq!(q.page_size, Some(20));
        assert_eq!(q.status, Some("approved".to_string()));
        assert_eq!(q.approval_status, Some("approved".to_string()));
        assert_eq!(q.supplier_category, Some("raw_material".to_string()));
        assert_eq!(q.start_date, Some("2026-08-01".to_string()));
        assert_eq!(q.end_date, Some("2026-08-31".to_string()));
    }

    #[test]
    fn supplier_admission_query_params_deserialize_empty() {
        let raw = "{}";
        let q: SupplierAdmissionQueryParams = serde_json::from_str(raw).unwrap();
        assert!(q.page.is_none());
        assert!(q.status.is_none());
        assert!(q.end_date.is_none());
    }

    #[test]
    fn audit_request_deserialize_full() {
        let raw = r#"{
            "audit_items": [
                {
                    "audit_item": "营业执照",
                    "audit_result": "pass",
                    "remarks": "合格"
                },
                {
                    "audit_item": "税务登记",
                    "audit_result": "fail",
                    "remarks": null
                }
            ]
        }"#;
        let req: AuditRequest = serde_json::from_str(raw).unwrap();
        assert_eq!(req.audit_items.len(), 2);
        assert_eq!(req.audit_items[0].audit_item, "营业执照");
        assert_eq!(req.audit_items[0].audit_result, "pass");
        assert_eq!(req.audit_items[0].remarks, Some("合格".to_string()));
        assert_eq!(req.audit_items[1].audit_item, "税务登记");
        assert_eq!(req.audit_items[1].audit_result, "fail");
        assert!(req.audit_items[1].remarks.is_none());
    }

    #[test]
    fn audit_request_deserialize_empty_items() {
        let raw = r#"{"audit_items": []}"#;
        let req: AuditRequest = serde_json::from_str(raw).unwrap();
        assert!(req.audit_items.is_empty());
    }

    #[test]
    fn audit_item_deserialize() {
        let raw = r#"{
            "audit_item": "组织机构代码",
            "audit_result": "pass",
            "remarks": null
        }"#;
        let item: AuditItem = serde_json::from_str(raw).unwrap();
        assert_eq!(item.audit_item, "组织机构代码");
        assert_eq!(item.audit_result, "pass");
        assert!(item.remarks.is_none());
    }

    #[test]
    fn supplier_admission_deserialize_from_json() {
        let raw = r#"{
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "admission_no": "ADM-JSON-001",
            "supplier_name": "JSON Supplier",
            "short_name": null,
            "contact_person": null,
            "contact_phone": null,
            "contact_email": null,
            "address": null,
            "business_license": null,
            "tax_registration": null,
            "organization_code": null,
            "legal_representative": null,
            "registered_capital": null,
            "established_date": null,
            "business_scope": null,
            "supplier_category": null,
            "risk_level": null,
            "status": "pending",
            "approval_status": null,
            "approver": null,
            "approved_at": null,
            "applicant": "u-001",
            "application_date": "2026-08-01",
            "remarks": null,
            "created_at": "2026-08-15T08:00:00Z",
            "updated_at": "2026-08-15T08:00:00Z",
            "deleted_at": null
        }"#;
        let a: SupplierAdmission = serde_json::from_str(raw).unwrap();
        assert_eq!(a.admission_no, "ADM-JSON-001");
        assert_eq!(a.status, "pending");
        assert_eq!(a.applicant, Some("u-001".to_string()));
        assert!(a.deleted_at.is_none());
    }
}
