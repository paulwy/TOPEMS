//! TOPEMS Monitor Service - 从 unified-core 拆分（V68.1 A2.1）

pub mod modules;
pub mod openapi;
pub mod shared;

// 兼容 modules/monitor/* 内 `use crate::AppState` 的绝对路径引用
pub use shared::AppState;
