// MES 服务 OpenAPI 文档
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::{OpenApi, ToSchema};
use uuid::Uuid;

// ===== Work Order (工单) =====
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ListWorkOrdersQuery {
    pub page: Option<i32>,
    pub pagesize: Option<i32>,
    pub search: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateWorkOrderRequest {
    pub work_order_no: String,
    pub order_id: Option<String>,
    pub order_no: Option<String>,
    pub product_code: String,
    pub product_name: String,
    pub work_station_id: Option<String>,
    pub process_id: Option<String>,
    pub team_id: Option<String>,
    pub planned_quantity: serde_json::Value,
    pub priority: Option<String>,
    pub plan_start_date: Option<DateTime<Utc>>,
    pub plan_end_date: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateWorkOrderRequest {
    pub work_order_no: Option<String>,
    pub order_id: Option<String>,
    pub order_no: Option<String>,
    pub product_code: Option<String>,
    pub product_name: Option<String>,
    pub work_station_id: Option<String>,
    pub process_id: Option<String>,
    pub team_id: Option<String>,
    pub planned_quantity: Option<serde_json::Value>,
    pub priority: Option<String>,
    pub plan_start_date: Option<DateTime<Utc>>,
    pub plan_end_date: Option<DateTime<Utc>>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct WorkOrderResponse {
    pub id: String,
    pub work_order_no: String,
    pub order_id: Option<String>,
    pub order_no: Option<String>,
    pub product_code: String,
    pub product_name: String,
    pub work_station_id: Option<String>,
    pub work_station_name: Option<String>,
    pub process_id: Option<String>,
    pub process_name: Option<String>,
    pub team_id: Option<String>,
    pub team_name: Option<String>,
    pub planned_quantity: serde_json::Value,
    pub completed_quantity: Option<serde_json::Value>,
    pub priority: String,
    pub status: String,
    pub plan_start_date: Option<DateTime<Utc>>,
    pub plan_end_date: Option<DateTime<Utc>>,
    pub actual_start_date: Option<DateTime<Utc>>,
    pub actual_end_date: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// ===== Work Report (报工) =====
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ListWorkReportsQuery {
    pub page: Option<i32>,
    pub pagesize: Option<i32>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub work_order_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateWorkReportRequest {
    pub work_order_id: Option<String>,
    pub work_order_no: Option<String>,
    pub work_station_id: Option<String>,
    pub operator_id: Option<String>,
    pub operator_name: Option<String>,
    pub report_date: Option<DateTime<Utc>>,
    pub good_quantity: Option<serde_json::Value>,
    pub bad_quantity: Option<serde_json::Value>,
    pub scrap_quantity: Option<serde_json::Value>,
    pub work_hours: Option<f64>,
    pub remark: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateWorkReportRequest {
    pub work_order_id: Option<String>,
    pub work_order_no: Option<String>,
    pub work_station_id: Option<String>,
    pub operator_id: Option<String>,
    pub operator_name: Option<String>,
    pub report_date: Option<DateTime<Utc>>,
    pub good_quantity: Option<serde_json::Value>,
    pub bad_quantity: Option<serde_json::Value>,
    pub scrap_quantity: Option<serde_json::Value>,
    pub work_hours: Option<f64>,
    pub remark: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct WorkReportResponse {
    pub id: String,
    pub report_no: String,
    pub work_order_id: Option<String>,
    pub work_order_no: Option<String>,
    pub work_station_id: Option<String>,
    pub work_station_name: Option<String>,
    pub operator_id: Option<String>,
    pub operator_name: Option<String>,
    pub report_date: DateTime<Utc>,
    pub good_quantity: serde_json::Value,
    pub bad_quantity: Option<serde_json::Value>,
    pub scrap_quantity: Option<serde_json::Value>,
    pub work_hours: Option<f64>,
    pub status: String,
    pub remark: Option<String>,
    pub reviewer_id: Option<String>,
    pub reviewed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// ===== Production Order (生产订单) =====
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ListProductionOrdersQuery {
    pub page: Option<i32>,
    pub pagesize: Option<i32>,
    pub search: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ErpSalesOrderInfo {
    pub order_no: String,
    pub customer: Option<String>,
    pub items: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateFromErpRequest {
    pub erp_order: ErpSalesOrderInfo,
    pub planned_start_date: Option<DateTime<Utc>>,
    pub planned_end_date: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateProductionOrderRequest {
    pub product_id: Option<Uuid>,
    pub product_name: String,
    pub product_code: String,
    pub order_no: Option<String>,
    pub quantity: serde_json::Value,
    pub unit: Option<String>,
    pub planned_start_date: Option<DateTime<Utc>>,
    pub planned_end_date: Option<DateTime<Utc>>,
    pub priority: Option<String>,
    pub remark: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateProductionOrderRequest {
    pub product_name: Option<String>,
    pub product_code: Option<String>,
    pub order_no: Option<String>,
    pub quantity: Option<serde_json::Value>,
    pub unit: Option<String>,
    pub planned_start_date: Option<DateTime<Utc>>,
    pub planned_end_date: Option<DateTime<Utc>>,
    pub priority: Option<String>,
    pub status: Option<String>,
    pub remark: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ProductionOrderResponse {
    pub id: Uuid,
    pub order_no: String,
    pub product_id: Option<Uuid>,
    pub product_name: String,
    pub product_code: String,
    pub quantity: serde_json::Value,
    pub completed_quantity: Option<serde_json::Value>,
    pub unit: Option<String>,
    pub status: String,
    pub priority: String,
    pub planned_start_date: Option<DateTime<Utc>>,
    pub planned_end_date: Option<DateTime<Utc>>,
    pub actual_start_date: Option<DateTime<Utc>>,
    pub actual_end_date: Option<DateTime<Utc>>,
    pub remark: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(OpenApi)]
#[openapi(
    // TODO(V72 A4-4 follow-up): 逐个 handler 添加 #[utoipa::path(...)] 宏后再在下面注册，
    // 目前仅注册 components(schemas) 保证 extract_openapi_spec 能生成完整 schema。
    components(
        schemas(
            // Work Order
            ListWorkOrdersQuery,
            CreateWorkOrderRequest,
            UpdateWorkOrderRequest,
            WorkOrderResponse,
            // Work Report
            ListWorkReportsQuery,
            CreateWorkReportRequest,
            UpdateWorkReportRequest,
            WorkReportResponse,
            // Production Order
            ListProductionOrdersQuery,
            ErpSalesOrderInfo,
            CreateProductionOrderRequest,
            CreateFromErpRequest,
            UpdateProductionOrderRequest,
            ProductionOrderResponse,
        ),
    ),
    tags(
        (name = "work_order", description = "工单管理 API"),
        (name = "work_report", description = "报工管理 API"),
        (name = "production_order", description = "生产订单 API"),
        (name = "equipment", description = "设备管理 API"),
        (name = "quality", description = "质量管理 API"),
    ),
    info(
        title = "TOPEMS MES API",
        version = "1.0.0",
        description = "制造执行系统 API - 包含工单、报工、生产订单、设备 OEE、质量追溯等功能"
    ),
    servers(
        (url = "http://localhost:8058", description = "本地开发环境"),
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
