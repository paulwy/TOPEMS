//! Settlement Center - 统一结算对账中心模块
//!
//! 整合分散在 erp.fin_reconciliations 和 pm.settlements 的对账结算功能，
//! 提供统一的 API 入口、统一的数据视图、统一的业务流程。
//!
//! # 业务流程闭环
//! 1. 创建对账单（统一入口） → `create_reconciliation`
//! 2. 执行对账（手工/自动） → `reconcile` / `auto_reconcile`
//! 3. 发现差异时创建差异调整 → `create_difference`
//! 4. 差异审批 → `approve_difference` / `reject_difference`
//! 5. 关联结算单 → `create_link`
//! 6. 执行结算 → `approve_settlement`
//!
//! # 数据隔离
//! 所有查询带 tenant_id 过滤，跨 schema 查询时使用完整表名
//! （erp.fin_reconciliations, pm.settlements, core.reconciliation_settlement_links）。

pub mod handlers;
pub mod models;
pub mod routes;
pub mod service;

pub use routes::create_routes;
