use super::generic::ApiResponse;

crate::define_service_client!(
    MesServiceClient,
    "MES_SERVICE_URL",
    "http://localhost:8030",
    {
        list_production_orders(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/mes/production-orders?page={}&pagesize={}"
        }
        get_production_order(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/mes/production-orders/{}"
        }
        list_work_stations(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/mes/work-stations?page={}&pagesize={}"
        }
        get_work_station(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/mes/work-stations/{}"
        }
        list_equipment(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/mes/equipment?page={}&pagesize={}"
        }
        get_equipment(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/mes/equipment/{}"
        }
        list_materials(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/mes/materials?page={}&pagesize={}"
        }
        get_wip_summary() -> ApiResponse<serde_json::Value> {
            get => "/api/mes/wip/summary"
        }
        get_quality_traceability(batch_no: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/mes/quality-traceability/{}"
        }
        get_equipment_oee(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/mes/equipment/{}/oee"
        }
    }
);
