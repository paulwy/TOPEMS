use super::generic::ApiResponse;

crate::define_service_client!(
    DocServiceClient,
    "DOC_SERVICE_URL",
    "http://localhost:8012",
    {
        list_documents(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/doc/documents?page={}&pagesize={}"
        }
        get_document(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/doc/documents/{}"
        }
        create_document() -> ApiResponse<serde_json::Value> {
            post => "/api/doc/documents"; body: data: &serde_json::Value
        }
        update_document(id: &str) -> ApiResponse<serde_json::Value> {
            put => "/api/doc/documents/{}"; body: data: &serde_json::Value
        }
        delete_document(id: &str) -> ApiResponse<serde_json::Value> {
            delete => "/api/doc/documents/{}"
        }
        list_folders(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/doc/folders?page={}&pagesize={}"
        }
        upload_file() -> ApiResponse<serde_json::Value> {
            post => "/api/doc/upload"; body: data: &serde_json::Value
        }
        search_documents(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/doc/search?page={}&pagesize={}"
        }
    }
);
