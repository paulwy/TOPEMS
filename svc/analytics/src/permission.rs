//! # Analytics 权限模块
//!
//! 声明 analytics 服务模块权限码与统一校验入口。
//! - 接口级鉴权：路由层经 `topems_shared_auth::middleware::require_permission` 完成；
//! - 行级数据权限：由 `modules::bi::row_level_permission` 独立实现。

/// analytics 模块权限码
pub mod codes {
    /// 查看分析报表（只读）
    pub const VIEW: &str = "analytics:view";
    /// 管理分析报表 / 权限配置（读写）
    pub const ADMIN: &str = "analytics:admin";
}

/// 接口级权限校验（re-export 自 shared-auth，供路由层使用）
pub use topems_shared_auth::middleware::require_permission;
