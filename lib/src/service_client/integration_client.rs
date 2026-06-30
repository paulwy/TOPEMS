use super::generic::ApiResponse;

crate::define_service_client!(
    IntegrationServiceClient,
    "INTEGRATION_SERVICE_URL",
    "http://localhost:8072",
    {
        list_connectors(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/integration/connectors?page={}&pagesize={}"
        }
        get_connector(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/integration/connectors/{}"
        }
        create_connector() -> ApiResponse<serde_json::Value> {
            post => "/api/integration/connectors"; body: data: &serde_json::Value
        }
        update_connector(id: &str) -> ApiResponse<serde_json::Value> {
            put => "/api/integration/connectors/{}"; body: data: &serde_json::Value
        }
        delete_connector(id: &str) -> ApiResponse<serde_json::Value> {
            delete => "/api/integration/connectors/{}"
        }
        test_connection(id: &str) -> ApiResponse<serde_json::Value> {
            post => "/api/integration/connectors/{}/test"
        }
        list_webhooks(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/integration/webhooks?page={}&pagesize={}"
        }
        create_webhook() -> ApiResponse<serde_json::Value> {
            post => "/api/integration/webhooks"; body: data: &serde_json::Value
        }
        trigger_sync(id: &str) -> ApiResponse<serde_json::Value> {
            post => "/api/integration/connectors/{}/sync"
        }
    }
);
