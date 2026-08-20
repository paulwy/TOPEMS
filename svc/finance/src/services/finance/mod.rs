use sqlx::postgres::PgPool;

use topems_shared_service_client::service_client::{TypedServiceClient, WorkflowApi};

pub struct FinanceService {
    db_pool: PgPool,
    workflow_client: TypedServiceClient<WorkflowApi>,
}

mod account;
mod aging;
mod approval_configs;
mod aux_accounts;
mod collection;
mod database;
pub mod erp_e2e;
mod payable;
mod payment;
mod payment_record;
mod payment_workflow;
pub mod periods;
mod receivable;
mod reconciliation;
mod report;
pub mod reversal;
pub mod trial_balance;
pub mod u8_import;
pub mod voucher;
pub mod voucher_generation;
pub mod voucher_template;
pub mod year_end;

pub use reconciliation::ReconciliationService;

impl FinanceService {
    pub fn new(db_pool: PgPool, workflow_client: TypedServiceClient<WorkflowApi>) -> Self {
        Self {
            db_pool,
            workflow_client,
        }
    }
}

pub use database::{init_aux_tables, init_database};
