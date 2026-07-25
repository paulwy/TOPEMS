use super::super::error::ServiceClientResult;
use super::super::trait_api::TypedServiceClient;
use crate::define_service_api;

define_service_api!(
    BillingApi,
    "topems-billing",
    8080,
    Some("BILLING_SERVICE_URL"),
    "/api/billing"
);

impl TypedServiceClient<BillingApi> {
    pub async fn list_plans(&self) -> ServiceClientResult<serde_json::Value> {
        self.get(&self.build_path("/plans")).await
    }

    pub async fn get_plan(&self, plan_id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/plans/{}", plan_id);
        self.get(&self.build_path(&path)).await
    }

    pub async fn create_plan(
        &self,
        data: serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/plans"), &data).await
    }

    pub async fn update_plan(
        &self,
        plan_id: &str,
        data: serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/plans/{}", plan_id);
        self.put(&self.build_path(&path), &data).await
    }

    pub async fn delete_plan(&self, plan_id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/plans/{}", plan_id);
        self.delete(&self.build_path(&path)).await
    }

    pub async fn list_subscriptions(&self) -> ServiceClientResult<serde_json::Value> {
        self.get(&self.build_path("/subscriptions")).await
    }

    pub async fn get_subscription(&self, subscription_id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/subscriptions/{}", subscription_id);
        self.get(&self.build_path(&path)).await
    }

    pub async fn create_subscription(
        &self,
        data: serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        self.post(&self.build_path("/subscriptions"), &data).await
    }

    pub async fn update_subscription(
        &self,
        subscription_id: &str,
        data: serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/subscriptions/{}", subscription_id);
        self.put(&self.build_path(&path), &data).await
    }

    pub async fn cancel_subscription(&self, subscription_id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/subscriptions/{}/cancel", subscription_id);
        self.post(&self.build_path(&path), &serde_json::json!({})).await
    }

    pub async fn list_invoices(&self) -> ServiceClientResult<serde_json::Value> {
        self.get(&self.build_path("/invoices")).await
    }

    pub async fn get_invoice(&self, invoice_id: &str) -> ServiceClientResult<serde_json::Value> {
        let path = format!("/invoices/{}", invoice_id);
        self.get(&self.build_path(&path)).await
    }
}
