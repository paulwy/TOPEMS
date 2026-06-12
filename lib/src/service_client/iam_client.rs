use super::base_client::BaseServiceClient;
use super::error::ServiceClientResult;
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

    pub async fn get_health(&self) -> ServiceClientResult<bool> {
        match self.base_client.get_without_response("/health").await {
            Ok(_) => Ok(true),
            Err(_) => Ok(false),
        }
    }

    pub async fn get_user(&self, id: Uuid) -> ServiceClientResult<User> {
        self.base_client.get(&format!("/api/v1/users/{}", id)).await
    }

    pub async fn get_role(&self, id: Uuid) -> ServiceClientResult<Role> {
        self.base_client.get(&format!("/api/v1/roles/{}", id)).await
    }

    pub async fn list_users(&self) -> ServiceClientResult<Vec<User>> {
        self.base_client.get("/api/v1/users").await
    }

    pub async fn list_roles(&self) -> ServiceClientResult<Vec<Role>> {
        self.base_client.get("/api/v1/roles").await
    }
}
