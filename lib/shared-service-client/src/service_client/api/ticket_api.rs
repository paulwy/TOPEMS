use super::super::error::ServiceClientResult;
use super::super::trait_api::TypedServiceClient;
use crate::define_service_api;

define_service_api!(
    TicketApi,
    "topems-ticket",
    8081,
    Some("TICKET_SERVICE_URL"),
    "/api/ticket"
);

impl TypedServiceClient<TicketApi> {
    pub async fn list_tickets(
        &self,
        params: serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        let query_string = serde_urlencoded::to_string(params).unwrap_or_default();
        let path = if query_string.is_empty() {
            "/tickets".to_string()
        } else {
            format!("/tickets?{}", query_string)
        };
        self.get(&self.build_path(&path)).await
    }

    pub async fn get_ticket(&self, ticket_id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/tickets/{}", ticket_id);
        self.get(&self.build_path(&path)).await
    }

    pub async fn create_ticket(
        &self,
        data: serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/tickets"), &data).await
    }

    pub async fn update_ticket(
        &self,
        ticket_id: &str,
        data: serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/tickets/{}", ticket_id);
        self.put(&self.build_path(&path), &data).await
    }

    pub async fn delete_ticket(&self, ticket_id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/tickets/{}", ticket_id);
        self.delete(&self.build_path(&path)).await
    }

    pub async fn list_comments(&self, ticket_id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/tickets/{}/comments", ticket_id);
        self.get(&self.build_path(&path)).await
    }

    pub async fn add_comment(
        &self,
        ticket_id: &str,
        data: serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/tickets/{}/comments", ticket_id);
        self.post(&self.build_path(&path), &data).await
    }

    pub async fn get_stats(&self) -> ServiceClientResult<serde_json::Value> {
        self.get(&self.build_path("/tickets/stats")).await
    }

    pub async fn get_sla_stats(&self) -> ServiceClientResult<serde_json::Value> {
        self.get(&self.build_path("/tickets/sla-stats")).await
    }
}
