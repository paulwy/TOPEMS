use super::generic::ApiResponse;

crate::define_service_client!(
    ErpServiceClient,
    "ERP_SERVICE_URL",
    "http://localhost:8002",
    {
        list_customers(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/erp/customers?page={}&pagesize={}"
        }
        get_customer(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/erp/customers/{}"
        }
        list_suppliers(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/erp/suppliers?page={}&pagesize={}"
        }
        get_supplier(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/erp/suppliers/{}"
        }
        list_materials(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/erp/materials?page={}&pagesize={}"
        }
        get_inventory_summary() -> ApiResponse<serde_json::Value> {
            get => "/api/erp/inventory/summary"
        }
        list_purchase_orders(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/erp/purchase-orders?page={}&pagesize={}"
        }
        list_sales_orders(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/erp/sales-orders?page={}&pagesize={}"
        }
        list_vouchers(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/erp/vouchers?page={}&pagesize={}"
        }
        list_assets(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/erp/assets?page={}&pagesize={}"
        }
        get_finance_summary() -> ApiResponse<serde_json::Value> {
            get => "/api/erp/finance/summary"
        }
    }
);
