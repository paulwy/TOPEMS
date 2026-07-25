use super::generic::ApiResponse;

crate::define_service_client!(
    LimsServiceClient,
    "LIMS_SERVICE_URL",
    "http://localhost:8051",
    {
        list_samples(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/lims/samples?page={}&pagesize={}"
        }
        get_sample(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/lims/samples/{}"
        }
        create_sample() -> ApiResponse<serde_json::Value> {
            post => "/api/lims/samples"; body: data: &serde_json::Value
        }
        update_sample(id: &str) -> ApiResponse<serde_json::Value> {
            put => "/api/lims/samples/{}"; body: data: &serde_json::Value
        }
        delete_sample(id: &str) -> ApiResponse<serde_json::Value> {
            delete => "/api/lims/samples/{}"
        }
        list_tests(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/lims/tests?page={}&pagesize={}"
        }
        list_instruments(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/lims/instruments?page={}&pagesize={}"
        }
        list_reagents(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/lims/reagents?page={}&pagesize={}"
        }
        upload_result(id: &str) -> ApiResponse<serde_json::Value> {
            post => "/api/lims/samples/{}/result"; body: data: &serde_json::Value
        }
    }
);
