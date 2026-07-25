use super::generic::ApiResponse;

crate::define_service_client!(
    PortalServiceClient,
    "PORTAL_SERVICE_URL",
    "http://localhost:8063",
    {
        list_announcements(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/portal/announcements?page={}&pagesize={}"
        }
        get_announcement(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/portal/announcements/{}"
        }
        create_announcement() -> ApiResponse<serde_json::Value> {
            post => "/api/portal/announcements"; body: data: &serde_json::Value
        }
        update_announcement(id: &str) -> ApiResponse<serde_json::Value> {
            put => "/api/portal/announcements/{}"; body: data: &serde_json::Value
        }
        delete_announcement(id: &str) -> ApiResponse<serde_json::Value> {
            delete => "/api/portal/announcements/{}"
        }
        list_shortcuts() -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/portal/shortcuts"
        }
        get_portal_config() -> ApiResponse<serde_json::Value> {
            get => "/api/portal/config"
        }
        update_portal_config() -> ApiResponse<serde_json::Value> {
            put => "/api/portal/config"; body: data: &serde_json::Value
        }
    }
);
