use super::generic::ApiResponse;

crate::define_service_client!(
    CommunicationServiceClient,
    "COMMUNICATION_SERVICE_URL",
    "http://localhost:8084",
    {
        list_channels(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/communication/channels?page={}&pagesize={}"
        }
        send_message() -> ApiResponse<serde_json::Value> {
            post => "/api/communication/messages"; body: msg: &serde_json::Value
        }
        list_messages(channel_id: &str, page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/communication/channels/{}/messages?page={}&pagesize={}"
        }
        list_notifications(page: i32, page_size: i32) -> ApiResponse<serde_json::Value> {
            get => "/api/communication/notifications?page={}&pagesize={}"
        }
        get_unread_notifications() -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/communication/notifications/unread"
        }
        mark_notification_read(id: &str) -> ApiResponse<serde_json::Value> {
            put => "/api/communication/notifications/{}/read"; body: body: &()
        }
        mark_all_notifications_read() -> ApiResponse<i32> {
            put => "/api/communication/notifications/read-all"; body: body: &()
        }
        send_mail() -> ApiResponse<serde_json::Value> {
            post => "/api/communication/mail/send"; body: mail: &serde_json::Value
        }
    }
);
