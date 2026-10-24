use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

// ============================================================
// V37.0 Phase 5 / V39.0 Phase 7: 凭证模块已整体迁移到 Finance 服务，
// ERP 凭证 CRUD 经 modules/finance_proxy.rs 代理到 Finance 服务。
//
// 2026-10-24 P3 死代码清理：以下 f64 死结构全仓零引用（实际 DB 写入用的是
// modules/finance.rs 本地 Decimal 结构；Finance 服务自有 entities 域模型），
// 已删除：
//   - FinancialVoucher / CreateFinancialVoucherRequest / UpdateFinancialVoucherRequest
//   - VoucherItem / VoucherItemRequest / U8VoucherImportRequest / U8VoucherData
//   - U8VoucherItem / VoucherImportResult
//   - VoucherTemplate / CreateVoucherTemplateRequest / UpdateVoucherTemplateRequest
//   - CollectionRecord / CreateCollectionRequest / PaymentRecord / CreatePaymentRequest
// 保留 AccountingSubject 家族（opening_balance.rs 经 query_as 使用）。
// ============================================================

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct AccountingSubject {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub category: String,
    pub level: i32,
    pub parent_code: Option<String>,
    pub description: Option<String>,
    pub is_cash_flow: bool,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateAccountingSubjectRequest {
    pub code: String,
    pub name: String,
    pub category: String,
    pub level: i32,
    pub parent_code: Option<String>,
    pub description: Option<String>,
    pub is_cash_flow: Option<bool>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdateAccountingSubjectRequest {
    pub name: Option<String>,
    pub category: Option<String>,
    pub parent_code: Option<String>,
    pub description: Option<String>,
    pub is_cash_flow: Option<bool>,
    pub status: Option<String>,
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    use super::*;
    use chrono::Utc;

    fn sample_uuid() -> Uuid {
        Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap()
    }

    // ========== AccountingSubject ==========
    #[test]
    fn test_accounting_subject_serde() {
        let s = AccountingSubject {
            id: sample_uuid(),
            code: "1001".into(),
            name: "库存现金".into(),
            category: "asset".into(),
            level: 1,
            parent_code: None,
            description: Some("现金科目".into()),
            is_cash_flow: true,
            status: "active".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let v = serde_json::to_value(&s).unwrap();
        let s2: AccountingSubject = serde_json::from_value(v).unwrap();
        assert_eq!(s.id, s2.id);
        assert_eq!(s.code, s2.code);
        assert_eq!(s.name, s2.name);
        assert_eq!(s.category, s2.category);
        assert_eq!(s.level, s2.level);
        assert_eq!(s.is_cash_flow, s2.is_cash_flow);
    }

    #[test]
    fn test_accounting_subject_level_3_with_parent() {
        let s = AccountingSubject {
            id: sample_uuid(),
            code: "10010101".into(),
            name: "人民币-基本户".into(),
            category: "asset".into(),
            level: 3,
            parent_code: Some("100101".into()),
            description: None,
            is_cash_flow: false,
            status: "inactive".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let st = serde_json::to_string(&s).unwrap();
        let s2: AccountingSubject = serde_json::from_str(&st).unwrap();
        assert_eq!(s2.level, 3);
        assert_eq!(s2.parent_code, Some("100101".into()));
        assert!(!s2.is_cash_flow);
    }

    #[test]
    fn test_create_accounting_subject_request_all_fields() {
        let r = CreateAccountingSubjectRequest {
            code: "2001".into(),
            name: "短期借款".into(),
            category: "liability".into(),
            level: 1,
            parent_code: None,
            description: Some("desc".into()),
            is_cash_flow: Some(false),
            status: Some("active".into()),
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: CreateAccountingSubjectRequest = serde_json::from_value(v).unwrap();
        assert_eq!(r.code, r2.code);
        assert_eq!(r.level, r2.level);
    }

    #[test]
    fn test_create_accounting_subject_request_minimal() {
        let r = CreateAccountingSubjectRequest {
            code: "c".into(),
            name: "n".into(),
            category: "cat".into(),
            level: 2,
            parent_code: Some("p".into()),
            description: None,
            is_cash_flow: None,
            status: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let r2: CreateAccountingSubjectRequest = serde_json::from_str(&s).unwrap();
        assert!(r2.is_cash_flow.is_none());
        assert!(r2.status.is_none());
    }

    #[test]
    fn test_update_accounting_subject_request_all_some() {
        let r = UpdateAccountingSubjectRequest {
            name: Some("新".into()),
            category: Some("equity".into()),
            parent_code: Some("p".into()),
            description: Some("d".into()),
            is_cash_flow: Some(true),
            status: Some("x".into()),
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: UpdateAccountingSubjectRequest = serde_json::from_value(v).unwrap();
        assert_eq!(r2.name, Some("新".into()));
        assert_eq!(r2.is_cash_flow, Some(true));
    }

    #[test]
    fn test_update_accounting_subject_all_none() {
        let r = UpdateAccountingSubjectRequest {
            name: None,
            category: None,
            parent_code: None,
            description: None,
            is_cash_flow: None,
            status: None,
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: UpdateAccountingSubjectRequest = serde_json::from_value(v).unwrap();
        assert!(r2.name.is_none());
    }
}
