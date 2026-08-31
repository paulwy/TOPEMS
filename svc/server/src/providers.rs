//! 进程内调用契约（Private-Deployment 模式）
//!
//! 模块化单体私有化部署的核心：模块间通过 trait 在进程内直接调用，
//! 消除 HTTP 服务间调用的网络开销。
//!
//! ## 进程内调用机制
//!
//! 由于 Rust 标准库的 `Arc::downcast` 只能 downcast 到 Sized 类型
//! （无法直接 downcast 到 `dyn Trait`），这里采用**类型安全的枚举方案**：
//! - 所有 provider 类型在编译期已知（模块集固定）
//! - `InProcProvider` 枚举包装各 provider 的 trait 对象
//! - 注册表用 `TypeId` 索引，查询时按枚举变体返回 `Arc<dyn Trait>`
//!
//! 新增 provider 时：
//! 1. 定义 trait（如 `AccountBalanceProvider`）
//! 2. 在 `InProcProvider` 枚举中添加变体
//! 3. 在 registry 中实现对应 `register_xxx` / `get_xxx` 方法

use std::sync::Arc;

/// 财务模块提供的账户余额查询能力
///
/// 由 `FinanceModule` 实现并注册，`DashboardModule` 等通过
/// `ModuleRegistry::get_account_balance_provider()` 在进程内调用（非 HTTP）。
#[async_trait::async_trait]
pub trait AccountBalanceProvider: Send + Sync {
    /// 按科目编码查询账户余额
    async fn get_account_balance(&self, account_code: &str) -> Result<f64, String>;

    /// 查询总资产（汇总所有资产类科目）
    async fn get_total_assets(&self) -> Result<f64, String>;
}

/// 进程内 provider 类型枚举（编译期已知的模块能力集合）
///
/// 每个变体包装一个模块对外提供的 trait 对象。
/// 新增能力时在此添加变体。
#[derive(Clone)]
pub enum InProcProvider {
    /// 财务账户余额查询能力
    AccountBalance(Arc<dyn AccountBalanceProvider>),
}

/// 进程内调用返回结果（用于日志/审计）
#[derive(Debug, Clone, serde::Serialize)]
pub struct InProcCallResult {
    /// 调用方模块
    pub caller: String,
    /// 被调用方模块
    pub callee: String,
    /// 调用的能力（trait 方法名）
    pub capability: String,
    /// 是否通过进程内 trait 调用（非 HTTP）
    pub in_proc: bool,
    /// 耗时（微秒）
    pub duration_us: u64,
}
