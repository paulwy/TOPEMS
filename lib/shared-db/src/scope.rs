//! 单池 + 事务级 `search_path`（连接治理 B）。
//!
//! # 设计
//!
//! - [`Db`] 是模块唯一可见的数据库句柄，内部 `PgPool` **私有**，不实现 `Deref`，
//!   模块无法 `pool.acquire()` 或直接把 `&PgPool` 当 `Executor` 用；
//! - [`Db::scope`] / [`Db::scope_read`] / [`Db::scope_with`] 返回 [`ScopedTxn`]：
//!   作用域开始时执行 `set_config('search_path', $1, true)`（即 `SET LOCAL`）；
//! - [`ScopedTxn`] 实现 `Executor`，模块沿用 `sqlx::query(..).fetch_all(&mut *scope)`
//!   的写法，不需要改 SQL；但拿不到底层 `PgConnection`。
//!
//! # 为什么 `SET LOCAL` 是正确选择
//!
//! `SET LOCAL`（`set_config(..., true)`）只在**当前事务**内生效；事务 `COMMIT` /
//! `ROLLBACK` 结束时 PostgreSQL 自动恢复到连接上原有的（会话级）`search_path`。因此：
//!
//! - 连接归还池时**不会残留**本次作用域的 `search_path`，而是回到池的基线值
//!   （`create_database_pool` 的 `after_connect` 按 `SEARCH_PATH` 设置的会话级值）；
//! - 无需 `after_release` 清理；
//! - 若有人在事务内误用会话级 `SET search_path`（`is_local=false`），它会越过事务
//!   泄漏给池里的其他使用者。本类型不暴露 `PgConnection`，模块无法执行这种语句；
//!   这是结构性的堵死，不是约定。
//!
//! # 非事务只读查询
//!
//! `SET LOCAL` 依附于事务；autocommit 下单条语句结束后立刻失效，无法「先 SET 再查」。
//! 因此只读路径也用**只读事务**（`BEGIN` + `SET TRANSACTION READ ONLY`），
//! 代价是一次额外的 BEGIN/COMMIT 往返；换来的是所有模块查询都有一致的 schema
//! 作用域，并且可以用连接池复用、无需会话状态。
//!
//! # 与请求级 RLS 事务共存
//!
//! `tenant_middleware` 会为每个请求开启一个事务并设置 `app.tenant_id`。此时不能再
//! `BEGIN` 一个新事务（会丢租户上下文），应使用 [`Db::scope_with`] 复用该事务，
//! 只在其上叠加 `SET LOCAL search_path`；提交/回滚仍由中间件负责。

use either::Either;
use futures_util::future::BoxFuture;
use futures_util::stream::BoxStream;
use sqlx::postgres::{PgConnection, PgQueryResult, PgRow, PgStatement, PgTypeInfo, Postgres};
use sqlx::{Execute, Executor, PgPool, SqlStr, Transaction};
use std::sync::Arc;

/// 模块级数据库句柄（进程单池之上的类型化视图）。
#[derive(Clone)]
pub struct Db {
    pool: PgPool,
    search_path: Arc<str>,
}

impl Db {
    /// `search_path` 是完整的 schema 列表，例如 `"finance, public"`。
    pub fn new(pool: PgPool, search_path: impl Into<String>) -> Self {
        Self {
            pool,
            search_path: Arc::from(search_path.into()),
        }
    }

    pub fn search_path(&self) -> &str {
        &self.search_path
    }

    /// 读作用域（只读事务 + 事务级 `search_path`）。
    pub async fn scope_read(&self) -> sqlx::Result<ScopedTxn<'_>> {
        let mut tx = self.pool.begin().await?;
        // 必须是事务内第一条语句。
        sqlx::query("SET TRANSACTION READ ONLY")
            .execute(&mut *tx)
            .await?;
        let mut scope = ScopedTxn {
            inner: TxRef::Owned(tx),
            search_path: Arc::clone(&self.search_path),
        };
        scope.apply_search_path().await?;
        Ok(scope)
    }

    /// 写作用域（读写事务 + 事务级 `search_path`）。
    pub async fn scope(&self) -> sqlx::Result<ScopedTxn<'_>> {
        let tx = self.pool.begin().await?;
        let mut scope = ScopedTxn {
            inner: TxRef::Owned(tx),
            search_path: Arc::clone(&self.search_path),
        };
        scope.apply_search_path().await?;
        Ok(scope)
    }

    /// 健康检查（不暴露底层池）。
    pub async fn check_health(&self) -> sqlx::Result<()> {
        let mut scope = self.scope_read().await?;
        sqlx::query("SELECT 1").execute(&mut scope).await?;
        scope.commit().await
    }

    /// 池内统计（只读快照，不暴露池本身）。
    ///
    /// 供模块健康 / metrics 端点使用，避免为了读 `size()/num_idle()` 而绕过作用域封装。
    pub fn stats(&self) -> DbPoolStats {
        DbPoolStats {
            size: self.pool.size(),
            idle: self.pool.num_idle(),
            max: self.pool.options().get_max_connections(),
        }
    }

    /// 复用请求级 RLS 事务：只叠加 `SET LOCAL search_path`，不接管提交/回滚。
    pub async fn scope_with<'a>(
        &self,
        tx: &'a mut Transaction<'static, Postgres>,
    ) -> sqlx::Result<ScopedTxn<'a>> {
        let mut scope = ScopedTxn {
            inner: TxRef::Borrowed(tx),
            search_path: Arc::clone(&self.search_path),
        };
        scope.apply_search_path().await?;
        Ok(scope)
    }
}

