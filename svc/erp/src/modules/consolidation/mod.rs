use axum::{
    routing::*,
    Router,
};

use super::ApiState;

mod common;
mod scopes;
mod scope_companies;
mod elimination_rules;
mod internal_transactions;
mod reports;
mod company_relations;

pub use common::{call_finance_core_approval, PaginationParams};

pub use scopes::{
    list_scopes,
    get_scope,
    create_scope,
    update_scope,
    delete_scope,
};

pub use scope_companies::{
    list_scope_companies,
    add_scope_company,
    update_scope_company,
    remove_scope_company,
};

pub use elimination_rules::{
    list_elimination_rules,
    get_elimination_rule,
    create_elimination_rule,
    update_elimination_rule,
    delete_elimination_rule,
};

pub use internal_transactions::{
    list_internal_transactions,
    execute_elimination,
};

pub use reports::{
    list_reports,
    get_report,
    generate_report,
    get_report_lines,
    submit_report,
    approve_report,
    publish_report,
    delete_report,
};

pub use company_relations::{
    list_company_relations,
    get_company_tree,
    create_company_relation,
    update_company_relation,
    delete_company_relation,
    get_company_financial_data,
};

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/api/consolidation/scopes",
            get(list_scopes).post(create_scope),
        )
        .route(
            "/api/consolidation/scopes/{scopeId}",
            get(get_scope).put(update_scope).delete(delete_scope),
        )
        .route(
            "/api/consolidation/scopes/{scopeId}/companies",
            get(list_scope_companies),
        )
        .route(
            "/api/consolidation/scopes/companies",
            post(add_scope_company),
        )
        .route(
            "/api/consolidation/scopes/companies/{companyId}",
            put(update_scope_company).delete(remove_scope_company),
        )
        .route(
            "/api/consolidation/elimination-rules",
            get(list_elimination_rules).post(create_elimination_rule),
        )
        .route(
            "/api/consolidation/elimination-rules/{ruleId}",
            get(get_elimination_rule)
                .put(update_elimination_rule)
                .delete(delete_elimination_rule),
        )
        .route(
            "/api/consolidation/internal-transactions",
            get(list_internal_transactions),
        )
        .route(
            "/api/consolidation/execute-elimination",
            post(execute_elimination),
        )
        .route(
            "/api/consolidation/reports",
            get(list_reports).post(generate_report),
        )
        .route(
            "/api/consolidation/reports/{reportId}",
            get(get_report).delete(delete_report),
        )
        .route(
            "/api/consolidation/reports/{reportId}/lines",
            get(get_report_lines),
        )
        .route(
            "/api/consolidation/reports/{reportId}/approve",
            post(approve_report),
        )
        .route(
            "/api/consolidation/reports/{reportId}/submit",
            post(submit_report),
        )
        .route(
            "/api/consolidation/reports/{reportId}/publish",
            post(publish_report),
        )
        .route(
            "/api/consolidation/company-relations",
            get(list_company_relations).post(create_company_relation),
        )
        .route("/api/consolidation/company-tree", get(get_company_tree))
        .route(
            "/api/consolidation/company-relations/{relationId}",
            put(update_company_relation).delete(delete_company_relation),
        )
        .route(
            "/api/consolidation/companies/{companyId}/financial-data",
            get(get_company_financial_data),
        )
}
