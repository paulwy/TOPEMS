//! AI 表单配置注册表
//!
//! 集中管理所有支持 AI 辅助的业务表单配置，包括：
//! - 字段说明（field_descriptions）
//! - 填写示例（filling_examples）
//! - 验证规则（validation_rules）
//! - 业务术语（business_terms）
//! - AI 功能开关（ai_features）
//!
//! 通过 `default_registry()` 可获取预注册的 30+ 核心表单配置。
//!
//! 模块按业务域拆分：
//! - [`common`]：公共类型（FormDomain、FieldDefinition 等）
//! - [`config`]：FormConfig 表单配置
//! - [`registry`]：FormRegistry 注册表与默认注册表构造
//! - `*_forms`：各业务域表单注册实现

mod common;
mod config;
mod registry;

mod crm_forms;
mod ehs_forms;
mod erp_finance_forms;
mod erp_inventory_forms;
mod erp_production_forms;
mod erp_purchase_forms;
mod erp_sales_forms;
mod hrm_forms;
mod iam_forms;
mod lims_forms;
mod mes_forms;
mod pm_forms;
mod qms_forms;
mod rd_forms;
mod scm_forms;
mod system_forms;
mod wms_forms;

#[cfg(test)]
mod tests;

pub use common::{AiFeatures, BusinessTerm, FieldDefinition, FormDomain, FormValidationRule};
pub use config::FormConfig;
pub use registry::{default_registry, FormRegistry};
