// MES 服务 OpenAPI 文档
//
// V72 fix: 导入实际模块类型（而非占位符），注册 paths 使 extract_openapi_spec
// 能生成包含全部 MES 路径的完整 OpenAPI spec。
use utoipa::OpenApi;

// Re-export handler modules' public types for schema registration
use crate::modules::equipment::{
    CreateEquipmentRequest, CreateInspectionRequest, CreateMaintenanceRecord,
    EquipmentResponse, ListEquipmentResponse, MaintenanceRecord, UpdateEquipmentRequest,
    UpdateMaintenanceStatus,
};
use crate::modules::equipment_oee::{
    CreateOeeRecordRequest, EquipmentEfficiencyAnalysis, ListOeeRecordsResponse, OeeRecordResponse,
    OeeStatisticsResponse, UpdateOeeRecordRequest,
};
use crate::modules::production_kanban::DashboardResponse;
use crate::modules::production_order::{
    CreateFromErpRequest, CreateProductionOrderRequest, ErpSalesOrderInfo,
    ListProductionOrdersResponse, ProductionOrderResponse, ProductionOrderSource,
    UpdateProductionOrderRequest,
};
use crate::modules::production_scheduling::{
    AdjustScheduleRequest, CreateProductionScheduleRequest, GanttDataResponse,
    ListProductionSchedulesResponse, ProductionScheduleResponse, UpdateProductionScheduleRequest,
};
use crate::modules::wip::{
    CreateWipRequest, CreateWipTransferRequest, ListWipResponse, UpdateWipRequest, WipResponse,
    WipStatisticsResponse, WipTransferResponse,
};
use crate::modules::work_order::{
    CreateWorkOrderRequest, UpdateWorkOrderRequest, WorkOrderResponse,
};
use crate::modules::work_report::{
    CreateWorkReportRequest, RejectWorkReportRequest, UpdateWorkReportRequest, WorkReportResponse,
};

