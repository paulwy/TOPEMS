use sqlx::postgres::PgPool;

use crate::workflow::WorkflowClient;

pub struct FinanceService {
    db_pool: PgPool,
    workflow_client: WorkflowClient,
}

mod account;
mod approval_configs;
mod approvals;
mod aux_accounts;
mod database;
mod payment;
mod payment_workflow;
mod periods;
mod report;
mod voucher;

impl FinanceService {
    pub fn new(db_pool: PgPool, workflow_client: WorkflowClient) -> Self {
        Self {
            db_pool,
            workflow_client,
        }
    }
}

pub use database::{init_aux_tables, init_database};
