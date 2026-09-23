use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

/// 项目费用行（DB row / 响应体）。
/// 列对齐 pm.project_expenses 真库：expense_type/amount/currency/expense_date/description/
/// status/approver/approved_date/created_by + 补列(phase_id/budget_item_id/resource_id/
/// expense_ref_id/approval_workflow_id/attachment_ids)。
/// 代码侧改名：incurred_date->expense_date, paid_date->approved_date, approved_by->approver；
/// category/subcategory/reported_date 表无独立列，已删除（类型由 expense_type 承载）。
#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ProjectExpense {
    pub id: Uuid,
    pub project_id: Uuid,
    pub phase_id: Option<Uuid>,
    pub expense_type: String,
    pub description: Option<String>,
    pub amount: f64,
    pub currency: Option<String>,
    pub expense_date: DateTime<Utc>,
    pub approved_date: Option<DateTime<Utc>>,
    pub budget_item_id: Option<Uuid>,
    pub resource_id: Option<Uuid>,
    pub expense_ref_id: Option<String>,
    pub status: Option<String>,
    pub approval_workflow_id: Option<Uuid>,
    pub attachment_ids: Option<Vec<Uuid>>,
    pub created_by: Option<String>,
    pub approver: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateExpenseRequest {
    pub phase_id: Option<Uuid>,
    pub expense_type: String,
    pub description: Option<String>,
    pub amount: f64,
    pub currency: Option<String>,
    pub expense_date: NaiveDate,
    pub budget_item_id: Option<Uuid>,
    pub resource_id: Option<Uuid>,
    pub expense_ref_id: Option<String>,
    pub approval_workflow_id: Option<Uuid>,
    pub attachment_ids: Option<Vec<Uuid>>,
    pub created_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateExpenseRequest {
    pub expense_type: Option<String>,
    pub description: Option<String>,
    pub amount: Option<f64>,
    pub approved_date: Option<NaiveDate>,
    pub status: Option<String>,
    pub approver: Option<String>,
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

    fn sample_date() -> NaiveDate {
        NaiveDate::from_ymd_opt(2024, 6, 15).unwrap()
    }

    // ---- ProjectExpense ----

    fn sample_expense() -> ProjectExpense {
        ProjectExpense {
            id: uid(),
            project_id: uid(),
            phase_id: Some(uid()),
            expense_type: "material".to_string(),
            description: Some("钢材采购".to_string()),
            amount: 50_000.0,
            currency: Some("CNY".to_string()),
            expense_date: now(),
            approved_date: Some(now()),
            budget_item_id: Some(uid()),
            resource_id: Some(uid()),
            expense_ref_id: Some("EXP-001".to_string()),
            status: Some("approved".to_string()),
            approval_workflow_id: Some(uid()),
            attachment_ids: Some(vec![uid(), uid()]),
            created_by: Some("u1".to_string()),
            approver: Some("boss".to_string()),
            created_at: now(),
            updated_at: now(),
        }
    }

    #[test]
    fn test_project_expense_serde_roundtrip() {
        let e = sample_expense();
        let s = serde_json::to_string(&e).unwrap();
        let back: ProjectExpense = serde_json::from_str(&s).unwrap();
        assert_eq!(back.id, e.id);
        assert_eq!(back.expense_type, e.expense_type);
        assert_eq!(back.amount, e.amount);
        assert_eq!(back.attachment_ids, e.attachment_ids);
    }

    #[test]
    fn test_project_expense_clone_preserves_fields() {
        let e = sample_expense();
        let c = e.clone();
        assert_eq!(c.id, e.id);
        assert_eq!(c.amount, e.amount);
        assert_eq!(c.attachment_ids, e.attachment_ids);
    }

    #[test]
    fn test_project_expense_with_none_optional() {
        let e = ProjectExpense {
            id: uid(),
            project_id: uid(),
            phase_id: None,
            expense_type: "labor".to_string(),
            description: None,
            amount: 0.0,
            currency: None,
            expense_date: now(),
            approved_date: None,
            budget_item_id: None,
            resource_id: None,
            expense_ref_id: None,
            status: None,
            approval_workflow_id: None,
            attachment_ids: None,
            created_by: None,
            approver: None,
            created_at: now(),
            updated_at: now(),
        };
        let s = serde_json::to_string(&e).unwrap();
        let back: ProjectExpense = serde_json::from_str(&s).unwrap();
        assert!(back.phase_id.is_none());
        assert!(back.attachment_ids.is_none());
    }

    #[test]
    fn test_project_expense_empty_attachments_roundtrip() {
        let mut e = sample_expense();
        e.attachment_ids = Some(vec![]);
        let s = serde_json::to_string(&e).unwrap();
        let back: ProjectExpense = serde_json::from_str(&s).unwrap();
        assert_eq!(back.attachment_ids.as_ref().unwrap().len(), 0);
    }

    #[test]
    fn test_project_expense_negative_amount_roundtrip() {
        let mut e = sample_expense();
        e.amount = -100.0;
        let s = serde_json::to_string(&e).unwrap();
        let back: ProjectExpense = serde_json::from_str(&s).unwrap();
        assert_eq!(back.amount, -100.0);
    }

    #[test]
    fn test_project_expense_multi_attachments_roundtrip() {
        let mut e = sample_expense();
        e.attachment_ids = Some(vec![uid(); 5]);
        let s = serde_json::to_string(&e).unwrap();
        let back: ProjectExpense = serde_json::from_str(&s).unwrap();
        assert_eq!(back.attachment_ids.as_ref().unwrap().len(), 5);
    }

    // ---- CreateExpenseRequest ----

    #[test]
    fn test_create_expense_request_roundtrip() {
        let r = CreateExpenseRequest {
            phase_id: Some(uid()),
            expense_type: "equipment".to_string(),
            description: Some("d".to_string()),
            amount: 12_345.67,
            currency: Some("USD".to_string()),
            expense_date: sample_date(),
            budget_item_id: Some(uid()),
            resource_id: Some(uid()),
            expense_ref_id: Some("REF".to_string()),
            approval_workflow_id: Some(uid()),
            attachment_ids: Some(vec![uid()]),
            created_by: Some("u".to_string()),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateExpenseRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.expense_type, r.expense_type);
        assert_eq!(back.amount, r.amount);
        assert_eq!(back.attachment_ids, r.attachment_ids);
    }

    #[test]
    fn test_create_expense_request_minimal() {
        let r = CreateExpenseRequest {
            phase_id: None,
            expense_type: "misc".to_string(),
            description: None,
            amount: 0.0,
            currency: None,
            expense_date: sample_date(),
            budget_item_id: None,
            resource_id: None,
            expense_ref_id: None,
            approval_workflow_id: None,
            attachment_ids: None,
            created_by: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateExpenseRequest = serde_json::from_str(&s).unwrap();
        assert!(back.phase_id.is_none());
        assert!(back.attachment_ids.is_none());
    }

    // ---- UpdateExpenseRequest ----

    #[test]
    fn test_update_expense_request_all_none() {
        let r = UpdateExpenseRequest {
            expense_type: None,
            description: None,
            amount: None,
            approved_date: None,
            status: None,
            approver: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: UpdateExpenseRequest = serde_json::from_str(&s).unwrap();
        assert!(back.expense_type.is_none());
        assert!(back.amount.is_none());
    }

    #[test]
    fn test_update_expense_request_with_values() {
        let r = UpdateExpenseRequest {
            expense_type: Some("travel".to_string()),
            description: Some("d".to_string()),
            amount: Some(999.99),
            approved_date: Some(sample_date()),
            status: Some("paid".to_string()),
            approver: Some("a".to_string()),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: UpdateExpenseRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.expense_type, r.expense_type);
        assert_eq!(back.amount, r.amount);
        assert_eq!(back.approved_date, r.approved_date);
    }

    #[test]
    fn test_project_expense_naive_date_roundtrip() {
        let mut e = sample_expense();
        e.expense_date = DateTime::<Utc>::from_naive_utc_and_offset(
            NaiveDate::from_ymd_opt(2020, 12, 31).unwrap().and_hms_opt(0, 0, 0).unwrap(),
            Utc,
        );
        let s = serde_json::to_string(&e).unwrap();
        let back: ProjectExpense = serde_json::from_str(&s).unwrap();
        assert_eq!(back.expense_date, e.expense_date);
    }
}
