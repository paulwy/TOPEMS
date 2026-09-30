//! Modules for unified-core service
//! Contains IAM, Flow, File, Communication, Tenant, Billing, Plugin, and other submodules.
//!
//! 注：billing/ticket/feedback/search/communication 虽已外迁为独立微服务
//! （见 config/services.yaml 端口 8082-8087），但本 crate 内的实现仍被
//! routes/master.rs、routes/communication.rs、main.rs、iam/auth.rs 等活跃引用，
//! 作为 unified-core 内置兼容层保留。独立服务为可选的横向扩展部署方案。
//! Note: sync module was migrated to integration service (2026-07 方案 C)

pub mod audit;
pub mod automation;
// V434: Business Tools module - 统一业务工具, 连接真实服务(CRM/ERP/Finance等)
pub mod business_tools;
pub mod communication;
// V68.1 A2.3: dict 模块已合并到 svc/master-data/src/modules/dict/（主数据域）
// pub mod dict;
pub mod doc;
pub mod file;
pub mod flow;
// V68.1 A2.4.2: help 模块已迁移至 svc/portal/src/modules/help/（Portal BFF 用户服务域）
// pub mod help;
pub mod iam;
// V68.1 A2.4.1: login_log 模块已合并为 audit/login_log_* 子模块（统一审计域）
// pub mod login_log;
pub mod master;
pub mod menu;
pub mod migration;
// V68.1 A2.1: monitor 模块已拆出到独立 svc/monitor/ crate，这里不再 re-export
// pub mod monitor;
pub mod openapi;
// V68.1 A2.2: plugin 模块已拆出到独立 svc/plugin-registry/（端口 8096）
// pub mod plugin;
pub mod subscription;
pub mod system_audit;
pub mod tenant;
// WMS: 仓储管理系统
pub mod wms;
// MES: 制造执行系统
pub mod mes;
// SCM: 供应链管理
pub mod scm;
// Finance: 财务管理
pub mod finance;
// ERP: 企业资源计划
pub mod erp;
// CRM: 客户关系管理
pub mod crm;
// HRM: 人力资源管理
pub mod hrm;
// QMS: 质量管理
pub mod qms;
// PDM: 产品数据管理
pub mod pdm;
// EHS: 环境健康安全
pub mod ehs;
// Analytics: 数据分析
pub mod analytics;
// PM: 项目管理
pub mod pm;
// LIMS: 实验室信息管理系统
pub mod lims;
// SRM: 供应商关系管理
pub mod srm;
