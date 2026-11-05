//! 进程级数据库连接预算（连接治理 A）。
//!
//! # 目标
//!
//! 任何情况下，**单进程对同一数据库的总连接数** ≤ `DB_TOTAL_CONNECTION_BUDGET`。
//!
//! 默认值：嵌入模式（topems-server）= 推导池数 × [`DEFAULT_CONNECTIONS_PER_POOL`]
//! （当前 31 × 2 = 62）；独立部署 = [`DEFAULT_TOTAL_CONNECTION_BUDGET`]（60）。
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
//! denom   = max(预期池数, 已提交池数 + 1)
//! share   = max(1, 预算 / denom)
//! grant   = min(申请值, share, 预算 - 已分配)
//! grant == 0 → 返回错误（fail-fast，不超发）
//! ```
//!
//! # 池数从哪来
//!
//! 嵌入模式（topems-server）的池数**不再靠手工常量**：启动时由
//! [`configure_expected_pools`] 传入「服务注册表/模块 build 列表」推导出的值
//! （每模块池数 + 1 个共享迁移池）。`DB_EXPECTED_POOLS` 仅作一致性校验：
//! 与推导值不一致时打印告警并**采用推导值**，避免配置与代码漂移后静默少算。
//!
//! 独立部署（单服务）不调用 `configure_expected_pools`，默认按 2 个池（业务池 + 迁移池）。

use std::env;
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::{Mutex, OnceLock};
use topems_shared_core::error::{Result, TopemsError};

/// 额度不足的稳定标记：错误经 anyhow → TopemsError::Internal 包装后仍可用它归类
/// 为「预算不足」，与「数据库连不上」在健康检查 degraded 信息里区分。
pub const BUDGET_EXHAUSTED_TAG: &str = "[db-budget-exhausted]";

/// 独立部署的默认进程总连接预算（给 PG `max_connections=100` 留约 40 的运维 / 其他进程余量）。
///
/// 嵌入模式不套用该常量：默认值 = 推导池数 × [`DEFAULT_CONNECTIONS_PER_POOL`]。
pub const DEFAULT_TOTAL_CONNECTION_BUDGET: u32 = 60;

/// 嵌入模式每池的合理并发上限（传给池的 `max_connections`）。
///
/// 取 2 而不是单池申请上限 3：这 2 是 A 上线以来所有池的**实际授予值**
/// （prod 实测峰值 73 也印证单池活跃连接 ≲ 3），按 2 配置可保证
/// `31 池 × 2 = 62 ≤ 100`，给运维/迁移留 38 条余量；请求值仍可随
/// `DB_MODULE_MAX_CONNECTIONS` 上调，但会被预算夹住。
pub const DEFAULT_CONNECTIONS_PER_POOL: u32 = 2;

/// 嵌入模式兜底池数（仅在服务端忘记调用 [`configure_expected_pools`] 时使用）。
/// 实际值以服务注册表推导为准，见 `svc/server/src/main.rs::derived_db_pools`。
const EMBEDDED_DEFAULT_EXPECTED_POOLS: u32 = 31;

/// 独立部署默认池数量：1 个业务池 + 1 个共享迁移池。
const STANDALONE_DEFAULT_EXPECTED_POOLS: u32 = 2;

/// 启动期由服务端推导出的池数（0 = 未配置，走独立部署默认逻辑）。
static DERIVED_EXPECTED_POOLS: AtomicU32 = AtomicU32::new(0);

static GLOBAL_LEDGER: OnceLock<Mutex<Ledger>> = OnceLock::new();

/// 设置注册表推导的池数。**必须在首个池创建前调用**（之后调用不生效并告警）。
pub fn configure_expected_pools(pools: u32) {
    if pools == 0 {
        return;
    }
    if GLOBAL_LEDGER.get().is_some() {
        tracing::warn!(
            "[db-budget] configure_expected_pools({pools}) 在首个池创建后调用，本次不生效（已用推导值 {}）",
            derived_expected_pools()
        );
        return;
    }
    let previous = DERIVED_EXPECTED_POOLS.swap(pools, Ordering::Relaxed);
    if previous != 0 && previous != pools {
        tracing::warn!("[db-budget] 注册表推导池数被重复设置：{previous} -> {pools}");
    }
    tracing::info!("[db-budget] 池数由服务注册表推导：{pools}（DB_EXPECTED_POOLS 仅作一致性校验）");
}

