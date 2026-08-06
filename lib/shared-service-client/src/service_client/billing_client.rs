use super::generic::ApiResponse;

crate::define_service_client!(
    BillingServiceClient,
    "BILLING_SERVICE_URL",
    "http://localhost:8085",
    {
        list_plans(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/billing/plans?page={}&pagesize={}"
        }
        get_plan(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/billing/plans/{}"
        }
        create_plan() -> ApiResponse<serde_json::Value> {
            post => "/api/billing/plans"; body: plan: &serde_json::Value
        }
        get_subscription(tenant_id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/billing/subscriptions/{}"
        }
        create_subscription() -> ApiResponse<serde_json::Value> {
            post => "/api/billing/subscriptions"; body: req: &serde_json::Value
        }
        cancel_subscription(tenant_id: &str) -> ApiResponse<serde_json::Value> {
            put => "/api/billing/subscriptions/{}"; body: body: &()
        }
        list_invoices(tenant_id: &str, page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/billing/invoices/{}?page={}&pagesize={}"
        }
        get_usage_summary(tenant_id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/billing/usage/{}"
        }
        record_usage(tenant_id: &str, metric_type: &str) -> ApiResponse<serde_json::Value> {
            post => "/api/billing/usage/{}/{}"; body: req: &serde_json::Value
        }
    }
);
