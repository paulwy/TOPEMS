use super::generic::ApiResponse;

crate::define_service_client!(
    ReportServiceClient,
    "REPORT_SERVICE_URL",
    "http://localhost:8061",
    {
        list_reports(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/report/reports?page={}&pagesize={}"
        }
        get_report(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/report/reports/{}"
        }
        create_report() -> ApiResponse<serde_json::Value> {
            post => "/api/report/reports"; body: data: &serde_json::Value
        }
        update_report(id: &str) -> ApiResponse<serde_json::Value> {
            put => "/api/report/reports/{}"; body: data: &serde_json::Value
        }
        delete_report(id: &str) -> ApiResponse<serde_json::Value> {
            delete => "/api/report/reports/{}"
        }
        generate_report(id: &str) -> ApiResponse<serde_json::Value> {
            post => "/api/report/reports/{}/generate"; body: data: &serde_json::Value
        }
        list_templates(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/report/templates?page={}&pagesize={}"
        }
        schedule_report(id: &str) -> ApiResponse<serde_json::Value> {
            post => "/api/report/reports/{}/schedule"; body: data: &serde_json::Value
        }
    }
);
