//! Modules for unified-core service
//! Contains IAM, Flow, File, Communication, Tenant, Billing, Plugin, and other submodules.
//!
//! 注：billing/ticket/feedback/search/communication 虽已外迁为独立微服务
//! （见 config/services.yaml 端口 8082-8087），但本 crate 内的实现仍被
//! routes/master.rs、routes/communication.rs、main.rs、iam/auth.rs 等活跃引用，
//! 作为 unified-core 内置兼容层保留。独立服务为可选的横向扩展部署方案。
//! Note: sync module was migrated to integration service (2026-07 方案 C)

pub mod audit;
pub mod communication;
pub mod dict;
pub mod doc;
pub mod file;
pub mod flow;
pub mod help;
pub mod iam;
pub mod login_log;
pub mod master;
pub mod menu;
pub mod migration;
pub mod monitor;
pub mod openapi;
pub mod plugin;
pub mod tenant;
