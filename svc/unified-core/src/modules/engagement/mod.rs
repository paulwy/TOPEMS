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

use sqlx::PgPool;

/// 幂等建表：通用评论表 + 个人收藏表。
pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS public.core_comments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
            content TEXT NOT NULL,
            author_id VARCHAR(128) NOT NULL DEFAULT '',
            author_name VARCHAR(128) NOT NULL DEFAULT '',
            entity_type VARCHAR(64) NOT NULL,
            entity_id VARCHAR(128) NOT NULL,
            parent_id UUID,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ,
            deleted_at TIMESTAMPTZ
        );
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS public.core_favorites (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
            user_id VARCHAR(128) NOT NULL,
            entity_type VARCHAR(64) NOT NULL,
            entity_id VARCHAR(128) NOT NULL,
            entity_name VARCHAR(256) NOT NULL DEFAULT '',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (tenant_id, user_id, entity_type, entity_id)
        );
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_core_comments_entity ON core_comments(tenant_id, entity_type, entity_id);",
    )
    .execute(pool)
    .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_comments_parent ON core_comments(parent_id);")
        .execute(pool)
        .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_core_favorites_user ON core_favorites(tenant_id, user_id);",
    )
    .execute(pool)
    .await?;

    Ok(())
}
