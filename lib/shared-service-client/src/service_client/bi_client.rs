use super::generic::ApiResponse;

crate::define_service_client!(
    BiServiceClient,
    "BI_SERVICE_URL",
    "http://localhost:8060",
    {
        list_dashboards(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/bi/dashboards?page={}&pagesize={}"
        }
        get_dashboard(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/bi/dashboards/{}"
        }
        create_dashboard() -> ApiResponse<serde_json::Value> {
            post => "/api/bi/dashboards"; body: data: &serde_json::Value
        }
        update_dashboard(id: &str) -> ApiResponse<serde_json::Value> {
            put => "/api/bi/dashboards/{}"; body: data: &serde_json::Value
        }
        delete_dashboard(id: &str) -> ApiResponse<serde_json::Value> {
            delete => "/api/bi/dashboards/{}"
        }
        list_data_sources(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/bi/data-sources?page={}&pagesize={}"
        }
        execute_query() -> ApiResponse<serde_json::Value> {
            post => "/api/bi/query/execute"; body: data: &serde_json::Value
        }
        export_report(id: &str) -> ApiResponse<serde_json::Value> {
            post => "/api/bi/dashboards/{}/export"; body: data: &serde_json::Value
        }
    }
);