impl std::fmt::Debug for Db {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Db")
            .field("search_path", &self.search_path)
            .finish_non_exhaustive()
    }
}

/// 池内统计快照。
#[derive(Debug, Clone, Copy)]
pub struct DbPoolStats {
    pub size: u32,
    pub idle: usize,
    pub max: u32,
}

enum TxRef<'a> {
    Owned(Transaction<'a, Postgres>),
    Borrowed(&'a mut Transaction<'static, Postgres>),
}

/// 带 schema 作用域的事务视图。
pub struct ScopedTxn<'a> {
    inner: TxRef<'a>,
    search_path: Arc<str>,
}

impl ScopedTxn<'_> {
    pub fn search_path(&self) -> &str {
        &self.search_path
    }

    /// 当前作用域的连接（仅在本类型内部使用，不对外暴露）。
    fn conn_mut(&mut self) -> &mut PgConnection {
        match &mut self.inner {
            TxRef::Owned(tx) => &mut **tx,
            TxRef::Borrowed(tx) => &mut ***tx,
        }
    }

    async fn apply_search_path(&mut self) -> sqlx::Result<()> {
        let path = self.search_path.to_string();
        sqlx::query("SELECT set_config('search_path', $1, true)")
            .bind(path)
            .execute(&mut *self)
            .await?;
        Ok(())
    }

    /// 提交（仅自有事务生效；借用的事务由请求中间件统一提交）。
    pub async fn commit(self) -> sqlx::Result<()> {
        match self.inner {
            TxRef::Owned(tx) => tx.commit().await,
            TxRef::Borrowed(_) => Ok(()),
        }
    }

    /// 显式回滚（Drop 时 sqlx 也会自动回滚自有事务）。
    pub async fn rollback(self) -> sqlx::Result<()> {
        match self.inner {
            TxRef::Owned(tx) => tx.rollback().await,
            TxRef::Borrowed(_) => Ok(()),
        }
    }
}

impl std::fmt::Debug for ScopedTxn<'_> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("ScopedTxn")
            .field("search_path", &self.search_path)
            .finish_non_exhaustive()
    }
}

impl<'c> Executor<'c> for &'c mut ScopedTxn<'_> {
    type Database = Postgres;

    fn fetch_many<'e, 'q: 'e, E>(
        self,
        query: E,
    ) -> BoxStream<'e, sqlx::Result<Either<PgQueryResult, PgRow>>>
    where
        'c: 'e,
        E: 'q + Execute<'q, Postgres>,
    {
        let conn: &'c mut PgConnection = ScopedTxn::conn_mut(self);
        conn.fetch_many(query)
    }

    fn fetch_optional<'e, 'q: 'e, E>(self, query: E) -> BoxFuture<'e, sqlx::Result<Option<PgRow>>>
    where
        'c: 'e,
        E: 'q + Execute<'q, Postgres>,
    {
        let conn: &'c mut PgConnection = ScopedTxn::conn_mut(self);
        conn.fetch_optional(query)
    }

    fn prepare_with<'e>(
        self,
        sql: SqlStr,
        parameters: &'e [PgTypeInfo],
    ) -> BoxFuture<'e, sqlx::Result<PgStatement>>
    where
        'c: 'e,
    {
        let conn: &'c mut PgConnection = ScopedTxn::conn_mut(self);
        conn.prepare_with(sql, parameters)
    }

    fn describe<'e>(self, sql: SqlStr) -> BoxFuture<'e, sqlx::Result<sqlx::Describe<Postgres>>>
    where
        'c: 'e,
    {
        let conn: &'c mut PgConnection = ScopedTxn::conn_mut(self);
        conn.describe(sql)
    }
}