/// 当前注册表推导的池数（0 = 未配置）。
pub fn derived_expected_pools() -> u32 {
    DERIVED_EXPECTED_POOLS.load(Ordering::Relaxed)
}

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
    /// - `DB_TOTAL_CONNECTION_BUDGET`（未设置时：嵌入模式 = 推导池数 × 2；独立部署 = 60）
    /// - `DB_EXPECTED_POOLS`：**仅作一致性校验**，与注册表推导值不一致时告警并采用推导值
    pub fn from_env() -> Self {
        let raw_total = env::var("DB_TOTAL_CONNECTION_BUDGET")
            .ok()
            .and_then(|s| s.trim().parse::<u32>().ok());
        // 显式 0 是「预算耗尽」而不是「未配置」：不能被默认值静默覆盖。
        let zero_budget = raw_total == Some(0);
        let env_total = raw_total.filter(|v| *v > 0);
        let env_expected = env::var("DB_EXPECTED_POOLS")
            .ok()
            .and_then(|s| s.trim().parse::<u32>().ok())
            .filter(|v| *v > 0);

        let derived = derived_expected_pools();
        if derived > 0 {
            if let Some(configured) = env_expected {
                if configured != derived {
                    tracing::warn!(
                        "[db-budget] DB_EXPECTED_POOLS={configured} 与注册表推导值 {derived} 不一致；\
                         采用推导值（配置值仅供一致性校验）"
                    );
                }
            }
            let total = match env_total {
                Some(v) => v,
                None if zero_budget => {
                    tracing::error!(
                        "[db-budget] DB_TOTAL_CONNECTION_BUDGET=0：所有池都将因额度不足而构建失败（fail-fast，不静默降级）"
                    );
                    0
                }
                None => derived.saturating_mul(DEFAULT_CONNECTIONS_PER_POOL),
            };
            if total < derived {
                tracing::warn!(
                    "[db-budget] 预算 {total} 小于池数 {derived}：至少有 {} 个池会因额度不足而构建失败",
                    derived.saturating_sub(total)
                );
            }
            // 显式 0 必须保持为 0（Self::new 会把 0 兜底成 1，掩盖「预算耗尽」语义）。
            return Self {
                total,
                expected_pools: derived,
            };
        }

        // 独立部署（或服务端尚未调用 configure_expected_pools 的兜底路径）
        let embedded = env::var("TOPEMS_EMBEDDED")
            .map(|v| v == "true" || v == "1")
            .unwrap_or(false);
        let default_expected = if embedded {
            EMBEDDED_DEFAULT_EXPECTED_POOLS
        } else {
            STANDALONE_DEFAULT_EXPECTED_POOLS
        };
        let expected_pools = env_expected.unwrap_or(default_expected);
        let default_total = if embedded {
            // 兜底也要自洽：池数 × 每池上限，保证所有池拿得到额度。
            EMBEDDED_DEFAULT_EXPECTED_POOLS.saturating_mul(DEFAULT_CONNECTIONS_PER_POOL)
        } else {
            DEFAULT_TOTAL_CONNECTION_BUDGET
        };
        let total = match env_total {
            Some(v) => v,
            None if zero_budget => {
                tracing::error!(
                    "[db-budget] DB_TOTAL_CONNECTION_BUDGET=0：所有池都将因额度不足而构建失败（fail-fast，不静默降级）"
                );
                0
            }
            None => default_total,
        };

        Self {
            total,
            expected_pools,
        }
    }
}

/// 预算快照（日志 / 测试 / 排障用）。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BudgetSnapshot {
    pub total: u32,
    pub expected_pools: u32,
    /// 已提交池占用的额度总和（= Σ 各池 max_connections）。
    pub allocated: u32,
    /// 已成功创建的池数量（**预算单位**：共享运行时池按其合并模块数计）。
    pub pools: u32,
    /// 已成功创建的**物理池**数量（共享运行时池只算 1）。
    pub physical_pools: u32,
    /// 历史峰值 allocated（含未提交的临时预留）。
    pub peak_allocated: u32,
}

/// 预算账本（纯状态机，便于单测；进程级实例由 [`global_ledger`] 提供）。
#[derive(Debug)]
pub struct Ledger {
    cfg: BudgetConfig,
    allocated: u32,
    pools: u32,
    physical_pools: u32,
    peak_allocated: u32,
}

impl Ledger {
    pub const fn new(cfg: BudgetConfig) -> Self {
        Self {
            cfg,
            allocated: 0,
            pools: 0,
            physical_pools: 0,
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
            physical_pools: self.physical_pools,
            peak_allocated: self.peak_allocated,
        }
    }

    /// 计算本次能给该池的额度（不修改状态）。
    ///
    /// `requested` 是该池的单池上限（`DB_MODULE_MAX_CONNECTIONS` 或服务配置）；
    /// 结果同时受「公平份额」和「预算余额」约束，且不小于 1（除非余额已为 0）。
    fn next_grant(&self, requested: u32) -> u32 {
        self.next_grant_weighted(requested, 1)
    }

