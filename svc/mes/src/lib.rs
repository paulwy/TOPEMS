// [2026-11-03] sqlx 0.9.0 query! 宏对 NUMERIC 在 bigdecimal+rust_decimal 双 feature 下无条件 emit deprecation
// （sqlx.toml 配置 preferred-crates 亦无法消除，属 0.9.0 实现缺陷），被 pre-push hook 的
// RUSTFLAGS="-D warnings" 升为 error；本 crate 内无其他 deprecated API 使用，故 crate 级 allow。
#![allow(deprecated)]
pub mod event_handlers;
pub mod models;
pub mod modules;
pub mod shared;

pub use modules::openapi::MesApiDoc as ApiDoc;
pub use shared::AppState;

#[cfg(test)]
pub mod anomaly_no_fake_negative_ratchet;
#[cfg(test)]
pub mod aps_no_fabrication_ratchet;
#[cfg(test)]
pub mod cost_no_fabrication_ratchet;
