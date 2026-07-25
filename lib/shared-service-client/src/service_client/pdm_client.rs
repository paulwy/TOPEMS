use super::generic::ApiResponse;

crate::define_service_client!(
    PdmServiceClient,
    "PDM_SERVICE_URL",
    "http://localhost:8031",
    {
        list_products(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/pdm/products?page={}&pagesize={}"
        }
        get_product(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/pdm/products/{}"
        }
        create_product() -> ApiResponse<serde_json::Value> {
            post => "/api/pdm/products"; body: data: &serde_json::Value
        }
        update_product(id: &str) -> ApiResponse<serde_json::Value> {
            put => "/api/pdm/products/{}"; body: data: &serde_json::Value
        }
        delete_product(id: &str) -> ApiResponse<serde_json::Value> {
            delete => "/api/pdm/products/{}"
        }
        list_boms(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/pdm/boms?page={}&pagesize={}"
        }
        list_drawings(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/pdm/drawings?page={}&pagesize={}"
        }
        list_versions(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/pdm/versions?page={}&pagesize={}"
        }
    }
);
