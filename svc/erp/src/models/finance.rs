use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

use super::uuid_helpers::option_uuid;

// ============================================================
// V37.0 Phase 5: 已移除以下已迁移到 Finance 服务的类型
// - ExpenseStatus / ReceivableStatus / PayableStatus
// - Expense / CreateExpenseRequest / UpdateExpenseRequest
// - Budget / CreateBudgetRequest / UpdateBudgetRequest
// - Receivable / CreateReceivableRequest / UpdateReceivableRequest
// - Payable / CreatePayableRequest / UpdatePayableRequest
// - AccountBalance / AccountingPeriod
// - Reconciliation / CreateReconciliationRequest / ReconciliationRecord / ReconciliationRule / ReconciliationQuery
// ============================================================
// V39.0 Phase 7: 凭证模块完整迁移到 Finance 服务
// - Finance 服务已补全 update/delete/unpost 接口
// - ERP finance_proxy.rs 已补全凭证代理路由（update/delete/unpost/batch/export）
// - 凭证 CRUD 全部通过 /api/erp/finance/v2/vouchers/* 代理到 Finance 服务
// - 以下凭证相关类型仍被 ERP 本地 voucher 模块引用（modules/voucher/），
//   待 voucher 模块完全退役后方可删除
// - collections/payments/aging 模块不引用凭证类型，仅保留 voucher_id/voucher_no 字段关联
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

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct FinancialVoucher {
    pub id: Uuid,
    pub voucher_number: String,
    pub voucher_date: DateTime<Utc>,
    pub period: String,
    pub attachment_count: Option<i32>,
    pub summary: Option<String>,
    pub maker_id: Option<Uuid>,
    pub maker_name: Option<String>,
    pub checker_id: Option<Uuid>,
    pub checker_name: Option<String>,
    pub bookkeeper_id: Option<Uuid>,
    pub bookkeeper_name: Option<String>,
    pub status: String,
    pub total_debit: f64,
    pub total_credit: f64,
    pub source_system: Option<String>,
    pub source_id: Option<String>,
    pub project_id: Option<Uuid>,
    pub contract_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateFinancialVoucherRequest {
    pub voucher_number: String,
    pub voucher_date: DateTime<Utc>,
    pub period: String,
    pub attachment_count: Option<i32>,
    pub summary: Option<String>,
    #[serde(default, with = "option_uuid")]
    pub maker_id: Option<Uuid>,
    pub maker_name: Option<String>,
    #[serde(default, with = "option_uuid")]
    pub project_id: Option<Uuid>,
    #[serde(default, with = "option_uuid")]
    pub contract_id: Option<Uuid>,
    pub items: Vec<VoucherItemRequest>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdateFinancialVoucherRequest {
    pub voucher_date: Option<DateTime<Utc>>,
    pub period: Option<String>,
    pub attachment_count: Option<i32>,
    pub summary: Option<String>,
    #[serde(default, with = "option_uuid")]
    pub checker_id: Option<Uuid>,
    pub checker_name: Option<String>,
    #[serde(default, with = "option_uuid")]
    pub bookkeeper_id: Option<Uuid>,
    pub bookkeeper_name: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct VoucherItem {
    pub id: Uuid,
    pub voucher_id: Uuid,
    pub line_number: i32,
    pub subject_code: String,
    pub subject_name: String,
    pub summary: Option<String>,
    pub debit_amount: f64,
    pub credit_amount: f64,
    pub quantity: Option<f64>,
    pub unit: Option<String>,
    pub price: Option<f64>,
    pub department_id: Option<Uuid>,
    pub project_id: Option<Uuid>,
    pub contract_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct VoucherItemRequest {
    pub line_number: i32,
    pub subject_code: String,
    pub subject_name: Option<String>,
    pub summary: Option<String>,
    pub debit_amount: f64,
    pub credit_amount: f64,
    pub quantity: Option<f64>,
    pub unit: Option<String>,
    pub price: Option<f64>,
    #[serde(default, with = "option_uuid")]
    pub department_id: Option<Uuid>,
    #[serde(default, with = "option_uuid")]
    pub project_id: Option<Uuid>,
    #[serde(default, with = "option_uuid")]
    pub contract_id: Option<Uuid>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct U8VoucherImportRequest {
    pub file_name: String,
    pub file_content: String,
    pub import_mode: String,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct U8VoucherData {
    pub voucher_number: String,
    pub voucher_date: String,
    pub period: String,
    pub summary: String,
    pub maker: String,
    pub items: Vec<U8VoucherItem>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct U8VoucherItem {
    pub line_number: i32,
    pub subject_code: String,
    pub subject_name: String,
    pub summary: String,
    pub debit_amount: f64,
    pub credit_amount: f64,
    pub quantity: Option<f64>,
    pub unit: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct VoucherImportResult {
    pub success_count: i32,
    pub failed_count: i32,
    pub errors: Vec<String>,
    pub imported_vouchers: Vec<FinancialVoucher>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct VoucherTemplate {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub r#type: String,
    pub description: Option<String>,
    pub applicable_modules: Option<serde_json::Value>,
    pub applicable_companies: Option<serde_json::Value>,
    pub condition: Option<String>,
    pub entries: Option<serde_json::Value>,
    pub status: String,
    pub is_default: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateVoucherTemplateRequest {
    pub code: String,
    pub name: String,
    pub r#type: String,
    pub description: Option<String>,
    pub applicable_modules: Option<Vec<String>>,
    pub applicable_companies: Option<Vec<String>>,
    pub condition: Option<String>,
    pub entries: Vec<serde_json::Value>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdateVoucherTemplateRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub applicable_modules: Option<Vec<String>>,
    pub applicable_companies: Option<Vec<String>>,
    pub condition: Option<String>,
    pub entries: Option<Vec<serde_json::Value>>,
    pub status: Option<String>,
    pub is_default: Option<bool>,
}

// ============================================================
// 收款 / 付款记录（ERP 本地保留，未迁移到 Finance 服务）
// voucher_id / voucher_no 字段仅用于收付款与凭证的关联引用，
// 不依赖 FinancialVoucher 类型。
// ============================================================

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct CollectionRecord {
    pub id: Uuid,
    pub collection_no: String,
    pub customer_id: Option<Uuid>,
    pub customer_name: Option<String>,
    pub amount: f64,
    pub collection_date: Option<DateTime<Utc>>,
    pub invoice_ids: Option<serde_json::Value>,
    pub bank_account_id: Option<Uuid>,
    pub bank_account_no: Option<String>,
    pub bank_name: Option<String>,
    pub voucher_id: Option<Uuid>,
    pub voucher_no: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateCollectionRequest {
    pub collection_no: Option<String>,
    #[serde(default, with = "option_uuid")]
    pub customer_id: Option<Uuid>,
    pub customer_name: Option<String>,
    pub amount: f64,
    pub collection_date: Option<DateTime<Utc>>,
    pub invoice_ids: Option<Vec<String>>,
    #[serde(default, with = "option_uuid")]
    pub bank_account_id: Option<Uuid>,
    pub bank_account_no: Option<String>,
    pub bank_name: Option<String>,
    pub remark: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct PaymentRecord {
    pub id: Uuid,
    pub payment_no: String,
    pub supplier_id: Option<Uuid>,
    pub supplier_name: Option<String>,
    pub amount: f64,
    pub payment_date: Option<DateTime<Utc>>,
    pub invoice_ids: Option<serde_json::Value>,
    pub bank_account_id: Option<Uuid>,
    pub bank_account_no: Option<String>,
    pub bank_name: Option<String>,
    pub voucher_id: Option<Uuid>,
    pub voucher_no: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreatePaymentRequest {
    pub payment_no: Option<String>,
    #[serde(default, with = "option_uuid")]
    pub supplier_id: Option<Uuid>,
    pub supplier_name: Option<String>,
    pub amount: f64,
    pub payment_date: Option<DateTime<Utc>>,
    pub invoice_ids: Option<Vec<String>>,
    #[serde(default, with = "option_uuid")]
    pub bank_account_id: Option<Uuid>,
    pub bank_account_no: Option<String>,
    pub bank_name: Option<String>,
    pub remark: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use serde_json::json;

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

    // ========== FinancialVoucher ==========
    #[test]
    fn test_financial_voucher_serde_balanced() {
        let v = FinancialVoucher {
            id: sample_uuid(),
            voucher_number: "记-2025-0001".into(),
            voucher_date: Utc::now(),
            period: "2025-01".into(),
            attachment_count: Some(3),
            summary: Some("计提折旧".into()),
            maker_id: Some(sample_uuid()),
            maker_name: Some("张会计".into()),
            checker_id: None,
            checker_name: None,
            bookkeeper_id: None,
            bookkeeper_name: None,
            status: "draft".into(),
            total_debit: 10000.0,
            total_credit: 10000.0,
            source_system: None,
            source_id: None,
            project_id: None,
            contract_id: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let j = serde_json::to_value(&v).unwrap();
        let v2: FinancialVoucher = serde_json::from_value(j).unwrap();
        assert_eq!(v.voucher_number, v2.voucher_number);
        assert_eq!(v.period, v2.period);
        assert_eq!(v.total_debit, v2.total_debit);
        assert_eq!(v.total_credit, v2.total_credit);
        assert_eq!(v.status, v2.status);
    }

    #[test]
    fn test_financial_voucher_unbalanced_amounts() {
        let v = FinancialVoucher {
            id: sample_uuid(),
            voucher_number: "V-1".into(),
            voucher_date: Utc::now(),
            period: "2025-02".into(),
            attachment_count: None,
            summary: None,
            maker_id: None,
            maker_name: None,
            checker_id: None,
            checker_name: None,
            bookkeeper_id: None,
            bookkeeper_name: None,
            status: "error".into(),
            total_debit: 500.0,
            total_credit: 499.99,
            source_system: None,
            source_id: None,
            project_id: None,
            contract_id: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let s = serde_json::to_string(&v).unwrap();
        let v2: FinancialVoucher = serde_json::from_str(&s).unwrap();
        assert_eq!(v2.total_debit, 500.0);
        assert_eq!(v2.total_credit, 499.99);
    }

    #[test]
    fn test_financial_voucher_negative_amounts() {
        let v = FinancialVoucher {
            id: sample_uuid(),
            voucher_number: "V-RED".into(),
            voucher_date: Utc::now(),
            period: "2025-03".into(),
            attachment_count: Some(-1),
            summary: Some("红字冲销".into()),
            maker_id: None,
            maker_name: None,
            checker_id: None,
            checker_name: None,
            bookkeeper_id: None,
            bookkeeper_name: None,
            status: "posted".into(),
            total_debit: -1500.0,
            total_credit: -1500.0,
            source_system: Some("manual".into()),
            source_id: Some("src-1".into()),
            project_id: Some(sample_uuid()),
            contract_id: Some(sample_uuid()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let vv = serde_json::to_value(&v).unwrap();
        let v2: FinancialVoucher = serde_json::from_value(vv).unwrap();
        assert_eq!(v2.total_debit, -1500.0);
        assert_eq!(v2.source_system, Some("manual".into()));
        assert_eq!(v2.project_id, Some(sample_uuid()));
    }

    #[test]
    fn test_create_financial_voucher_request_with_items() {
        let r = CreateFinancialVoucherRequest {
            voucher_number: "NEW-001".into(),
            voucher_date: Utc::now(),
            period: "2025-06".into(),
            attachment_count: Some(2),
            summary: Some("采购入库".into()),
            maker_id: Some(sample_uuid()),
            maker_name: Some("李".into()),
            project_id: None,
            contract_id: None,
            items: vec![
                VoucherItemRequest {
                    line_number: 1,
                    subject_code: "1403".into(),
                    subject_name: Some("原材料".into()),
                    summary: None,
                    debit_amount: 1000.0,
                    credit_amount: 0.0,
                    quantity: Some(10.0),
                    unit: Some("kg".into()),
                    price: Some(100.0),
                    department_id: None,
                    project_id: None,
                    contract_id: None,
                },
                VoucherItemRequest {
                    line_number: 2,
                    subject_code: "2202".into(),
                    subject_name: Some("应付账款".into()),
                    summary: None,
                    debit_amount: 0.0,
                    credit_amount: 1000.0,
                    quantity: None,
                    unit: None,
                    price: None,
                    department_id: None,
                    project_id: None,
                    contract_id: None,
                },
            ],
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: CreateFinancialVoucherRequest = serde_json::from_value(v).unwrap();
        assert_eq!(r2.items.len(), 2);
        assert_eq!(r2.items[0].debit_amount, 1000.0);
        assert_eq!(r2.items[1].credit_amount, 1000.0);
        assert_eq!(r2.items[0].quantity, Some(10.0));
    }

    #[test]
    fn test_update_financial_voucher_request() {
        let r = UpdateFinancialVoucherRequest {
            voucher_date: Some(Utc::now()),
            period: Some("2025-07".into()),
            attachment_count: Some(5),
            summary: Some("修改摘要".into()),
            checker_id: Some(sample_uuid()),
            checker_name: Some("王审核".into()),
            bookkeeper_id: None,
            bookkeeper_name: None,
            status: Some("approved".into()),
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: UpdateFinancialVoucherRequest = serde_json::from_value(v).unwrap();
        assert_eq!(r2.period, Some("2025-07".into()));
        assert_eq!(r2.checker_name, Some("王审核".into()));
        assert_eq!(r2.status, Some("approved".into()));
    }

    // ========== VoucherItem ==========
    #[test]
    fn test_voucher_item_serde() {
        let i = VoucherItem {
            id: sample_uuid(),
            voucher_id: sample_uuid(),
            line_number: 5,
            subject_code: "6601".into(),
            subject_name: "销售费用".into(),
            summary: Some("广告费".into()),
            debit_amount: 5000.5,
            credit_amount: 0.0,
            quantity: None,
            unit: None,
            price: None,
            department_id: Some(sample_uuid()),
            project_id: None,
            contract_id: Some(sample_uuid()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let v = serde_json::to_value(&i).unwrap();
        let i2: VoucherItem = serde_json::from_value(v).unwrap();
        assert_eq!(i.line_number, i2.line_number);
        assert_eq!(i.debit_amount, i2.debit_amount);
        assert_eq!(i.department_id, i2.department_id);
    }

    #[test]
    fn test_voucher_item_request_zero_amounts() {
        let i = VoucherItemRequest {
            line_number: 1,
            subject_code: "x".into(),
            subject_name: None,
            summary: None,
            debit_amount: 0.0,
            credit_amount: 0.0,
            quantity: Some(0.0),
            unit: None,
            price: Some(0.0),
            department_id: None,
            project_id: None,
            contract_id: None,
        };
        let s = serde_json::to_string(&i).unwrap();
        let i2: VoucherItemRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(i2.debit_amount, 0.0);
        assert_eq!(i2.quantity, Some(0.0));
    }

    // ========== VoucherTemplate ==========
    #[test]
    fn test_voucher_template_serde() {
        let t = VoucherTemplate {
            id: sample_uuid(),
            code: "TPL-SALE".into(),
            name: "销售模板".into(),
            r#type: "auto".into(),
            description: Some("自动生成销售凭证".into()),
            applicable_modules: Some(json!(["sales"])),
            applicable_companies: Some(json!(["COMP-001"])),
            condition: Some("amount > 0".into()),
            entries: Some(json!([{"dr": "1122", "cr": "6001"}])),
            status: "active".into(),
            is_default: true,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            created_by: Some(sample_uuid()),
        };
        let v = serde_json::to_value(&t).unwrap();
        let t2: VoucherTemplate = serde_json::from_value(v).unwrap();
        assert_eq!(t.code, t2.code);
        assert_eq!(t.r#type, t2.r#type);
        assert_eq!(t.is_default, t2.is_default);
    }

    #[test]
    fn test_create_voucher_template_request() {
        let r = CreateVoucherTemplateRequest {
            code: "TPL-1".into(),
            name: "模板1".into(),
            r#type: "manual".into(),
            description: None,
            applicable_modules: Some(vec!["inv".into(), "po".into()]),
            applicable_companies: None,
            condition: Some("true".into()),
            entries: vec![json!({"a": 1}), json!({"b": 2})],
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: CreateVoucherTemplateRequest = serde_json::from_value(v).unwrap();
        assert_eq!(r2.entries.len(), 2);
        assert_eq!(r2.applicable_modules, Some(vec!["inv".into(), "po".into()]));
    }

    #[test]
    fn test_update_voucher_template_request_mixed() {
        let r = UpdateVoucherTemplateRequest {
            name: Some("新名".into()),
            description: None,
            applicable_modules: None,
            applicable_companies: Some(vec!["C1".into()]),
            condition: None,
            entries: Some(vec![]),
            status: Some("inactive".into()),
            is_default: Some(false),
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: UpdateVoucherTemplateRequest = serde_json::from_value(v).unwrap();
        assert_eq!(r2.name, Some("新名".into()));
        assert_eq!(r2.is_default, Some(false));
        assert_eq!(r2.entries, Some(vec![]));
    }

    // ========== U8 Voucher ==========
    #[test]
    fn test_u8_voucher_import_request() {
        let r = U8VoucherImportRequest {
            file_name: "vouchers.xlsx".into(),
            file_content: "base64data==".into(),
            import_mode: "append".into(),
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: U8VoucherImportRequest = serde_json::from_value(v).unwrap();
        assert_eq!(r2.file_name, "vouchers.xlsx");
    }

    #[test]
    fn test_u8_voucher_data_and_items() {
        let d = U8VoucherData {
            voucher_number: "U8-001".into(),
            voucher_date: "2025-01-15".into(),
            period: "2025-01".into(),
            summary: "U8导入".into(),
            maker: "USER1".into(),
            items: vec![
                U8VoucherItem {
                    line_number: 1,
                    subject_code: "1001".into(),
                    subject_name: "现金".into(),
                    summary: "借".into(),
                    debit_amount: 100.0,
                    credit_amount: 0.0,
                    quantity: None,
                    unit: None,
                },
                U8VoucherItem {
                    line_number: 2,
                    subject_code: "1002".into(),
                    subject_name: "银行".into(),
                    summary: "贷".into(),
                    debit_amount: 0.0,
                    credit_amount: 100.0,
                    quantity: Some(5.5),
                    unit: Some("件".into()),
                },
            ],
        };
        let s = serde_json::to_string(&d).unwrap();
        let d2: U8VoucherData = serde_json::from_str(&s).unwrap();
        assert_eq!(d2.items.len(), 2);
        assert_eq!(d2.items[1].quantity, Some(5.5));
    }

    #[test]
    fn test_voucher_import_result() {
        let r = VoucherImportResult {
            success_count: 5,
            failed_count: 2,
            errors: vec!["err1".into(), "err2".into()],
            imported_vouchers: vec![],
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: VoucherImportResult = serde_json::from_value(v).unwrap();
        assert_eq!(r2.success_count, 5);
        assert_eq!(r2.failed_count, 2);
        assert_eq!(r2.errors.len(), 2);
    }

    // ========== CollectionRecord ==========
    #[test]
    fn test_collection_record_full() {
        let c = CollectionRecord {
            id: sample_uuid(),
            collection_no: "COL-2025-001".into(),
            customer_id: Some(sample_uuid()),
            customer_name: Some("客户A".into()),
            amount: 50000.0,
            collection_date: Some(Utc::now()),
            invoice_ids: Some(json!(["INV-1", "INV-2"])),
            bank_account_id: Some(sample_uuid()),
            bank_account_no: Some("6222****1234".into()),
            bank_name: Some("工商银行".into()),
            voucher_id: None,
            voucher_no: None,
            status: "cleared".into(),
            created_at: Utc::now(),
            created_by: Some(sample_uuid()),
        };
        let v = serde_json::to_value(&c).unwrap();
        let c2: CollectionRecord = serde_json::from_value(v).unwrap();
        assert_eq!(c.collection_no, c2.collection_no);
        assert_eq!(c.amount, c2.amount);
        assert_eq!(c.customer_name, c2.customer_name);
    }

    #[test]
    fn test_collection_record_zero_and_negative() {
        let c = CollectionRecord {
            id: sample_uuid(),
            collection_no: "C-0".into(),
            customer_id: None,
            customer_name: None,
            amount: 0.0,
            collection_date: None,
            invoice_ids: None,
            bank_account_id: None,
            bank_account_no: None,
            bank_name: None,
            voucher_id: None,
            voucher_no: None,
            status: "pending".into(),
            created_at: Utc::now(),
            created_by: None,
        };
        let s = serde_json::to_string(&c).unwrap();
        let c2: CollectionRecord = serde_json::from_str(&s).unwrap();
        assert_eq!(c2.amount, 0.0);
        assert!(c2.customer_id.is_none());
    }

    #[test]
    fn test_create_collection_request() {
        let r = CreateCollectionRequest {
            collection_no: Some("NEW-C".into()),
            customer_id: Some(sample_uuid()),
            customer_name: Some("Cust".into()),
            amount: 9999.99,
            collection_date: None,
            invoice_ids: Some(vec!["I1".into()]),
            bank_account_id: None,
            bank_account_no: None,
            bank_name: None,
            remark: Some("备注".into()),
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: CreateCollectionRequest = serde_json::from_value(v).unwrap();
        assert_eq!(r2.amount, 9999.99);
        assert_eq!(r2.remark, Some("备注".into()));
    }

    // ========== PaymentRecord ==========
    #[test]
    fn test_payment_record_full() {
        let p = PaymentRecord {
            id: sample_uuid(),
            payment_no: "PAY-2025-008".into(),
            supplier_id: Some(sample_uuid()),
            supplier_name: Some("供应商B".into()),
            amount: -200.5,
            payment_date: Some(Utc::now()),
            invoice_ids: Some(json!(["INV-A"])),
            bank_account_id: Some(sample_uuid()),
            bank_account_no: Some("4321".into()),
            bank_name: Some("建行".into()),
            voucher_id: Some(sample_uuid()),
            voucher_no: Some("V-001".into()),
            status: "pending".into(),
            created_at: Utc::now(),
            created_by: None,
        };
        let v = serde_json::to_value(&p).unwrap();
        let p2: PaymentRecord = serde_json::from_value(v).unwrap();
        assert_eq!(p.payment_no, p2.payment_no);
        assert_eq!(p.amount, p2.amount);
        assert_eq!(p.voucher_no, p2.voucher_no);
    }

    #[test]
    fn test_create_payment_request_minimal() {
        let r = CreatePaymentRequest {
            payment_no: None,
            supplier_id: None,
            supplier_name: None,
            amount: 1234.56,
            payment_date: None,
            invoice_ids: None,
            bank_account_id: None,
            bank_account_no: None,
            bank_name: None,
            remark: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let r2: CreatePaymentRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(r2.amount, 1234.56);
        assert!(r2.payment_no.is_none());
    }

    #[test]
    fn test_create_payment_request_all_optionals() {
        let r = CreatePaymentRequest {
            payment_no: Some("PAY-NEW".into()),
            supplier_id: Some(sample_uuid()),
            supplier_name: Some("S".into()),
            amount: f64::MAX,
            payment_date: Some(Utc::now()),
            invoice_ids: Some(vec!["I1".into(), "I2".into()]),
            bank_account_id: Some(sample_uuid()),
            bank_account_no: Some("123".into()),
            bank_name: Some("银行".into()),
            remark: Some("rmk".into()),
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: CreatePaymentRequest = serde_json::from_value(v).unwrap();
        assert_eq!(r2.amount, f64::MAX);
        assert_eq!(r2.invoice_ids, Some(vec!["I1".into(), "I2".into()]));
    }
}
