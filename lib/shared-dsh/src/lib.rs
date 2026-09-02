//! TOPEMS 共享 DSH 类型库
//!
//! 提供通用的 Tool、Resource、Prompt 类型定义，
//! 可被多个服务引用，减少类型重复定义。

pub mod error;
pub mod prompt;
pub mod resource;
pub mod tool;
pub mod types;

pub use error::*;
pub use prompt::*;
pub use resource::*;
pub use tool::*;
pub use types::*;

/// 库版本号
pub const VERSION: &str = env!("CARGO_PKG_VERSION");

/// 库名称
pub const NAME: &str = "topems-shared-dsh";
