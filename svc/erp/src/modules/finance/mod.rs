#![allow(dead_code)]

use std::time::Duration;

use axum::{routing::*, Router};
use serde::Deserialize;
use uuid::Uuid;

use super::ApiState;

const FINANCE_CACHE_TTL: Duration = Duration::from_secs(300);

fn expense_cache_key(id: &Uuid) -> String {
    format!("expense:{}", id)
}

fn budget_cache_key(id: &Uuid) -> String {
    format!("budget:{}", id)
}

fn receivable_cache_key(id: &Uuid) -> String {
    format!("receivable:{}", id)
}

fn payable_cache_key(id: &Uuid) -> String {
    format!("payable:{}", id)
}

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

mod accounts;
mod aging;
mod balances;
mod budgets;
mod collections;
mod expenses;
mod payables;
mod payments;
mod periods;
mod receivables;
mod reconciliation;

pub use accounts::*;
pub use aging::*;
pub use balances::*;
pub use budgets::*;
pub use collections::*;
pub use expenses::*;
pub use payables::*;
pub use payments::*;
pub use periods::*;
pub use receivables::*;
pub use reconciliation::*;

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/api/erp/expenses", get(list_expenses).post(create_expense))
        .route(
            "/api/erp/expenses/{id}",
            get(get_expense).put(update_expense).delete(delete_expense),
        )
        .route("/api/erp/budgets", get(list_budgets).post(create_budget))
        .route(
            "/api/erp/budgets/{id}",
            get(get_budget).put(update_budget).delete(delete_budget),
        )
        .route(
            "/api/erp/receivables",
            get(list_receivables).post(create_receivable),
        )
        .route(
            "/api/erp/receivables/{id}",
            get(get_receivable)
                .put(update_receivable)
                .delete(delete_receivable),
        )
        .route("/api/erp/payables", get(list_payables).post(create_payable))
        .route(
            "/api/erp/payables/{id}",
            get(get_payable).put(update_payable).delete(delete_payable),
        )
        // 余额查询
        .route("/api/erp/finance/balances", get(get_account_balances))
        // 会计期间管理
        .route("/api/erp/finance/periods/current", get(get_current_period))
        .route("/api/erp/finance/periods", get(list_periods))
        .route("/api/erp/finance/periods/{period}/open", post(open_period))
        .route(
            "/api/erp/finance/periods/{period}/close",
            post(close_period),
        )
        // 对账管理 - V19.5 恢复路由注册
        .route(
            "/api/erp/finance/reconciliation",
            get(list_reconciliations).post(create_reconciliation),
        )
        .route("/api/erp/finance/reconciliation/auto", post(auto_reconcile))
}
