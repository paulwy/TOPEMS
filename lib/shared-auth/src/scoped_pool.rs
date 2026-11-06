//! 请求作用域连接池（B0 机制层）。
//!
//! # 目标
//!
//! `tenant_middleware` 已经在每个请求上开启了一个事务并设置了
//! `app.tenant_id`（`set_config(..., true)`，即 `SET LOCAL`），但该事务此前没有任何
//! 消费者——所有业务查询仍然走 `state.pool`（随机借池连接、无租户 GUC）。本模块把
//! 该请求事务放进 `tokio::task_local!`，并让 [`ScopedPool`] 的 `Executor` 实现复用
//! 它，从而：
//!
//! - **调用点零改动**：`sqlx::query(..).fetch_all(&state.pool)` 的写法不变；
//! - **传输层不必逐处改**：只需要把 `AppState.pool` / `ApiState.db` 的字段类型从
//!   `PgPool` 改为 `ScopedPool`；
//! - **fail-closed**：task-local 中没有请求上下文时直接返回错误，**不会**静默回退到
//!   无租户的 `PgPool`。
//!
//! # 边界语义
//!
//! - **同请求并发查询**：所有查询共享同一个请求事务，因此 `join!` 发起的并发查询会在
//!   `Arc<Mutex<..>>` 上排队串行执行（M-A 决策已接受）。排队时间受各查询自身耗时
//!   支配；sqlx 连接池的 `acquire_timeout` 只作用于取连接，不作用于本互斥锁，
//!   因此不会额外引入"池超时"错误，但极端情况下会拉长单请求耗时。
//! - **嵌套调用**：同一个请求内再次进入 [`ScopedPool::scope`] 会覆盖外层 task-local
//!   上下文；中间件只应在路由最外层进入一次。
//! - **无事务上下文**（后台任务、`tokio::spawn`、public 路径）：`Executor` 直接返回
//!   `Error::Protocol`，fail-closed。需要租户的后台任务请显式使用
//!   [`ScopedPool::with_tenant`]。
//! - **连接归还 / RESET**：复用的事务由 `tenant_middleware` 统一 `commit`；SQLx 在
//!   连接归还时按池配置复位会话状态，且 `SET LOCAL` 随事务结束自动失效，不残留。
//! - **BEGIN 失败**：由中间件直接返回 500，不会以"无上下文"继续执行 handler。

use either::Either;
use futures_util::future::BoxFuture;
use futures_util::stream::BoxStream;
use futures_util::StreamExt;
use sqlx::postgres::{PgQueryResult, PgRow, PgStatement, PgTypeInfo, Postgres};
use sqlx::{Execute, Executor, PgPool, SqlStr, Transaction};
use std::sync::Arc;
use tokio::sync::Mutex;
use uuid::Uuid;

/// 请求事务句柄（与 `tenant_middleware` 注入到请求扩展的类型同源）。
pub type ScopedTxnCell = Arc<Mutex<Option<Transaction<'static, Postgres>>>>;

/// 请求级租户上下文：事务句柄 + 中间件写入的 GUC 值。
#[derive(Clone, Debug)]
pub struct ScopedCtx {
    pub txn: ScopedTxnCell,
    /// 已写入 `app.tenant_id` 的值：普通租户为其 uuid，service/superuser 为 nil uuid。
    pub tenant: String,
}

tokio::task_local! {
    static SCOPED_CTX: ScopedCtx;
}

/// 当前 task 的租户上下文；不在请求作用域内时为 `None`。
pub fn current() -> Option<ScopedCtx> {
    SCOPED_CTX.try_with(Clone::clone).ok()
}

/// 在租户上下文作用域内执行 future（由 `tenant_middleware` 调用）。
pub fn scope<F>(ctx: ScopedCtx, fut: F) -> tokio::task::futures::TaskLocalFuture<ScopedCtx, F>
where
    F: std::future::Future,
{
    SCOPED_CTX.scope(ctx, fut)
}

fn no_context() -> sqlx::Error {
    sqlx::Error::Protocol(
        "ScopedPool: 无请求租户上下文（fail-closed，拒绝回退到无租户 pool）".to_string(),
    )
}

fn no_txn() -> sqlx::Error {
    sqlx::Error::Protocol(
        "ScopedPool: 请求事务已被接管或未初始化（fail-closed）".to_string(),
    )
}

/// 连接池的请求作用域视图。
///
/// 内部 `PgPool` 私有，查询必须经 `Executor`（复用请求事务）；`Deref<Target = PgPool>`
/// 仅用于兼容既有 `fn foo(pool: &PgPool)` 辅助函数与 `size()` / `acquire()` 等
/// 非查询 API。**经 Deref 使用的查询不享受请求租户上下文**——这类调用点已登记为
/// 后续批次（B1+）的收敛对象。
#[derive(Clone, Debug)]
pub struct ScopedPool {
    inner: PgPool,
}

impl ScopedPool {
    pub fn new(inner: PgPool) -> Self {
        Self { inner }
    }

    /// 底层池（仅供引导、健康检查、测试与显式放行的基础设施路径使用）。
    pub fn inner(&self) -> &PgPool {
        &self.inner
    }

