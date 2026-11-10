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
    pub fn new(db: Db, workflow_client: TypedServiceClient<WorkflowApi>) -> Self {
        Self {
            db,
            workflow_client,
        }
    }

    pub(crate) fn db(&self) -> &Db {
        &self.db
    }

    /// 写作用域：租户上下文取自请求中间件，缺失即 `Protocol` 错误（不兜底）。
    async fn write_scope(&self) -> Result<topems_shared_db::scope::ScopedTxn<'_>, TopemsError> {
        Ok(self.db.scope().await?)
    }

    /// 读作用域：同上，只读事务。
    async fn read_scope(&self) -> Result<topems_shared_db::scope::ScopedTxn<'_>, TopemsError> {
        Ok(self.db.scope_read().await?)
    }
}
