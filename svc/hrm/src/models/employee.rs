use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
#[schema(example = json!({
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "company_id": "550e8400-e29b-41d4-a716-446655440001",
    "department_id": "550e8400-e29b-41d4-a716-446655440002",
    "position_id": "550e8400-e29b-41d4-a716-446655440003",
    "employee_no": "EMP001",
    "name": "张三",
    "gender": "男",
    "hire_date": "2020-06-01",
    "email": "zhangsan@example.com",
    "phone": "13800138000",
    "status": "active",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-15T12:00:00Z"
}))]
pub struct Employee {
    #[schema(example = "550e8400-e29b-41d4-a716-446655440000")]
    pub id: Uuid,
    #[schema(example = "550e8400-e29b-41d4-a716-446655440001")]
    pub company_id: Option<Uuid>,
    #[schema(example = "550e8400-e29b-41d4-a716-446655440002")]
    pub department_id: Option<Uuid>,
    #[schema(example = "550e8400-e29b-41d4-a716-446655440003")]
    pub position_id: Option<Uuid>,
    #[schema(example = "EMP001")]
    pub employee_no: String,
    #[schema(example = "张三")]
    pub name: String,
    #[schema(example = "男")]
    pub gender: Option<String>,
    #[schema(example = "2020-06-01")]
    pub hire_date: Option<NaiveDate>,
    #[schema(example = "zhangsan@example.com")]
    pub email: Option<String>,
    #[schema(example = "13800138000")]
    pub phone: Option<String>,
    #[schema(example = "active")]
    pub status: String,
    #[schema(example = "2024-01-01T00:00:00Z")]
    pub created_at: DateTime<Utc>,
    #[schema(example = "2024-01-15T12:00:00Z")]
    pub updated_at: DateTime<Utc>,
}

pub struct EmployeeFinance {
    pub employee_id: Uuid,
    pub base_salary: Option<Decimal>,
    pub bonus: Option<Decimal>,
    pub allowance: Option<Decimal>,
    pub social_security: Option<Decimal>,
    pub housing_fund: Option<Decimal>,
    pub personal_income_tax: Option<Decimal>,
    pub net_salary: Option<Decimal>,
    pub bank_account: Option<String>,
    pub bank_name: Option<String>,
    pub cost_center: Option<String>,
    pub payroll_bank_account: Option<String>,
    pub salary_payment_status: String,
    pub annual_salary: Option<Decimal>,
    pub hourly_rate: Option<Decimal>,
    pub tax_exempt_allowance: Option<Decimal>,
    pub social_security_company: Option<Decimal>,
    pub housing_fund_company: Option<Decimal>,
    pub total_compensation: Option<Decimal>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
#[schema(example = json!({
    "company_id": "550e8400-e29b-41d4-a716-446655440001",
    "department_id": "550e8400-e29b-41d4-a716-446655440002",
    "position_id": "550e8400-e29b-41d4-a716-446655440003",
    "employee_no": "EMP001",
    "name": "张三",
    "gender": "男",
    "hire_date": "2024-01-01",
    "email": "zhangsan@example.com",
    "phone": "13800138000"
}))]
pub struct CreateEmployeeRequest {
    #[schema(example = "550e8400-e29b-41d4-a716-446655440001")]
    pub company_id: Uuid,
    #[schema(example = "550e8400-e29b-41d4-a716-446655440002")]
    pub department_id: Option<Uuid>,
    #[schema(example = "550e8400-e29b-41d4-a716-446655440003")]
    pub position_id: Option<Uuid>,
    #[schema(example = "EMP001")]
    pub employee_no: String,
    #[schema(example = "张三")]
    pub name: String,
    #[schema(example = "男")]
    pub gender: Option<String>,
    #[schema(example = "2024-01-01")]
    pub hire_date: Option<NaiveDate>,
    #[schema(example = "zhangsan@example.com")]
    pub email: Option<String>,
    #[schema(example = "13800138000")]
    pub phone: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
#[schema(example = json!({
    "company_id": "550e8400-e29b-41d4-a716-446655440001",
    "department_id": "550e8400-e29b-41d4-a716-446655440004",
    "position_id": "550e8400-e29b-41d4-a716-446655440005",
    "name": "张三",
    "gender": "男",
    "hire_date": "2020-06-01",
    "email": "zhangsan@example.com",
    "phone": "13800138000",
    "status": "active"
}))]
pub struct UpdateEmployeeRequest {
    #[schema(example = "550e8400-e29b-41d4-a716-446655440001")]
    pub company_id: Option<Uuid>,
    #[schema(example = "550e8400-e29b-41d4-a716-446655440004")]
    pub department_id: Option<Uuid>,
    #[schema(example = "550e8400-e29b-41d4-a716-446655440005")]
    pub position_id: Option<Uuid>,
    #[schema(example = "张三")]
    pub name: Option<String>,
    #[schema(example = "男")]
    pub gender: Option<String>,
    #[schema(example = "2020-06-01")]
    pub hire_date: Option<NaiveDate>,
    #[schema(example = "zhangsan@example.com")]
    pub email: Option<String>,
    #[schema(example = "13800138000")]
    pub phone: Option<String>,
    #[schema(example = "active")]
    pub status: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_employee_struct() {
        let id = Uuid::new_v4();
        let company_id = Uuid::new_v4();
        let created_at = Utc::now();
        let updated_at = Utc::now();

        let employee = Employee {
            id,
            company_id: Some(company_id),
            department_id: None,
            position_id: None,
            employee_no: "EMP001".to_string(),
            name: "John Doe".to_string(),
            gender: Some("male".to_string()),
            hire_date: Some(NaiveDate::from_ymd_opt(2024, 1, 15).unwrap()),
            email: Some("john@example.com".to_string()),
            phone: Some("1234567890".to_string()),
            status: "active".to_string(),
            created_at,
            updated_at,
        };

        assert_eq!(employee.id, id);
        assert_eq!(employee.employee_no, "EMP001");
        assert_eq!(employee.name, "John Doe");
        assert_eq!(employee.status, "active");
        assert!(employee.email.is_some());
    }

    #[test]
    fn test_create_employee_request() {
        let company_id = Uuid::new_v4();
        let request = CreateEmployeeRequest {
            company_id,
            department_id: None,
            position_id: None,
            employee_no: "EMP002".to_string(),
            name: "Jane Smith".to_string(),
            gender: Some("female".to_string()),
            hire_date: None,
            email: Some("jane@example.com".to_string()),
            phone: None,
        };

        assert_eq!(request.employee_no, "EMP002");
        assert_eq!(request.name, "Jane Smith");
    }

    #[test]
    fn test_update_employee_request() {
        let request = UpdateEmployeeRequest {
            company_id: None,
            department_id: None,
            position_id: None,
            name: Some("Jane Updated".to_string()),
            gender: None,
            hire_date: None,
            email: None,
            phone: None,
            status: Some("inactive".to_string()),
        };

        assert_eq!(request.name, Some("Jane Updated".to_string()));
        assert_eq!(request.status, Some("inactive".to_string()));
    }
}
