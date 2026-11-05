//! 进程级数据库连接预算（连接治理 A）。
//!
//! # 目标
//!
//! 任何情况下，**单进程对同一数据库的总连接数** ≤ `DB_TOTAL_CONNECTION_BUDGET`（默认 60）。
//!
//! # 与单池上限的关系
//!
//! 预算是**总额天花板**，不是 `DB_MODULE_MAX_CONNECTIONS` / `DB_MODULE_MIN_CONNECTIONS` 的替代：
//!
//! - 单池仍按自身配置申请 `max_connections`（嵌入模式默认 3、独立部署沿用服务配置）；
//! - 建池时向本模块申请配额：`实际 max = min(单池申请值, 预算剩余, 每池公平份额)`；
//! - 因此 `Σ(所有池的 max_connections) ≤ 预算`，而每个池的实际连接数 ≤ 该池 max，
//!   所以进程总连接数 ≤ 预算。
//!
//! # 为什么不是「取连接时拿信号量」
//!
//! 业务代码把 `PgPool` 直接当 `sqlx::Executor` 使用（`&PgPool` 实现 `Executor`）且大量
//! 调用 `pool.acquire()`，进程内没有统一的「取连接」拦截点。若在 acquire 层加信号量，
//! 需要把 `PgPool` 换成自定义 newtype 并改所有服务签名与调用点（27 个模块），风险与收益
//! 不成比例，且任意 early-return / panic 漏还许可会比现状更糟。
//!
//! 本模块改为**建池期记账 + RAII 预约**（`PoolReservation`）：配额在池创建前预留，
//! 创建成功则 commit（该池从此永久占用该额度），创建失败 / 提前返回 / panic 时 `Drop`
//! 自动归还。没有运行期许可，也就不存在运行期泄漏路径。
//!
//! # 额度算法
//!
//! ```text
//! denom   = max(DB_EXPECTED_POOLS, 已提交池数 + 1)
//! share   = max(1, 预算 / denom)
//! grant   = min(申请值, share, 预算 - 已分配)
//! grant == 0 → 返回错误（fail-fast，不超发）
//! ```
//!
//! `DB_EXPECTED_POOLS` 让额度在池之间公平分摊：嵌入模式默认 29（28 个 real_module +
//! 1 个进程级迁移池），独立部署默认 2（业务池 + 迁移池）。默认值与「先到先得」相比，
//! 不会让前面的池吃光预算、后面的池拿不到连接。

use std::env;
use std::sync::{Mutex, OnceLock};
use topems_shared_core::error::{Result, TopemsError};

/// 默认进程总连接预算。给 PG `max_connections=100` 留出约 40 的运维 / 其他进程余量。
pub const DEFAULT_TOTAL_CONNECTION_BUDGET: u32 = 60;

/// 嵌入模式（topems-server）默认池数量：28 个 real_module 业务池 + 1 个共享迁移池。
const EMBEDDED_DEFAULT_EXPECTED_POOLS: u32 = 29;

/// 独立部署默认池数量：1 个业务池 + 1 个共享迁移池。
const STANDALONE_DEFAULT_EXPECTED_POOLS: u32 = 2;

/// 预算配置。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BudgetConfig {
    /// 进程总预算（连接数）。
    pub total: u32,
    /// 预期池数量（用于公平分摊额度）。
    pub expected_pools: u32,
}

impl BudgetConfig {
    pub const fn new(total: u32, expected_pools: u32) -> Self {
        Self {
            total: if total == 0 { 1 } else { total },
            expected_pools: if expected_pools == 0 {
                1
            } else {
                expected_pools
            },
        }
    }

    /// 从环境变量解析：
    /// - `DB_TOTAL_CONNECTION_BUDGET`（默认 60，非法/0 回退默认值）
    /// - `DB_EXPECTED_POOLS`（默认：嵌入 28 / 独立部署 2）
    pub fn from_env() -> Self {
        let total = env::var("DB_TOTAL_CONNECTION_BUDGET")
            .ok()
            .and_then(|s| s.trim().parse::<u32>().ok())
            .filter(|v| *v > 0)
            .unwrap_or(DEFAULT_TOTAL_CONNECTION_BUDGET);

        let embedded = env::var("TOPEMS_EMBEDDED")
            .map(|v| v == "true" || v == "1")
            .unwrap_or(false);
        let default_expected = if embedded {
            EMBEDDED_DEFAULT_EXPECTED_POOLS
        } else {
            STANDALONE_DEFAULT_EXPECTED_POOLS
        };
        let expected_pools = env::var("DB_EXPECTED_POOLS")
            .ok()
            .and_then(|s| s.trim().parse::<u32>().ok())
            .filter(|v| *v > 0)
            .unwrap_or(default_expected);

        Self::new(total, expected_pools)
    }
}

