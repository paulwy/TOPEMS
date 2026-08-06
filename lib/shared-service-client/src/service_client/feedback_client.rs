use super::generic::ApiResponse;

crate::define_service_client!(
    FeedbackServiceClient,
    "FEEDBACK_SERVICE_URL",
    "http://localhost:8087",
    {
        list_feedbacks(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/feedback/feedbacks?page={}&pagesize={}"
        }
        get_feedback(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/feedback/feedbacks/{}"
        }
        submit_feedback() -> ApiResponse<serde_json::Value> {
            post => "/api/feedback/feedbacks"; body: fb: &serde_json::Value
        }
        reply_feedback(id: &str) -> ApiResponse<serde_json::Value> {
            post => "/api/feedback/feedbacks/{}/replies"; body: reply: &serde_json::Value
        }
        mark_resolved(id: &str) -> ApiResponse<serde_json::Value> {
            put => "/api/feedback/feedbacks/{}/resolved"; body: body: &()
        }
        list_forms(page: i32, page_size: i32) -> ApiResponse<Vec<serde_json::Value>> {
            get => "/api/feedback/forms?page={}&pagesize={}"
        }
        get_form(id: &str) -> ApiResponse<serde_json::Value> {
            get => "/api/feedback/forms/{}"
        }
    }
);
