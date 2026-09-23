use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// 决算行（DB row / 响应体）。
/// 列对齐 pm.settlements 真库：settlement_no/settlement_type/settlement_date/amount/currency/
/// status/remarks/created_by + 补列(settlement_name/settlement_period_start/
/// settlement_period_end/approved_at)。
/// 代码改名：settlement_code->settlement_no, description->remarks, actual_amount->amount；
/// budget_amount/variance_* 表无列，已删除。
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Settlement {
    pub id: Uuid,
    pub project_id: Uuid,
    pub settlement_no: Option<String>,
    pub settlement_name: Option<String>,
    pub settlement_type: String,
    pub status: String,
    pub settlement_date: DateTime<Utc>,
    pub amount: f64,
    pub currency: Option<String>,
    pub remarks: Option<String>,
    pub settlement_period_start: Option<DateTime<Utc>>,
    pub settlement_period_end: Option<DateTime<Utc>>,
    pub approved_at: Option<DateTime<Utc>>,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateSettlementRequest {
    pub settlement_code: Option<String>,
    pub settlement_name: String,
    pub settlement_type: String,
    pub settlement_period_start: Option<String>,
    pub settlement_period_end: Option<String>,
    pub description: Option<String>,
    pub created_by: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateSettlementRequest {
    pub settlement_name: Option<String>,
    pub status: Option<String>,
    pub actual_amount: Option<f64>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct SettlementItem {
    pub id: Uuid,
    pub settlement_id: Uuid,
    pub item_code: Option<String>,
    pub item_name: String,
    pub category: Option<String>,
    pub budget_amount: f64,
    pub actual_amount: f64,
    pub variance_amount: f64,
    pub variance_percent: Option<f64>,
    pub description: Option<String>,
    pub expense_ref_id: Option<String>,
    pub contract_ref_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateSettlementItemRequest {
    pub item_code: Option<String>,
    pub item_name: String,
    pub category: Option<String>,
    pub budget_amount: f64,
    pub actual_amount: f64,
    pub description: Option<String>,
    pub expense_ref_id: Option<String>,
    pub contract_ref_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateSettlementItemRequest {
    pub item_name: Option<String>,
    pub category: Option<String>,
    pub actual_amount: Option<f64>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct SettlementAdjustment {
    pub id: Uuid,
    pub settlement_id: Uuid,
    pub adjustment_type: String,
    pub adjustment_code: Option<String>,
    pub description: Option<String>,
    pub amount: f64,
    pub reason: Option<String>,
    pub supporting_documents: Option<serde_json::Value>,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateSettlementAdjustmentRequest {
    pub adjustment_type: String,
    pub adjustment_code: Option<String>,
    pub description: Option<String>,
    pub amount: f64,
    pub reason: Option<String>,
    pub supporting_documents: Option<serde_json::Value>,
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

    // ---- Settlement ----

    fn sample_settlement() -> Settlement {
        Settlement {
            id: uid(),
            project_id: uid(),
            settlement_no: Some("STL-001".to_string()),
            settlement_name: Some("月度结算".to_string()),
            settlement_type: "monthly".to_string(),
            status: "draft".to_string(),
            settlement_date: now(),
            amount: 95_000.0,
            currency: Some("CNY".to_string()),
            remarks: Some("d".to_string()),
            settlement_period_start: Some(now()),
            settlement_period_end: Some(now()),
            approved_at: Some(now()),
            created_by: Some("admin".to_string()),
            created_at: now(),
            updated_at: now(),
        }
    }

    #[test]
    fn test_settlement_serde_roundtrip() {
        let s = sample_settlement();
        let ser = serde_json::to_string(&s).unwrap();
        let back: Settlement = serde_json::from_str(&ser).unwrap();
        assert_eq!(back.id, s.id);
        assert_eq!(back.settlement_name, s.settlement_name);
        assert_eq!(back.settlement_type, s.settlement_type);
        assert_eq!(back.status, s.status);
        assert_eq!(back.amount, s.amount);
    }

    #[test]
    fn test_settlement_with_none_optional() {
        let s = Settlement {
            id: uid(),
            project_id: uid(),
            settlement_no: None,
            settlement_name: None,
            settlement_type: "final".to_string(),
            status: "draft".to_string(),
            settlement_date: now(),
            amount: 0.0,
            currency: None,
            remarks: None,
            settlement_period_start: None,
            settlement_period_end: None,
            approved_at: None,
            created_by: None,
            created_at: now(),
            updated_at: now(),
        };
        let ser = serde_json::to_string(&s).unwrap();
        let back: Settlement = serde_json::from_str(&ser).unwrap();
        assert!(back.settlement_no.is_none());
        assert!(back.approved_at.is_none());
    }

    #[test]
    fn test_settlement_approved_status_roundtrip() {
        let mut s = sample_settlement();
        s.status = "approved".to_string();
        let ser = serde_json::to_string(&s).unwrap();
        let back: Settlement = serde_json::from_str(&ser).unwrap();
        assert_eq!(back.status, "approved");
    }

    // ---- CreateSettlementRequest ----

    #[test]
    fn test_create_settlement_request_roundtrip() {
        let r = CreateSettlementRequest {
            settlement_code: Some("STL-002".to_string()),
            settlement_name: "新结算".to_string(),
            settlement_type: "quarterly".to_string(),
            settlement_period_start: Some("2026-01-01".to_string()),
            settlement_period_end: Some("2026-03-31".to_string()),
            description: Some("d".to_string()),
            created_by: Some("u".to_string()),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateSettlementRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.settlement_name, r.settlement_name);
        assert_eq!(back.settlement_type, r.settlement_type);
    }

    #[test]
    fn test_create_settlement_request_minimal() {
        let r = CreateSettlementRequest {
            settlement_code: None,
            settlement_name: "n".to_string(),
            settlement_type: "final".to_string(),
            settlement_period_start: None,
            settlement_period_end: None,
            description: None,
            created_by: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateSettlementRequest = serde_json::from_str(&s).unwrap();
        assert!(back.settlement_code.is_none());
        assert!(back.description.is_none());
    }

    // ---- UpdateSettlementRequest ----

    #[test]
    fn test_update_settlement_request_all_none() {
        let r = UpdateSettlementRequest {
            settlement_name: None,
            status: None,
            actual_amount: None,
            description: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: UpdateSettlementRequest = serde_json::from_str(&s).unwrap();
        assert!(back.settlement_name.is_none());
        assert!(back.actual_amount.is_none());
    }

    #[test]
    fn test_update_settlement_request_with_values() {
        let r = UpdateSettlementRequest {
            settlement_name: Some("updated".to_string()),
            status: Some("approved".to_string()),
            actual_amount: Some(99_000.0),
            description: Some("d".to_string()),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: UpdateSettlementRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.settlement_name, r.settlement_name);
        assert_eq!(back.actual_amount, r.actual_amount);
    }

    // ---- SettlementItem ----

    fn sample_item() -> SettlementItem {
        SettlementItem {
            id: uid(),
            settlement_id: uid(),
            item_code: Some("SI-001".to_string()),
            item_name: "人力成本".to_string(),
            category: Some("labor".to_string()),
            budget_amount: 50_000.0,
            actual_amount: 48_000.0,
            variance_amount: -2_000.0,
            variance_percent: Some(-4.0),
            description: Some("d".to_string()),
            expense_ref_id: Some("exp-001".to_string()),
            contract_ref_id: Some("con-001".to_string()),
            created_at: now(),
            updated_at: now(),
        }
    }

    #[test]
    fn test_settlement_item_serde_roundtrip() {
        let i = sample_item();
        let s = serde_json::to_string(&i).unwrap();
        let back: SettlementItem = serde_json::from_str(&s).unwrap();
        assert_eq!(back.id, i.id);
        assert_eq!(back.item_name, i.item_name);
        assert_eq!(back.budget_amount, i.budget_amount);
        assert_eq!(back.actual_amount, i.actual_amount);
        assert_eq!(back.variance_amount, i.variance_amount);
        assert_eq!(back.variance_percent, i.variance_percent);
    }

    #[test]
    fn test_settlement_item_with_none_optional() {
        let i = SettlementItem {
            id: uid(),
            settlement_id: uid(),
            item_code: None,
            item_name: "n".to_string(),
            category: None,
            budget_amount: 0.0,
            actual_amount: 0.0,
            variance_amount: 0.0,
            variance_percent: None,
            description: None,
            expense_ref_id: None,
            contract_ref_id: None,
            created_at: now(),
            updated_at: now(),
        };
        let s = serde_json::to_string(&i).unwrap();
        let back: SettlementItem = serde_json::from_str(&s).unwrap();
        assert!(back.item_code.is_none());
        assert!(back.variance_percent.is_none());
    }

    #[test]
    fn test_settlement_item_positive_variance_roundtrip() {
        let mut i = sample_item();
        i.variance_amount = 3_000.0;
        i.variance_percent = Some(6.0);
        let s = serde_json::to_string(&i).unwrap();
        let back: SettlementItem = serde_json::from_str(&s).unwrap();
        assert_eq!(back.variance_amount, 3_000.0);
        assert_eq!(back.variance_percent, Some(6.0));
    }

    // ---- CreateSettlementItemRequest ----

    #[test]
    fn test_create_settlement_item_request_roundtrip() {
        let r = CreateSettlementItemRequest {
            item_code: Some("SI-002".to_string()),
            item_name: "材料费".to_string(),
            category: Some("material".to_string()),
            budget_amount: 30_000.0,
            actual_amount: 28_000.0,
            description: Some("d".to_string()),
            expense_ref_id: Some("e1".to_string()),
            contract_ref_id: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateSettlementItemRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.item_name, r.item_name);
        assert_eq!(back.budget_amount, r.budget_amount);
        assert_eq!(back.actual_amount, r.actual_amount);
    }

    #[test]
    fn test_create_settlement_item_request_minimal() {
        let r = CreateSettlementItemRequest {
            item_code: None,
            item_name: "n".to_string(),
            category: None,
            budget_amount: 0.0,
            actual_amount: 0.0,
            description: None,
            expense_ref_id: None,
            contract_ref_id: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateSettlementItemRequest = serde_json::from_str(&s).unwrap();
        assert!(back.item_name == "n");
        assert!(back.category.is_none());
    }

    // ---- UpdateSettlementItemRequest ----

    #[test]
    fn test_update_settlement_item_request_all_none() {
        let r = UpdateSettlementItemRequest {
            item_name: None,
            category: None,
            actual_amount: None,
            description: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: UpdateSettlementItemRequest = serde_json::from_str(&s).unwrap();
        assert!(back.item_name.is_none());
        assert!(back.description.is_none());
    }

    #[test]
    fn test_update_settlement_item_request_with_values() {
        let r = UpdateSettlementItemRequest {
            item_name: Some("updated".to_string()),
            category: Some("other".to_string()),
            actual_amount: Some(35_000.0),
            description: Some("d".to_string()),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: UpdateSettlementItemRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.item_name, r.item_name);
        assert_eq!(back.actual_amount, r.actual_amount);
    }

    // ---- SettlementAdjustment ----

    #[test]
    fn test_settlement_adjustment_serde_roundtrip() {
        let a = SettlementAdjustment {
            id: uid(),
            settlement_id: uid(),
            adjustment_type: "increase".to_string(),
            adjustment_code: Some("ADJ-001".to_string()),
            description: Some("增加预算".to_string()),
            amount: 5_000.0,
            reason: Some("材料涨价".to_string()),
            supporting_documents: Some(serde_json::json!(["doc1.pdf", "doc2.pdf"])),
            created_by: Some("admin".to_string()),
            created_at: now(),
        };
        let s = serde_json::to_string(&a).unwrap();
        let back: SettlementAdjustment = serde_json::from_str(&s).unwrap();
        assert_eq!(back.id, a.id);
        assert_eq!(back.adjustment_type, a.adjustment_type);
        assert_eq!(back.amount, a.amount);
        assert_eq!(back.supporting_documents, a.supporting_documents);
    }

    #[test]
    fn test_settlement_adjustment_with_none_optional() {
        let a = SettlementAdjustment {
            id: uid(),
            settlement_id: uid(),
            adjustment_type: "decrease".to_string(),
            adjustment_code: None,
            description: None,
            amount: -2_000.0,
            reason: None,
            supporting_documents: None,
            created_by: None,
            created_at: now(),
        };
        let s = serde_json::to_string(&a).unwrap();
        let back: SettlementAdjustment = serde_json::from_str(&s).unwrap();
        assert!(back.adjustment_code.is_none());
        assert!(back.supporting_documents.is_none());
    }

    #[test]
    fn test_settlement_adjustment_negative_amount_roundtrip() {
        let a = SettlementAdjustment {
            id: uid(),
            settlement_id: uid(),
            adjustment_type: "decrease".to_string(),
            adjustment_code: Some("ADJ-002".to_string()),
            description: Some("减少预算".to_string()),
            amount: -3_000.0,
            reason: Some("节约成本".to_string()),
            supporting_documents: None,
            created_by: Some("u".to_string()),
            created_at: now(),
        };
        let s = serde_json::to_string(&a).unwrap();
        let back: SettlementAdjustment = serde_json::from_str(&s).unwrap();
        assert_eq!(back.amount, -3_000.0);
    }

    // ---- CreateSettlementAdjustmentRequest ----

    #[test]
    fn test_create_settlement_adjustment_request_roundtrip() {
        let r = CreateSettlementAdjustmentRequest {
            adjustment_type: "increase".to_string(),
            adjustment_code: Some("ADJ-003".to_string()),
            description: Some("d".to_string()),
            amount: 10_000.0,
            reason: Some("新增需求".to_string()),
            supporting_documents: Some(serde_json::json!(["doc.pdf"])),
            created_by: Some("u".to_string()),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateSettlementAdjustmentRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.adjustment_type, r.adjustment_type);
        assert_eq!(back.amount, r.amount);
        assert_eq!(back.supporting_documents, r.supporting_documents);
    }

    #[test]
    fn test_create_settlement_adjustment_request_minimal() {
        let r = CreateSettlementAdjustmentRequest {
            adjustment_type: "decrease".to_string(),
            adjustment_code: None,
            description: None,
            amount: -1_000.0,
            reason: None,
            supporting_documents: None,
            created_by: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateSettlementAdjustmentRequest = serde_json::from_str(&s).unwrap();
        assert!(back.adjustment_code.is_none());
        assert!(back.reason.is_none());
    }
}
