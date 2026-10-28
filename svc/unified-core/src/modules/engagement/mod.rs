//! 通用评论 / 收藏模块（engagement）。
//!
//! 替代原 contract_stubs 中 `/comments/*`、`/favorites/*` 的空壳兜底：
//! 前端 `CommentsPage` / `FavoritesPage` 真实消费的通用评论与个人收藏。
//! 表在启动时由 `init_database` 幂等自举（与 menu 模块同范式），查询内按
//! tenant_id + 当前用户隔离，不依赖外部 RLS 策略。

pub mod handlers;
pub mod models;

pub use handlers::*;
pub use models::*;