/// 预算快照（日志 / 测试 / 排障用）。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BudgetSnapshot {
    pub total: u32,
    pub expected_pools: u32,
    /// 已提交池占用的额度总和（= Σ 各池 max_connections）。
    pub allocated: u32,
    /// 已成功创建的池数量。
    pub pools: u32,
    /// 历史峰值 allocated（含未提交的临时预留）。
    pub peak_allocated: u32,
}

/// 预算账本（纯状态机，便于单测；进程级实例由 [`global_ledger`] 提供）。
#[derive(Debug)]
pub struct Ledger {
    cfg: BudgetConfig,
    allocated: u32,
    pools: u32,
    peak_allocated: u32,
}

impl Ledger {
    pub const fn new(cfg: BudgetConfig) -> Self {
        Self {
            cfg,
            allocated: 0,
            pools: 0,
            peak_allocated: 0,
        }
    }

    pub fn config(&self) -> BudgetConfig {
        self.cfg
    }

    pub fn snapshot(&self) -> BudgetSnapshot {
        BudgetSnapshot {
            total: self.cfg.total,
            expected_pools: self.cfg.expected_pools,
            allocated: self.allocated,
            pools: self.pools,
            peak_allocated: self.peak_allocated,
        }
    }

    /// 计算本次能给该池的额度（不修改状态）。
    ///
    /// `requested` 是该池的单池上限（`DB_MODULE_MAX_CONNECTIONS` 或服务配置）；
    /// 结果同时受「公平份额」和「预算余额」约束，且不小于 1（除非余额已为 0）。
    fn next_grant(&self, requested: u32) -> u32 {
        if requested == 0 {
            return 0;
        }
        let denom = self.cfg.expected_pools.max(self.pools.saturating_add(1));
        let share = (self.cfg.total / denom).max(1);
        let remaining = self.cfg.total.saturating_sub(self.allocated);
        requested.min(share).min(remaining)
    }

    /// 预留额度；返回 `None` 表示预算已耗尽（不允许超发）。
    pub fn try_reserve(&mut self, requested: u32) -> Option<u32> {
        let grant = self.next_grant(requested);
        if grant == 0 {
            return None;
        }
        self.allocated = self.allocated.saturating_add(grant);
        self.peak_allocated = self.peak_allocated.max(self.allocated);
        Some(grant)
    }

    /// 池创建成功：额度转为永久占用，池计数 +1。
    fn commit(&mut self) {
        self.pools = self.pools.saturating_add(1);
    }

    /// 池创建失败 / 提前返回：归还临时预留。
    fn release(&mut self, grant: u32) {
        self.allocated = self.allocated.saturating_sub(grant);
    }
}

/// 建池额度预约句柄（RAII）。
///
/// - 创建成功：调用 [`PoolReservation::commit`]，额度永久归该池；
/// - 创建失败 / 任意 early-return / panic 展开：`Drop` 自动归还额度。
///
/// 由于额度在建池前就已确定并写进 `PgPoolOptions::max_connections`，运行期不存在
/// 「许可」对象，因此不可能出现「许可逐步泄漏」。
#[derive(Debug)]
pub struct PoolReservation {
    ledger: &'static Mutex<Ledger>,
    granted: u32,
    committed: bool,
    label: &'static str,
    requested: u32,
}

impl PoolReservation {
    /// 该池实际可用的 `max_connections`（单池申请值与预算约束取小）。
    pub fn granted(&self) -> u32 {
        self.granted
    }

