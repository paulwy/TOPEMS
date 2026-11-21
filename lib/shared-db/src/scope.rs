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

/// 平台共享数据行的保留租户（全零 UUID）。
///
/// 与「缺少租户上下文」不同：这是**显式的平台通道标记**，只用于平台级共享数据
/// （如 `core.ai_faqs` 的内置默认 FAQ）。业务数据不得使用该值。
pub const PLATFORM_TENANT_ID: Uuid = Uuid::nil();

/// 模块级数据库句柄（进程单池之上的类型化视图）。
#[derive(Clone)]
pub struct Db {
    pool: PgPool,
    search_path: Arc<str>,
    /// 请求上下文守卫（M-1）：开启后请求链路内禁止 `scope()` / `scope_read()` 自开事务。
    deny_request_own_txn: bool,
    /// 请求上下文守卫（M-1/B4）：开启后请求链路内禁止 `scope_for_tenant()` /
    /// `scope_read_for_tenant()` 自开租户事务。按服务逐个开启，不做全局切换。
    deny_request_tenant_scope: bool,
}

impl Db {
    /// `search_path` 是完整的 schema 列表，例如 `"finance, public"`。
    pub fn new(pool: PgPool, search_path: impl Into<String>) -> Self {
        Self {
            pool,
            search_path: Arc::from(search_path.into()),
            deny_request_own_txn: false,
            deny_request_tenant_scope: false,
        }
    }

    /// 开启请求上下文守卫（M-1 试点）：请求链路内调用 [`Db::scope`] / [`Db::scope_read`]
    /// 直接返回 `Protocol` 错误，强制改用 [`Db::scope_with`] 复用请求事务。
    ///
    /// 只影响存在请求租户上下文的调用；后台任务/脚本/显式租户遍历没有上下文，不受影响。
    /// 这是类型化 `RequestTxn` 落地前的运行期兜底：按服务逐个开启，先保证该服务的
    /// `own_txn` 归零，再推广到全仓。
    pub fn deny_request_own_txn(mut self) -> Self {
        self.deny_request_own_txn = true;
        self
    }

    /// 开启「请求链路禁止自开租户作用域」守卫（M-1/B4）。
    ///
    /// 开启后，请求上下文内调用 [`Db::scope_for_tenant`] / [`Db::scope_read_for_tenant`]
    /// 直接返回 `Protocol` 错误，强制改用 [`Db::scope_with`] 复用请求事务。
    ///
    /// **按服务显式开启**：只有该服务的请求 handler 全部迁移完成后才允许打开，
    /// 后台任务/脚本/显式租户遍历没有请求上下文，不受影响。
    pub fn deny_request_tenant_scope(mut self) -> Self {
        self.deny_request_tenant_scope = true;
        self
    }

    pub fn search_path(&self) -> &str {
        &self.search_path
    }

    /// 请求上下文里自开事务 = 一个请求占用两条连接且外层回滚失效（§17.2）。
    fn guard_request_own_txn(&self, entry: &'static str) -> sqlx::Result<()> {
        if self.deny_request_own_txn
            && topems_shared_auth::middleware::tenant::current_request_tenant().is_some()
        {
            return Err(sqlx::Error::Protocol(
                format!(
                    "请求上下文禁止 {entry} 自开事务：请改用 Db::scope_with(&mut req_txn) 复用请求事务；\
                     后台任务/脚本请用 Db::scope_system()/scope_read_system()"
                )
                .into(),
            ));
        }
        Ok(())
    }

    /// 请求上下文里自开租户事务 = 一个请求占用两条连接且外层回滚失效（M-1/B4）。
    fn guard_request_tenant_scope(&self, entry: &'static str) -> sqlx::Result<()> {
        if self.deny_request_tenant_scope
            && topems_shared_auth::middleware::tenant::current_request_tenant().is_some()
        {
            return Err(sqlx::Error::Protocol(
                format!(
                    "请求上下文禁止 {entry} 自开租户事务：请改用 Db::scope_with(&mut req_txn) 复用请求事务；\
                     后台任务/脚本请用 Db::scope_for_tenant()/scope_read_for_tenant() 的独立上下文"
                )
                .into(),
            ));
        }
        Ok(())
    }

