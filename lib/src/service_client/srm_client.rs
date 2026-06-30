use super::generic::ApiResponse;

crate::define_service_client!(
    SrmServiceClient,
    "SRM_SERVICE_URL",
    "http://localhost:8042",
    {
        list_suppliers(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/srm/suppliers?page={}&pagesize={}"
        }
        get_supplier(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/srm/suppliers/{}"
        }
        create_supplier() -> ApiResponse<serde_json::Value> {
            post => "/api/srm/suppliers"; body: data: &serde_json::Value
        }
        update_supplier(id: &str) -> ApiResponse<serde_json::Value> {
            put => "/api/srm/suppliers/{}"; body: data: &serde_json::Value
        }
        delete_supplier(id: &str) -> ApiResponse<serde_json::Value> {
            delete => "/api/srm/suppliers/{}"
        }
        list_purchase_orders(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/srm/purchase-orders?page={}&pagesize={}"
        }
        list_quotations(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/srm/quotations?page={}&pagesize={}"
        }
        evaluate_supplier(id: &str) -> ApiResponse<serde_json::Value> {
            post => "/api/srm/suppliers/{}/evaluate"; body: data: &serde_json::Value
        }
    }
);
