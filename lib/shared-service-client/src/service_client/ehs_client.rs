use super::generic::ApiResponse;

crate::define_service_client!(
    EhsServiceClient,
    "EHS_SERVICE_URL",
    "http://localhost:8052",
    {
        list_hazards(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/ehs/hazards?page={}&pagesize={}"
        }
        get_hazard(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/ehs/hazards/{}"
        }
        create_hazard() -> ApiResponse<serde_json::Value> {
            post => "/api/ehs/hazards"; body: data: &serde_json::Value
        }
        update_hazard(id: &str) -> ApiResponse<serde_json::Value> {
            put => "/api/ehs/hazards/{}"; body: data: &serde_json::Value
        }
        delete_hazard(id: &str) -> ApiResponse<serde_json::Value> {
            delete => "/api/ehs/hazards/{}"
        }
        list_incidents(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/ehs/incidents?page={}&pagesize={}"
        }
        list_checks(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/ehs/checks?page={}&pagesize={}"
        }
        list_training_plans(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/ehs/training-plans?page={}&pagesize={}"
        }
        list_emergency_plans(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/ehs/emergency-plans?page={}&pagesize={}"
        }
        get_dashboard_stats() -> ApiResponse<serde_json::Value> {
            get => "/api/ehs/dashboard/stats"
        }
    }
);
