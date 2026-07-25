use super::generic::ApiResponse;

crate::define_service_client!(
    RdServiceClient,
    "RD_SERVICE_URL",
    "http://localhost:8053",
    {
        list_projects(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/rd/projects?page={}&pagesize={}"
        }
        get_project(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/rd/projects/{}"
        }
        create_project() -> ApiResponse<serde_json::Value> {
            post => "/api/rd/projects"; body: data: &serde_json::Value
        }
        update_project(id: &str) -> ApiResponse<serde_json::Value> {
            put => "/api/rd/projects/{}"; body: data: &serde_json::Value
        }
        delete_project(id: &str) -> ApiResponse<serde_json::Value> {
            delete => "/api/rd/projects/{}"
        }
        list_experiments(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/rd/experiments?page={}&pagesize={}"
        }
        list_samples(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/rd/samples?page={}&pagesize={}"
        }
        list_publications(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/rd/publications?page={}&pagesize={}"
        }
    }
);
