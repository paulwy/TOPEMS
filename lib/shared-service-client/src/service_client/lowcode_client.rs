use super::generic::ApiResponse;

crate::define_service_client!(
    LowcodeServiceClient,
    "LOWCODE_SERVICE_URL",
    "http://localhost:8088",
    {
        list_apps(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/lowcode/apps?page={}&pagesize={}"
        }
        get_app(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/lowcode/apps/{}"
        }
        create_app() -> ApiResponse<serde_json::Value> {
            post => "/api/lowcode/apps"; body: app: &serde_json::Value
        }
        update_app(id: &str) -> ApiResponse<serde_json::Value> {
            put => "/api/lowcode/apps/{}"; body: data: &serde_json::Value
        }
        publish_app(id: &str) -> ApiResponse<serde_json::Value> {
            post => "/api/lowcode/apps/{}/publish"; body: body: &()
        }
        delete_app(id: &str) -> ApiResponse<bool> {
            delete => "/api/lowcode/apps/{}"
        }
        list_pages(app_id: &str, page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/lowcode/apps/{}/pages?page={}&pagesize={}"
        }
        get_schema(app_id: &str, page: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/lowcode/apps/{}/pages/{}/schema"
        }
    }
);