    pub fn into_inner(self) -> PgPool {
        self.inner
    }

    pub async fn begin(&self) -> sqlx::Result<Transaction<'static, Postgres>> {
        let ctx = current().ok_or_else(no_context)?;
        let mut tx = self.inner.begin().await?;
        // 独立事务同样带上本请求租户，避免 fail-closed 后写路径读到 0 行。
        sqlx::query("SELECT set_config('app.tenant_id', $1, true)")
            .bind(ctx.tenant)
            .execute(&mut *tx)
            .await?;
        Ok(tx)
    }

    /// 无请求上下文的后台任务/事件处理使用：自建事务 + 显式租户作用域。
    ///
    /// `Uuid::nil()` 表示 service/超管语义（RLS 策略的 nil 分支放行全量）。
    pub async fn with_tenant<F, T>(&self, tenant: Uuid, fut: F) -> sqlx::Result<T>
    where
        F: std::future::Future<Output = T>,
    {
        let mut tx = self.inner.begin().await?;
        sqlx::query("SELECT set_config('app.tenant_id', $1, true)")
            .bind(tenant.to_string())
            .execute(&mut *tx)
            .await?;
        let cell: ScopedTxnCell = Arc::new(Mutex::new(Some(tx)));
        let ctx = ScopedCtx {
            txn: cell.clone(),
            tenant: tenant.to_string(),
        };
        let out = scope(ctx, fut).await;
        if let Some(tx) = cell.lock().await.take() {
            tx.commit().await?;
        }
        Ok(out)
    }
}

impl std::ops::Deref for ScopedPool {
    type Target = PgPool;

    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

impl<'c> Executor<'c> for &'c ScopedPool {
    type Database = Postgres;

    fn fetch_many<'e, 'q: 'e, E>(
        self,
        query: E,
    ) -> BoxStream<'e, sqlx::Result<Either<PgQueryResult, PgRow>>>
    where
        'c: 'e,
        E: 'q + Execute<'q, Postgres>,
    {
        let ctx = match current() {
            Some(c) => c,
            None => {
                return Box::pin(futures_util::stream::once(async {
                    Err(no_context())
                }))
            }
        };
        let fut = async move {
            let mut guard = ctx.txn.lock().await;
            let mut tx = match guard.take() {
                Some(t) => t,
                None => return Err(no_txn()),
            };
            // 先在事务上跑完并收集，再归还句柄：避免跨 yield 持有连接借用。
            let items: Vec<Either<PgQueryResult, PgRow>> = {
                let mut stream = (&mut *tx).fetch_many(query);
                let mut out = Vec::new();
                while let Some(item) = stream.next().await {
                    out.push(item?);
                }
                out
            };
            *guard = Some(tx);
            Ok(items)
        };
        let s = futures_util::stream::once(fut)
            .map(|res: sqlx::Result<Vec<Either<PgQueryResult, PgRow>>>| {
                let inner: BoxStream<'e, sqlx::Result<Either<PgQueryResult, PgRow>>> = match res {
                    Ok(v) => Box::pin(futures_util::stream::iter(v.into_iter().map(Ok))),
                    Err(e) => Box::pin(futures_util::stream::once(async move { Err(e) })),
                };
                inner
            })
            .flatten();
        Box::pin(s)
    }

    fn fetch_optional<'e, 'q: 'e, E>(self, query: E) -> BoxFuture<'e, sqlx::Result<Option<PgRow>>>
    where
        'c: 'e,
        E: 'q + Execute<'q, Postgres>,
    {
        let ctx = match current() {
            Some(c) => c,
            None => return Box::pin(async { Err(no_context()) }),
        };
        Box::pin(async move {
            let mut guard = ctx.txn.lock().await;
            let mut tx = match guard.take() {
                Some(t) => t,
                None => return Err(no_txn()),
            };
            let res = (&mut *tx).fetch_optional(query).await;
            *guard = Some(tx);
            res
        })
    }

    fn prepare_with<'e>(
        self,
        sql: SqlStr,
        parameters: &'e [PgTypeInfo],
    ) -> BoxFuture<'e, sqlx::Result<PgStatement>>
    where
        'c: 'e,
    {
        let ctx = match current() {
            Some(c) => c,
            None => return Box::pin(async { Err(no_context()) }),
        };
        Box::pin(async move {
            let mut guard = ctx.txn.lock().await;
            let mut tx = match guard.take() {
                Some(t) => t,
                None => return Err(no_txn()),
            };
            let res = (&mut *tx).prepare_with(sql, parameters).await;
            *guard = Some(tx);
            res
        })
    }

    fn describe<'e>(self, sql: SqlStr) -> BoxFuture<'e, sqlx::Result<sqlx::Describe<Postgres>>>
    where
        'c: 'e,
    {
        let ctx = match current() {
            Some(c) => c,
            None => return Box::pin(async { Err(no_context()) }),
        };
        Box::pin(async move {
            let mut guard = ctx.txn.lock().await;
            let mut tx = match guard.take() {
                Some(t) => t,
                None => return Err(no_txn()),
            };
            let res = (&mut *tx).describe(sql).await;
            *guard = Some(tx);
            res
        })
    }
}