    /// 按「预算单位权重」计算额度。
    ///
    /// 共享运行时池合并了 N 个模块，但仍只占 1 个物理池；为不挤占其并发能力，
    /// 它在公平分摊中按 `weight=N` 参与（`denom = max(expected_pools, pools + weight)`），
    /// 授予上限为 `share × weight`。`expected_pools` 也按预算单位计（共享池计 N）。
    fn next_grant_weighted(&self, requested: u32, weight: u32) -> u32 {
        if requested == 0 || weight == 0 {
            return 0;
        }
        let denom = self
            .cfg
            .expected_pools
            .max(self.pools.saturating_add(weight));
        let share = (self.cfg.total / denom).max(1);
        let weighted_share = share.saturating_mul(weight);
        let remaining = self.cfg.total.saturating_sub(self.allocated);
        requested.min(weighted_share).min(remaining)
    }

    /// 预留额度；返回 `None` 表示预算已耗尽（不允许超发）。
    pub fn try_reserve(&mut self, requested: u32) -> Option<u32> {
        self.try_reserve_weighted(requested, 1)
    }

    /// 按预算单位权重预留额度（见 [`Self::next_grant_weighted`]）。
    pub fn try_reserve_weighted(&mut self, requested: u32, weight: u32) -> Option<u32> {
        let grant = self.next_grant_weighted(requested, weight);
        if grant == 0 {
            return None;
        }
        self.allocated = self.allocated.saturating_add(grant);
        self.peak_allocated = self.peak_allocated.max(self.allocated);
        Some(grant)
    }

    /// 池创建成功：额度转为永久占用，池计数按预算单位 +`weight`，物理池 +1。
    fn commit(&mut self, weight: u32) {
        self.pools = self.pools.saturating_add(weight);
        self.physical_pools = self.physical_pools.saturating_add(1);
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
    weight: u32,
}

impl PoolReservation {
    /// 该池实际可用的 `max_connections`（单池申请值与预算约束取小）。
    pub fn granted(&self) -> u32 {
        self.granted
    }

