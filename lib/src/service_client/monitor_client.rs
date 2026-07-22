use super::generic::ApiResponse;

crate::define_service_client!(
    MonitorServiceClient,
    "MONITOR_SERVICE_URL",
    "http://localhost:8062",
    {
        get_service_status() -> ApiResponse<serde_json::Value> {
            get => "/api/monitor/services/status"
        }
        list_alerts(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/monitor/alerts?page={}&pagesize={}"
        }
        get_alert(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/monitor/alerts/{}"
        }
        list_metrics() -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/monitor/metrics"
        }
        get_metric_data(metric_name: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/monitor/metrics/{}/data"
        }
        get_dashboard_stats() -> ApiResponse<serde_json::Value> {
            get => "/api/monitor/dashboard/stats"
        }
        list_logs(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/monitor/logs?page={}&pagesize={}"
        }
        acknowledge_alert(id: &str) -> ApiResponse<serde_json::Value> {
            put => "/api/monitor/alerts/{}/acknowledge"; body: data: &serde_json::Value
        }
    }
);
