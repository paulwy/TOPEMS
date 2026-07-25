use super::super::error::ServiceClientResult;
use super::super::trait_api::TypedServiceClient;
use crate::define_service_api;

define_service_api!(
    FeedbackApi,
    "topems-feedback",
    8082,
    Some("FEEDBACK_SERVICE_URL"),
    "/api/feedback"
);

impl TypedServiceClient<FeedbackApi> {
    pub async fn list_feedbacks(&self, params: serde_json::Value) -> ServiceClientResult<serde_json::Value> {
        let query_string = serde_urlencoded::to_string(params).unwrap_or_default();
        let path = if query_string.is_empty() {
            "/feedbacks".to_string()
        } else {
            format!("/feedbacks?{}", query_string)
        };
        self.get(&self.build_path(&path)).await
    }

    pub async fn get_feedback(&self, feedback_id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/feedbacks/{}", feedback_id);
        self.get(&self.build_path(&path)).await
    }

    pub async fn create_feedback(
        &self,
        data: serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/feedbacks"), &data).await
    }

    pub async fn response_feedback(
        &self,
        feedback_id: &str,
        data: serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/feedbacks/{}", feedback_id);
        self.put(&self.build_path(&path), &data).await
    }

    pub async fn delete_feedback(&self, feedback_id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/feedbacks/{}", feedback_id);
        self.delete(&self.build_path(&path)).await
    }
}
