// 死代码登记（P2 平台域 A）：async_task_queue 整包无写入方/消费者，
// 全仓 grep 确认仅本文件声明、无任何调用方（路由/openapi 均未挂载），
// 已下线模块注册；文件保留在原地作为参考实现，待后续真正接入调度消费方时再启用。
// pub mod async_task_queue; // DISABLED 2026-10 dead-code registration
pub mod conversion_rules;
pub mod crm_erp_sync;
pub mod crm_scm_sync;
pub mod erp_status;
pub mod erp_wms_sync;
pub mod event_bus;
pub mod event_handlers;
pub mod external_erp;
pub mod handlers;
pub mod hrm_finance_sync;
pub mod mes_erp_sync;
pub mod mes_erp_sync_status;
pub mod mes_qms_integration;
pub mod models;
pub mod openapi;
pub mod permission;
pub mod plugin;
pub mod qms_lims_ehs;
pub mod retry_handler;
pub mod routes;
pub mod rule_engine;
pub mod shared;
pub mod sync_retry;
pub mod sync_scheduler;

pub use openapi::ApiDoc;
