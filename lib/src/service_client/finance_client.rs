use super::generic::ApiResponse;

crate::define_service_client!(
    FinanceServiceClient,
    "FINANCE_SERVICE_URL",
    "http://localhost:8011",
    {
        list_invoices(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/finance/invoices?page={}&pagesize={}"
        }
        get_invoice(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/finance/invoices/{}"
        }
        create_invoice() -> ApiResponse<serde_json::Value> {
            post => "/api/finance/invoices"; body: data: &serde_json::Value
        }
        update_invoice(id: &str) -> ApiResponse<serde_json::Value> {
            put => "/api/finance/invoices/{}"; body: data: &serde_json::Value
        }
        list_vouchers(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/finance/vouchers?page={}&pagesize={}"
        }
        get_dashboard_stats() -> ApiResponse<serde_json::Value> {
            get => "/api/finance/dashboard/stats"
        }
    }
);
