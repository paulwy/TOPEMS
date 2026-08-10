use axum::{routing::*, Router};

use super::ApiState;

pub mod common;
pub mod company_relations;
pub mod elimination_rules;
pub mod internal_transactions;
pub mod reports;
pub mod scope_companies;
pub mod scopes;

pub use common::{call_finance_core_approval, PaginationParams};

pub use scopes::{create_scope, delete_scope, get_scope, list_scopes, update_scope};

pub use scope_companies::{
    add_scope_company, list_scope_companies, remove_scope_company, update_scope_company,
};

pub use elimination_rules::{
    create_elimination_rule, delete_elimination_rule, export_elimination_worksheet,
    get_elimination_rule, list_elimination_rules, update_elimination_rule,
};

pub use internal_transactions::{
    execute_elimination, get_internal_transaction, list_internal_transactions,
};

pub use reports::{
    approve_report, delete_report, export_report, generate_report, get_report, get_report_lines,
    list_reports, publish_report, submit_report,
};

pub use company_relations::{
    create_company_relation, delete_company_relation, get_company_financial_data, get_company_tree,
    list_company_relations, update_company_relation,
};

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/consolidation/scopes", get(list_scopes).post(create_scope))
        .route(
            "/consolidation/scopes/{scopeId}",
            get(get_scope).put(update_scope).delete(delete_scope),
        )
        .route(
            "/consolidation/scopes/{scopeId}/companies",
            get(list_scope_companies),
        )
        .route(
            "/consolidation/scopes/{scopeId}/elimination-worksheet/export",
            get(export_elimination_worksheet),
        )
        .route("/consolidation/scopes/companies", post(add_scope_company))
        .route(
            "/consolidation/scopes/companies/{companyId}",
            put(update_scope_company).delete(remove_scope_company),
        )
        .route(
            "/consolidation/elimination-rules",
            get(list_elimination_rules).post(create_elimination_rule),
        )
        .route(
            "/consolidation/elimination-rules/{ruleId}",
            get(get_elimination_rule)
                .put(update_elimination_rule)
                .delete(delete_elimination_rule),
        )
        .route(
            "/consolidation/internal-transactions",
            get(list_internal_transactions),
        )
        .route(
            "/consolidation/internal-transactions/{transactionId}",
            get(get_internal_transaction),
        )
        .route(
            "/consolidation/execute-elimination",
            post(execute_elimination),
        )
        .route(
            "/consolidation/reports",
            get(list_reports).post(generate_report),
        )
        .route("/consolidation/reports/generate", post(generate_report))
        .route(
            "/consolidation/reports/{reportId}",
            get(get_report).delete(delete_report),
        )
        .route(
            "/consolidation/reports/{reportId}/lines",
            get(get_report_lines),
        )
        .route(
            "/consolidation/reports/{reportId}/export",
            get(export_report),
        )
        .route(
            "/consolidation/reports/{reportId}/approve",
            post(approve_report),
        )
        .route(
            "/consolidation/reports/{reportId}/submit",
            post(submit_report),
        )
        .route(
            "/consolidation/reports/{reportId}/publish",
            post(publish_report),
        )
        .route(
            "/consolidation/company-relations",
            get(list_company_relations).post(create_company_relation),
        )
        .route("/consolidation/company-tree", get(get_company_tree))
        .route(
            "/consolidation/company-relations/{relationId}",
            put(update_company_relation).delete(delete_company_relation),
        )
        .route(
            "/consolidation/companies/{companyId}/financial-data",
            get(get_company_financial_data),
        )
}
