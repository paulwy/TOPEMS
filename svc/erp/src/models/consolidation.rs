use serde::{Deserialize, Serialize};
use sqlx::FromRow;

// ==================== 合并范围 ====================
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ConsolidationScope {
    pub id: uuid::Uuid,
    pub tenant_id: uuid::Uuid,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub consolidation_method: String,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
    pub created_by: Option<uuid::Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateConsolidationScopeRequest {
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub consolidation_method: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateConsolidationScopeRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub consolidation_method: Option<String>,
    pub status: Option<String>,
}

// ==================== 合并范围公司 ====================
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ConsolidationScopeCompany {
    pub id: uuid::Uuid,
    pub tenant_id: uuid::Uuid,
    pub scope_id: uuid::Uuid,
    pub company_id: uuid::Uuid,
    pub company_code: Option<String>,
    pub company_name: Option<String>,
    pub is_parent: bool,
    pub control_type: String,
    pub ownership_percentage: rust_decimal::Decimal,
    pub consolidation_percentage: rust_decimal::Decimal,
    pub minority_interest: rust_decimal::Decimal,
    pub effective_date: Option<chrono::NaiveDate>,
    pub expiry_date: Option<chrono::NaiveDate>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddScopeCompanyRequest {
    pub scope_id: uuid::Uuid,
    pub company_id: uuid::Uuid,
    pub is_parent: Option<bool>,
    pub control_type: String,
    pub ownership_percentage: f64,
    pub consolidation_percentage: Option<f64>,
    pub minority_interest: Option<f64>,
    pub effective_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateScopeCompanyRequest {
    pub control_type: Option<String>,
    pub ownership_percentage: Option<f64>,
    pub consolidation_percentage: Option<f64>,
    pub minority_interest: Option<f64>,
    pub expiry_date: Option<String>,
}

// ==================== 抵消规则 ====================
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct EliminationRule {
    pub id: uuid::Uuid,
    pub tenant_id: uuid::Uuid,
    pub scope_id: uuid::Uuid,
    pub code: String,
    pub name: String,
    pub r#type: String,
    pub description: Option<String>,
    pub status: String,
    pub direction: String,
    pub debit_account_codes: Option<serde_json::Value>,
    pub credit_account_codes: Option<serde_json::Value>,
    pub company_pairs: Option<serde_json::Value>,
    pub auto_elimination: bool,
    pub priority: i32,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateEliminationRuleRequest {
    pub scope_id: uuid::Uuid,
    pub code: String,
    pub name: String,
    pub r#type: String,
    pub description: Option<String>,
    pub status: Option<String>,
    pub direction: Option<String>,
    pub debit_account_codes: Option<Vec<String>>,
    pub credit_account_codes: Option<Vec<String>>,
    pub company_pairs: Option<serde_json::Value>,
    pub auto_elimination: Option<bool>,
    pub priority: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateEliminationRuleRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub direction: Option<String>,
    pub debit_account_codes: Option<Vec<String>>,
    pub credit_account_codes: Option<Vec<String>>,
    pub company_pairs: Option<serde_json::Value>,
    pub auto_elimination: Option<bool>,
    pub priority: Option<i32>,
}

// ==================== 内部交易 ====================
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct InternalTransaction {
    pub id: uuid::Uuid,
    pub tenant_id: uuid::Uuid,
    pub transaction_no: String,
    pub transaction_date: chrono::NaiveDate,
    pub period: String,
    pub from_company_id: uuid::Uuid,
    pub from_company_name: Option<String>,
    pub to_company_id: uuid::Uuid,
    pub to_company_name: Option<String>,
    pub transaction_type: String,
    pub description: Option<String>,
    pub amount: rust_decimal::Decimal,
    pub currency: String,
    pub elimination_status: String,
    pub eliminated_amount: rust_decimal::Decimal,
    pub remaining_amount: rust_decimal::Decimal,
    pub voucher_id: Option<uuid::Uuid>,
    pub elimination_voucher_id: Option<uuid::Uuid>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecuteEliminationRequest {
    pub scope_id: uuid::Uuid,
    pub period: String,
    pub rule_ids: Option<Vec<uuid::Uuid>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EliminationResult {
    pub eliminated_count: i64,
    pub total_eliminated: f64,
    pub results: Vec<RuleEliminationResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuleEliminationResult {
    pub rule_id: uuid::Uuid,
    pub rule_name: String,
    pub rule_type: String,
    pub transaction_count: i64,
    pub total_eliminated: f64,
    pub success: bool,
    pub error_message: Option<String>,
}

// ==================== 合并报表 ====================
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ConsolidationReport {
    pub id: uuid::Uuid,
    pub tenant_id: uuid::Uuid,
    pub report_no: String,
    pub report_type: String,
    pub scope_id: uuid::Uuid,
    pub scope_name: Option<String>,
    pub period: String,
    pub year: i32,
    pub quarter: Option<i32>,
    pub month: Option<i32>,
    pub status: String,
    pub company_count: i32,
    pub eliminated_company_count: i32,
    pub total_assets: Option<rust_decimal::Decimal>,
    pub total_liabilities: Option<rust_decimal::Decimal>,
    pub total_equity: Option<rust_decimal::Decimal>,
    pub total_revenue: Option<rust_decimal::Decimal>,
    pub total_profit: Option<rust_decimal::Decimal>,
    pub net_profit: Option<rust_decimal::Decimal>,
    pub minority_interest: Option<rust_decimal::Decimal>,
    pub parent_net_profit: Option<rust_decimal::Decimal>,
    pub approval_status: String,
    pub approved_by: Option<uuid::Uuid>,
    pub approved_at: Option<chrono::DateTime<chrono::Utc>>,
    pub published_by: Option<uuid::Uuid>,
    pub published_at: Option<chrono::DateTime<chrono::Utc>>,
    pub generated_by: Option<uuid::Uuid>,
    pub generated_at: Option<chrono::DateTime<chrono::Utc>>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerateConsolidationReportRequest {
    pub scope_id: uuid::Uuid,
    pub report_type: String,
    pub period: String,
    pub include_prior_period: Option<bool>,
    pub auto_eliminate: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ConsolidationReportLine {
    pub id: uuid::Uuid,
    pub tenant_id: uuid::Uuid,
    pub report_id: uuid::Uuid,
    pub line_no: i32,
    pub item_code: Option<String>,
    pub item_name: String,
    pub item_level: i32,
    pub current_period: rust_decimal::Decimal,
    pub prior_period: Option<rust_decimal::Decimal>,
    pub company_breakdown: Option<serde_json::Value>,
    pub elimination_breakdown: Option<serde_json::Value>,
    pub formula: Option<String>,
    pub notes: Option<String>,
}

// ==================== 公司关系 ====================
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CompanyRelation {
    pub id: uuid::Uuid,
    pub tenant_id: uuid::Uuid,
    pub parent_company_id: uuid::Uuid,
    pub parent_company_name: Option<String>,
    pub child_company_id: uuid::Uuid,
    pub child_company_name: Option<String>,
    pub relation_type: String,
    pub ownership_percentage: rust_decimal::Decimal,
    pub control_percentage: rust_decimal::Decimal,
    pub effective_date: chrono::NaiveDate,
    pub expiry_date: Option<chrono::NaiveDate>,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompanyTreeNode {
    pub id: uuid::Uuid,
    pub name: String,
    pub code: String,
    pub level: i32,
    pub is_parent: bool,
    pub relation_type: String,
    pub ownership_percentage: f64,
    pub children: Vec<CompanyTreeNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateCompanyRelationRequest {
    pub parent_company_id: uuid::Uuid,
    pub child_company_id: uuid::Uuid,
    pub relation_type: String,
    pub ownership_percentage: f64,
    pub control_percentage: Option<f64>,
    pub effective_date: String,
    pub expiry_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateCompanyRelationRequest {
    pub ownership_percentage: Option<f64>,
    pub control_percentage: Option<f64>,
    pub expiry_date: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompanyFinancialData {
    pub company_id: uuid::Uuid,
    pub company_name: String,
    pub period: String,
    pub current_assets: f64,
    pub non_current_assets: f64,
    pub total_assets: f64,
    pub current_liabilities: f64,
    pub non_current_liabilities: f64,
    pub total_liabilities: f64,
    pub paid_in_capital: f64,
    pub capital_reserve: f64,
    pub surplus_reserve: f64,
    pub undistributed_profit: f64,
    pub total_equity: f64,
    pub revenue: f64,
    pub cost_of_goods_sold: f64,
    pub gross_profit: f64,
    pub operating_profit: f64,
    pub profit_before_tax: f64,
    pub net_profit: f64,
    pub operating_cash_flow: f64,
    pub investing_cash_flow: f64,
    pub financing_cash_flow: f64,
    pub net_cash_flow: f64,
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use rust_decimal::Decimal;
    use serde::Serialize;
    use serde_json::Value;
    use uuid::Uuid;

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn struct_consolidation_scope() {
        roundtrip(&ConsolidationScope {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            code: "SCOPE-001".into(),
            name: "集团合并范围".into(),
            description: Some("测试合并范围".into()),
            consolidation_method: "full".into(),
            status: "active".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            created_by: Some(Uuid::new_v4()),
        });
    }

    #[test]
    fn struct_create_consolidation_scope_request() {
        roundtrip(&CreateConsolidationScopeRequest {
            code: "SCOPE-002".into(),
            name: "新范围".into(),
            description: None,
            consolidation_method: Some("equity".into()),
        });
    }

    #[test]
    fn struct_update_consolidation_scope_request() {
        roundtrip(&UpdateConsolidationScopeRequest {
            name: Some("更新后名称".into()),
            description: Some("新描述".into()),
            consolidation_method: None,
            status: Some("inactive".into()),
        });
    }

    #[test]
    fn struct_consolidation_scope_company() {
        roundtrip(&ConsolidationScopeCompany {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            scope_id: Uuid::new_v4(),
            company_id: Uuid::new_v4(),
            company_code: Some("C001".into()),
            company_name: Some("子公司A".into()),
            is_parent: false,
            control_type: "direct".into(),
            ownership_percentage: Decimal::from(80),
            consolidation_percentage: Decimal::from(100),
            minority_interest: Decimal::from(20),
            effective_date: Some(chrono::NaiveDate::from_ymd_opt(2024, 1, 1).unwrap()),
            expiry_date: None,
            created_at: Utc::now(),
        });
    }

    #[test]
    fn struct_add_scope_company_request() {
        roundtrip(&AddScopeCompanyRequest {
            scope_id: Uuid::new_v4(),
            company_id: Uuid::new_v4(),
            is_parent: Some(false),
            control_type: "direct".into(),
            ownership_percentage: 75.5,
            consolidation_percentage: Some(100.0),
            minority_interest: Some(0.0),
            effective_date: Some("2024-01-01".into()),
        });
    }

    #[test]
    fn struct_update_scope_company_request() {
        roundtrip(&UpdateScopeCompanyRequest {
            control_type: Some("indirect".into()),
            ownership_percentage: Some(60.0),
            consolidation_percentage: Some(80.0),
            minority_interest: Some(20.0),
            expiry_date: Some("2025-12-31".into()),
        });
    }

    #[test]
    fn struct_elimination_rule() {
        roundtrip(&EliminationRule {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            scope_id: Uuid::new_v4(),
            code: "ELIM-001".into(),
            name: "内部交易抵消".into(),
            r#type: "transaction".into(),
            description: Some("抵消内部应收应付".into()),
            status: "active".into(),
            direction: "both".into(),
            debit_account_codes: Some(serde_json::json!(["1122"])),
            credit_account_codes: Some(serde_json::json!(["2202"])),
            company_pairs: Some(serde_json::json!([["A", "B"]])),
            auto_elimination: true,
            priority: 10,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        });
    }

    #[test]
    fn struct_create_elimination_rule_request() {
        roundtrip(&CreateEliminationRuleRequest {
            scope_id: Uuid::new_v4(),
            code: "ELIM-002".into(),
            name: "新抵消规则".into(),
            r#type: "balance".into(),
            description: None,
            status: Some("draft".into()),
            direction: Some("debit".into()),
            debit_account_codes: Some(vec!["1122".into()]),
            credit_account_codes: Some(vec!["2202".into()]),
            company_pairs: Some(serde_json::json!([["A", "B"]])),
            auto_elimination: Some(false),
            priority: Some(5),
        });
    }

    #[test]
    fn struct_generate_consolidation_report_request() {
        roundtrip(&GenerateConsolidationReportRequest {
            scope_id: Uuid::new_v4(),
            report_type: "balance_sheet".into(),
            period: "2024-Q1".into(),
            include_prior_period: Some(true),
            auto_eliminate: Some(false),
        });
    }

    #[test]
    fn struct_consolidation_report_line() {
        roundtrip(&ConsolidationReportLine {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            report_id: Uuid::new_v4(),
            line_no: 1,
            item_code: Some("1001".into()),
            item_name: "货币资金".into(),
            item_level: 2,
            current_period: Decimal::from(1000000),
            prior_period: Some(Decimal::from(900000)),
            company_breakdown: Some(serde_json::json!({"A": 600000, "B": 400000})),
            elimination_breakdown: Some(serde_json::json!({"EL1": -50000})),
            formula: Some("L1+L2-L3".into()),
            notes: Some("现金及等价物".into()),
        });
    }

    #[test]
    fn struct_company_relation() {
        roundtrip(&CompanyRelation {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            parent_company_id: Uuid::new_v4(),
            parent_company_name: Some("母公司".into()),
            child_company_id: Uuid::new_v4(),
            child_company_name: Some("子公司".into()),
            relation_type: "wholly_owned".into(),
            ownership_percentage: Decimal::from(100),
            control_percentage: Decimal::from(100),
            effective_date: chrono::NaiveDate::from_ymd_opt(2023, 6, 1).unwrap(),
            expiry_date: None,
            status: "active".into(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        });
    }

    #[test]
    fn struct_company_tree_node() {
        roundtrip(&CompanyTreeNode {
            id: Uuid::new_v4(),
            name: "集团总部".into(),
            code: "HQ".into(),
            level: 0,
            is_parent: true,
            relation_type: "group".into(),
            ownership_percentage: 100.0,
            children: vec![CompanyTreeNode {
                id: Uuid::new_v4(),
                name: "子公司A".into(),
                code: "A".into(),
                level: 1,
                is_parent: false,
                relation_type: "wholly_owned".into(),
                ownership_percentage: 100.0,
                children: vec![],
            }],
        });
    }

    #[test]
    fn struct_create_company_relation_request() {
        roundtrip(&CreateCompanyRelationRequest {
            parent_company_id: Uuid::new_v4(),
            child_company_id: Uuid::new_v4(),
            relation_type: "subsidiary".into(),
            ownership_percentage: 70.0,
            control_percentage: Some(100.0),
            effective_date: "2024-01-01".into(),
            expiry_date: None,
        });
    }

    #[test]
    fn struct_update_company_relation_request() {
        roundtrip(&UpdateCompanyRelationRequest {
            ownership_percentage: Some(80.0),
            control_percentage: Some(90.0),
            expiry_date: Some("2026-12-31".into()),
            status: Some("inactive".into()),
        });
    }

    #[test]
    fn struct_company_financial_data() {
        roundtrip(&CompanyFinancialData {
            company_id: Uuid::new_v4(),
            company_name: "公司A".into(),
            period: "2024-Q1".into(),
            current_assets: 500000.0,
            non_current_assets: 1500000.0,
            total_assets: 2000000.0,
            current_liabilities: 300000.0,
            non_current_liabilities: 700000.0,
            total_liabilities: 1000000.0,
            paid_in_capital: 500000.0,
            capital_reserve: 100000.0,
            surplus_reserve: 100000.0,
            undistributed_profit: 300000.0,
            total_equity: 1000000.0,
            revenue: 800000.0,
            cost_of_goods_sold: 500000.0,
            gross_profit: 300000.0,
            operating_profit: 150000.0,
            profit_before_tax: 140000.0,
            net_profit: 100000.0,
            operating_cash_flow: 120000.0,
            investing_cash_flow: -50000.0,
            financing_cash_flow: -20000.0,
            net_cash_flow: 50000.0,
        });
    }
}
