use super::base_client::BaseServiceClient;
use super::error::ServiceClientResult;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Employee {
    pub id: Uuid,
    pub name: String,
    pub email: String,
    pub phone: Option<String>,
    pub department_id: Option<Uuid>,
    pub company_id: Uuid,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Department {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub company_id: Uuid,
    pub parent_id: Option<Uuid>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Company {
    pub id: Uuid,
    pub name: String,
    pub code: String,
    pub description: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Clone)]
pub struct HrmServiceClient {
    base_client: BaseServiceClient,
}

impl HrmServiceClient {
    pub fn new(base_url: impl Into<String>) -> ServiceClientResult<Self> {
        Ok(Self {
            base_client: BaseServiceClient::new(base_url)?,
        })
    }

    pub fn from_env() -> ServiceClientResult<Self> {
        let base_url =
            std::env::var("HRM_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8011".into());
        Self::new(base_url)
    }

    pub async fn get_health(&self) -> ServiceClientResult<bool> {
        match self.base_client.get_without_response("/health").await {
            Ok(_) => Ok(true),
            Err(_) => Ok(false),
        }
    }

    pub async fn get_employee(&self, id: Uuid) -> ServiceClientResult<Employee> {
        self.base_client
            .get(&format!("/api/employees/{}", id))
            .await
    }

    pub async fn get_department(&self, id: Uuid) -> ServiceClientResult<Department> {
        self.base_client
            .get(&format!("/api/departments/{}", id))
            .await
    }

    pub async fn get_company(&self, id: Uuid) -> ServiceClientResult<Company> {
        self.base_client
            .get(&format!("/api/companies/{}", id))
            .await
    }

    pub async fn list_employees(&self) -> ServiceClientResult<Vec<Employee>> {
        self.base_client.get("/api/employees").await
    }

    pub async fn list_departments(&self) -> ServiceClientResult<Vec<Department>> {
        self.base_client.get("/api/departments").await
    }

    pub async fn list_companies(&self) -> ServiceClientResult<Vec<Company>> {
        self.base_client.get("/api/companies").await
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
}
