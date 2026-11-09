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
//!   （建池时通过 `create_database_pool_with_search_path` 显式传入的会话级值）；
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
use uuid::Uuid;

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
        scope.apply_request_tenant().await?;
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
        scope.apply_request_tenant().await?;
        Ok(scope)
    }

    /// 系统读作用域（只读事务 + 显式 nil 租户 + `app.rls_system='on'`）。
    ///
    /// 用于后台任务、脚本、启动期自愈等**没有请求上下文**的场景。
    /// 与「不设 GUC」不同：显式 nil 是策略里的系统分支，可读全量；
    /// 不设 GUC 在策略下是 fail-closed（NULL 不匹配任何分支）。
    pub async fn scope_read_system(&self) -> sqlx::Result<ScopedTxn<'_>> {
        let mut tx = self.pool.begin().await?;
        sqlx::query("SET TRANSACTION READ ONLY")
            .execute(&mut *tx)
            .await?;
        let mut scope = ScopedTxn {
            inner: TxRef::Owned(tx),
            search_path: Arc::clone(&self.search_path),
        };
        scope.apply_search_path().await?;
        scope.apply_explicit_tenant(Uuid::nil(), true).await?;
        Ok(scope)
    }

    /// 系统写作用域（读写事务 + 显式 nil 租户 + `app.rls_system='on'`）。
    pub async fn scope_system(&self) -> sqlx::Result<ScopedTxn<'_>> {
        let tx = self.pool.begin().await?;
        let mut scope = ScopedTxn {
            inner: TxRef::Owned(tx),
            search_path: Arc::clone(&self.search_path),
        };
        scope.apply_search_path().await?;
        scope.apply_explicit_tenant(Uuid::nil(), true).await?;
        Ok(scope)
    }

    /// 显式租户读作用域（只读事务 + 指定租户，`app.rls_system='off'`）。
    ///
    /// 仅供**按租户遍历/批处理**（后台任务、数据修复、导出）使用；
    /// 请求链路请用 [`Db::scope_read`]，由 task-local 自动带上下文。
    pub async fn scope_read_for_tenant(&self, tenant: Uuid) -> sqlx::Result<ScopedTxn<'_>> {
        let mut tx = self.pool.begin().await?;
        sqlx::query("SET TRANSACTION READ ONLY")
            .execute(&mut *tx)
            .await?;
        let mut scope = ScopedTxn {
            inner: TxRef::Owned(tx),
            search_path: Arc::clone(&self.search_path),
        };
        scope.apply_search_path().await?;
        scope.apply_explicit_tenant(tenant, false).await?;
        Ok(scope)
    }

    /// 显式租户写作用域（读写事务 + 指定租户，`app.rls_system='off'`）。
    ///
    /// 同 [`Db::scope_read_for_tenant`]，仅用于按租户遍历的后台/批处理路径。
    pub async fn scope_for_tenant(&self, tenant: Uuid) -> sqlx::Result<ScopedTxn<'_>> {
        let tx = self.pool.begin().await?;
        let mut scope = ScopedTxn {
            inner: TxRef::Owned(tx),
            search_path: Arc::clone(&self.search_path),
        };
        scope.apply_search_path().await?;
        scope.apply_explicit_tenant(tenant, false).await?;
        Ok(scope)
    }

    /// 健康检查（不暴露底层池）。
    ///
    /// 健康检查没有请求上下文，必须显式系统通道；否则 fail-closed 后
    /// 探针会在第一条 SQL 前就报「缺少租户上下文」。
    pub async fn check_health(&self) -> sqlx::Result<()> {
        let mut scope = self.scope_read_system().await?;
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
        scope.apply_request_tenant().await?;
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

    /// 把认证中间件写入 task-local 的租户上下文落到当前作用域事务上。
    ///
    /// 只读/读写作用域各自 `BEGIN`，与 `tenant_middleware` 的请求事务不是同一条连接；
    /// 不在这里补 `app.tenant_id` / `app.rls_system`，内联谓词与策略里的
    /// `current_setting(..., true)` 就是 NULL（「未设即豁免」分支）＝跨租户放行。
    ///
    /// 无请求上下文（后台任务/脚本/CLI/测试）**必须报错**，不得静默执行：
    /// 静默执行会落到数据库的 fail-closed（0 行）或被旧策略放行（全量），
    /// 两种结果都无法与"真的没数据"区分。非请求入口改用
    /// [`Db::scope_system`] / [`Db::scope_read_system`] 或
    /// [`Db::scope_for_tenant`] / [`Db::scope_read_for_tenant`]。
    async fn apply_request_tenant(&mut self) -> sqlx::Result<()> {
        let Some(ctx) = topems_shared_auth::middleware::tenant::current_request_tenant() else {
            return Err(sqlx::Error::Protocol(
                "RLS context missing: 无租户上下文，禁止执行租户数据查询；\
                 后台任务/脚本请改用 Db::scope_system()/scope_read_system() 或按租户遍历"
                    .into(),
            ));
        };
        self.apply_explicit_tenant(ctx.tenant, ctx.system).await
    }

    /// 显式设置租户通道 GUC（系统通道 = nil UUID + `rls_system='on'`）。
    async fn apply_explicit_tenant(&mut self, tenant: Uuid, system: bool) -> sqlx::Result<()> {
        sqlx::query(
            "SELECT set_config('app.tenant_id', $1, true), \
                    set_config('app.rls_system', $2, true)",
        )
        .bind(tenant.to_string())
        .bind(if system { "on" } else { "off" })
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
