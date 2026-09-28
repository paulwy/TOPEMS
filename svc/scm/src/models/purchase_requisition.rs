use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct PurchaseRequisition {
    pub id: Uuid,
    pub requisition_no: Option<String>,
    pub title: String,
    pub applicant_id: Option<Uuid>,
    pub applicant_name: Option<String>,
    pub department_id: Option<Uuid>,
    pub department_name: Option<String>,
    pub request_date: DateTime<Utc>,
    pub required_date: Option<DateTime<Utc>>,
    pub total_amount: Option<f64>,
    pub currency: Option<String>,
    pub status: String,
    pub priority: Option<String>,
    pub supplier_id: Option<Uuid>,
    pub supplier_name: Option<String>,
    pub approval_status: Option<String>,
    pub approver: Option<String>,
    pub approved_at: Option<DateTime<Utc>>,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct PurchaseRequisitionItem {
    pub id: Uuid,
    pub requisition_id: Uuid,
    pub line_number: i32,
    pub product_code: Option<String>,
    pub product_name: String,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub quantity: f64,
    pub unit_price: Option<f64>,
    pub amount: Option<f64>,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreatePurchaseRequisitionRequest {
    pub requisition_no: Option<String>,
    pub title: String,
    pub applicant_id: Option<String>,
    pub department_id: Option<String>,
    pub request_date: String,
    pub required_date: Option<String>,
    pub priority: Option<String>,
    pub supplier_id: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdatePurchaseRequisitionRequest {
    pub title: Option<String>,
    pub required_date: Option<String>,
    pub priority: Option<String>,
    pub supplier_id: Option<String>,
    pub status: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct PurchaseRequisitionQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub applicant_id: Option<String>,
    pub department_id: Option<String>,
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
    fn purchase_requisition_serde_roundtrip_full() {
        let r = PurchaseRequisition {
            id: fixed_uuid(),
            requisition_no: Some("PR-2026-001".to_string()),
            title: "原材料采购申请".to_string(),
            applicant_id: Some(fixed_uuid()),
            applicant_name: Some("张三".to_string()),
            department_id: Some(fixed_uuid()),
            department_name: Some("生产部".to_string()),
            request_date: fixed_dt(),
            required_date: Some(fixed_dt()),
            total_amount: Some(99999.99),
            currency: Some("CNY".to_string()),
            status: "pending".to_string(),
            priority: Some("high".to_string()),
            supplier_id: Some(fixed_uuid()),
            supplier_name: Some("Acme".to_string()),
            approval_status: Some("approved".to_string()),
            approver: Some("李四".to_string()),
            approved_at: Some(fixed_dt()),
            remarks: Some("加急".to_string()),
            created_at: fixed_dt(),
            updated_at: fixed_dt(),
        };
        roundtrip(&r);
    }

    #[test]
    fn purchase_requisition_serde_roundtrip_minimal() {
        let r = PurchaseRequisition {
            id: fixed_uuid(),
            requisition_no: Some("PR-0001".to_string()),
            title: "Minimal".to_string(),
            applicant_id: None,
            applicant_name: None,
            department_id: None,
            department_name: None,
            request_date: fixed_dt(),
            required_date: None,
            total_amount: None,
            currency: None,
            status: "draft".to_string(),
            priority: None,
            supplier_id: None,
            supplier_name: None,
            approval_status: None,
            approver: None,
            approved_at: None,
            remarks: None,
            created_at: fixed_dt(),
            updated_at: fixed_dt(),
        };
        roundtrip(&r);
    }

    #[test]
    fn purchase_requisition_item_serde_roundtrip_full() {
        let item = PurchaseRequisitionItem {
            id: fixed_uuid(),
            requisition_id: fixed_uuid(),
            line_number: 1,
            product_code: Some("P-100".to_string()),
            product_name: "螺丝".to_string(),
            specification: Some("M6x20".to_string()),
            unit: Some("个".to_string()),
            quantity: 100.0,
            unit_price: Some(0.25),
            amount: Some(25.0),
            remarks: Some("备注".to_string()),
            created_at: fixed_dt(),
        };
        roundtrip(&item);
    }

    #[test]
    fn purchase_requisition_item_serde_roundtrip_minimal() {
        let item = PurchaseRequisitionItem {
            id: fixed_uuid(),
            requisition_id: fixed_uuid(),
            line_number: 1,
            product_code: None,
            product_name: "Bare".to_string(),
            specification: None,
            unit: None,
            quantity: 1.0,
            unit_price: None,
            amount: None,
            remarks: None,
            created_at: fixed_dt(),
        };
        roundtrip(&item);
    }

    #[test]
    fn create_purchase_requisition_request_serde_roundtrip() {
        let req = CreatePurchaseRequisitionRequest {
            requisition_no: Some("PR-001".to_string()),
            title: "申请标题".to_string(),
            applicant_id: Some("u-001".to_string()),
            department_id: Some("d-001".to_string()),
            request_date: "2026-08-15".to_string(),
            required_date: Some("2026-08-20".to_string()),
            priority: Some("high".to_string()),
            supplier_id: Some("s-001".to_string()),
            remarks: Some("备注".to_string()),
        };
        roundtrip(&req);
    }

    #[test]
    fn create_purchase_requisition_request_serde_minimal() {
        let req = CreatePurchaseRequisitionRequest {
            requisition_no: Some("PR-002".to_string()),
            title: "Min".to_string(),
            applicant_id: None,
            department_id: None,
            request_date: "2026-08-15".to_string(),
            required_date: None,
            priority: None,
            supplier_id: None,
            remarks: None,
        };
        roundtrip(&req);
    }

    #[test]
    fn update_purchase_requisition_request_serde_all_none() {
        let req = UpdatePurchaseRequisitionRequest {
            title: None,
            required_date: None,
            priority: None,
            supplier_id: None,
            status: None,
            remarks: None,
        };
        roundtrip(&req);
    }

    #[test]
    fn update_purchase_requisition_request_serde_partial() {
        let req = UpdatePurchaseRequisitionRequest {
            title: Some("Updated".to_string()),
            required_date: Some("2026-08-25".to_string()),
            priority: None,
            supplier_id: Some("s-002".to_string()),
            status: Some("approved".to_string()),
            remarks: None,
        };
        roundtrip(&req);
    }

    #[test]
    fn purchase_requisition_query_params_deserialize_full() {
        let raw = r#"{
            "page": 1,
            "page_size": 20,
            "status": "pending",
            "applicant_id": "u-001",
            "department_id": "d-001",
            "start_date": "2026-08-01",
            "end_date": "2026-08-31"
        }"#;
        let q: PurchaseRequisitionQueryParams = serde_json::from_str(raw).unwrap();
        assert_eq!(q.page, Some(1));
        assert_eq!(q.page_size, Some(20));
        assert_eq!(q.status, Some("pending".to_string()));
        assert_eq!(q.applicant_id, Some("u-001".to_string()));
        assert_eq!(q.department_id, Some("d-001".to_string()));
        assert_eq!(q.start_date, Some("2026-08-01".to_string()));
        assert_eq!(q.end_date, Some("2026-08-31".to_string()));
    }

    #[test]
    fn purchase_requisition_query_params_deserialize_empty() {
        let raw = "{}";
        let q: PurchaseRequisitionQueryParams = serde_json::from_str(raw).unwrap();
        assert!(q.page.is_none());
        assert!(q.status.is_none());
        assert!(q.end_date.is_none());
    }

    #[test]
    fn purchase_requisition_deserialize_from_json() {
        let raw = r#"{
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "requisition_no": "PR-JSON-001",
            "title": "From JSON",
            "applicant_id": null,
            "applicant_name": null,
            "department_id": null,
            "department_name": null,
            "request_date": "2026-08-15T08:00:00Z",
            "required_date": "2026-08-20T08:00:00Z",
            "total_amount": 1234.56,
            "currency": "CNY",
            "status": "approved",
            "priority": "high",
            "supplier_id": null,
            "supplier_name": null,
            "approval_status": "approved",
            "approver": "admin",
            "approved_at": "2026-08-16T08:00:00Z",
            "remarks": "ok",
            "created_at": "2026-08-15T08:00:00Z",
            "updated_at": "2026-08-16T08:00:00Z"
        }"#;
        let r: PurchaseRequisition = serde_json::from_str(raw).unwrap();
        assert_eq!(r.requisition_no, Some("PR-JSON-001".to_string()));
        assert_eq!(r.status, "approved");
        assert_eq!(r.priority, Some("high".to_string()));
        assert_eq!(r.total_amount, Some(1234.56));
    }
}
