use super::generic::ApiResponse;

crate::define_service_client!(
    QmsServiceClient,
    "QMS_SERVICE_URL",
    "http://localhost:8006",
    {
        list_standards(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/qms/quality-standards?page={}&pagesize={}"
        }
        get_standard(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/qms/quality-standards/{}"
        }
        list_inspections(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/qms/quality-inspections?page={}&pagesize={}"
        }
        get_inspection(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/qms/quality-inspections/{}"
        }
        list_issues(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/qms/quality-issues?page={}&pagesize={}"
        }
        get_issue(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/qms/quality-issues/{}"
        }
        get_dashboard_stats() -> ApiResponse<serde_json::Value> {
            get => "/api/qms/dashboard/stats"
        }
        list_audits(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/qms/quality-audits?page={}&pagesize={}"
        }
        list_corrective_actions(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/qms/corrective-actions?page={}&pagesize={}"
        }
    }
);
