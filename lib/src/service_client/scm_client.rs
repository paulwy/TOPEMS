use super::generic::ApiResponse;

crate::define_service_client!(
    ScmServiceClient,
    "SCM_SERVICE_URL",
    "http://localhost:8009",
    {
        list_suppliers(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/scm/suppliers?page={}&pagesize={}"
        }
        get_supplier(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/scm/suppliers/{}"
        }
        list_purchase_orders(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/scm/purchase-orders?page={}&pagesize={}"
        }
        get_purchase_order(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/scm/purchase-orders/{}"
        }
        list_purchase_items(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/scm/purchase-items?page={}&pagesize={}"
        }
        list_mrp_plans(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/scm/mrp-plans?page={}&pagesize={}"
        }
        get_dashboard_stats() -> ApiResponse<serde_json::Value> {
            get => "/api/scm/dashboard/stats"
        }
        list_supplier_evaluations(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/scm/supplier-evaluations?page={}&pagesize={}"
        }
        list_incoming_inspection(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/scm/incoming-inspection?page={}&pagesize={}"
        }
        list_price_comparison(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/scm/price-comparison?page={}&pagesize={}"
        }
    }
);