    /// 标记池创建成功：额度永久保留，之后 `Drop` 不再归还。
    pub fn commit(mut self) {
        if let Ok(mut ledger) = self.ledger.lock() {
            ledger.commit();
        }
        self.committed = true;
        tracing::info!(
            "[db-budget] 池 {} 已提交：granted={}/{}，预算 {}/{}，池数 {}",
            self.label,
            self.granted,
            self.requested,
            self.ledger
                .lock()
                .map(|l| l.allocated)
                .unwrap_or(self.granted),
            self.ledger.lock().map(|l| l.cfg.total).unwrap_or(0),
            self.ledger.lock().map(|l| l.pools).unwrap_or(1),
        );
    }
}

impl Drop for PoolReservation {
    fn drop(&mut self) {
        if self.committed {
            return;
        }
        if let Ok(mut ledger) = self.ledger.lock() {
            ledger.release(self.granted);
        }
    }
}

fn global_ledger() -> &'static Mutex<Ledger> {
    static LEDGER: OnceLock<Mutex<Ledger>> = OnceLock::new();
    LEDGER.get_or_init(|| Mutex::new(Ledger::new(BudgetConfig::from_env())))
}

/// 向指定账本申请一个池的额度（测试可注入独立账本）。
pub fn reserve_from(
    ledger: &'static Mutex<Ledger>,
    label: &'static str,
    requested: u32,
) -> Result<PoolReservation> {
    let mut guard = ledger
        .lock()
        .map_err(|_| TopemsError::Database("连接预算账本锁 poisoned".to_string()))?;
    match guard.try_reserve(requested) {
        Some(granted) => {
            let snap = guard.snapshot();
            drop(guard);
            tracing::info!(
                "[db-budget] 池 {} 预约额度 granted={}/{}，已分配 {}/{}，池数 {}",
                label,
                granted,
                requested,
                snap.allocated,
                snap.total,
                snap.pools
            );
            Ok(PoolReservation {
                ledger,
                granted,
                committed: false,
                label,
                requested,
            })
        }
        None => {
            let snap = guard.snapshot();
            Err(TopemsError::Database(format!(
                "数据库连接预算已耗尽：池 {} 申请 {}，预算 {}，已分配 {}，池数 {}；\
                 请调大 DB_TOTAL_CONNECTION_BUDGET 或调小单池上限",
                label, requested, snap.total, snap.allocated, snap.pools
            )))
        }
    }
}

/// 向进程级账本申请一个池的额度。
pub fn reserve_pool(label: &'static str, requested: u32) -> Result<PoolReservation> {
    reserve_from(global_ledger(), label, requested)
}

