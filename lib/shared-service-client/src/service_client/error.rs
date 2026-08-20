//! Service client error types — 统一到 TopemsError
//!
//! 历史上此处定义了独立的 `ServiceClientError` 枚举，其 6 个变体与
//! `TopemsError` 中的对应变体完全重叠。P3-1b 将其合并：
//! - `ServiceClientError` → `TopemsError`（直接使用）
//! - `ServiceClientResult<T>` → `topems_shared_core::error::Result<T>` 的别名

/// Service client 统一结果类型，底层使用 `TopemsError`。
pub type ServiceClientResult<T> = topems_shared_core::error::Result<T>;
