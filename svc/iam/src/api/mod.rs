pub mod auth;
pub mod permission;
pub mod role;
pub mod user_permission;

// 重新导出共享库的 ApiResponse，保持向后兼容
pub use topems_shared::ApiResponse;