#[derive(OpenApi)]
#[openapi(
    paths(
        // ── Work Order ──────────────────────────────────────────────
        crate::modules::work_order::list_work_orders,
        crate::modules::work_order::create_work_order,
        crate::modules::work_order::get_work_order,
        crate::modules::work_order::update_work_order,
        crate::modules::work_order::delete_work_order,
        crate::modules::work_order::start_work_order,
        crate::modules::work_order::complete_work_order,
        crate::modules::work_order::cancel_work_order,
        crate::modules::work_order::pause_work_order,
        crate::modules::work_order::resume_work_order,

        // ── Work Report ─────────────────────────────────────────────
        crate::modules::work_report::list_work_reports,
        crate::modules::work_report::create_work_report,
        crate::modules::work_report::get_work_report,
        crate::modules::work_report::update_work_report,
        crate::modules::work_report::delete_work_report,
        crate::modules::work_report::approve_work_report,
        crate::modules::work_report::reject_work_report,
        crate::modules::work_report::get_today_production_output,

        // ── Production Order ────────────────────────────────────────
        crate::modules::production_order::list_production_orders,
        crate::modules::production_order::create_production_order,
        crate::modules::production_order::get_production_order,
        crate::modules::production_order::update_production_order,
        crate::modules::production_order::delete_production_order,
        crate::modules::production_order::create_from_erp,
        crate::modules::production_order::release_production_order,
        crate::modules::production_order::start_production_order,
        crate::modules::production_order::complete_production_order,
        crate::modules::production_order::cancel_production_order,

        // ── Equipment ───────────────────────────────────────────────
        crate::modules::equipment::list_equipment,
        crate::modules::equipment::create_equipment,
        crate::modules::equipment::get_equipment,
        crate::modules::equipment::update_equipment,
        crate::modules::equipment::delete_equipment,
        crate::modules::equipment::maintenance_equipment,
        crate::modules::equipment::get_equipment_statistics,
        crate::modules::equipment::list_inspections,
        crate::modules::equipment::create_inspection,
        crate::modules::equipment::list_maintenances,
        crate::modules::equipment::create_maintenance,
        crate::modules::equipment::update_maintenance_status,

        // ── Equipment OEE ───────────────────────────────────────────
        crate::modules::equipment_oee::list_oee_records,
        crate::modules::equipment_oee::create_oee_record,
        crate::modules::equipment_oee::get_oee_record,
        crate::modules::equipment_oee::update_oee_record,
        crate::modules::equipment_oee::delete_oee_record,
        crate::modules::equipment_oee::get_oee_statistics,
        crate::modules::equipment_oee::get_equipment_efficiency_analysis,

        // ── Production Scheduling ───────────────────────────────────
        crate::modules::production_scheduling::list_production_schedules,
        crate::modules::production_scheduling::create_production_schedule,
        crate::modules::production_scheduling::get_production_schedule,
        crate::modules::production_scheduling::update_production_schedule,
        crate::modules::production_scheduling::delete_production_schedule,
        crate::modules::production_scheduling::adjust_schedule,
        crate::modules::production_scheduling::get_gantt_data,

        // ── WIP ─────────────────────────────────────────────────────
        crate::modules::wip::list_wips,
        crate::modules::wip::create_wip,
        crate::modules::wip::get_wip,
        crate::modules::wip::update_wip,
        crate::modules::wip::delete_wip,
        crate::modules::wip::transfer_wip,
        crate::modules::wip::list_wip_transfers,
        crate::modules::wip::get_wip_statistics,

        // ── Production Kanban ───────────────────────────────────────
        crate::modules::production_kanban::get_dashboard,
        crate::modules::production_kanban::get_order_progress,
        crate::modules::production_kanban::get_workstation_status,
        crate::modules::production_kanban::get_quality_trend,
        crate::modules::production_kanban::get_equipment_status,
    ),
    components(
        schemas(
            // Work Order
            CreateWorkOrderRequest,
            UpdateWorkOrderRequest,
            WorkOrderResponse,
            // Work Report
            CreateWorkReportRequest,
            UpdateWorkReportRequest,
            RejectWorkReportRequest,
            WorkReportResponse,
            // Production Order
            ProductionOrderSource,
            ErpSalesOrderInfo,
            CreateFromErpRequest,
            CreateProductionOrderRequest,
            UpdateProductionOrderRequest,
            ProductionOrderResponse,
            ListProductionOrdersResponse,
            // Equipment
            CreateEquipmentRequest,
            UpdateEquipmentRequest,
            EquipmentResponse,
            ListEquipmentResponse,
            CreateMaintenanceRecord,
            UpdateMaintenanceStatus,
            MaintenanceRecord,
            CreateInspectionRequest,
            // Equipment OEE
            CreateOeeRecordRequest,
            UpdateOeeRecordRequest,
            OeeRecordResponse,
            ListOeeRecordsResponse,
            OeeStatisticsResponse,
            EquipmentEfficiencyAnalysis,
            // Production Scheduling
            CreateProductionScheduleRequest,
            UpdateProductionScheduleRequest,
            AdjustScheduleRequest,
            ProductionScheduleResponse,
            ListProductionSchedulesResponse,
            GanttDataResponse,
            // WIP
            CreateWipRequest,
            UpdateWipRequest,
            CreateWipTransferRequest,
            WipResponse,
            ListWipResponse,
            WipTransferResponse,
            WipStatisticsResponse,
            // Production Kanban
            DashboardResponse,
        ),
    ),
    tags(
        (name = "WorkOrder", description = "工单管理 API"),
        (name = "WorkReport", description = "报工管理 API"),
        (name = "ProductionOrder", description = "生产订单 API"),
        (name = "Equipment", description = "设备管理 API"),
        (name = "EquipmentOEE", description = "设备 OEE API"),
        (name = "ProductionScheduling", description = "生产排程 API"),
        (name = "WIP", description = "在制品管理 API"),
        (name = "ProductionKanban", description = "生产看板 API"),
    ),
    info(
        title = "TOPEMS MES API",
        version = "1.0.0",
        description = "制造执行系统 API - 包含工单、报工、生产订单、设备 OEE、质量追溯等功能"
    ),
    servers(
        (url = "http://localhost:8030", description = "本地开发环境"),
    )
)]
pub struct MesApiDoc;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extract_openapi_spec() {
        let spec = MesApiDoc::openapi();
        let json = serde_json::to_string_pretty(&spec).expect("Failed to serialize OpenAPI spec");
        std::fs::write("/tmp/topems-mes-openapi.json", json).expect("Failed to write spec");
        eprintln!("OpenAPI spec written to /tmp/topems-mes-openapi.json");
    }
}
