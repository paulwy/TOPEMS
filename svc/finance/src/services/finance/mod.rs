use sqlx::postgres::PgPool;

use crate::workflow::WorkflowClient;

pub struct FinanceService {
    db_pool: PgPool,
    workflow_client: WorkflowClient,
}

mod account;
mod voucher;
mod report;
mod periods;
mod aux_accounts;
mod approvals;
mod payment;
mod payment_workflow;
mod approval_configs;
mod database;

impl FinanceService {
    pub fn new(db_pool: PgPool, workflow_client: WorkflowClient) -> Self {
        Self {
            db_pool,
            workflow_client,
        }
    }
}

pub use database::{init_aux_tables, init_database};
