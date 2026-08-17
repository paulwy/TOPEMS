use super::base_client::BaseServiceClient;
use super::error::ServiceClientResult;
use serde::{Deserialize, Serialize};
use topems_shared_core::response::ApiResponse;
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

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_dt() -> chrono::DateTime<chrono::Utc> {
        "2024-01-01T00:00:00Z".parse().unwrap()
    }

    // ========== User serde tests ==========

    #[test]
    fn user_serde_roundtrip_full() {
        let original = User {
            id: Uuid::nil(),
            username: "alice".to_string(),
            email: "alice@example.com".to_string(),
            is_active: true,
            is_superuser: false,
            created_at: sample_dt(),
            updated_at: sample_dt(),
        };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: User = serde_json::from_str(&json).unwrap();
        let val1 = serde_json::to_value(&original).unwrap();
        let val2 = serde_json::to_value(&deserialized).unwrap();
        assert_eq!(val1, val2);
    }

    #[test]
    fn user_serde_roundtrip_superuser() {
        let original = User {
            id: Uuid::max(),
            username: "admin".to_string(),
            email: "admin@example.com".to_string(),
            is_active: true,
            is_superuser: true,
            created_at: sample_dt(),
            updated_at: sample_dt(),
        };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: User = serde_json::from_str(&json).unwrap();
        let val1 = serde_json::to_value(&original).unwrap();
        let val2 = serde_json::to_value(&deserialized).unwrap();
        assert_eq!(val1, val2);
    }

    #[test]
    fn user_deserialize_from_json() {
        let json = r#"{
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "username": "bob",
            "email": "bob@test.com",
            "is_active": false,
            "is_superuser": false,
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-02T00:00:00Z"
        }"#;
        let user: User = serde_json::from_str(json).unwrap();
        assert_eq!(user.username, "bob");
        assert_eq!(user.email, "bob@test.com");
        assert!(!user.is_active);
        assert!(!user.is_superuser);
    }

    #[test]
    fn user_serialize_produces_correct_json() {
        let user = User {
            id: Uuid::nil(),
            username: "test".to_string(),
            email: "test@test.com".to_string(),
            is_active: true,
            is_superuser: false,
            created_at: sample_dt(),
            updated_at: sample_dt(),
        };
        let val = serde_json::to_value(&user).unwrap();
        assert_eq!(val["username"], "test");
        assert_eq!(val["is_active"], true);
        assert_eq!(val["is_superuser"], false);
        assert_eq!(val["email"], "test@test.com");
    }

    // ========== Role serde tests ==========

    #[test]
    fn role_serde_roundtrip_with_description() {
        let original = Role {
            id: Uuid::nil(),
            name: "admin".to_string(),
            description: Some("Administrator role".to_string()),
            created_at: sample_dt(),
            updated_at: sample_dt(),
        };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: Role = serde_json::from_str(&json).unwrap();
        let val1 = serde_json::to_value(&original).unwrap();
        let val2 = serde_json::to_value(&deserialized).unwrap();
        assert_eq!(val1, val2);
    }

    #[test]
    fn role_serde_roundtrip_without_description() {
        let original = Role {
            id: Uuid::nil(),
            name: "user".to_string(),
            description: None,
            created_at: sample_dt(),
            updated_at: sample_dt(),
        };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: Role = serde_json::from_str(&json).unwrap();
        let val1 = serde_json::to_value(&original).unwrap();
        let val2 = serde_json::to_value(&deserialized).unwrap();
        assert_eq!(val1, val2);
    }

    #[test]
    fn role_deserialize_from_json() {
        let json = r#"{
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "name": "manager",
            "description": "Manager role",
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z"
        }"#;
        let role: Role = serde_json::from_str(json).unwrap();
        assert_eq!(role.name, "manager");
        assert_eq!(role.description, Some("Manager role".to_string()));
    }

    #[test]
    fn role_deserialize_from_json_null_description() {
        let json = r#"{
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "name": "guest",
            "description": null,
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z"
        }"#;
        let role: Role = serde_json::from_str(json).unwrap();
        assert_eq!(role.name, "guest");
        assert!(role.description.is_none());
    }

    // ========== IamServiceClient construction tests ==========

    #[test]
    fn iam_client_new_succeeds() {
        let client = IamServiceClient::new("http://localhost:8000");
        assert!(client.is_ok());
    }

    #[test]
    fn iam_client_new_with_empty_url_fails() {
        let result = IamServiceClient::new("");
        assert!(result.is_err());
    }

    #[test]
    fn iam_client_from_env_succeeds() {
        let client = IamServiceClient::from_env();
        assert!(client.is_ok());
    }

    #[test]
    fn iam_client_set_auth_token_does_not_panic() {
        let mut client = IamServiceClient::new("http://localhost:8000").unwrap();
        client.set_auth_token("token-abc");
    }

    #[test]
    fn iam_client_with_auth_token_returns_self() {
        let client = IamServiceClient::new("http://localhost:8000").unwrap();
        let _client = client.with_auth_token("token-xyz");
    }

    #[test]
    fn iam_client_add_header_does_not_panic() {
        let mut client = IamServiceClient::new("http://localhost:8000").unwrap();
        client.add_header("X-Tenant-Id", "tenant-001");
    }

    #[tokio::test]
    async fn iam_client_get_health_unreachable_returns_false() {
        let client = IamServiceClient::new("http://127.0.0.1:1").unwrap();
        let result = client.get_health().await;
        assert!(result.is_ok());
        assert!(!result.unwrap());
    }
}
