use super::generic::ApiResponse;

crate::define_service_client!(
    RsServiceClient,
    "RS_SERVICE_URL",
    "http://localhost:8053",
    {
        list_projects(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/rs/projects?page={}&pagesize={}"
        }
        get_project(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/rs/projects/{}"
        }
        create_project() -> ApiResponse<serde_json::Value> {
            post => "/api/rs/projects"; body: data: &serde_json::Value
        }
        update_project(id: &str) -> ApiResponse<serde_json::Value> {
            put => "/api/rs/projects/{}"; body: data: &serde_json::Value
        }
        delete_project(id: &str) -> ApiResponse<serde_json::Value> {
            delete => "/api/rs/projects/{}"
        }
        list_experiments(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/rs/experiments?page={}&pagesize={}"
        }
        list_samples(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/rs/samples?page={}&pagesize={}"
        }
        list_publications(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/rs/publications?page={}&pagesize={}"
        }
    }
);
