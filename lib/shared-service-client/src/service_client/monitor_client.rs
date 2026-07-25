use super::generic::ApiResponse;

crate::define_service_client!(
    MonitorServiceClient,
    "MONITOR_SERVICE_URL",
    "http://localhost:8000",
    {
        get_service_status() -> ApiResponse<serde_json::Value> {
            get => "/api/core/monitor/services/status"
        }
        list_alerts(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/core/monitor/alerts?page={}&pagesize={}"
        }
        get_alert(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/core/monitor/alerts/{}"
        }
        list_metrics() -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/core/monitor/metrics"
        }
        get_metric_data(metric_name: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/core/monitor/metrics/{}/data"
        }
        get_dashboard_stats() -> ApiResponse<serde_json::Value> {
            get => "/api/core/monitor/dashboard/stats"
        }
        list_logs(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/core/monitor/logs?page={}&pagesize={}"
        }
        acknowledge_alert(id: &str) -> ApiResponse<serde_json::Value> {
            put => "/api/core/monitor/alerts/{}/acknowledge"; body: data: &serde_json::Value
        }
    }
);