    /// 标记池创建成功：额度永久保留，之后 `Drop` 不再归还。
    pub fn commit(mut self) {
        if let Ok(mut ledger) = self.ledger.lock() {
            ledger.commit(self.weight);
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
    GLOBAL_LEDGER.get_or_init(|| Mutex::new(Ledger::new(BudgetConfig::from_env())))
}

/// 向指定账本申请一个池的额度（测试可注入独立账本）。
pub fn reserve_from(
    ledger: &'static Mutex<Ledger>,
    label: &'static str,
    requested: u32,
) -> Result<PoolReservation> {
    reserve_from_weighted(ledger, label, requested, 1)
}

/// 按预算单位权重申请额度（共享运行时池用 `weight` = 合并的模块数）。
pub fn reserve_from_weighted(
    ledger: &'static Mutex<Ledger>,
    label: &'static str,
    requested: u32,
    weight: u32,
) -> Result<PoolReservation> {
    let weight = weight.max(1);
    let mut guard = ledger
        .lock()
        .map_err(|_| TopemsError::Database("连接预算账本锁 poisoned".to_string()))?;
    match guard.try_reserve_weighted(requested, weight) {
        Some(granted) => {
            let snap = guard.snapshot();
            drop(guard);
            tracing::info!(
                "[db-budget] 池 {} 预约额度 granted={}/{}（权重 {}），已分配 {}/{}，预算单位 {}，物理池 {}",
                label,
                granted,
                requested,
                weight,
                snap.allocated,
                snap.total,
                snap.pools,
                snap.physical_pools
            );
            Ok(PoolReservation {
                ledger,
                granted,
                committed: false,
                label,
                requested,
                weight,
            })
        }
        None => {
            let snap = guard.snapshot();
            let remaining = snap.total.saturating_sub(snap.allocated);
            drop(guard);
            tracing::error!(
                "{BUDGET_EXHAUSTED_TAG} 池 {} 额度不足：需要 {}，剩余 {}，预算 {}，已分配 {}，池数 {}；\
                 该模块将构建失败并进入 degraded（kind=budget）",
                label,
                requested,
                remaining,
                snap.total,
                snap.allocated,
                snap.pools
            );
            Err(TopemsError::Database(format!(
                "{BUDGET_EXHAUSTED_TAG} 数据库连接预算不足：池 {} 需要 {}，剩余 {}，预算 {}，已分配 {}，\
                 预期池数 {}；请调大 DB_TOTAL_CONNECTION_BUDGET 或调小单池上限",
                label, requested, remaining, snap.total, snap.allocated, snap.expected_pools
            )))
        }
    }
}

/// 向进程级账本申请一个池的额度。
pub fn reserve_pool(label: &'static str, requested: u32) -> Result<PoolReservation> {
    reserve_from(global_ledger(), label, requested)
}

/// 向进程级账本按权重申请额度（共享运行时池：`weight` = 合并的模块数）。
pub fn reserve_pool_weighted(
    label: &'static str,
    requested: u32,
    weight: u32,
) -> Result<PoolReservation> {
    reserve_from_weighted(global_ledger(), label, requested, weight)
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
            physical_pools: 0,
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

    /// 默认自洽：31 个推导池 × 每池 2 = 62，全部池都能拿到额度（含最后 1 个）。
    #[test]
    fn default_budget_covers_all_derived_pools() {
        static L: OnceLock<Mutex<Ledger>> = OnceLock::new();
        let l = ledger(&L, 31 * DEFAULT_CONNECTIONS_PER_POOL, 31);
        for n in 1..=31 {
            let r = reserve_from(l, "derived", 3)
                .unwrap_or_else(|e| panic!("第 {n} 个池不应额度不足: {e}"));
            assert_eq!(r.granted(), DEFAULT_CONNECTIONS_PER_POOL);
            r.commit();
        }
        let snap = l.lock().unwrap().snapshot();
        assert_eq!(snap.pools, 31);
        assert_eq!(snap.allocated, 62);
    }

    /// B 批次 2 形状：23 个物理池 = 17 模块池 + 2 advanced + 2 core + 1 迁移 + 1 共享池；
    /// 共享池合并 9 个已迁移模块（批次 1 的 3 + 批次 2 的 6），按 9 个预算单位参与。
    /// 预期 31 单位、预算 62：普通池各 2（44），共享池 18，Σ = 62，无池额度不足。
    #[test]
    fn weighted_shared_pool_fits_budget_with_nine_modules() {
        static L: OnceLock<Mutex<Ledger>> = OnceLock::new();
        let l = ledger(&L, 31 * DEFAULT_CONNECTIONS_PER_POOL, 31);
        for _ in 0..7 {
            reserve_from(l, "business", 3).unwrap().commit();
        }
        let shared = reserve_from_weighted(l, "shared", 9 * 3, 9).unwrap();
        assert_eq!(shared.granted(), 18, "共享池应按 9 个预算单位拿到 18");
        shared.commit();
        for n in 8..=22 {
            let r = reserve_from(l, "business", 3)
                .unwrap_or_else(|e| panic!("第 {n} 个池不应额度不足: {e}"));
            assert_eq!(r.granted(), 2);
            r.commit();
        }
        let snap = l.lock().unwrap().snapshot();
        assert_eq!(snap.pools, 31, "预算单位：22 普通 + 9 共享");
        assert_eq!(snap.physical_pools, 23, "物理池：22 普通 + 1 共享");
        assert_eq!(snap.allocated, 62);
        assert!(snap.allocated <= snap.total);
    }

    /// 预算比池数少 1：最后一个池必须显式报出「额度不足」+ 数字，而不是静默跳过。
    #[test]
    fn budget_one_short_reports_explicit_exhaustion() {
        static L: OnceLock<Mutex<Ledger>> = OnceLock::new();
        let l = ledger(&L, 30, 31);
        for _ in 0..30 {
            reserve_from(l, "short", 1).unwrap().commit();
        }
        let err = reserve_from(l, "short", 1).unwrap_err().to_string();
        assert!(err.contains(BUDGET_EXHAUSTED_TAG), "缺少稳定标记: {err}");
        assert!(err.contains("需要 1"), "缺少 needs: {err}");
        assert!(err.contains("剩余 0"), "缺少 remaining: {err}");
        assert!(err.contains("预算 30"), "缺少 budget: {err}");
    }

    /// 显式预算 0（不是「未配置」）：第一个池就必须失败，且原因里可见预算 0。
    #[test]
    fn zero_budget_fails_first_pool_explicitly() {
        static L: OnceLock<Mutex<Ledger>> = OnceLock::new();
        let l = L.get_or_init(|| {
            Mutex::new(Ledger::new(BudgetConfig {
                total: 0,
                expected_pools: 31,
            }))
        });
        let err = reserve_from(l, "zero", 1).unwrap_err().to_string();
        assert!(err.contains(BUDGET_EXHAUSTED_TAG), "缺少稳定标记: {err}");
        assert!(err.contains("剩余 0"), "缺少 remaining: {err}");
        assert!(err.contains("预算 0"), "缺少 budget: {err}");
        assert_eq!(l.lock().unwrap().snapshot().pools, 0);
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
