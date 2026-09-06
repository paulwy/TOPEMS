//! 客户端实时运行监控（连接池/请求健康状态的可观测层）。
//!
//! reqwest `Client` 内部维护 hyper 连接池，但未暴露实时状态 API；
//! 本模块在客户端入口处维护原子计数器，提供请求量、在途数、成功率、
//! 平均耗时、熔断拦截数等实时快照，供 metrics/诊断/管理接口消费。

use serde::Serialize;
use std::sync::atomic::{AtomicU64, AtomicUsize, Ordering};

/// 实时监控快照（`Serialize` 可直接暴露为 JSON 指标）。
#[derive(Debug, Clone, Serialize)]
pub struct ClientMetricsSnapshot {
    /// 累计发起的请求数（含被熔断拦截的）
    pub total_requests: u64,
    /// 成功请求数（2xx 且反序列化成功）
    pub success_requests: u64,
    /// 失败请求数（网络错误 / 非 2xx / 反序列化错误）
    pub failure_requests: u64,
    /// 熔断拦截次数（OPEN 期间被拒绝的请求）
    pub circuit_open_blocks: u64,
    /// 当前在途请求数（实时）
    pub in_flight: usize,
    /// 历史峰值在途请求数
    pub peak_in_flight: usize,
    /// 成功率（0..=1，无请求时为 1.0）
    pub success_rate: f64,
    /// 平均请求耗时（毫秒）
    pub avg_duration_ms: f64,
    /// 熔断器当前是否打开
    pub circuit_open: bool,
    /// 目标服务地址
    pub base_url: String,
}

/// 客户端实时计数器（`Arc` 共享，跨 clone 视图一致）。
#[derive(Debug, Default)]
pub struct ClientMetrics {
    total_requests: AtomicU64,
    success_requests: AtomicU64,
    failure_requests: AtomicU64,
    circuit_open_blocks: AtomicU64,
    in_flight: AtomicUsize,
    peak_in_flight: AtomicUsize,
    total_duration_ns: AtomicU64,
}

/// 在途请求 guard：Drop 时自动归还在途计数，防止异常路径泄漏。
pub struct InFlightGuard<'a> {
    metrics: &'a ClientMetrics,
}

impl ClientMetrics {
    pub fn new() -> Self {
        Self::default()
    }

    /// 请求开始：累计总数 + 在途 +1（并刷新峰值）。返回 guard。
    pub(crate) fn begin_request(&self) -> InFlightGuard<'_> {
        self.total_requests.fetch_add(1, Ordering::Relaxed);
        let cur = self.in_flight.fetch_add(1, Ordering::Relaxed) + 1;
        self.peak_in_flight.fetch_max(cur, Ordering::Relaxed);
        InFlightGuard { metrics: self }
    }

    pub(crate) fn record_success(&self, duration_ns: u64) {
        self.success_requests.fetch_add(1, Ordering::Relaxed);
        self.total_duration_ns.fetch_add(duration_ns, Ordering::Relaxed);
    }

    pub(crate) fn record_failure(&self, duration_ns: u64) {
        self.failure_requests.fetch_add(1, Ordering::Relaxed);
        self.total_duration_ns.fetch_add(duration_ns, Ordering::Relaxed);
    }

    pub(crate) fn record_circuit_block(&self) {
        self.circuit_open_blocks.fetch_add(1, Ordering::Relaxed);
    }

    /// 生成当前快照（熔断态与目标地址由调用方提供）。
    pub fn snapshot(&self, circuit_open: bool, base_url: &str) -> ClientMetricsSnapshot {
        let total = self.total_requests.load(Ordering::Relaxed);
        let success = self.success_requests.load(Ordering::Relaxed);
        let failure = self.failure_requests.load(Ordering::Relaxed);
        let recorded = success + failure;
        let duration = self.total_duration_ns.load(Ordering::Relaxed);
        ClientMetricsSnapshot {
            total_requests: total,
            success_requests: success,
            failure_requests: failure,
            circuit_open_blocks: self.circuit_open_blocks.load(Ordering::Relaxed),
            in_flight: self.in_flight.load(Ordering::Relaxed),
            peak_in_flight: self.peak_in_flight.load(Ordering::Relaxed),
            success_rate: if total > 0 {
                success as f64 / total as f64
            } else {
                1.0
            },
            avg_duration_ms: if recorded > 0 {
                duration as f64 / recorded as f64 / 1_000_000.0
            } else {
                0.0
            },
            circuit_open,
            base_url: base_url.to_string(),
        }
    }
}

impl Drop for InFlightGuard<'_> {
    fn drop(&mut self) {
        self.metrics.in_flight.fetch_sub(1, Ordering::Relaxed);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn initial_snapshot_is_empty() {
        let m = ClientMetrics::new();
        let s = m.snapshot(false, "http://localhost:8011");
        assert_eq!(s.total_requests, 0);
        assert_eq!(s.success_requests, 0);
        assert_eq!(s.failure_requests, 0);
        assert_eq!(s.circuit_open_blocks, 0);
        assert_eq!(s.in_flight, 0);
        assert_eq!(s.peak_in_flight, 0);
        assert_eq!(s.success_rate, 1.0);
        assert_eq!(s.avg_duration_ms, 0.0);
        assert!(!s.circuit_open);
        assert_eq!(s.base_url, "http://localhost:8011");
    }

    #[test]
    fn begin_end_balances_in_flight() {
        let m = ClientMetrics::new();
        let g1 = m.begin_request();
        let g2 = m.begin_request();
        assert_eq!(m.snapshot(false, "").in_flight, 2);
        drop(g1);
        assert_eq!(m.snapshot(false, "").in_flight, 1);
        drop(g2);
        assert_eq!(m.snapshot(false, "").in_flight, 0);
        assert_eq!(m.snapshot(false, "").peak_in_flight, 2);
    }

    #[test]
    fn success_and_failure_records_are_counted() {
        let m = ClientMetrics::new();
        m.record_success(5_000_000);
        m.record_success(15_000_000);
        m.record_failure(10_000_000);
        let s = m.snapshot(false, "");
        assert_eq!(s.total_requests, 0); // begin_request 未调用，total 不计
        assert_eq!(s.success_requests, 2);
        assert_eq!(s.failure_requests, 1);
        assert!((s.avg_duration_ms - 10.0).abs() < 1e-9);
    }

    #[test]
    fn circuit_block_is_recorded() {
        let m = ClientMetrics::new();
        m.record_circuit_block();
        m.record_circuit_block();
        assert_eq!(m.snapshot(true, "").circuit_open_blocks, 2);
        assert!(m.snapshot(true, "").circuit_open);
    }

    #[test]
    fn full_request_path_counts_total_and_success_rate() {
        let m = ClientMetrics::new();
        let g = m.begin_request();
        m.record_success(8_000_000);
        drop(g);
        let s = m.snapshot(false, "");
        assert_eq!(s.total_requests, 1);
        assert_eq!(s.success_requests, 1);
        assert_eq!(s.success_rate, 1.0);
        assert_eq!(s.in_flight, 0);
    }
}
