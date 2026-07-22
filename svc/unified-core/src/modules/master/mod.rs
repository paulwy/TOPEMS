//! MDM 主数据模块
//!
//! 提供 5 大主数据域的统一管理能力：
//! - 客户（Customer）
//! - 供应商（Supplier）
//! - 物料（Material）
//! - 组织（Organization）
//! - 员工（Employee）
//!
//! 所有 CRUD 操作都会自动发布 MasterDataEvent 事件，通知下游服务同步。

pub mod handlers;
pub mod models;

pub use handlers::{master_data_routes, MasterDataService};
