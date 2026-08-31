//! 业务模块（Phase B 演示 + 真实接入）
//!
//! 当前模块：
//! - `finance_module`：财务模块，实现 AccountBalanceProvider（进程内调用契约）
//! - `dashboard_module`：业务看板模块，通过进程内 trait 调用 finance（非 HTTP）
//! - `finance_real_module`：真实 finance 服务接入（feature `module-finance` 门控，Phase B3）
//! - `erp_real_module`：真实 erp 服务接入（feature `module-erp` 门控，Phase B3 扩展）
//! - `dev_claims`：开发验证模式的模拟认证中间件（真实模块共用）
//!
//! 真实服务接入模板：见 `real_service_adapter.rs` 与两个真实模块实现。

// [V2026.08 已合并] aps_real_module 已移除（aps 合并至 mes，由 module-mes 承载）
#[cfg(feature = "module-crm")]
pub mod crm_real_module;
pub mod dashboard_module;
pub mod dev_claims;
#[cfg(feature = "module-ehs")]
pub mod ehs_real_module;
#[cfg(feature = "module-erp")]
pub mod erp_real_module;
pub mod finance_module;
#[cfg(feature = "module-finance")]
pub mod finance_real_module;
#[cfg(feature = "module-hrm")]
pub mod hrm_real_module;
#[cfg(feature = "module-lims")]
pub mod lims_real_module;
#[cfg(feature = "module-mes")]
pub mod mes_real_module;
#[cfg(feature = "module-pm")]
pub mod pm_real_module;
#[cfg(feature = "module-qms")]
pub mod qms_real_module;
pub mod real_service_adapter;
#[cfg(feature = "module-scm")]
pub mod scm_real_module;
#[cfg(feature = "module-subscription")]
pub mod subscription_module;
#[cfg(feature = "module-tms")]
pub mod tms_real_module;
#[cfg(feature = "module-ticket")]
pub mod ticket_real_module;
#[cfg(feature = "module-rd")]
pub mod rd_real_module;
#[cfg(feature = "module-srm")]
pub mod srm_real_module;
#[cfg(feature = "module-wms")]
pub mod wms_real_module;
