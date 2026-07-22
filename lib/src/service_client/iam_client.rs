use super::base_client::BaseServiceClient;
use super::error::ServiceClientResult;
use crate::response::ApiResponse;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: Uuid,
    pub username: String,
    pub email: String,
    pub is_active: bool,
    pub is_superuser: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Role {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Clone)]
pub struct IamServiceClient {
    base_client: BaseServiceClient,
}

impl IamServiceClient {
    pub fn new(base_url: impl Into<String>) -> ServiceClientResult<Self> {
        Ok(Self {
            base_client: BaseServiceClient::new(base_url)?,
        })
    }

    pub fn from_env() -> ServiceClientResult<Self> {
        let base_url =
            std::env::var("IAM_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8000".into());
        Self::new(base_url)
    }

    pub fn set_auth_token(&mut self, token: impl Into<String>) {
        self.base_client.set_auth_token(token);
    }

    pub fn with_auth_token(mut self, token: impl Into<String>) -> Self {
        self.base_client.set_auth_token(token);
        self
    }

    pub fn add_header(&mut self, key: impl Into<String>, value: impl Into<String>) {
        self.base_client.add_header(key, value);
    }

    pub async fn get_health(&self) -> ServiceClientResult<bool> {
        match self.base_client.get_without_response("/health").await {
            Ok(_) => Ok(true),
            Err(_) => Ok(false),
        }
    }

    pub async fn get_user(&self, id: Uuid) -> ServiceClientResult<User> {
        self.base_client
            .get(&format!("/api/core/iam/users/{}", id))
            .await
    }

    pub async fn get_role(&self, id: Uuid) -> ServiceClientResult<Role> {
        self.base_client
            .get(&format!("/api/core/iam/roles/{}", id))
            .await
    }

    pub async fn list_users(&self) -> ServiceClientResult<Vec<User>> {
        self.base_client.get("/api/core/iam/users").await
    }

    pub async fn list_roles(&self) -> ServiceClientResult<Vec<Role>> {
        self.base_client.get("/api/core/iam/roles").await
    }

    pub async fn get_user_preferences(&self) -> ServiceClientResult<serde_json::Value> {
        let resp: ApiResponse<serde_json::Value> = self
            .base_client
            .get("/api/core/iam/users/me/preferences")
            .await?;
        resp.data.ok_or_else(|| {
            super::error::ServiceClientError::ConfigError(
                "IAM preferences response missing data field".into(),
            )
        })
    }

    pub async fn update_user_preferences(
        &self,
        body: &serde_json::Value,
    ) -> ServiceClientResult<serde_json::Value> {
        let resp: ApiResponse<serde_json::Value> = self
            .base_client
            .put("/api/core/iam/users/me/preferences", body)
            .await?;
        resp.data.ok_or_else(|| {
            super::error::ServiceClientError::ConfigError(
                "IAM preferences update response missing data field".into(),
            )
        })
    }
}
