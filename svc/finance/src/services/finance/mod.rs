use topems_shared_core::error::TopemsError;
use topems_shared_db::scope::Db;
use topems_shared_service_client::service_client::{TypedServiceClient, WorkflowApi};
use uuid::Uuid;

/// A 类业务端点守卫：nil 租户视为缺少上下文，显式报错，禁止降级为跨租户。
///
/// 对应冻结文档 §2.1.2：业务读写接口不提供“全租户视角”。
pub(crate) fn require_tenant(tenant_id: Uuid) -> Result<Uuid, TopemsError> {
    if tenant_id.is_nil() {
        return Err(TopemsError::ValidationFailed("缺少租户上下文".to_string()));
    }
    Ok(tenant_id)
}

pub struct FinanceService {
    db: Db,
    workflow_client: TypedServiceClient<WorkflowApi>,
}

mod account;
mod aging;
mod approval_configs;
mod aux_accounts;
mod collection;
pub(crate) mod company;
pub mod erp_ar_ap_status;
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
    pub fn new(db: Db, workflow_client: TypedServiceClient<WorkflowApi>) -> Self {
        Self {
            db,
            workflow_client,
        }
    }

    /// 写作用域：复用请求事务（`scope_with`），租户上下文由请求中间件注入。
    ///
    /// M-1：请求链路禁止自开事务；事务归 `tenant_middleware` 所有。
    async fn write_scope<'a>(
        &'a self,
        txn: &'a mut sqlx::Transaction<'static, sqlx::Postgres>,
    ) -> Result<topems_shared_db::scope::ScopedTxn<'a>, TopemsError> {
        Ok(self.db.scope_with(txn).await?)
    }

    /// 读作用域：同 [`FinanceService::write_scope`]，复用请求事务。
    async fn read_scope<'a>(
        &'a self,
        txn: &'a mut sqlx::Transaction<'static, sqlx::Postgres>,
    ) -> Result<topems_shared_db::scope::ScopedTxn<'a>, TopemsError> {
        Ok(self.db.scope_with(txn).await?)
    }
}
