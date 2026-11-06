//! Tenant module - Multi-tenant Management
//!
//! Supports:
//! - Independent database mode (one database per tenant)
//! - Shared database mode (row-level isolation via tenant_id)

pub mod handlers;
pub mod models;
// 批 13：业务域 tier 统一映射（basic/standard/enterprise）
pub mod tier;
