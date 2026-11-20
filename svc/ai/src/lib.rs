pub mod event_handlers;
pub mod handlers;
pub mod models;
pub mod modules;
pub mod permission;
pub mod routes;
pub mod services;
pub mod shared;

/// DSH (Data-Driven Service Hub) AI 中间层模块
///
/// 基于 TOPEMS_Architecture_Improvement_Plan v1.1 + MCP_Architecture_Amendment_Plan v1.0
/// 提供 LLM Provider 抽象、Agent 编排、Tool Registry、AI 治理、MCP 协议适配等能力。
pub mod dsh;

/// AI 表单助手（B11：自 topems_shared 迁出，供 modules/ai_form 使用）
pub use modules::ApiDoc;
