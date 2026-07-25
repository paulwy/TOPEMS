use super::generic::ApiResponse;

crate::define_service_client!(
    MobileServiceClient,
    "MOBILE_SERVICE_URL",
    "http://localhost:8070",
    {
        list_notifications(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/mobile/notifications?page={}&pagesize={}"
        }
        get_notification(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/mobile/notifications/{}"
        }
        list_tasks(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/mobile/tasks?page={}&pagesize={}"
        }
        get_task(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/mobile/tasks/{}"
        }
        list_approvals(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/mobile/approvals?page={}&pagesize={}"
        }
        get_approval(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/mobile/approvals/{}"
        }
        approve_task(id: &str) -> ApiResponse<serde_json::Value> {
            post => "/api/mobile/tasks/{}/approve"; body: data: &serde_json::Value
        }
        reject_approval(id: &str) -> ApiResponse<serde_json::Value> {
            post => "/api/mobile/approvals/{}/reject"; body: data: &serde_json::Value
        }
        get_user_profile() -> ApiResponse<serde_json::Value> {
            get => "/api/mobile/user/profile"
        }
        update_device_token() -> ApiResponse<serde_json::Value> {
            put => "/api/mobile/user/device-token"; body: data: &serde_json::Value
        }
    }
);
