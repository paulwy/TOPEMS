use super::generic::ApiResponse;

crate::define_service_client!(
    CrmServiceClient,
    "CRM_SERVICE_URL",
    "http://localhost:8029",
    {
        list_customers(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/crm/customers?page={}&pagesize={}"
        }
        get_customer(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/crm/customers/{}"
        }
        create_customer() -> ApiResponse<serde_json::Value> {
            post => "/api/crm/customers"; body: data: &serde_json::Value
        }
        update_customer(id: &str) -> ApiResponse<serde_json::Value> {
            put => "/api/crm/customers/{}"; body: data: &serde_json::Value
        }
        delete_customer(id: &str) -> ApiResponse<serde_json::Value> {
            delete => "/api/crm/customers/{}"
        }
        list_leads(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/crm/leads?page={}&pagesize={}"
        }
        list_opportunities(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/crm/opportunities?page={}&pagesize={}"
        }
        get_dashboard_stats() -> ApiResponse<serde_json::Value> {
            get => "/api/crm/dashboard/stats"
        }
    }
);
