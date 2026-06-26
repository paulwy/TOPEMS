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
