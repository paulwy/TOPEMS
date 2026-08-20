use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct Contract {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub employee_id: Uuid,
    pub contract_no: Option<String>,
    pub contract_type: String,
    pub party_a_name: Option<String>,
    pub party_a_contact: Option<String>,
    pub party_b_name: Option<String>,
    pub party_b_contact: Option<String>,
    pub start_date: DateTime<Utc>,
    pub end_date: Option<DateTime<Utc>>,
    pub salary: Option<f64>,
    pub probation_period_days: Option<i32>,
    pub contract_file_path: Option<String>,
    pub reminder_days: Option<i32>,
    pub status: String,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateContractRequest {
    pub employee_id: Uuid,
    pub contract_no: Option<String>,
    pub contract_type: String,
    pub party_a_name: Option<String>,
    pub party_a_contact: Option<String>,
    pub party_b_name: Option<String>,
    pub party_b_contact: Option<String>,
    pub start_date: DateTime<Utc>,
    pub end_date: Option<DateTime<Utc>>,
    pub salary: Option<f64>,
    pub probation_period_days: Option<i32>,
    pub contract_file_path: Option<String>,
    pub reminder_days: Option<i32>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdateContractRequest {
    pub contract_no: Option<String>,
    pub contract_type: Option<String>,
    pub party_a_name: Option<String>,
    pub party_a_contact: Option<String>,
    pub party_b_name: Option<String>,
    pub party_b_contact: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub salary: Option<f64>,
    pub probation_period_days: Option<i32>,
    pub contract_file_path: Option<String>,
    pub reminder_days: Option<i32>,
    pub status: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct ContractRenewal {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub contract_id: Uuid,
    pub previous_contract_id: Option<Uuid>,
    pub renewal_type: String,
    pub renewal_reason: Option<String>,
    pub new_start_date: DateTime<Utc>,
    pub new_end_date: Option<DateTime<Utc>>,
    pub new_salary: Option<f64>,
    pub status: String,
    pub approver_id: Option<Uuid>,
    pub approved_at: Option<DateTime<Utc>>,
    pub rejection_reason: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateRenewalRequest {
    #[allow(dead_code)]
    pub contract_id: Uuid,
    pub renewal_type: String,
    pub renewal_reason: Option<String>,
    pub new_start_date: DateTime<Utc>,
    pub new_end_date: Option<DateTime<Utc>>,
    pub new_salary: Option<f64>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ContractPaginationParams {
    pub page: Option<i64>,
    #[serde(alias = "pagesize")]
    pub page_size: Option<i64>,
    pub employee_id: Option<Uuid>,
    pub status: Option<String>,
    pub contract_type: Option<String>,
    #[allow(dead_code)]
    pub expiring_soon: Option<bool>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_contract_struct() {
        let id = Uuid::new_v4();
        let employee_id = Uuid::new_v4();
        let created_at = Utc::now();
        let updated_at = Utc::now();

        let contract = Contract {
            id,
            tenant_id: Uuid::new_v4(),
            employee_id,
            contract_no: Some("CONTRACT-001".to_string()),
            contract_type: "full_time".to_string(),
            party_a_name: Some("Company".to_string()),
            party_a_contact: Some("company@example.com".to_string()),
            party_b_name: Some("Employee".to_string()),
            party_b_contact: Some("employee@example.com".to_string()),
            start_date: created_at,
            end_date: None,
            salary: Some(80000.0),
            probation_period_days: Some(90),
            contract_file_path: None,
            reminder_days: Some(30),
            status: "active".to_string(),
            notes: None,
            created_at,
            updated_at,
        };

        assert_eq!(contract.id, id);
        assert_eq!(contract.employee_id, employee_id);
        assert_eq!(contract.contract_type, "full_time");
        assert_eq!(contract.status, "active");
    }

    #[test]
    fn test_create_contract_request() {
        let employee_id = Uuid::new_v4();
        let start_date = Utc::now();

        let request = CreateContractRequest {
            employee_id,
            contract_no: Some("CONTRACT-002".to_string()),
            contract_type: "part_time".to_string(),
            party_a_name: None,
            party_a_contact: None,
            party_b_name: None,
            party_b_contact: None,
            start_date,
            end_date: None,
            salary: Some(50000.0),
            probation_period_days: Some(30),
            contract_file_path: None,
            reminder_days: None,
            notes: None,
        };

        assert_eq!(request.employee_id, employee_id);
        assert_eq!(request.contract_type, "part_time");
    }

    #[test]
    fn test_update_contract_request() {
        let request = UpdateContractRequest {
            contract_no: Some("CONTRACT-003".to_string()),
            contract_type: Some("contractor".to_string()),
            party_a_name: None,
            party_a_contact: None,
            party_b_name: None,
            party_b_contact: None,
            start_date: None,
            end_date: None,
            salary: Some(60000.0),
            probation_period_days: None,
            contract_file_path: None,
            reminder_days: None,
            status: Some("inactive".to_string()),
            notes: None,
        };

        assert_eq!(request.contract_no, Some("CONTRACT-003".to_string()));
        assert_eq!(request.status, Some("inactive".to_string()));
    }

    #[test]
    fn test_contract_renewal_struct() {
        let id = Uuid::new_v4();
        let contract_id = Uuid::new_v4();
        let created_at = Utc::now();
        let updated_at = Utc::now();
        let new_start_date = Utc::now();

        let renewal = ContractRenewal {
            id,
            tenant_id: Uuid::new_v4(),
            contract_id,
            previous_contract_id: None,
            renewal_type: "annual".to_string(),
            renewal_reason: None,
            new_start_date,
            new_end_date: None,
            new_salary: Some(90000.0),
            status: "pending".to_string(),
            approver_id: None,
            approved_at: None,
            rejection_reason: None,
            created_at,
            updated_at,
        };

        assert_eq!(renewal.id, id);
        assert_eq!(renewal.contract_id, contract_id);
        assert_eq!(renewal.renewal_type, "annual");
        assert_eq!(renewal.status, "pending");
    }
}
