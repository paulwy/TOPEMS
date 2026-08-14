use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Contract {
    pub id: Uuid,
    pub project_id: Uuid,
    pub contract_no: String,
    pub contract_name: String,
    pub contract_type: String,
    pub party_a: String,
    pub party_b: String,
    pub amount: Option<f64>,
    pub currency: String,
    pub sign_date: Option<DateTime<Utc>>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub status: String,
    pub tenant_id: Option<Uuid>,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateContractRequest {
    pub project_id: Uuid,
    pub contract_no: String,
    pub contract_name: String,
    pub contract_type: String,
    pub party_a: String,
    pub party_b: String,
    pub amount: Option<f64>,
    pub currency: Option<String>,
    pub sign_date: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub created_by: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateContractRequest {
    pub contract_name: Option<String>,
    pub party_a: Option<String>,
    pub party_b: Option<String>,
    pub amount: Option<f64>,
    pub currency: Option<String>,
    pub sign_date: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ContractMilestone {
    pub id: Uuid,
    pub contract_id: Uuid,
    pub project_milestone_id: Option<Uuid>,
    pub name: String,
    pub description: Option<String>,
    pub target_date: DateTime<Utc>,
    pub payment_amount: f64,
    pub payment_percent: Option<f64>,
    pub status: String,
    pub actual_date: Option<DateTime<Utc>>,
    pub payment_status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateContractMilestoneRequest {
    pub name: String,
    pub description: Option<String>,
    pub target_date: String,
    pub payment_amount: Option<f64>,
    pub payment_percent: Option<f64>,
    pub project_milestone_id: Option<Uuid>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ContractPaymentSchedule {
    pub id: Uuid,
    pub contract_id: Uuid,
    pub payment_number: i32,
    pub payment_name: Option<String>,
    pub payment_percent: Option<f64>,
    pub payment_amount: f64,
    pub due_date: DateTime<Utc>,
    pub actual_payment_date: Option<DateTime<Utc>>,
    pub actual_payment_amount: Option<f64>,
    pub status: String,
    pub invoice_number: Option<String>,
    pub expense_ref_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreatePaymentScheduleRequest {
    pub payment_number: i32,
    pub payment_name: Option<String>,
    pub payment_percent: Option<f64>,
    pub payment_amount: f64,
    pub due_date: String,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ContractTemplate {
    pub id: Uuid,
    pub name: String,
    pub contract_type: String,
    pub description: Option<String>,
    pub content: serde_json::Value,
    pub is_active: bool,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateContractTemplateRequest {
    pub name: String,
    pub contract_type: String,
    pub description: Option<String>,
    pub content: serde_json::Value,
    pub created_by: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn now() -> DateTime<Utc> {
        Utc::now()
    }

    fn uid() -> Uuid {
        Uuid::parse_str("123e4567-e89b-12d3-a456-426614174000").unwrap()
    }

    // ---- Contract ----

    fn sample_contract() -> Contract {
        Contract {
            id: uid(),
            project_id: uid(),
            contract_no: "HT-2024-001".to_string(),
            contract_name: "咨询服务合同".to_string(),
            contract_type: "service".to_string(),
            party_a: "甲方公司".to_string(),
            party_b: "乙方公司".to_string(),
            amount: Some(500_000.0),
            currency: "CNY".to_string(),
            sign_date: Some(now()),
            start_date: Some(now()),
            end_date: Some(now()),
            status: "active".to_string(),
            tenant_id: Some(uid()),
            created_by: Some("admin".to_string()),
            created_at: now(),
            updated_at: now(),
            deleted_at: None,
        }
    }

    #[test]
    fn test_contract_serde_roundtrip() {
        let c = sample_contract();
        let s = serde_json::to_string(&c).unwrap();
        let back: Contract = serde_json::from_str(&s).unwrap();
        assert_eq!(back.id, c.id);
        assert_eq!(back.contract_no, c.contract_no);
        assert_eq!(back.party_a, c.party_a);
        assert_eq!(back.amount, c.amount);
        assert_eq!(back.currency, c.currency);
    }

    #[test]
    fn test_contract_clone_preserves_fields() {
        let c = sample_contract();
        let cl = c.clone();
        assert_eq!(cl.id, c.id);
        assert_eq!(cl.contract_name, c.contract_name);
    }

    #[test]
    fn test_contract_with_none_optional_fields() {
        let c = Contract {
            id: uid(),
            project_id: uid(),
            contract_no: "HT-002".to_string(),
            contract_name: "n".to_string(),
            contract_type: "t".to_string(),
            party_a: "a".to_string(),
            party_b: "b".to_string(),
            amount: None,
            currency: "CNY".to_string(),
            sign_date: None,
            start_date: None,
            end_date: None,
            status: "draft".to_string(),
            tenant_id: None,
            created_by: None,
            created_at: now(),
            updated_at: now(),
            deleted_at: Some(now()),
        };
        let s = serde_json::to_string(&c).unwrap();
        let back: Contract = serde_json::from_str(&s).unwrap();
        assert!(back.amount.is_none());
        assert!(back.sign_date.is_none());
        assert!(back.deleted_at.is_some());
    }

    #[test]
    fn test_contract_amount_negative_roundtrip() {
        let mut c = sample_contract();
        c.amount = Some(-1.0);
        let s = serde_json::to_string(&c).unwrap();
        let back: Contract = serde_json::from_str(&s).unwrap();
        assert_eq!(back.amount, Some(-1.0));
    }

    // ---- CreateContractRequest ----

    #[test]
    fn test_create_contract_request_roundtrip() {
        let r = CreateContractRequest {
            project_id: uid(),
            contract_no: "NEW-HT-1".to_string(),
            contract_name: "新合同".to_string(),
            contract_type: "purchase".to_string(),
            party_a: "PA".to_string(),
            party_b: "PB".to_string(),
            amount: Some(1000.0),
            currency: Some("USD".to_string()),
            sign_date: Some("2024-01-01T00:00:00Z".to_string()),
            start_date: Some("2024-01-02T00:00:00Z".to_string()),
            end_date: Some("2024-12-31T00:00:00Z".to_string()),
            created_by: Some("u".to_string()),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateContractRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.contract_no, r.contract_no);
        assert_eq!(back.amount, r.amount);
        assert_eq!(back.currency, r.currency);
    }

    #[test]
    fn test_create_contract_request_minimal() {
        let r = CreateContractRequest {
            project_id: uid(),
            contract_no: "N".to_string(),
            contract_name: "x".to_string(),
            contract_type: "t".to_string(),
            party_a: "a".to_string(),
            party_b: "b".to_string(),
            amount: None,
            currency: None,
            sign_date: None,
            start_date: None,
            end_date: None,
            created_by: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateContractRequest = serde_json::from_str(&s).unwrap();
        assert!(back.amount.is_none());
        assert!(back.currency.is_none());
    }

    // ---- UpdateContractRequest ----

    #[test]
    fn test_update_contract_request_all_none() {
        let r = UpdateContractRequest {
            contract_name: None,
            party_a: None,
            party_b: None,
            amount: None,
            currency: None,
            sign_date: None,
            start_date: None,
            end_date: None,
            status: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: UpdateContractRequest = serde_json::from_str(&s).unwrap();
        assert!(back.contract_name.is_none());
        assert!(back.amount.is_none());
    }

    #[test]
    fn test_update_contract_request_with_values() {
        let r = UpdateContractRequest {
            contract_name: Some("updated".to_string()),
            party_a: Some("PA2".to_string()),
            party_b: Some("PB2".to_string()),
            amount: Some(2000.0),
            currency: Some("EUR".to_string()),
            sign_date: Some("2024-03-01T00:00:00Z".to_string()),
            start_date: Some("2024-03-02T00:00:00Z".to_string()),
            end_date: Some("2024-12-31T00:00:00Z".to_string()),
            status: Some("completed".to_string()),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: UpdateContractRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.contract_name, r.contract_name);
        assert_eq!(back.amount, r.amount);
    }

    // ---- ContractMilestone ----

    #[test]
    fn test_contract_milestone_serde_roundtrip() {
        let m = ContractMilestone {
            id: uid(),
            contract_id: uid(),
            project_milestone_id: Some(uid()),
            name: "首付款".to_string(),
            description: Some("d".to_string()),
            target_date: now(),
            payment_amount: 100_000.0,
            payment_percent: Some(30.0),
            status: "pending".to_string(),
            actual_date: Some(now()),
            payment_status: "unpaid".to_string(),
            created_at: now(),
            updated_at: now(),
        };
        let s = serde_json::to_string(&m).unwrap();
        let back: ContractMilestone = serde_json::from_str(&s).unwrap();
        assert_eq!(back.id, m.id);
        assert_eq!(back.name, m.name);
        assert_eq!(back.payment_amount, m.payment_amount);
        assert_eq!(back.payment_percent, m.payment_percent);
    }

    #[test]
    fn test_contract_milestone_with_none_optional() {
        let m = ContractMilestone {
            id: uid(),
            contract_id: uid(),
            project_milestone_id: None,
            name: "n".to_string(),
            description: None,
            target_date: now(),
            payment_amount: 0.0,
            payment_percent: None,
            status: "pending".to_string(),
            actual_date: None,
            payment_status: "unpaid".to_string(),
            created_at: now(),
            updated_at: now(),
        };
        let s = serde_json::to_string(&m).unwrap();
        let back: ContractMilestone = serde_json::from_str(&s).unwrap();
        assert!(back.project_milestone_id.is_none());
        assert!(back.actual_date.is_none());
    }

    // ---- CreateContractMilestoneRequest ----

    #[test]
    fn test_create_contract_milestone_request_roundtrip() {
        let r = CreateContractMilestoneRequest {
            name: "尾款".to_string(),
            description: Some("d".to_string()),
            target_date: "2024-12-31T00:00:00Z".to_string(),
            payment_amount: Some(50_000.0),
            payment_percent: Some(50.0),
            project_milestone_id: Some(uid()),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateContractMilestoneRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.name, r.name);
        assert_eq!(back.payment_amount, r.payment_amount);
    }

    #[test]
    fn test_create_contract_milestone_request_minimal() {
        let r = CreateContractMilestoneRequest {
            name: "n".to_string(),
            description: None,
            target_date: "2024-12-31T00:00:00Z".to_string(),
            payment_amount: None,
            payment_percent: None,
            project_milestone_id: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateContractMilestoneRequest = serde_json::from_str(&s).unwrap();
        assert!(back.payment_amount.is_none());
    }

    // ---- ContractPaymentSchedule ----

    #[test]
    fn test_contract_payment_schedule_roundtrip() {
        let p = ContractPaymentSchedule {
            id: uid(),
            contract_id: uid(),
            payment_number: 1,
            payment_name: Some("第一期".to_string()),
            payment_percent: Some(30.0),
            payment_amount: 30_000.0,
            due_date: now(),
            actual_payment_date: Some(now()),
            actual_payment_amount: Some(30_000.0),
            status: "paid".to_string(),
            invoice_number: Some("INV-001".to_string()),
            expense_ref_id: Some("EXP-001".to_string()),
            created_at: now(),
            updated_at: now(),
        };
        let s = serde_json::to_string(&p).unwrap();
        let back: ContractPaymentSchedule = serde_json::from_str(&s).unwrap();
        assert_eq!(back.id, p.id);
        assert_eq!(back.payment_number, p.payment_number);
        assert_eq!(back.payment_amount, p.payment_amount);
        assert_eq!(back.invoice_number, p.invoice_number);
    }

    #[test]
    fn test_contract_payment_schedule_with_none() {
        let p = ContractPaymentSchedule {
            id: uid(),
            contract_id: uid(),
            payment_number: 2,
            payment_name: None,
            payment_percent: None,
            payment_amount: 0.0,
            due_date: now(),
            actual_payment_date: None,
            actual_payment_amount: None,
            status: "unpaid".to_string(),
            invoice_number: None,
            expense_ref_id: None,
            created_at: now(),
            updated_at: now(),
        };
        let s = serde_json::to_string(&p).unwrap();
        let back: ContractPaymentSchedule = serde_json::from_str(&s).unwrap();
        assert!(back.payment_name.is_none());
        assert!(back.actual_payment_date.is_none());
    }

    // ---- CreatePaymentScheduleRequest ----

    #[test]
    fn test_create_payment_schedule_request_roundtrip() {
        let r = CreatePaymentScheduleRequest {
            payment_number: 3,
            payment_name: Some("第二期".to_string()),
            payment_percent: Some(40.0),
            payment_amount: 40_000.0,
            due_date: "2024-06-30T00:00:00Z".to_string(),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreatePaymentScheduleRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.payment_number, r.payment_number);
        assert_eq!(back.payment_amount, r.payment_amount);
    }

    #[test]
    fn test_create_payment_schedule_request_minimal() {
        let r = CreatePaymentScheduleRequest {
            payment_number: 4,
            payment_name: None,
            payment_percent: None,
            payment_amount: 0.0,
            due_date: "2024-09-30T00:00:00Z".to_string(),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreatePaymentScheduleRequest = serde_json::from_str(&s).unwrap();
        assert!(back.payment_name.is_none());
    }

    // ---- ContractTemplate ----

    #[test]
    fn test_contract_template_roundtrip() {
        let t = ContractTemplate {
            id: uid(),
            name: "标准服务合同".to_string(),
            contract_type: "service".to_string(),
            description: Some("d".to_string()),
            content: serde_json::json!({"clause": "test"}),
            is_active: true,
            created_by: Some("u".to_string()),
            created_at: now(),
            updated_at: now(),
        };
        let s = serde_json::to_string(&t).unwrap();
        let back: ContractTemplate = serde_json::from_str(&s).unwrap();
        assert_eq!(back.id, t.id);
        assert_eq!(back.name, t.name);
        assert_eq!(back.is_active, t.is_active);
        assert_eq!(back.content, t.content);
    }

    #[test]
    fn test_contract_template_inactive_roundtrip() {
        let t = ContractTemplate {
            id: uid(),
            name: "n".to_string(),
            contract_type: "t".to_string(),
            description: None,
            content: serde_json::Value::Null,
            is_active: false,
            created_by: None,
            created_at: now(),
            updated_at: now(),
        };
        let s = serde_json::to_string(&t).unwrap();
        let back: ContractTemplate = serde_json::from_str(&s).unwrap();
        assert!(!back.is_active);
        assert_eq!(back.content, serde_json::Value::Null);
    }

    // ---- CreateContractTemplateRequest ----

    #[test]
    fn test_create_contract_template_request_roundtrip() {
        let r = CreateContractTemplateRequest {
            name: "新模板".to_string(),
            contract_type: "service".to_string(),
            description: Some("d".to_string()),
            content: serde_json::json!({"k": "v"}),
            created_by: Some("u".to_string()),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateContractTemplateRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.name, r.name);
        assert_eq!(back.content, r.content);
    }

    #[test]
    fn test_create_contract_template_request_minimal() {
        let r = CreateContractTemplateRequest {
            name: "x".to_string(),
            contract_type: "t".to_string(),
            description: None,
            content: serde_json::Value::Null,
            created_by: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateContractTemplateRequest = serde_json::from_str(&s).unwrap();
        assert!(back.description.is_none());
    }
}
