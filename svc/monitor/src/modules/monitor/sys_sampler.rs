//! 系统指标真实采集（sysinfo）
//!
//! 背景：`GET /metrics/system` 此前把 CPU/内存/磁盘/网络全部硬编码为 0，前端监控页只能
//! 用 `createFlatTrend(标签数, 单值)` 伪造趋势线。这里补上 OS 级采集：
//!   · 后台线程每 5s 采样一次，写入 24h 环形缓冲；
//!   · `GET /metrics/system` 返回最近一次快照；
//!   · `GET /metrics/history?minutes=` 返回窗口内的真实样本，供前端画趋势。
//!
//! CPU 使用率需要两次刷新之间的差分，因此首个采样点（启动瞬间）不写入历史。

use std::collections::VecDeque;
use std::sync::{Mutex, OnceLock};
use std::time::Duration;

use serde::Serialize;
use sysinfo::{Disks, Networks, System};

/// 采样间隔（秒）
const SAMPLE_INTERVAL_SECS: u64 = 5;
/// 保留 24h 样本
const MAX_SAMPLES: usize = (24 * 60 * 60 / SAMPLE_INTERVAL_SECS) as usize;

#[derive(Debug, Clone, Serialize)]
pub struct SysSample {
    /// unix 秒
    pub ts: i64,
    pub cpu: f32,
    pub memory: f32,
    pub disk: f32,
    pub net_in: u64,
    pub net_out: u64,
}

#[derive(Debug, Clone, Default, Serialize)]
pub struct SysSnapshot {
    pub cpu_usage: f32,
    pub memory_usage: f32,
    pub memory_total: u64,
    pub memory_used: u64,
    pub disk_usage: f32,
    pub disk_total: u64,
    pub disk_used: u64,
    pub net_in: u64,
    pub net_out: u64,
    /// 是否已采到第一份有效样本（CPU 差分至少要两次刷新）
    pub ready: bool,
}

struct SamplerState {
    history: Mutex<VecDeque<SysSample>>,
    latest: Mutex<SysSnapshot>,
}

static STATE: OnceLock<SamplerState> = OnceLock::new();

fn state() -> &'static SamplerState {
    STATE.get_or_init(|| SamplerState {
        history: Mutex::new(VecDeque::with_capacity(MAX_SAMPLES)),
        latest: Mutex::new(SysSnapshot::default()),
    })
}

/// 最近一次采集快照
pub fn latest_snapshot() -> SysSnapshot {
    state().latest.lock().map(|s| s.clone()).unwrap_or_default()
}

/// 时间窗口内的样本（按时间升序）
pub fn history_minutes(minutes: i64) -> Vec<SysSample> {
    let cutoff = chrono::Utc::now().timestamp() - minutes.max(1) * 60;
    state()
        .history
        .lock()
        .map(|h| h.iter().filter(|s| s.ts >= cutoff).cloned().collect())
        .unwrap_or_default()
}

fn collect(sys: &mut System, networks: &mut Networks, disks: &Disks, first: bool) -> SysSample {
    sys.refresh_memory();
    sys.refresh_cpu_usage();
    // 网卡必须复用同一个 Networks 实例：每次重建会把累计字节清零，
    // 前端按「相邻样本差值」算吞吐就永远是 0。
    networks.refresh(true);

    let cpu = sys.global_cpu_usage();
    let total_mem = sys.total_memory();
    let used_mem = sys.used_memory();
    let memory = if total_mem > 0 {
        (used_mem as f64 / total_mem as f64 * 100.0) as f32
    } else {
        0.0
    };

    let disk_total: u64 = disks.iter().map(|d| d.total_space()).sum();
    let disk_used: u64 = disks
        .iter()
        .map(|d| d.total_space() - d.available_space())
        .sum();
    let disk = if disk_total > 0 {
        (disk_used as f64 / disk_total as f64 * 100.0) as f32
    } else {
        0.0
    };

    let net_in: u64 = networks.iter().map(|(_, d)| d.total_received()).sum();
    let net_out: u64 = networks.iter().map(|(_, d)| d.total_transmitted()).sum();

    let ts = chrono::Utc::now().timestamp();
    let sample = SysSample {
        ts,
        cpu,
        memory,
        disk,
        net_in,
        net_out,
    };

    if let Ok(mut latest) = state().latest.lock() {
        *latest = SysSnapshot {
            cpu_usage: cpu,
            memory_usage: memory,
            memory_total: total_mem,
            memory_used: used_mem,
            disk_usage: disk,
            disk_total,
            disk_used,
            net_in,
            net_out,
            ready: !first,
        };
    }

    sample
}

/// 启动后台采样线程（幂等）
pub fn spawn_sampler() {
    static SPAWNED: OnceLock<()> = OnceLock::new();
    if SPAWNED.set(()).is_err() {
        return;
    }
    tokio::task::spawn_blocking(|| {
        let mut sys = System::new();
        // 第一次刷新建立基线（CPU 差分的起点）
        sys.refresh_cpu_usage();
        sys.refresh_memory();
        std::thread::sleep(Duration::from_millis(500));
        let mut networks = Networks::new_with_refreshed_list();

        let mut first = true;
        loop {
            // 磁盘列表每轮重建（能反映热插拔）；网卡列表复用上面的实例，见 collect 注释
            let disks = Disks::new_with_refreshed_list();
            let sample = collect(&mut sys, &mut networks, &disks, first);
            if !first {
                if let Ok(mut h) = state().history.lock() {
                    if h.len() >= MAX_SAMPLES {
                        h.pop_front();
                    }
                    h.push_back(sample);
                }
            }
            first = false;
            std::thread::sleep(Duration::from_secs(SAMPLE_INTERVAL_SECS));
        }
    });
}
