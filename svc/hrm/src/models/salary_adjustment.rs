use bigdecimal::BigDecimal;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, ToSchema)]
pub struct SalaryAdjustment {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub employee_id: Uuid,
    pub employee_name: Option<String>,
    pub department: Option<String>,
    pub adjustment_type: String,
    pub old_salary: Option<BigDecimal>,
    pub new_salary: Option<BigDecimal>,
    pub adjustment_amount: Option<BigDecimal>,
    pub reason: Option<String>,
    pub effective_date: Option<DateTime<Utc>>,
    pub status: String,
    pub approver_id: Option<Uuid>,
    pub approved_at: Option<DateTime<Utc>>,
    pub rejection_reason: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateSalaryAdjustmentRequest {
    pub employee_id: Uuid,
    pub adjustment_type: String,
    pub old_salary: Option<BigDecimal>,
    pub new_salary: Option<BigDecimal>,
    pub reason: Option<String>,
    pub effective_date: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateSalaryAdjustmentRequest {
    pub adjustment_type: Option<String>,
    pub old_salary: Option<BigDecimal>,
    pub new_salary: Option<BigDecimal>,
    pub reason: Option<String>,
    pub effective_date: Option<DateTime<Utc>>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApproveSalaryAdjustmentRequest {
    pub approver_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RejectSalaryAdjustmentRequest {
    pub approver_id: Uuid,
    pub reason: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn now() -> DateTime<Utc> {
        Utc::now()
    }

    fn dec(n: i64) -> BigDecimal {
        BigDecimal::from(n)
    }

    fn roundtrip<T: Serialize + serde::de::DeserializeOwned + std::fmt::Debug>(item: &T) {
        let json = serde_json::to_string(item).expect("serialize");
        let v1: serde_json::Value = serde_json::from_str(&json).expect("to_value");
        let back: T = serde_json::from_str(&json).expect("deserialize");
        let json2 = serde_json::to_string(&back).expect("re-serialize");
        let v2: serde_json::Value = serde_json::from_str(&json2).expect("to_value2");
        assert_eq!(v1, v2, "roundtrip mismatch");
    }

    #[test]
    fn test_salary_adjustment_roundtrip_full() {
        roundtrip(&SalaryAdjustment {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            employee_id: Uuid::new_v4(),
            employee_name: Some("Alice".to_string()),
            department: Some("Engineering".to_string()),
            adjustment_type: "promotion".to_string(),
            old_salary: Some(dec(10000)),
            new_salary: Some(dec(15000)),
            adjustment_amount: Some(dec(5000)),
            reason: Some("Annual promotion".to_string()),
            effective_date: Some(now()),
            status: "approved".to_string(),
            approver_id: Some(Uuid::new_v4()),
            approved_at: Some(now()),
            rejection_reason: None,
            created_at: Some(now()),
            updated_at: Some(now()),
        });
    }

    #[test]
    fn test_salary_adjustment_roundtrip_minimal() {
        roundtrip(&SalaryAdjustment {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            employee_id: Uuid::new_v4(),
            employee_name: None,
            department: None,
            adjustment_type: "merit".to_string(),
            old_salary: None,
            new_salary: None,
            adjustment_amount: None,
            reason: None,
            effective_date: None,
            status: "pending".to_string(),
            approver_id: None,
            approved_at: None,
            rejection_reason: None,
            created_at: None,
            updated_at: None,
        });
    }

    #[test]
    fn test_salary_adjustment_roundtrip_rejected() {
        roundtrip(&SalaryAdjustment {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            employee_id: Uuid::new_v4(),
            employee_name: Some("Bob".to_string()),
            department: Some("Sales".to_string()),
            adjustment_type: "cost_of_living".to_string(),
            old_salary: Some(dec(8000)),
            new_salary: Some(dec(8500)),
            adjustment_amount: Some(dec(500)),
            reason: Some("COL adjustment".to_string()),
            effective_date: Some(now()),
            status: "rejected".to_string(),
            approver_id: Some(Uuid::new_v4()),
            approved_at: Some(now()),
            rejection_reason: Some("Budget constraints".to_string()),
            created_at: Some(now()),
            updated_at: Some(now()),
        });
    }

    #[test]
    fn test_create_salary_adjustment_request_roundtrip() {
        roundtrip(&CreateSalaryAdjustmentRequest {
            employee_id: Uuid::new_v4(),
            adjustment_type: "promotion".to_string(),
            old_salary: Some(dec(10000)),
            new_salary: Some(dec(12000)),
            reason: Some("Merit increase".to_string()),
            effective_date: Some(now()),
        });
        roundtrip(&CreateSalaryAdjustmentRequest {
            employee_id: Uuid::new_v4(),
            adjustment_type: "transfer".to_string(),
            old_salary: None,
            new_salary: None,
            reason: None,
            effective_date: None,
        });
    }

    #[test]
    fn test_update_salary_adjustment_request_roundtrip_all_none() {
        roundtrip(&UpdateSalaryAdjustmentRequest {
            adjustment_type: None,
            old_salary: None,
            new_salary: None,
            reason: None,
            effective_date: None,
            status: None,
        });
    }

    #[test]
    fn test_update_salary_adjustment_request_roundtrip_all_some() {
        roundtrip(&UpdateSalaryAdjustmentRequest {
            adjustment_type: Some("promotion".to_string()),
            old_salary: Some(dec(9000)),
            new_salary: Some(dec(11000)),
            reason: Some("Performance bonus".to_string()),
            effective_date: Some(now()),
            status: Some("approved".to_string()),
        });
    }

    #[test]
    fn test_approve_salary_adjustment_request_roundtrip() {
        roundtrip(&ApproveSalaryAdjustmentRequest {
            approver_id: Uuid::new_v4(),
        });
    }

    #[test]
    fn test_reject_salary_adjustment_request_roundtrip() {
        roundtrip(&RejectSalaryAdjustmentRequest {
            approver_id: Uuid::new_v4(),
            reason: "Not eligible".to_string(),
        });
    }
}
