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

mod expenses;
mod budgets;
mod receivables;
mod payables;
mod periods;
mod accounts;
mod balances;
mod collections;
mod payments;
mod reconciliation;
mod aging;

pub use expenses::*;
pub use budgets::*;
pub use receivables::*;
pub use payables::*;
pub use periods::*;
pub use accounts::*;
pub use balances::*;
pub use collections::*;
pub use payments::*;
pub use reconciliation::*;
pub use aging::*;

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
}
