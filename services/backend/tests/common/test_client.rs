use reqwest::Client;
use serde::{de::DeserializeOwned, Serialize};

pub struct TestClient {
    client: Client,
    base_url: String,
    auth_token: Option<String>,
}

impl TestClient {
    pub fn new(base_url: &str) -> Self {
        TestClient {
            client: Client::new(),
            base_url: base_url.to_string(),
            auth_token: None,
        }
    }

    pub fn with_auth(base_url: &str, token: &str) -> Self {
        TestClient {
            client: Client::new(),
            base_url: base_url.to_string(),
            auth_token: Some(token.to_string()),
        }
    }

    pub fn set_auth_token(&mut self, token: &str) {
        self.auth_token = Some(token.to_string());
    }

    pub fn clear_auth_token(&mut self) {
        self.auth_token = None;
    }

    pub async fn get<T: DeserializeOwned>(&self, endpoint: &str) -> Result<T, reqwest::Error> {
        let url = format!("{}{}", self.base_url, endpoint);
        let mut request = self.client.get(&url);
        
        if let Some(ref token) = self.auth_token {
            request = request.header("Authorization", format!("Bearer {}", token));
        }
        
        request.send().await?.json().await
    }

    pub async fn post<T: DeserializeOwned, B: Serialize>(&self, endpoint: &str, body: &B) -> Result<T, reqwest::Error> {
        let url = format!("{}{}", self.base_url, endpoint);
        let mut request = self.client.post(&url).json(body);
        
        if let Some(ref token) = self.auth_token {
            request = request.header("Authorization", format!("Bearer {}", token));
        }
        
        request.send().await?.json().await
    }

    pub async fn put<T: DeserializeOwned, B: Serialize>(&self, endpoint: &str, body: &B) -> Result<T, reqwest::Error> {
        let url = format!("{}{}", self.base_url, endpoint);
        let mut request = self.client.put(&url).json(body);
        
        if let Some(ref token) = self.auth_token {
            request = request.header("Authorization", format!("Bearer {}", token));
        }
        
        request.send().await?.json().await
    }

    pub async fn delete<T: DeserializeOwned>(&self, endpoint: &str) -> Result<T, reqwest::Error> {
        let url = format!("{}{}", self.base_url, endpoint);
        let mut request = self.client.delete(&url);
        
        if let Some(ref token) = self.auth_token {
            request = request.header("Authorization", format!("Bearer {}", token));
        }
        
        request.send().await?.json().await
    }

    pub async fn get_status_code(&self, endpoint: &str) -> Result<u16, reqwest::Error> {
        let url = format!("{}{}", self.base_url, endpoint);
        let mut request = self.client.get(&url);
        
        if let Some(ref token) = self.auth_token {
            request = request.header("Authorization", format!("Bearer {}", token));
        }
        
        let response = request.send().await?;
        Ok(response.status().as_u16())
    }
}

impl Default for TestClient {
    fn default() -> Self {
        Self::new("http://localhost:8080")
    }
}
