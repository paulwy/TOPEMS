use super::generic::ApiResponse;

crate::define_service_client!(
    WmsServiceClient,
    "WMS_SERVICE_URL",
    "http://localhost:8041",
    {
        list_warehouses(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/wms/warehouses?page={}&pagesize={}"
        }
        get_warehouse(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/wms/warehouses/{}"
        }
        list_locations(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/wms/locations?page={}&pagesize={}"
        }
        get_inventory_summary() -> ApiResponse<serde_json::Value> {
            get => "/api/wms/inventory/summary"
        }
        list_inbound_orders(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/wms/inbound-orders?page={}&pagesize={}"
        }
        list_outbound_orders(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/wms/outbound-orders?page={}&pagesize={}"
        }
        list_transfers(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/wms/transfers?page={}&pagesize={}"
        }
        list_stocktake(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/wms/stocktake?page={}&pagesize={}"
        }
        update_inventory(material_id: &str) -> ApiResponse<serde_json::Value> {
            put => "/api/wms/inventory/{}"; body: data: &serde_json::Value
        }
        create_inventory_movement() -> ApiResponse<serde_json::Value> {
            post => "/api/wms/inventory-movements"; body: data: &serde_json::Value
        }
        list_inventory_movements_by_ref(ref_id: &str, ref_type: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/wms/inventory-movements?ref_id={}&ref_type={}"
        }
        list_inventory_items(page: i32, page_size: i32) -> ApiResponse<serde_json::Value> {
            get => "/api/wms/inventory/items?page={}&pagesize={}"
        }
        get_inventory_item(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/wms/inventory/items/{}"
        }
        list_stocktake_tasks(page: i32, page_size: i32) -> ApiResponse<serde_json::Value> {
            get => "/api/wms/stocktake/tasks?page={}&pagesize={}"
        }
        create_stocktake_record(task_id: &str) -> ApiResponse<serde_json::Value> {
            post => "/api/wms/stocktake/{}/records"; body: data: &serde_json::Value
        }
    }
);
