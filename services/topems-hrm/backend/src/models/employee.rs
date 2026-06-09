use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Employee {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub company_id: Option<Uuid>,
    pub department_id: Option<Uuid>,
    pub position_id: Option<Uuid>,
    pub employee_number: String,
    pub name: String,
    pub gender: Option<String>,
    pub birth_date: Option<DateTime<Utc>>,
    pub hire_date: Option<DateTime<Utc>>,
    pub position: Option<String>,
    pub job_title: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub emergency_contact_name: Option<String>,
    pub emergency_contact_phone: Option<String>,
    pub address: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateEmployeeRequest {
    pub organization_id: Uuid,
    pub company_id: Option<Uuid>,
    pub department_id: Option<Uuid>,
    pub position_id: Option<Uuid>,
    pub employee_number: String,
    pub name: String,
    pub gender: Option<String>,
    pub birth_date: Option<DateTime<Utc>>,
    pub hire_date: Option<DateTime<Utc>>,
    pub position: Option<String>,
    pub job_title: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub emergency_contact_name: Option<String>,
    pub emergency_contact_phone: Option<String>,
    pub address: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateEmployeeRequest {
    pub company_id: Option<Uuid>,
    pub department_id: Option<Uuid>,
    pub position_id: Option<Uuid>,
    pub name: Option<String>,
    pub gender: Option<String>,
    pub birth_date: Option<DateTime<Utc>>,
    pub hire_date: Option<DateTime<Utc>>,
    pub position: Option<String>,
    pub job_title: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub emergency_contact_name: Option<String>,
    pub emergency_contact_phone: Option<String>,
    pub address: Option<String>,
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
            organization_id: org_id,
            company_id: None,
            department_id: None,
            position_id: None,
            employee_number: "EMP001".to_string(),
            name: "John Doe".to_string(),
            gender: Some("male".to_string()),
            birth_date: None,
            hire_date: Some(created_at),
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
            organization_id: org_id,
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
            name: Some("Jane Updated".to_string()),
            gender: None,
            birth_date: None,
            hire_date: None,
            department_id: None,
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
