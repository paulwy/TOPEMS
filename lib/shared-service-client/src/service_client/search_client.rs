use super::generic::ApiResponse;

crate::define_service_client!(
    SearchServiceClient,
    "SEARCH_SERVICE_URL",
    "http://localhost:8082",
    {
        search(query: &str, page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/search?q={}&page={}&pagesize={}"
        }
        search_with_index(index: &str, query: &str, page: i32, page_size: i32) -> ApiResponse<serde_json::Value> {
            get => "/api/search/{}/search?q={}&page={}&pagesize={}"
        }
        create_index() -> ApiResponse<serde_json::Value> {
            post => "/api/search/indexes"; body: data: &serde_json::Value
        }
        list_indexes(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/search/indexes?page={}&pagesize={}"
        }
        delete_index(name: &str) -> ApiResponse<bool> {
            delete => "/api/search/indexes/{}"
        }
        index_document(index: &str) -> ApiResponse<serde_json::Value> {
            post => "/api/search/indexes/{}/documents"; body: doc: &serde_json::Value
        }
        bulk_documents(index: &str) -> ApiResponse<serde_json::Value> {
            post => "/api/search/indexes/{}/documents/bulk"; body: docs: &Vec<serde_json::Value>
        }
    }
);
