use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Department {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub organization_id: Uuid,
    pub company_id: Option<Uuid>,
    pub name: String,
    pub code: Option<String>,
    pub parent_id: Option<Uuid>,
    pub manager_id: Option<Uuid>,
    pub description: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateDepartmentRequest {
    pub organization_id: Option<Uuid>,
    pub company_id: Option<Uuid>,
    pub name: String,
    pub code: Option<String>,
    pub parent_id: Option<Uuid>,
    pub manager_id: Option<Uuid>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateDepartmentRequest {
    pub company_id: Option<Uuid>,
    pub name: Option<String>,
    pub code: Option<String>,
    pub parent_id: Option<Uuid>,
    pub manager_id: Option<Uuid>,
    pub description: Option<String>,
    pub status: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_department_struct() {
        let id = Uuid::new_v4();
        let org_id = Uuid::new_v4();
        let created_at = Utc::now();
        let updated_at = Utc::now();

        let department = Department {
            id,
            tenant_id: Uuid::new_v4(),
            organization_id: org_id,
            company_id: None,
            name: "Engineering".to_string(),
            code: Some("ENG".to_string()),
            parent_id: None,
            manager_id: None,
            description: Some("Engineering Department".to_string()),
            status: "active".to_string(),
            created_at,
            updated_at,
        };

        assert_eq!(department.id, id);
        assert_eq!(department.name, "Engineering");
        assert_eq!(department.code, Some("ENG".to_string()));
        assert_eq!(department.status, "active");
    }

    #[test]
    fn test_create_department_request() {
        let org_id = Uuid::new_v4();
        let request = CreateDepartmentRequest {
            organization_id: Some(org_id),
            company_id: None,
            name: "HR Department".to_string(),
            code: Some("HR".to_string()),
            parent_id: None,
            manager_id: None,
            description: Some("Human Resources".to_string()),
        };

        assert_eq!(request.name, "HR Department");
        assert_eq!(request.code, Some("HR".to_string()));
    }

    #[test]
    fn test_update_department_request() {
        let request = UpdateDepartmentRequest {
            company_id: None,
            name: Some("Updated HR Department".to_string()),
            code: None,
            parent_id: None,
            manager_id: None,
            description: Some("Updated description".to_string()),
            status: Some("inactive".to_string()),
        };

        assert_eq!(request.name, Some("Updated HR Department".to_string()));
        assert_eq!(request.status, Some("inactive".to_string()));
    }
}
