//! TOPEMS 模块化单体统一入口
//!
//! 架构：32 svc → 7 核心模块组（core/erp/finance/crm/wms/advanced/ai）
//! 设计文档：docs/architecture/modular-monolith-design.md
//!
//! 模块化单体推进状态：
//! - Phase A（骨架）✅：模块分组定义 + Cargo feature flags + 统一入口框架
//! - Phase B（接入）🚧：进程内调用机制 + 业务模块演示（finance/dashboard）
//! - Phase C（铺开）⏳：真实服务接入 + 全量编译验证

pub mod module;
pub mod modules;
pub mod platform_module;
pub mod providers;
pub mod registry;

pub use module::{Module, ModuleContext, ModuleGroup, ModuleHealth};
pub use providers::AccountBalanceProvider;
pub use registry::ModuleRegistry;