/// 进程级预算快照。
pub fn snapshot() -> BudgetSnapshot {
    global_ledger()
        .lock()
        .map(|l| l.snapshot())
        .unwrap_or(BudgetSnapshot {
            total: 0,
            expected_pools: 0,
            allocated: 0,
            pools: 0,
            peak_allocated: 0,
        })
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    use super::*;
    use std::panic::{catch_unwind, AssertUnwindSafe};
    use std::sync::Arc;

    fn ledger(
        cell: &'static OnceLock<Mutex<Ledger>>,
        total: u32,
        expected: u32,
    ) -> &'static Mutex<Ledger> {
        cell.get_or_init(|| Mutex::new(Ledger::new(BudgetConfig::new(total, expected))))
    }

    /// 28 个模块池各申请 3，预算 60、预期 29 池 → 每池 2，Σ max = 56 ≤ 60。
    #[test]
    fn grants_sum_within_budget_for_embedded_shape() {
        static L: OnceLock<Mutex<Ledger>> = OnceLock::new();
        let l = ledger(&L, 60, 29);
        let mut grants = Vec::new();
        for _ in 0..28 {
            let r = reserve_from(l, "business", 3).unwrap();
            grants.push(r.granted());
            r.commit();
        }
        let sum: u32 = grants.iter().sum();
        assert_eq!(sum, 56);
        assert!(sum <= 60);
        let snap = l.lock().unwrap().snapshot();
        assert_eq!(snap.allocated, 56);
        assert_eq!(snap.pools, 28);
    }

    /// 单池配置被调得很大也仍被预算卡住（负向用例的纯逻辑版）。
    #[test]
    fn huge_per_pool_request_is_capped_by_budget() {
        static L: OnceLock<Mutex<Ledger>> = OnceLock::new();
        let l = ledger(&L, 60, 2);
        let r = reserve_from(l, "huge", 1000).unwrap();
        assert_eq!(r.granted(), 30); // share = 60 / max(2, 1) = 30
        r.commit();
        let r2 = reserve_from(l, "huge2", 1000).unwrap();
        assert_eq!(r2.granted(), 30);
        r2.commit();
        // 余额已满 → 第三个池不能超发
        assert!(reserve_from(l, "huge3", 1000).is_err());
        assert!(l.lock().unwrap().snapshot().allocated <= 60);
    }

    /// 池数远超预期时，总额仍不超过预算；耗尽后返回错误而不是超发。
    #[test]
    fn never_exceeds_budget_across_many_pools() {
        static L: OnceLock<Mutex<Ledger>> = OnceLock::new();
        let l = ledger(&L, 60, 1);
        let mut sum = 0u32;
        let mut errs = 0u32;
        for _ in 0..40 {
            match reserve_from(l, "many", 10) {
                Ok(r) => {
                    sum += r.granted();
                    r.commit();
                }
                Err(_) => errs += 1,
            }
        }
        assert!(sum <= 60, "Σ max_connections={sum} 超出预算 60");
        assert!(errs > 0);
    }

    /// 提前返回 / 失败：未 commit 的预约必须归还；连续两轮观察 allocated 不递减。
    #[test]
    fn drop_releases_reservation_across_rounds() {
        static L: OnceLock<Mutex<Ledger>> = OnceLock::new();
        let l = ledger(&L, 60, 1);
        for _ in 0..3 {
            let r = reserve_from(l, "early-return", 30).unwrap();
            let granted = r.granted();
            assert_eq!(l.lock().unwrap().snapshot().allocated, granted);
            drop(r); // 模拟建池失败 / 提前返回
            assert_eq!(l.lock().unwrap().snapshot().allocated, 0);
            assert_eq!(l.lock().unwrap().snapshot().pools, 0);
        }
    }

    /// panic 展开路径：Drop 归还额度，账本不泄漏。
    #[test]
    fn panic_releases_reservation() {
        static L: OnceLock<Mutex<Ledger>> = OnceLock::new();
        let l = ledger(&L, 60, 1);
        let result = catch_unwind(AssertUnwindSafe(|| {
            let _r = reserve_from(l, "panic", 30).unwrap();
            panic!("boom");
        }));
        assert!(result.is_err());
        let snap = l.lock().unwrap().snapshot();
        assert_eq!(snap.allocated, 0);
        assert_eq!(snap.pools, 0);
    }

    /// 并发 N > 预算：所有成功预约的额度之和必须 ≤ 预算。
    #[test]
    fn concurrent_reservations_stay_within_budget() {
        static L: OnceLock<Mutex<Ledger>> = OnceLock::new();
        let l = ledger(&L, 40, 10);
        let handles: Vec<_> = (0..30)
            .map(|_| {
                std::thread::spawn(move || {
                    let r = reserve_from(l, "concurrent", 5).unwrap();
                    let granted = r.granted();
                    r.commit();
                    granted
                })
            })
            .collect();
        // 30 个线程、预算 40：公平份额 5，前 8 个成功（40），其余返回 Err 让 join 失败；
        // 这里只统计成功者的额度总和。
        let mut sum = 0u32;
        let mut ok = 0u32;
        for h in handles {
            if let Ok(g) = h.join() {
                sum += g;
                ok += 1;
            }
        }
        assert!(sum <= 40, "并发预约 Σ={sum} 超出预算 40");
        assert!(ok >= 1);
    }

    /// 环境变量解析：非法值回退默认，0 视为非法。
    #[test]
    fn budget_config_defaults_and_fallbacks() {
        let cfg = BudgetConfig::new(0, 0);
        assert_eq!(cfg.total, 1);
        assert_eq!(cfg.expected_pools, 1);
        assert_eq!(BudgetConfig::from_env().total, 60);
    }

    #[test]
    fn reservation_is_send_and_sync_guard_shape() {
        // 编译期约束：账本指针是 &'static，可跨 await 持有（Send）。
        fn assert_send<T: Send>(_: &T) {}
        static L: OnceLock<Mutex<Ledger>> = OnceLock::new();
        let l = ledger(&L, 10, 1);
        let r = reserve_from(l, "shape", 3).unwrap();
        assert_send(&r);
        let _: Arc<u8> = Arc::new(0);
    }
}