    /// 读作用域（只读事务 + 事务级 `search_path`）。
    pub async fn scope_read(&self) -> sqlx::Result<ScopedTxn<'_>> {
        self.guard_request_own_txn("scope_read")?;
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
        self.guard_request_own_txn("scope")?;
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

    /// 平台共享数据只读作用域（系统通道 + 只读事务）。
    ///
    /// # 契约（调用方必须遵守）
    ///
    /// 1. **只读**：事务以 `SET TRANSACTION READ ONLY` 开启，任何写语句都会被
    ///    PostgreSQL 拒绝；本入口不提供写能力。
    /// 2. **必须显式限定平台范围**：调用方 SQL 必须带平台谓词
    ///    （如 `tenant_id = PLATFORM_TENANT_ID`），不得省略谓词读取全表；
    ///    系统通道会绕过 RLS，省略谓词等于跨租户全量读取。
    /// 3. **禁止用于租户业务数据**：禁止在租户业务路径上以本入口替代
    ///    [`Db::scope_read`] / [`Db::scope_read_for_tenant`] 绕过隔离；
    ///    租户自身数据一律走租户作用域。
    /// 4. 适用于「平台内置共享语料」这类归属平台、对所有租户只读的数据
    ///    （当前仅有 `core.ai_faqs` 的全零租户内置 FAQ）。
    ///
    /// 与 [`Db::scope_read_system`] 的区别：后者是后台任务/脚本的通用系统读入口；
    /// 本入口语义更窄，仅用于平台共享数据，便于审计和代码检索。
    pub async fn scope_read_platform(&self) -> sqlx::Result<ScopedTxn<'_>> {
        self.scope_read_system().await
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
    ///
    /// `tenant` 为 nil 视为缺少租户上下文，直接报 `Protocol`，不降级为
    /// nil 租户（否则超管/服务身份会静默读写公共行）。
    pub async fn scope_read_for_tenant(&self, tenant: Uuid) -> sqlx::Result<ScopedTxn<'_>> {
        self.guard_request_tenant_scope("scope_read_for_tenant")?;
        self.open_read_for_tenant(tenant).await
    }

    /// 长连接/流式消费专用租户读作用域：**跳过请求上下文守卫**。
    ///
    /// 仅限 WebSocket 订阅循环这类「一个请求跨越大量短读事务」的场景：请求事务会
    /// 被长连接整段占住，不能复用。普通请求 handler 一律用 [`Db::scope_with`]。
    /// 静态门禁只允许该入口出现在 WebSocket 实现文件中。
    pub async fn scope_read_for_tenant_stream(&self, tenant: Uuid) -> sqlx::Result<ScopedTxn<'_>> {
        let mut scope = self.open_read_for_tenant(tenant).await?;
        // 长连接每轮短读同样受 30s 语句超时保护，避免一条慢查询卡住订阅循环。
        let timeout =
            std::env::var("TOPEMS_STATEMENT_TIMEOUT").unwrap_or_else(|_| "30s".to_string());
        sqlx::query("SELECT set_config('statement_timeout', $1, true)")
            .bind(timeout)
            .execute(&mut scope)
            .await?;
        Ok(scope)
    }

    async fn open_read_for_tenant(&self, tenant: Uuid) -> sqlx::Result<ScopedTxn<'_>> {
        if tenant.is_nil() {
            return Err(sqlx::Error::Protocol(
                "RLS context missing: scope_read_for_tenant 收到 nil 租户；\
                 缺租户上下文请改用 scope_read_system()"
                    .into(),
            ));
        }
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
    /// `tenant` 为 nil 视为缺少租户上下文，直接报 `Protocol`。
    pub async fn scope_for_tenant(&self, tenant: Uuid) -> sqlx::Result<ScopedTxn<'_>> {
        self.guard_request_tenant_scope("scope_for_tenant")?;
        if tenant.is_nil() {
            return Err(sqlx::Error::Protocol(
                "RLS context missing: scope_for_tenant 收到 nil 租户；\
                 缺租户上下文请改用 scope_system()"
                    .into(),
            ));
        }
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
    ///
    /// 事务形参生命周期是泛化的：既接受中间的 `&mut Transaction<'static, _>`，
    /// 也接受 SAVEPOINT 嵌套事务（`Transaction<'_, _>`）。
    pub async fn scope_with<'a>(
        &self,
        tx: &'a mut Transaction<'_, Postgres>,
    ) -> sqlx::Result<ScopedTxn<'a>> {
        let mut scope = ScopedTxn {
            inner: TxRef::Borrowed(&mut **tx),
            search_path: Arc::clone(&self.search_path),
        };
        scope.apply_search_path().await?;
        scope.apply_request_tenant().await?;
        Ok(scope)
    }

    /// 在给定事务内开一个**显式系统通道**作用域（平台目录/跨租户管理专用）。
    ///
    /// 与 [`Db::scope_with`] 的区别：不继承请求租户上下文，强制
    /// `app.tenant_id = nil`、`app.rls_system = 'on'`。用于平台管理员在未选定
    /// 目标租户时读写 `core_tenants` 等平台目录；调用方必须自行保证 SQL 已按
    /// 目标 id/用户过滤，**禁止**用于租户业务数据查询。
    pub async fn scope_with_system<'a>(
        &self,
        tx: &'a mut Transaction<'_, Postgres>,
    ) -> sqlx::Result<ScopedTxn<'a>> {
        let mut scope = ScopedTxn {
            inner: TxRef::Borrowed(&mut **tx),
            search_path: Arc::clone(&self.search_path),
        };
        scope.apply_search_path().await?;
        scope.apply_explicit_tenant(Uuid::nil(), true).await?;
        Ok(scope)
    }

    /// 在给定事务内开一个 **SAVEPOINT + 显式系统通道** 作用域。
    ///
    /// 语义同 [`Db::scope_with_system`]，提交 = RELEASE、回滚 = ROLLBACK TO；
    /// 用于平台侧需要部分回滚的写入（如租户开通）。
    pub async fn scope_savepoint_system<'a>(
        &self,
        tx: &'a mut Transaction<'_, Postgres>,
    ) -> sqlx::Result<ScopedTxn<'a>> {
        let savepoint = sqlx::Acquire::begin(tx).await?;
        let mut scope = ScopedTxn {
            inner: TxRef::Savepoint(savepoint),
            search_path: Arc::clone(&self.search_path),
        };
        scope.apply_search_path().await?;
        scope.apply_explicit_tenant(Uuid::nil(), true).await?;
        Ok(scope)
    }

    /// 在给定事务内开一个 SAVEPOINT 子事务作用域（逐行容错导入/批量操作）。
    ///
    /// `commit()` 释放保存点，`rollback()` 回滚到保存点，外层请求事务继续可用；
    /// 未显式收尾时由 sqlx 在连接写缓冲中执行 `ROLLBACK TO SAVEPOINT`（下一次语句前生效）。
    pub async fn scope_savepoint<'a>(
        &self,
        tx: &'a mut Transaction<'_, Postgres>,
    ) -> sqlx::Result<ScopedTxn<'a>> {
        let savepoint = sqlx::Acquire::begin(tx).await?;
        let mut scope = ScopedTxn {
            inner: TxRef::Savepoint(savepoint),
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
    Owned(Transaction<'static, Postgres>),
    /// 借用的事务只取它的连接（请求事务 / SAVEPOINT 子事务），提交回滚不归作用域管。
    Borrowed(&'a mut PgConnection),
    /// SAVEPOINT 子事务：`commit` = RELEASE，`rollback`/`Drop` = ROLLBACK TO。
    Savepoint(Transaction<'a, Postgres>),
    /// `commit` / `rollback` / `Drop` 已接管，避免二次收尾。
    Consumed,
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
            TxRef::Borrowed(conn) => conn,
            TxRef::Savepoint(tx) => &mut **tx,
            TxRef::Consumed => unreachable!("ScopedTxn 已收尾，不能再访问连接"),
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
        self.apply_explicit_tenant(ctx.tenant, ctx.system).await?;
        // no_txn 服务不经过请求中间件；在请求上下文内的自开作用域同样加 30s 语句超时。
        let timeout =
            std::env::var("TOPEMS_STATEMENT_TIMEOUT").unwrap_or_else(|_| "30s".to_string());
        sqlx::query("SELECT set_config('statement_timeout', $1, true)")
            .bind(timeout)
            .execute(&mut *self)
            .await?;
        Ok(())
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

    /// 提交（自有事务真正提交；SAVEPOINT 释放保存点；借用的事务由请求中间件统一提交）。
    pub async fn commit(mut self) -> sqlx::Result<()> {
        match std::mem::replace(&mut self.inner, TxRef::Consumed) {
            TxRef::Owned(tx) => tx.commit().await,
            TxRef::Savepoint(tx) => tx.commit().await,
            TxRef::Borrowed(_) | TxRef::Consumed => Ok(()),
        }
    }

    /// 显式回滚（自有事务回滚；SAVEPOINT 回滚到保存点；借用的事务交给中间件）。
    pub async fn rollback(mut self) -> sqlx::Result<()> {
        match std::mem::replace(&mut self.inner, TxRef::Consumed) {
            TxRef::Owned(tx) => tx.rollback().await,
            TxRef::Savepoint(tx) => tx.rollback().await,
            TxRef::Borrowed(_) | TxRef::Consumed => Ok(()),
        }
    }
}

/// 未显式收尾时，同步摘出自有事务并交给后台 driver 立即回滚。
///
/// sqlx 的 `Transaction::drop` 只把 `ROLLBACK` 写进连接写缓冲，真正 flush 依赖
/// `PoolConnection::drop` 里 `rt::spawn` 的归还任务执行 `ping`——调度时机不在请求
/// 控制范围内。请求结束到该任务被轮询之间，PG 侧连接仍是 `idle in transaction`；
/// 紧池下会与下一个请求的事务重叠（W7-B4-EHS-FOLLOWUP-1）。
///
/// 这里把「排队」变成「显式驱动」：Drop 内同步取走事务（不阻塞），并登记到当前请求的
/// 收尾表；`tenant_middleware` 在响应交回 hyper 之前等待，保证响应返回时事务已收尾。
/// 无请求上下文（后台任务/脚本/CLI）时任务自行 detach，与原行为一致。
impl Drop for ScopedTxn<'_> {
    fn drop(&mut self) {
        let TxRef::Owned(tx) = std::mem::replace(&mut self.inner, TxRef::Consumed) else {
            return;
        };
        let task = tokio::spawn(async move {
            if let Err(e) = tx.rollback().await {
                tracing::warn!(
                    target: "scoped_txn",
                    error = %e,
                    "作用域事务后台回滚失败"
                );
            }
        });
        let _ = topems_shared_auth::middleware::tenant::register_request_finalizer(task);
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

#[cfg(test)]
mod tenant_guard_tests {
    use super::*;
    use sqlx::postgres::PgPoolOptions;

    /// nil 租户必须直接报错，不允许降级成系统通道或 nil 租户作用域。
    #[tokio::test]
    async fn explicit_tenant_scopes_reject_nil() {
        let Ok(pool) = PgPoolOptions::new().connect_lazy("postgres://u:p@127.0.0.1:1/none") else {
            return;
        };

        let read_db = Db::new(pool.clone(), "lims, public");
        let err = read_db.scope_read_for_tenant(Uuid::nil()).await.err();
        assert!(
            matches!(&err, Some(sqlx::Error::Protocol(m)) if m.contains("RLS context missing")),
            "scope_read_for_tenant(nil) 应返回 Protocol: {err:?}"
        );

        let write_db = Db::new(pool, "lims, public");
        let err = write_db.scope_for_tenant(Uuid::nil()).await.err();
        assert!(
            matches!(&err, Some(sqlx::Error::Protocol(m)) if m.contains("RLS context missing")),
            "scope_for_tenant(nil) 应返回 Protocol: {err:?}"
        );
    }

    /// M-1 试点：开启守卫后，请求上下文内 `scope()` / `scope_read()` 必须直接报错，
    /// 不允许"看起来成功"地再开一条连接/事务。
    #[tokio::test]
    async fn request_context_rejects_own_txn_when_guarded() {
        let Ok(pool) = PgPoolOptions::new().connect_lazy("postgres://u:p@127.0.0.1:1/none") else {
            return;
        };
        let db = Db::new(pool, "tms, public").deny_request_own_txn();
        let ctx = topems_shared_auth::middleware::tenant::RlsRequestTenant {
            tenant: Uuid::new_v4(),
            system: false,
        };

        let (read, write) =
            topems_shared_auth::middleware::tenant::scope_request_tenant(ctx, async {
                let read = db.scope_read().await.err();
                let write = db.scope().await.err();
                (read, write)
            })
            .await;

        for err in [read, write] {
            assert!(
                matches!(&err, Some(sqlx::Error::Protocol(m)) if m.contains("禁止")),
                "请求上下文内自开事务应被拒绝，实际: {err:?}"
            );
        }
    }

    /// M-1/B4：开启租户作用域守卫后，请求上下文内
    /// `scope_for_tenant()` / `scope_read_for_tenant()` 必须直接报错。
    #[tokio::test]
    async fn request_context_rejects_tenant_scope_when_guarded() {
        let Ok(pool) = PgPoolOptions::new().connect_lazy("postgres://u:p@127.0.0.1:1/none") else {
            return;
        };
        let db = Db::new(pool, "qms, public").deny_request_tenant_scope();
        let ctx = topems_shared_auth::middleware::tenant::RlsRequestTenant {
            tenant: Uuid::new_v4(),
            system: false,
        };
        let tenant = ctx.tenant;

        let (read, write) =
            topems_shared_auth::middleware::tenant::scope_request_tenant(ctx, async {
                let read = db.scope_read_for_tenant(tenant).await.err();
                let write = db.scope_for_tenant(tenant).await.err();
                (read, write)
            })
            .await;

        for err in [read, write] {
            assert!(
                matches!(&err, Some(sqlx::Error::Protocol(m)) if m.contains("禁止")),
                "请求上下文内自开租户作用域应被拒绝，实际: {err:?}"
            );
        }
    }

    /// B3：长连接流式入口必须跳过请求租户守卫（否则 WebSocket 订阅无法短读）。
    #[tokio::test]
    async fn stream_scope_bypasses_request_tenant_guard() {
        let Ok(pool) = PgPoolOptions::new()
            .acquire_timeout(std::time::Duration::from_millis(200))
            .connect_lazy("postgres://u:p@127.0.0.1:1/none")
        else {
            return;
        };
        let db = Db::new(pool, "bi, public").deny_request_tenant_scope();
        let ctx = topems_shared_auth::middleware::tenant::RlsRequestTenant {
            tenant: Uuid::new_v4(),
            system: false,
        };
        let tenant = ctx.tenant;

        let Some(err) = topems_shared_auth::middleware::tenant::scope_request_tenant(ctx, async {
            db.scope_read_for_tenant_stream(tenant).await.err()
        })
        .await
        else {
            return;
        };

        // 连接必然失败（假地址）；关键是错误不是守卫的 Protocol("禁止")。
        assert!(
            !matches!(&err, sqlx::Error::Protocol(m) if m.contains("禁止")),
            "流式入口不应被请求守卫拦截，实际: {err:?}"
        );
    }
}
