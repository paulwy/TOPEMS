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
        // Purchase Contracts
        crate::modules::purchase_contract::list_contracts,
        crate::modules::purchase_contract::create_contract,
        crate::modules::purchase_contract::get_contract,
        crate::modules::purchase_contract::list_contracts,
        crate::modules::purchase_contract::create_contract,
        crate::modules::purchase_contract::get_contract,
        crate::modules::purchase_contract::submit_contract,
        crate::modules::purchase_contract::approve_contract,
        crate::modules::purchase_contract::reject_contract,
        crate::modules::purchase_contract::cancel_contract,
        crate::modules::purchase_contract::terminate_contract,
        crate::modules::purchase_contract::renew_contract,
        crate::modules::purchase_order::list_orders,
        crate::modules::purchase_order::create_order,
        crate::modules::purchase_order::get_order,
        crate::modules::purchase_order::update_order,
        crate::modules::purchase_order::delete_order,
        crate::modules::purchase_order::approve_order,
        crate::modules::purchase_order::reject_order,
        crate::modules::audit::list_audit_logs,
        crate::modules::audit::get_audit_log,
        crate::modules::data_sync::purchase_to_inbound,
        crate::modules::data_sync::create_inbound_from_purchase,
        crate::modules::data_sync::sync_supplier_from_srm,
        crate::modules::data_sync::sync_all_suppliers_from_srm,
        crate::modules::data_sync::get_sync_logs,
        crate::modules::data_sync::retry_failed_syncs,
        crate::modules::data_sync::get_sync_statistics,
        crate::modules::data_sync::batch_sync_purchase_to_wms,
        crate::modules::data_sync::check_consistency,
        crate::modules::supplier_delivery_appointment::list_appointments,
        crate::modules::supplier_delivery_appointment::get_appointment,
        crate::modules::supplier_delivery_appointment::approve_appointment,
        crate::modules::supplier_delivery_appointment::reject_appointment,
        crate::modules::supplier_delivery_appointment::confirm_arrival,
        crate::modules::supplier_delivery_appointment::complete_appointment,
        crate::modules::supplier_delivery_appointment::cancel_appointment,
        crate::modules::supplier_delivery_appointment::appointment_stats,
        crate::modules::purchase_requisition::list_requisitions,
        crate::modules::purchase_requisition::get_requisition,
        crate::modules::purchase_requisition::submit_requisition,
        crate::modules::purchase_requisition::approve_requisition,
        crate::modules::purchase_requisition::reject_requisition,
        crate::modules::purchase_requisition::cancel_requisition,
        crate::modules::purchase_requisition::convert_to_order,
        crate::modules::supplier_admission::list_admissions,
        crate::modules::supplier_admission::get_admission,
        crate::modules::supplier_admission::submit_admission,
        crate::modules::supplier_admission::approve_admission,
        crate::modules::supplier_admission::reject_admission,
        crate::modules::supplier_admission::audit_admission,
        crate::modules::supplier_admission::activate_supplier,
        crate::modules::analytics::get_purchase_trend,
        crate::modules::analytics::get_purchase_status,
        crate::modules::analytics::get_supplier_ranking,
        crate::modules::supplier::list_suppliers,
        crate::modules::supplier::create_supplier,
        crate::modules::supplier::get_supplier,
        crate::modules::supplier::update_supplier,
        crate::modules::supplier::delete_supplier,
        crate::modules::supplier_evaluation::list_evaluations,
        crate::modules::supplier_evaluation::get_evaluation,
        crate::modules::sync_records::list_sync_records,
        crate::modules::sync_records::get_sync_record,
        crate::modules::sync_records::retry_sync_record,
        crate::modules::sync_records::list_sync_details,
        crate::modules::sync_records::trigger_wms_sync,
        crate::modules::sync_records::trigger_srm_sync,
        crate::modules::supply_chain_dashboard::overview,
        crate::modules::supply_chain_dashboard::purchase_inbound_outbound_stats,
        crate::modules::supply_chain_dashboard::supplier_performance,
        crate::modules::supply_chain_dashboard::real_time_status,
        crate::modules::mrp::list_suggestions,
        crate::modules::mrp::get_suggestion,
        crate::modules::mrp::material_requirement_summary,
        crate::modules::incoming_inspection::list_notices,
        crate::modules::incoming_inspection::get_notice,
        crate::modules::incoming_inspection::list_inspections,
        crate::modules::incoming_inspection::get_inspection,
        crate::modules::incoming_inspection::inspection_pass,
        crate::modules::incoming_inspection::inspection_fail,
        crate::modules::incoming_inspection::list_inspection_records,
        crate::modules::purchase_item::list_items,
        crate::modules::purchase_item::get_item,
        crate::modules::settings::get_settings,
        crate::modules::inventory_turnover::calculate_turnover,
        crate::modules::inventory_turnover::turnover_days,
        crate::modules::inventory_turnover::abc_analysis,
        crate::modules::inventory_turnover::turnover_trend,
        crate::modules::price_comparison::list_inquiries,
        crate::modules::price_comparison::get_inquiry,
        crate::modules::price_comparison::publish_inquiry,
        crate::modules::price_comparison::list_quotes,
        crate::modules::price_comparison::get_quote,
        crate::modules::price_comparison::submit_quote,
        crate::modules::price_comparison::list_comparisons,
        crate::modules::price_comparison::get_comparison,
        crate::modules::price_comparison::approve_comparison,
            crate::modules::scm_plugin::get_plugin_info,
        crate::modules::scm_plugin::plugin_health_check,
),
    components(
        schemas(
            Supplier,
            CreateSupplierRequest,
            UpdateSupplierRequest,
            PurchaseOrder,
            SupplierEvaluation,
            SupplierDeliveryAppointment,
        ),
    ),
    tags(
        (name = "supplier", description = "供应商管理 API"),
        (name = "purchase_order", description = "采购订单 API"),
        (name = "purchase_contract", description = "采购合同 API"),
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
        tracing::info!("OpenAPI spec written to /tmp/topems-scm-openapi.json");
    }
}
