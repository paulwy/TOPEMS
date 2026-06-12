use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use utoipa::ToSchema;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
#[schema(example = json!({
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "organization_id": "00000000-0000-0000-0000-000000000001",
    "company_id": "550e8400-e29b-41d4-a716-446655440001",
    "department_id": "550e8400-e29b-41d4-a716-446655440002",
    "position_id": "550e8400-e29b-41d4-a716-446655440003",
    "employee_number": "EMP001",
    "name": "张三",
    "gender": "男",
    "birth_date": "1990-01-15",
    "hire_date": "2020-06-01",
    "position": "软件工程师",
    "job_title": "高级工程师",
    "email": "zhangsan@example.com",
    "phone": "13800138000",
    "emergency_contact_name": "李四",
    "emergency_contact_phone": "13900139000",
    "address": "北京市朝阳区",
    "status": "active",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-15T12:00:00Z"
}))]
pub struct Employee {
    #[schema(example = "550e8400-e29b-41d4-a716-446655440000")]
    pub id: Uuid,
    #[schema(example = "00000000-0000-0000-0000-000000000001")]
    pub organization_id: Option<Uuid>,
    #[schema(example = "550e8400-e29b-41d4-a716-446655440001")]
    pub company_id: Option<Uuid>,
    #[schema(example = "550e8400-e29b-41d4-a716-446655440002")]
    pub department_id: Option<Uuid>,
    #[schema(example = "550e8400-e29b-41d4-a716-446655440003")]
    pub position_id: Option<Uuid>,
    #[schema(example = "EMP001")]
    pub employee_number: String,
    #[schema(example = "张三")]
    pub name: String,
    #[schema(example = "男")]
    pub gender: Option<String>,
    #[schema(example = "1990-01-15")]
    pub birth_date: Option<NaiveDate>,
    #[schema(example = "2020-06-01")]
    pub hire_date: Option<NaiveDate>,
    #[schema(example = "软件工程师")]
    pub position: Option<String>,
    #[schema(example = "高级工程师")]
    pub job_title: Option<String>,
    #[schema(example = "zhangsan@example.com")]
    pub email: Option<String>,
    #[schema(example = "13800138000")]
    pub phone: Option<String>,
    #[schema(example = "李四")]
    pub emergency_contact_name: Option<String>,
    #[schema(example = "13900139000")]
    pub emergency_contact_phone: Option<String>,
    #[schema(example = "北京市朝阳区")]
    pub address: Option<String>,
    #[schema(example = "active")]
    pub status: String,
    #[schema(example = "2024-01-01T00:00:00Z")]
    pub created_at: DateTime<Utc>,
    #[schema(example = "2024-01-15T12:00:00Z")]
    pub updated_at: DateTime<Utc>,
}

