use super::generic::ApiResponse;

crate::define_service_client!(
    DocServiceClient,
    "DOC_SERVICE_URL",
    "http://localhost:8000",
    {
        list_documents(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/core/doc/documents?page={}&pagesize={}"
        }
        get_document(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/core/doc/documents/{}"
        }
        create_document() -> ApiResponse<serde_json::Value> {
            post => "/api/core/doc/documents"; body: data: &serde_json::Value
        }
        update_document(id: &str) -> ApiResponse<serde_json::Value> {
            put => "/api/core/doc/documents/{}"; body: data: &serde_json::Value
        }
        delete_document(id: &str) -> ApiResponse<serde_json::Value> {
            delete => "/api/core/doc/documents/{}"
        }
        list_folders(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/core/doc/folders?page={}&pagesize={}"
        }
        upload_file() -> ApiResponse<serde_json::Value> {
            post => "/api/core/doc/upload"; body: data: &serde_json::Value
        }
        search_documents(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/core/doc/search?page={}&pagesize={}"
        }
    }
);
