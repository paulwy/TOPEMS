use topems_shared_db::scope::{Db, DbPoolStats, ScopedTxn};

/// ai 模块的数据库句柄。
///
/// 运行时业务 SQL 统一通过 [`Db`] 的作用域（事务级 `SET LOCAL search_path = ai, public`）
/// 执行，不再暴露底层 `PgPool`。表、索引、触发器、RLS 全部由迁移链维护，
/// 本类型不再持有迁移池，也不提供任何运行期 DDL 入口。
#[derive(Clone)]
pub struct Database {
    db: Db,
}

impl Database {
    /// `db` 复用 bootstrap 的进程级共享池（仅包裹为 `Db` 并固化 search_path）。
    pub fn from_parts(db: Db) -> Self {
        Self { db }
    }

    /// 模块级数据库句柄（用于构造其它服务或按需派生作用域）。
    pub fn db(&self) -> &Db {
        &self.db
    }

    /// 复用请求级 RLS 事务：只叠加事务级 search_path，不接管提交/回滚。
    pub async fn scope_with<'a>(
        &self,
        tx: &'a mut sqlx::Transaction<'static, sqlx::Postgres>,
    ) -> sqlx::Result<ScopedTxn<'a>> {
        self.db.scope_with(tx).await
    }

    /// 池内统计快照（不暴露底层池）。
    pub fn stats(&self) -> DbPoolStats {
        self.db.stats()
    }
}
