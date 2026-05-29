use anyhow::{Result, anyhow};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::env;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize)]
pub struct CreateUserRequest {
    pub username: String,
    pub email: String,
    pub password: String,
    pub full_name: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct IamApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub message: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct IamUser {
    pub id: Uuid,
    pub username: String,
    pub email: String,
    pub full_name: Option<String>,
    pub is_active: bool,
    pub is_superuser: Option<bool>,
}

#[derive(Debug, Clone, Serialize)]
struct LoginRequest {
    username: String,
    password: String,
}

#[derive(Debug, Clone, Deserialize)]
struct LoginData {
    access_token: String,
}

#[derive(Debug, Clone, Deserialize)]
struct LoginResponse {
    data: Option<LoginData>,
}

pub struct IamClient {
    client: Client,
    base_url: String,
    admin_username: String,
    admin_password: String,
}

impl IamClient {
    pub fn new() -> Self {
        let base_url = env::var("IAM_SERVICE_URL")
            .unwrap_or_else(|_| "http://localhost:8002".to_string());
        let admin_username = env::var("IAM_ADMIN_USERNAME")
            .unwrap_or_else(|_| "admin".to_string());
        let admin_password = env::var("IAM_ADMIN_PASSWORD")
            .unwrap_or_else(|_| "admin123".to_string());

        Self {
            client: Client::new(),
            base_url,
            admin_username,
            admin_password,
        }
    }

    async fn get_admin_token(&self) -> Result<String> {
        let url = format!("{}/api/v1/auth/login", self.base_url);
        let login_req = LoginRequest {
            username: self.admin_username.clone(),
            password: self.admin_password.clone(),
        };

        let response = self.client.post(&url).json(&login_req).send().await.map_err(|e| {
            anyhow!("Failed to login to IAM: {}", e)
        })?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("IAM login returned {}: {}", status, error_text));
        }

        let login_response: IamApiResponse<LoginData> = response.json().await.map_err(|e| {
            anyhow!("Failed to parse IAM login response: {}", e)
        })?;

        if !login_response.success {
            return Err(anyhow!(
                "IAM login failed: {}",
                login_response.message.unwrap_or_else(|| "Unknown error".to_string())
            ));
        }

        login_response.data
            .ok_or_else(|| anyhow!("IAM login returned no token"))
            .map(|d| d.access_token)
    }

    pub async fn create_user(&self, req: CreateUserRequest) -> Result<IamUser> {
        let token = self.get_admin_token().await?;
        let url = format!("{}/api/v1/users", self.base_url);

        let response = self.client.post(&url)
            .header("Authorization", format!("Bearer {}", token))
            .json(&req)
            .send().await.map_err(|e| {
                anyhow!("Failed to call IAM API: {}", e)
            })?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("IAM API returned {}: {}", status, error_text));
        }

        let api_response: IamApiResponse<IamUser> = response.json().await.map_err(|e| {
            anyhow!("Failed to parse IAM API response: {}", e)
        })?;

        if !api_response.success {
            return Err(anyhow!(
                "IAM API error: {}",
                api_response.message.unwrap_or_else(|| "Unknown error".to_string())
            ));
        }

        api_response.data.ok_or_else(|| anyhow!("IAM API returned no user data"))
    }

    pub async fn get_user(&self, user_id: Uuid) -> Result<Option<IamUser>> {
        let token = self.get_admin_token().await?;
        let url = format!("{}/api/v1/users/{}", self.base_url, user_id);

        let response = self.client.get(&url)
            .header("Authorization", format!("Bearer {}", token))
            .send().await.map_err(|e| {
                anyhow!("Failed to call IAM API: {}", e)
            })?;

        if response.status() == 404 {
            return Ok(None);
        }

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("IAM API returned {}: {}", status, error_text));
        }

        let api_response: IamApiResponse<IamUser> = response.json().await.map_err(|e| {
            anyhow!("Failed to parse IAM API response: {}", e)
        })?;

        if !api_response.success {
            return Ok(None);
        }

        Ok(api_response.data)
    }

    pub async fn delete_user(&self, user_id: Uuid) -> Result<()> {
        let token = self.get_admin_token().await?;
        let url = format!("{}/api/v1/users/{}", self.base_url, user_id);

        let response = self.client.delete(&url)
            .header("Authorization", format!("Bearer {}", token))
            .send().await.map_err(|e| {
                anyhow!("Failed to call IAM API: {}", e)
            })?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("IAM API returned {}: {}", status, error_text));
        }

        Ok(())
    }
}

impl Default for IamClient {
    fn default() -> Self {
        Self::new()
    }
}
