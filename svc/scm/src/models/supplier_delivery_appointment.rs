use chrono::{DateTime, NaiveDate, NaiveTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// 供应商送货预约状态
///
/// 状态流转：
/// `pending` -> `approved` (审批通过) -> `arrived` (到货确认) -> `completed` (入库完成)
/// `pending` -> `rejected` (审批驳回)
/// 任意状态 -> `cancelled` (取消)
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct SupplierDeliveryAppointment {
    pub id: Uuid,
    pub appointment_no: String,
    pub purchase_order_id: Option<Uuid>,
    pub purchase_order_no: Option<String>,
    pub supplier_id: Uuid,
    pub supplier_name: Option<String>,
    pub delivery_date: NaiveDate,
    pub delivery_time: Option<NaiveTime>,
    pub delivery_method: String,
    pub vehicle_no: Option<String>,
    pub driver_name: Option<String>,
    pub driver_phone: Option<String>,
    pub cargo_description: Option<String>,
    pub total_quantity: Option<f64>,
    pub total_weight: Option<f64>,
    pub destination_warehouse: Option<String>,
    pub expected_arrival_time: Option<NaiveTime>,
    pub actual_arrival_time: Option<DateTime<Utc>>,
    pub status: String,
    pub applicant: Option<String>,
    pub approver: Option<String>,
    pub approved_at: Option<DateTime<Utc>>,
    pub rejection_reason: Option<String>,
    pub remarks: Option<String>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateSupplierDeliveryAppointmentRequest {
    pub purchase_order_id: Option<Uuid>,
    pub purchase_order_no: Option<String>,
    pub supplier_id: Uuid,
    pub supplier_name: Option<String>,
    pub delivery_date: NaiveDate,
    pub delivery_time: Option<NaiveTime>,
    pub delivery_method: String,
    pub vehicle_no: Option<String>,
    pub driver_name: Option<String>,
    pub driver_phone: Option<String>,
    pub cargo_description: Option<String>,
    pub total_quantity: Option<f64>,
    pub total_weight: Option<f64>,
    pub destination_warehouse: Option<String>,
    pub expected_arrival_time: Option<NaiveTime>,
    pub applicant: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateSupplierDeliveryAppointmentRequest {
    pub purchase_order_id: Option<Uuid>,
    pub purchase_order_no: Option<String>,
    pub delivery_date: Option<NaiveDate>,
    pub delivery_time: Option<NaiveTime>,
    pub delivery_method: Option<String>,
    pub vehicle_no: Option<String>,
    pub driver_name: Option<String>,
    pub driver_phone: Option<String>,
    pub cargo_description: Option<String>,
    pub total_quantity: Option<f64>,
    pub total_weight: Option<f64>,
    pub destination_warehouse: Option<String>,
    pub expected_arrival_time: Option<NaiveTime>,
    pub status: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ApprovalRequest {
    pub approver_name: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ArrivalConfirmRequest {
    pub actual_arrival_time: Option<DateTime<Utc>>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CompleteRequest {
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CancelRequest {
    pub reason: Option<String>,
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

    fn fixed_date() -> NaiveDate {
        NaiveDate::from_ymd_opt(2026, 8, 15).unwrap()
    }

    fn fixed_time() -> NaiveTime {
        NaiveTime::from_hms_opt(8, 30, 0).unwrap()
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
    fn supplier_delivery_appointment_serde_roundtrip_full() {
        let a = SupplierDeliveryAppointment {
            id: fixed_uuid(),
            appointment_no: "AP-001".to_string(),
            purchase_order_id: Some(fixed_uuid()),
            purchase_order_no: Some("PO-001".to_string()),
            supplier_id: fixed_uuid(),
            supplier_name: Some("Acme".to_string()),
            delivery_date: fixed_date(),
            delivery_time: Some(fixed_time()),
            delivery_method: "truck".to_string(),
            vehicle_no: Some("沪A12345".to_string()),
            driver_name: Some("王师傅".to_string()),
            driver_phone: Some("13800000000".to_string()),
            cargo_description: Some("钢材100吨".to_string()),
            total_quantity: Some(100.0),
            total_weight: Some(1000.0),
            destination_warehouse: Some("WH-01".to_string()),
            expected_arrival_time: Some(fixed_time()),
            actual_arrival_time: Some(fixed_dt()),
            status: "completed".to_string(),
            applicant: Some("张三".to_string()),
            approver: Some("李四".to_string()),
            approved_at: Some(fixed_dt()),
            rejection_reason: None,
            remarks: Some("备注".to_string()),
            created_by: Some(fixed_uuid()),
            created_at: fixed_dt(),
            updated_at: fixed_dt(),
        };
        roundtrip(&a);
    }

    #[test]
    fn supplier_delivery_appointment_serde_roundtrip_minimal() {
        let a = SupplierDeliveryAppointment {
            id: fixed_uuid(),
            appointment_no: "AP-002".to_string(),
            purchase_order_id: None,
            purchase_order_no: None,
            supplier_id: fixed_uuid(),
            supplier_name: None,
            delivery_date: fixed_date(),
            delivery_time: None,
            delivery_method: "self".to_string(),
            vehicle_no: None,
            driver_name: None,
            driver_phone: None,
            cargo_description: None,
            total_quantity: None,
            total_weight: None,
            destination_warehouse: None,
            expected_arrival_time: None,
            actual_arrival_time: None,
            status: "pending".to_string(),
            applicant: None,
            approver: None,
            approved_at: None,
            rejection_reason: None,
            remarks: None,
            created_by: None,
            created_at: fixed_dt(),
            updated_at: fixed_dt(),
        };
        roundtrip(&a);
    }

    #[test]
    fn supplier_delivery_appointment_serde_roundtrip_rejected() {
        let a = SupplierDeliveryAppointment {
            id: fixed_uuid(),
            appointment_no: "AP-003".to_string(),
            purchase_order_id: None,
            purchase_order_no: None,
            supplier_id: fixed_uuid(),
            supplier_name: Some("Rejected Co".to_string()),
            delivery_date: fixed_date(),
            delivery_time: None,
            delivery_method: "truck".to_string(),
            vehicle_no: None,
            driver_name: None,
            driver_phone: None,
            cargo_description: None,
            total_quantity: None,
            total_weight: None,
            destination_warehouse: None,
            expected_arrival_time: None,
            actual_arrival_time: None,
            status: "rejected".to_string(),
            applicant: Some("u-001".to_string()),
            approver: Some("admin".to_string()),
            approved_at: None,
            rejection_reason: Some("时间冲突".to_string()),
            remarks: None,
            created_by: None,
            created_at: fixed_dt(),
            updated_at: fixed_dt(),
        };
        roundtrip(&a);
    }

    #[test]
    fn create_supplier_delivery_appointment_request_serde_roundtrip() {
        let req = CreateSupplierDeliveryAppointmentRequest {
            purchase_order_id: Some(fixed_uuid()),
            purchase_order_no: Some("PO-001".to_string()),
            supplier_id: fixed_uuid(),
            supplier_name: Some("Acme".to_string()),
            delivery_date: fixed_date(),
            delivery_time: Some(fixed_time()),
            delivery_method: "truck".to_string(),
            vehicle_no: Some("沪A12345".to_string()),
            driver_name: Some("王师傅".to_string()),
            driver_phone: Some("13800000000".to_string()),
            cargo_description: Some("钢材100吨".to_string()),
            total_quantity: Some(100.0),
            total_weight: Some(1000.0),
            destination_warehouse: Some("WH-01".to_string()),
            expected_arrival_time: Some(fixed_time()),
            applicant: Some("张三".to_string()),
            remarks: Some("备注".to_string()),
        };
        roundtrip(&req);
    }

    #[test]
    fn create_supplier_delivery_appointment_request_serde_minimal() {
        let req = CreateSupplierDeliveryAppointmentRequest {
            purchase_order_id: None,
            purchase_order_no: None,
            supplier_id: fixed_uuid(),
            supplier_name: None,
            delivery_date: fixed_date(),
            delivery_time: None,
            delivery_method: "self".to_string(),
            vehicle_no: None,
            driver_name: None,
            driver_phone: None,
            cargo_description: None,
            total_quantity: None,
            total_weight: None,
            destination_warehouse: None,
            expected_arrival_time: None,
            applicant: None,
            remarks: None,
        };
        roundtrip(&req);
    }

    #[test]
    fn update_supplier_delivery_appointment_request_serde_all_none() {
        let req = UpdateSupplierDeliveryAppointmentRequest {
            purchase_order_id: None,
            purchase_order_no: None,
            delivery_date: None,
            delivery_time: None,
            delivery_method: None,
            vehicle_no: None,
            driver_name: None,
            driver_phone: None,
            cargo_description: None,
            total_quantity: None,
            total_weight: None,
            destination_warehouse: None,
            expected_arrival_time: None,
            status: None,
            remarks: None,
        };
        roundtrip(&req);
    }

    #[test]
    fn update_supplier_delivery_appointment_request_serde_partial() {
        let req = UpdateSupplierDeliveryAppointmentRequest {
            purchase_order_id: None,
            purchase_order_no: None,
            delivery_date: Some(fixed_date()),
            delivery_time: None,
            delivery_method: Some("truck".to_string()),
            vehicle_no: None,
            driver_name: None,
            driver_phone: None,
            cargo_description: None,
            total_quantity: Some(50.0),
            total_weight: None,
            destination_warehouse: None,
            expected_arrival_time: None,
            status: Some("approved".to_string()),
            remarks: None,
        };
        roundtrip(&req);
    }

    #[test]
    fn approval_request_serde_roundtrip() {
        let req = ApprovalRequest {
            approver_name: Some("admin".to_string()),
            remarks: Some("同意".to_string()),
        };
        roundtrip(&req);
    }

    #[test]
    fn approval_request_serde_minimal() {
        let req = ApprovalRequest {
            approver_name: None,
            remarks: None,
        };
        roundtrip(&req);
    }

    #[test]
    fn arrival_confirm_request_serde_roundtrip() {
        let req = ArrivalConfirmRequest {
            actual_arrival_time: Some(fixed_dt()),
            remarks: Some("已到货".to_string()),
        };
        roundtrip(&req);
    }

    #[test]
    fn arrival_confirm_request_serde_minimal() {
        let req = ArrivalConfirmRequest {
            actual_arrival_time: None,
            remarks: None,
        };
        roundtrip(&req);
    }

    #[test]
    fn complete_request_serde_roundtrip() {
        let req = CompleteRequest {
            remarks: Some("完成".to_string()),
        };
        roundtrip(&req);
    }

    #[test]
    fn complete_request_serde_minimal() {
        let req = CompleteRequest { remarks: None };
        roundtrip(&req);
    }

    #[test]
    fn cancel_request_serde_roundtrip() {
        let req = CancelRequest {
            reason: Some("时间冲突".to_string()),
        };
        roundtrip(&req);
    }

    #[test]
    fn cancel_request_serde_minimal() {
        let req = CancelRequest { reason: None };
        roundtrip(&req);
    }

    #[test]
    fn supplier_delivery_appointment_deserialize_from_json() {
        let raw = r#"{
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "appointment_no": "AP-JSON-001",
            "purchase_order_id": null,
            "purchase_order_no": null,
            "supplier_id": "550e8400-e29b-41d4-a716-446655440001",
            "supplier_name": "JSON Supplier",
            "delivery_date": "2026-08-15",
            "delivery_time": "08:30:00",
            "delivery_method": "truck",
            "vehicle_no": null,
            "driver_name": null,
            "driver_phone": null,
            "cargo_description": null,
            "total_quantity": null,
            "total_weight": null,
            "destination_warehouse": null,
            "expected_arrival_time": null,
            "actual_arrival_time": null,
            "status": "pending",
            "applicant": "u-001",
            "approver": null,
            "approved_at": null,
            "rejection_reason": null,
            "remarks": null,
            "created_by": null,
            "created_at": "2026-08-15T08:00:00Z",
            "updated_at": "2026-08-15T08:00:00Z"
        }"#;
        let a: SupplierDeliveryAppointment = serde_json::from_str(raw).unwrap();
        assert_eq!(a.appointment_no, "AP-JSON-001");
        assert_eq!(a.status, "pending");
        assert_eq!(a.supplier_name, Some("JSON Supplier".to_string()));
        assert_eq!(a.delivery_date, fixed_date());
        assert_eq!(a.delivery_time, Some(fixed_time()));
    }
}
