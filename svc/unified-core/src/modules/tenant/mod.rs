//! Tenant module - Multi-tenant Management
//!
//! Supports:
//! - Independent database mode (one database per tenant)
//! - Shared database mode (row-level isolation via tenant_id)

pub mod handlers;
pub mod models;
