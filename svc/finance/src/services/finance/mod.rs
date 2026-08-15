use sqlx::postgres::PgPool;

use topems_shared_service_client::service_client::WorkflowServiceClient;

pub struct FinanceService {
    db_pool: PgPool,
    workflow_client: WorkflowServiceClient,
}

mod account;
mod aging;
mod approval_configs;
mod aux_accounts;
mod collection;
mod database;
mod payable;
mod payment;
mod payment_record;
mod payment_workflow;
mod periods;
mod receivable;
mod reconciliation;
mod report;
mod reversal;
mod trial_balance;
pub mod u8_import;
mod voucher;
pub mod voucher_generation;
pub mod voucher_template;

pub use reconciliation::ReconciliationService;

impl FinanceService {
    pub fn new(db_pool: PgPool, workflow_client: WorkflowServiceClient) -> Self {
        Self {
            db_pool,
            workflow_client,
        }
    }
}

pub use database::{init_aux_tables, init_database};
