// SCM 服务 OpenAPI 文档
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::{OpenApi, ToSchema};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Supplier {
    pub id: Uuid,
    pub name: String,
    pub short_name: Option<String>,
    pub contact_name: Option<String>,
    pub contact_phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateSupplierRequest {
    pub name: String,
    pub short_name: Option<String>,
    pub contact_name: Option<String>,
    pub contact_phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub bank_account: Option<String>,
    pub tax_number: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateSupplierRequest {
    pub name: Option<String>,
    pub contact_name: Option<String>,
    pub contact_phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct PurchaseOrder {
    pub id: Uuid,
    pub order_no: String,
    pub supplier_id: Uuid,
    pub status: String,
    pub total_amount: Option<f64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SupplierEvaluation {
    pub id: Uuid,
    pub supplier_id: Uuid,
    pub score: f64,
    pub comment: Option<String>,
    pub evaluator_id: Uuid,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SupplierDeliveryAppointment {
    pub id: Uuid,
    pub appointment_no: String,
    pub purchase_order_id: Option<Uuid>,
    pub purchase_order_no: Option<String>,
    pub supplier_id: Uuid,
    pub supplier_name: Option<String>,
    pub delivery_date: String,
    pub delivery_time: Option<String>,
    pub delivery_method: String,
    pub vehicle_no: Option<String>,
    pub driver_name: Option<String>,
    pub driver_phone: Option<String>,
    pub cargo_description: Option<String>,
    pub total_quantity: Option<f64>,
    pub total_weight: Option<f64>,
    pub destination_warehouse: Option<String>,
    pub expected_arrival_time: Option<String>,
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

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: T,
    pub message: String,
}

#[derive(OpenApi)]
#[openapi(
    // V72.5: 12 条 paths 已注册（suppliers×5 + purchase_orders×7），对应 handlers 已补 #[utoipa::path] 宏
    paths(
        // Suppliers
        crate::modules::supplier::list_suppliers,
        crate::modules::supplier::create_supplier,
        crate::modules::supplier::get_supplier,
        crate::modules::supplier::update_supplier,
        crate::modules::supplier::delete_supplier,
        // Purchase Orders
        crate::modules::purchase_order::list_orders,
        crate::modules::purchase_order::create_order,
        crate::modules::purchase_order::get_order,
        crate::modules::purchase_order::update_order,
        crate::modules::purchase_order::delete_order,
        crate::modules::purchase_order::approve_order,
        crate::modules::purchase_order::reject_order,
    ),
    components(
        schemas(
            Supplier,
            CreateSupplierRequest,
            UpdateSupplierRequest,
            PurchaseOrder,
            SupplierEvaluation,
            SupplierDeliveryAppointment,
            PaginationParams,
        ),
    ),
    tags(
        (name = "supplier", description = "供应商管理 API"),
        (name = "purchase_order", description = "采购订单 API"),
        (name = "supplier_evaluation", description = "供应商评价 API"),
        (name = "supplier_delivery_appointment", description = "供应商送货预约 API"),
        (name = "audit", description = "审计日志 API"),
    ),
    info(
        title = "TOPEMS SCM API",
        version = "1.0.0",
        description = "供应链管理系统 API - 包含供应商管理、采购订单、供应商评价、送货预约等功能"
    ),
    servers(
        (url = "http://localhost:8063", description = "本地开发环境"),
    )
)]
pub struct ScmApiDoc;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extract_openapi_spec() {
        let spec = ScmApiDoc::openapi();
        let json = serde_json::to_string_pretty(&spec).expect("Failed to serialize OpenAPI spec");
        std::fs::write("/tmp/topems-scm-openapi.json", json).expect("Failed to write spec");
        eprintln!("OpenAPI spec written to /tmp/topems-scm-openapi.json");
    }
}