// 员工财务扩展字段
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct EmployeeFinance {
    pub employee_id: Uuid,
    pub base_salary: Option<Decimal>,           // 基本工资
    pub bonus: Option<Decimal>,                // 奖金
    pub allowance: Option<Decimal>,             // 补贴
    pub social_security: Option<Decimal>,       // 社保个人部分
    pub housing_fund: Option<Decimal>,          // 公积金个人部分
    pub personal_income_tax: Option<Decimal>,  // 个人所得税
    pub net_salary: Option<Decimal>,            // 实发工资
    pub bank_account: Option<String>,           // 银行账号
    pub bank_name: Option<String>,             // 开户银行
    pub cost_center: Option<String>,            // 成本中心
    pub payroll_bank_account: Option<String>, // 工资卡号
    pub salary_payment_status: String,          // 工资发放状态
    pub annual_salary: Option<Decimal>,         // 年薪
    pub hourly_rate: Option<Decimal>,          // 时薪
    pub tax_exempt_allowance: Option<Decimal>, // 免税补贴
    pub social_security_company: Option<Decimal>, // 社保公司部分
    pub housing_fund_company: Option<Decimal>,  // 公积金公司部分
    pub total_compensation: Option<Decimal>,   // 总薪酬
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
#[schema(example = json!({
    "organization_id": "00000000-0000-0000-0000-000000000001",
    "company_id": "550e8400-e29b-41d4-a716-446655440001",
    "department_id": "550e8400-e29b-41d4-a716-446655440002",
    "position_id": "550e8400-e29b-41d4-a716-446655440003",
    "employee_number": "EMP001",
    "name": "张三",
    "gender": "男",
    "birth_date": "1990-01-15",
    "hire_date": "2024-01-01",
    "position": "软件工程师",
    "job_title": "初级工程师",
    "email": "zhangsan@example.com",
    "phone": "13800138000",
    "emergency_contact_name": "李四",
    "emergency_contact_phone": "13900139000",
    "address": "北京市朝阳区"
}))]
pub struct CreateEmployeeRequest {
    #[schema(example = "00000000-0000-0000-0000-000000000001")]
    pub organization_id: Option<Uuid>,
    #[schema(example = "550e8400-e29b-41d4-a716-446655440001")]
    pub company_id: Option<Uuid>,
    #[schema(example = "550e8400-e29b-41d4-a716-446655440002")]
    pub department_id: Option<Uuid>,
    #[schema(example = "550e8400-e29b-41d4-a716-446655440003")]
    pub position_id: Option<Uuid>,
    #[schema(example = "EMP001")]
    pub employee_number: String,
    #[schema(example = "张三")]
    pub name: String,
    #[schema(example = "男")]
    pub gender: Option<String>,
    #[schema(example = "1990-01-15")]
    pub birth_date: Option<NaiveDate>,
    #[schema(example = "2024-01-01")]
    pub hire_date: Option<NaiveDate>,
    #[schema(example = "软件工程师")]
    pub position: Option<String>,
    #[schema(example = "初级工程师")]
    pub job_title: Option<String>,
    #[schema(example = "zhangsan@example.com")]
    pub email: Option<String>,
    #[schema(example = "13800138000")]
    pub phone: Option<String>,
    #[schema(example = "李四")]
    pub emergency_contact_name: Option<String>,
    #[schema(example = "13900139000")]
    pub emergency_contact_phone: Option<String>,
    #[schema(example = "北京市朝阳区")]
    pub address: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
#[schema(example = json!({
    "company_id": "550e8400-e29b-41d4-a716-446655440001",
    "department_id": "550e8400-e29b-41d4-a716-446655440004",
    "position_id": "550e8400-e29b-41d4-a716-446655440005",
    "name": "张三",
    "gender": "男",
    "birth_date": "1990-01-15",
    "hire_date": "2020-06-01",
    "position": "高级软件工程师",
    "job_title": "高级工程师",
    "email": "zhangsan@example.com",
    "phone": "13800138000",
    "emergency_contact_name": "李四",
    "emergency_contact_phone": "13900139000",
    "address": "北京市海淀区",
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
    #[schema(example = "1990-01-15")]
    pub birth_date: Option<NaiveDate>,
    #[schema(example = "2020-06-01")]
    pub hire_date: Option<NaiveDate>,
    #[schema(example = "高级软件工程师")]
    pub position: Option<String>,
    #[schema(example = "高级工程师")]
    pub job_title: Option<String>,
    #[schema(example = "zhangsan@example.com")]
    pub email: Option<String>,
    #[schema(example = "13800138000")]
    pub phone: Option<String>,
    #[schema(example = "李四")]
    pub emergency_contact_name: Option<String>,
    #[schema(example = "13900139000")]
    pub emergency_contact_phone: Option<String>,
    #[schema(example = "北京市海淀区")]
    pub address: Option<String>,
    #[schema(example = "active")]
    pub status: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_employee_struct() {
        let id = Uuid::new_v4();
        let org_id = Uuid::new_v4();
        let created_at = Utc::now();
        let updated_at = Utc::now();
        
        let employee = Employee {
            id,
            organization_id: Some(org_id),
            company_id: None,
            department_id: None,
            position_id: None,
            employee_number: "EMP001".to_string(),
            name: "John Doe".to_string(),
            gender: Some("male".to_string()),
            birth_date: None,
            hire_date: Some(NaiveDate::from_ymd_opt(2024, 1, 15).unwrap()),
            position: Some("Software Engineer".to_string()),
            job_title: Some("Senior Engineer".to_string()),
            email: Some("john@example.com".to_string()),
            phone: Some("1234567890".to_string()),
            emergency_contact_name: Some("Jane Doe".to_string()),
            emergency_contact_phone: Some("0987654321".to_string()),
            address: Some("123 Main St".to_string()),
            status: "active".to_string(),
            created_at,
            updated_at,
        };

        assert_eq!(employee.id, id);
        assert_eq!(employee.employee_number, "EMP001");
        assert_eq!(employee.name, "John Doe");
        assert_eq!(employee.status, "active");
        assert!(employee.email.is_some());
    }

    #[test]
    fn test_create_employee_request() {
        let org_id = Uuid::new_v4();
        let request = CreateEmployeeRequest {
            organization_id: Some(org_id),
            company_id: None,
            department_id: None,
            position_id: None,
            employee_number: "EMP002".to_string(),
            name: "Jane Smith".to_string(),
            gender: Some("female".to_string()),
            birth_date: None,
            hire_date: None,
            position: Some("Designer".to_string()),
            job_title: Some("UI Designer".to_string()),
            email: Some("jane@example.com".to_string()),
            phone: None,
            emergency_contact_name: None,
            emergency_contact_phone: None,
            address: None,
        };

        assert_eq!(request.employee_number, "EMP002");
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
            birth_date: None,
            hire_date: None,
            position: Some("Senior Designer".to_string()),
            job_title: None,
            email: None,
            phone: None,
            emergency_contact_name: None,
            emergency_contact_phone: None,
            address: None,
            status: Some("inactive".to_string()),
        };

        assert_eq!(request.name, Some("Jane Updated".to_string()));
        assert_eq!(request.position, Some("Senior Designer".to_string()));
        assert_eq!(request.status, Some("inactive".to_string()));
    }
}
