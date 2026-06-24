use std::collections::HashMap;
use std::sync::Arc;

use chrono::Utc;
use redis::AsyncCommands;
use uuid::Uuid;

use crate::db::SharedRepository;
use crate::models::*;

/// ID 序列号的 TTL（秒）- 24小时
const SEQUENCE_TTL_SECONDS: u64 = 86400;

pub struct SharedService {
    repository: Arc<SharedRepository>,
    redis_client: redis::Client,
    id_prefixes: HashMap<String, String>,
}

impl SharedService {
    pub fn new(repository: SharedRepository, redis_client: redis::Client) -> Self {
        let mut id_prefixes = HashMap::new();
        id_prefixes.insert("company".to_string(), "C".to_string());
        id_prefixes.insert("department".to_string(), "D".to_string());
        id_prefixes.insert("employee".to_string(), "E".to_string());
        id_prefixes.insert("user".to_string(), "U".to_string());
        id_prefixes.insert("project".to_string(), "P".to_string());
        id_prefixes.insert("customer".to_string(), "CU".to_string());
        id_prefixes.insert("supplier".to_string(), "SU".to_string());
        id_prefixes.insert("asset".to_string(), "AS".to_string());
        id_prefixes.insert("voucher".to_string(), "V".to_string());

        Self {
            repository: Arc::new(repository),
            redis_client,
            id_prefixes,
        }
    }

    pub async fn generate_id(&self, request: &GenerateIdRequest) -> Result<String, Box<dyn std::error::Error>> {
        let prefix = self.id_prefixes.get(&request.id_type)
            .ok_or(format!("Unknown ID type: {}", request.id_type))?;

        // 使用统一缓存 key 格式: shared:id:seq:{type}
        let key = format!("shared:id:seq:{}", request.id_type);
        let mut conn = self.redis_client.get_async_connection().await?;
        let seq: u64 = conn.incr(&key, 1).await?;
        
        // 为序列号添加 TTL，防止 Redis 键无限增长
        let _: () = conn.expire(&key, SEQUENCE_TTL_SECONDS).await?;

        let id = format!("{}{:08}", prefix, seq);

        let record = IdRecord {
            id: id.clone(),
            id_type: request.id_type.clone(),
            entity_type: request.entity_type.clone(),
            entity_id: request.entity_id,
            company_id: request.company_id,
            created_by: None,
            created_at: Utc::now(),
            metadata: None,
        };

        self.repository.create_id_record(&record).await?;

        Ok(id)
    }

    pub async fn get_id_info(&self, id: &str) -> Result<Option<IdRecord>, Box<dyn std::error::Error>> {
        let record = self.repository.get_id_record(id).await?;
        Ok(record)
    }

    pub async fn create_company(&self, data: &CreateCompanyRequest) -> Result<Company, Box<dyn std::error::Error>> {
        let company = self.repository.create_company(data).await?;
        Ok(company)
    }

    pub async fn get_company(&self, id: Uuid) -> Result<Option<Company>, Box<dyn std::error::Error>> {
        let company = self.repository.get_company(id).await?;
        Ok(company)
    }

    pub async fn get_companies(&self, status: Option<String>) -> Result<Vec<Company>, Box<dyn std::error::Error>> {
        let companies = self.repository.get_companies(status).await?;
        Ok(companies)
    }

    pub async fn update_company(&self, id: Uuid, data: &CreateCompanyRequest) -> Result<Company, Box<dyn std::error::Error>> {
        let company = self.repository.update_company(id, data).await?;
        Ok(company)
    }

    pub async fn delete_company(&self, id: Uuid) -> Result<(), Box<dyn std::error::Error>> {
        self.repository.delete_company(id).await?;
        Ok(())
    }

    pub async fn create_department(&self, data: &CreateDepartmentRequest) -> Result<Department, Box<dyn std::error::Error>> {
        let department = self.repository.create_department(data).await?;
        Ok(department)
    }

    pub async fn get_department(&self, id: Uuid) -> Result<Option<Department>, Box<dyn std::error::Error>> {
        let department = self.repository.get_department(id).await?;
        Ok(department)
    }

    pub async fn get_departments(&self, company_id: Option<Uuid>) -> Result<Vec<Department>, Box<dyn std::error::Error>> {
        let departments = self.repository.get_departments(company_id).await?;
        Ok(departments)
    }

    pub async fn create_position(&self, data: &CreatePositionRequest) -> Result<Position, Box<dyn std::error::Error>> {
        let position = self.repository.create_position(data).await?;
        Ok(position)
    }

    pub async fn get_position(&self, id: Uuid) -> Result<Option<Position>, Box<dyn std::error::Error>> {
        let position = self.repository.get_position(id).await?;
        Ok(position)
    }

    pub async fn create_employee(&self, data: &CreateEmployeeRequest) -> Result<Employee, Box<dyn std::error::Error>> {
        let employee = self.repository.create_employee(data).await?;
        Ok(employee)
    }

    pub async fn get_employee(&self, id: Uuid) -> Result<Option<Employee>, Box<dyn std::error::Error>> {
        let employee = self.repository.get_employee(id).await?;
        Ok(employee)
    }

    pub async fn get_employees(
        &self,
        company_id: Option<Uuid>,
        department_id: Option<Uuid>,
    ) -> Result<Vec<Employee>, Box<dyn std::error::Error>> {
        let employees = self.repository.get_employees(company_id, department_id).await?;
        Ok(employees)
    }

    pub async fn get_system_param(&self, param_key: &str) -> Result<Option<SystemParam>, Box<dyn std::error::Error>> {
        let param = self.repository.get_system_param(param_key).await?;
        Ok(param)
    }

    pub async fn set_system_param(
        &self,
        param_key: &str,
        param_value: &str,
        param_type: Option<&str>,
        description: Option<&str>,
        module: Option<&str>,
    ) -> Result<SystemParam, Box<dyn std::error::Error>> {
        let param = self.repository.set_system_param(param_key, param_value, param_type, description, module).await?;
        Ok(param)
    }
}