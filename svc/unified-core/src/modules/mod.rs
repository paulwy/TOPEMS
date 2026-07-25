//! Modules for unified-core service
//! Contains IAM, Flow, File, Communication, Tenant, Billing, Plugin, and other submodules
//! Note: sync module was migrated to integration service (2026-07 方案 C)

pub mod audit;
pub mod billing;
pub mod communication;
pub mod isolation;
pub mod dict;
pub mod doc;
pub mod feedback;
pub mod file;
pub mod flow;
pub mod help;
pub mod iam;
pub mod login_log;
pub mod master;
pub mod menu;
pub mod migration;
pub mod monitor;
pub mod plugin;
pub mod search;
pub mod tenant;
pub mod ticket;
