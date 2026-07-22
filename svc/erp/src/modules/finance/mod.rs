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
mod proxy;
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
pub use proxy::*;
pub use receivables::*;
pub use reconciliation::*;

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/expenses", get(list_expenses).post(create_expense))
        .route(
            "/expenses/{id}",
            get(get_expense).put(update_expense).delete(delete_expense),
        )
        .route("/budgets", get(list_budgets).post(create_budget))
        .route(
            "/budgets/{id}",
            get(get_budget).put(update_budget).delete(delete_budget),
        )
        .route(
            "/receivables",
            get(list_receivables).post(create_receivable),
        )
        .route(
            "/receivables/{id}",
            get(get_receivable)
                .put(update_receivable)
                .delete(delete_receivable),
        )
        .route("/payables", get(list_payables).post(create_payable))
        .route(
            "/payables/{id}",
            get(get_payable).put(update_payable).delete(delete_payable),
        )
        // V15 Phase 3: 代理到 Finance 服务
        .merge(proxy::proxy_routes())
}
