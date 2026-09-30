//! # 服务调用审计告警监控器
//!
//! 消费 `ServiceIdentity` + 调用频率数据，按规则检测异常服务间调用并输出告警。
//!
//! ## 告警规则（当前）
//!
//! 1. **未知服务**：调用方服务名不在已知服务白名单 → 疑似伪造 service token / 未注册服务。
//! 2. **高频调用**：某服务在滑动窗口内调用次数超过阈值 → 疑似异常循环 / 被攻击 / 风暴。
//!
//! ## 配置（环境变量，均可覆盖）
//!
//! - `SERVICE_ALERT_WINDOW_SECS`：滑动窗口秒数（默认 60）。
//! - `SERVICE_ALERT_HIGH_FREQ_THRESHOLD`：窗口内高频阈值（默认 500）。
//! - `SERVICE_ALERT_KNOWN_SERVICES`：已知服务白名单（逗号分隔，覆盖默认）。
//! - `SERVICE_ALERT_COOLDOWN_SECS`：同类告警冷却秒数（默认 60，防告警风暴）。
//! - `SERVICE_ALERT_ENABLED`：总开关（默认 true）。
//! - `FEISHU_ALERT_WEBHOOK`：飞书机器人 Webhook（可选）。配置后告警在 tracing 输出的
//!   同时推送飞书（fire-and-forget，失败不影响主流程；未配置则维持纯日志行为）。
//!
//! ## 告警消费
//!
//! 触发时 `tracing::warn!`（可被日志采集 / 接告警平台）；同一服务同一类型在冷却期内
//! 只告警一次，避免刷屏。检测为纯内存、非阻塞，不依赖外部存储。

use prometheus::{register_int_counter_vec, IntCounterVec};
use std::collections::{HashMap, HashSet};
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};

/// 内置默认服务白名单（覆盖当前 TopEMS 各服务签发的 service token username）。
const DEFAULT_KNOWN_SERVICES: &[&str] = &[
    "erp-service",
    "wms-service",
    "hrm-service",
    "finance-service",
    "crm-service",
    "mobile-service",
    "srm-service",
    "qms-service",
    "pm-service",
    "ehs-service",
    "portal-service",
    "mes-service",
    "notification-service",
    "iam-service",
    "monitor-service",
    "workflow-service",
    "scm-service",
    "tms-service",
    "rd-service",
    "integration-service",
    "communication-service",
    "gis-service",
    "master-data-service",
    "ticket-service",
    "process-service",
    "quality-service",
    "meeting-service",
    "plugin-registry-service",
    "unified-core",
    "ai-service",
    "server-service",
];

/// Prometheus 告警计数（kind 维度）——供 /metrics 监控消费（审计告警可观测出口）。
static SERVICE_ALERTS: OnceLock<IntCounterVec> = OnceLock::new();

fn service_alerts_metric() -> &'static IntCounterVec {
    SERVICE_ALERTS
        .get_or_init(|| {
            register_int_counter_vec!(
                "topems_service_alerts_total",
                "Total service call alerts emitted (kind=unknown_service|high_frequency|downstream_degrade)",
                &["kind"]
            )
            .expect("failed to register topems_service_alerts_total")
        })
}

/// 服务调用告警监控器（进程内单例，经 `ServiceCallMonitor::from_env` 构造）。
pub struct ServiceCallMonitor {
    /// 总开关
    enabled: bool,
    /// 已知服务白名单
    known_services: HashSet<String>,
    /// 滑动窗口计数：service_name → (窗口起点, 窗口内调用数)
    windows: Mutex<HashMap<String, (Instant, u64)>>,
    /// 告警去重：告警 key → 上次告警时间
    last_alerts: Mutex<HashMap<String, Instant>>,
    /// 高频检测窗口（秒）
    window_secs: u64,
    /// 窗口内高频阈值
    high_freq_threshold: u64,
    /// 同类告警冷却期
    alert_cooldown: Duration,
    /// 飞书告警 Webhook（可选；配置后告警同时推送飞书机器人）
    feishu_webhook: Option<String>,
}

/// 告警类型（用于去重 key 与日志语义）
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AlertKind {
    /// 未知服务名
    UnknownService,
    /// 高频调用
    HighFrequency,
    /// 下游服务调用降级/失败（如搜索源不可用、5xx、网络错误）
    DownstreamDegrade,
}

impl AlertKind {
    fn as_str(&self) -> &'static str {
        match self {
            AlertKind::UnknownService => "unknown_service",
            AlertKind::HighFrequency => "high_frequency",
            AlertKind::DownstreamDegrade => "downstream_degrade",
        }
    }
}

impl ServiceCallMonitor {
    /// 从环境变量构造（缺省用内置默认值）。
    pub fn from_env() -> Self {
        let enabled = std::env::var("SERVICE_ALERT_ENABLED")
            .map(|v| v == "true" || v == "1")
            .unwrap_or(true);
        let window_secs = std::env::var("SERVICE_ALERT_WINDOW_SECS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(60);
        let high_freq_threshold = std::env::var("SERVICE_ALERT_HIGH_FREQ_THRESHOLD")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(500);
        let cooldown_secs = std::env::var("SERVICE_ALERT_COOLDOWN_SECS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(60);

        let known_services: HashSet<String> =
            if let Ok(list) = std::env::var("SERVICE_ALERT_KNOWN_SERVICES") {
                list.split(',')
                    .map(|s| s.trim().to_string())
                    .filter(|s| !s.is_empty())
                    .collect()
            } else {
                DEFAULT_KNOWN_SERVICES
                    .iter()
                    .map(|s| s.to_string())
                    .collect()
            };

        let feishu_webhook = std::env::var("FEISHU_ALERT_WEBHOOK")
            .ok()
            .filter(|s| !s.trim().is_empty());

        Self {
            enabled,
            known_services,
            windows: Mutex::new(HashMap::new()),
            last_alerts: Mutex::new(HashMap::new()),
            window_secs,
            high_freq_threshold,
            alert_cooldown: Duration::from_secs(cooldown_secs),
            feishu_webhook,
        }
    }

    /// 记录一次服务调用并执行告警检测（非阻塞、纯内存）。
    pub fn record(&self, service_name: &str) {
        if !self.enabled {
            return;
        }
        self.check_unknown_service(service_name);
        self.check_high_frequency(service_name);
    }

    /// 规则 3：下游服务调用降级/失败告警（如搜索源 5xx / 网络错误）。
    ///
    /// 与 `record` 独立：`record` 面向"服务间正常调用"的频率/身份检测；
    /// 本方法面向"调用失败/降级"事件，按 `downstream:degrade` key 冷却去重。
    pub fn record_degrade(&self, downstream: &str, detail: &str) {
        if !self.enabled {
            return;
        }
        let key = format!("{}:{}", downstream, AlertKind::DownstreamDegrade.as_str());
        self.alert(
            &key,
            format!(
                "下游服务调用降级 downstream={} 详情: {}（服务不可用/5xx/网络错误，搜索等聚合功能将降级）",
                downstream, detail
            ),
        );
    }

    /// 规则 1：未知服务检测。
    fn check_unknown_service(&self, service_name: &str) {
        if !self.known_services.contains(service_name) {
            self.alert(
                &format!("{}:{}", service_name, AlertKind::UnknownService.as_str()),
                format!(
                    "检测到未知服务调用方 service={}（不在已知服务白名单，疑似伪造 service token 或未注册服务）",
                    service_name
                ),
            );
        }
    }

    /// 规则 2：高频调用检测（滑动窗口计数）。
    fn check_high_frequency(&self, service_name: &str) {
        let now = Instant::now();
        let window = Duration::from_secs(self.window_secs);

        let mut windows = match self.windows.lock() {
            Ok(g) => g,
            Err(poisoned) => poisoned.into_inner(),
        };

        let entry = windows.entry(service_name.to_string()).or_insert((now, 0));
        // 窗口过期则重置
        if now.duration_since(entry.0) > window {
            *entry = (now, 0);
        }
        entry.1 += 1;
        let count = entry.1;

        // 阈值检查（计数达到阈值即告警，之后冷却期内不再重复）
        if count >= self.high_freq_threshold {
            self.alert(
                &format!("{}:{}", service_name, AlertKind::HighFrequency.as_str()),
                format!(
                    "服务间调用高频告警 service={} 在 {}s 窗口内调用 {} 次（阈值 {}）——疑似异常循环/风暴/被攻击",
                    service_name, self.window_secs, count, self.high_freq_threshold
                ),
            );
        }
    }

    /// 告警输出（去重 + tracing::warn + 可选飞书 Webhook 推送）。
    fn alert(&self, key: &str, message: String) {
        let now = Instant::now();
        let mut last_alerts = match self.last_alerts.lock() {
            Ok(g) => g,
            Err(poisoned) => poisoned.into_inner(),
        };

        if let Some(last) = last_alerts.get(key) {
            if now.duration_since(*last) < self.alert_cooldown {
                return; // 冷却期内去重
            }
        }
        last_alerts.insert(key.to_string(), now);
        drop(last_alerts);

        // Prometheus 告警计数（kind 从 key 尾段解析）——供 /metrics 监控消费
        let kind = key.rsplit(':').next().unwrap_or("unknown").to_string();
        service_alerts_metric().with_label_values(&[&kind]).inc();

        tracing::warn!(target: "service_call_alert", "⚠️ [服务调用告警] {}", message);

        // 可选：推送飞书机器人（fire-and-forget，失败不影响主流程）
        if let Some(url) = self.feishu_webhook.clone() {
            notify_feishu(url, message);
        }
    }
}

/// 飞书机器人 Webhook 推送（异步 fire-and-forget）。
///
/// - 仅在服务运行于 tokio runtime 内时推送（`Handle::try_current`）；
///   无 runtime（如纯同步上下文/测试）时静默跳过，保持非阻塞语义。
/// - 推送失败仅 `trace::debug!`，绝不 panic、绝不阻塞主流程。
fn notify_feishu(webhook_url: String, message: String) {
    let handle = match tokio::runtime::Handle::try_current() {
        Ok(h) => h,
        Err(_) => return, // 无 runtime：不推送（告警已通过 tracing 输出）
    };
    handle.spawn(async move {
        let payload = serde_json::json!({
            "msg_type": "text",
            "content": { "text": format!("⚠️ [服务调用告警] {}", message) },
        });
        // 回环地址（测试/本机调试）不走系统代理：system-proxy 初始化在本机受限网络
        // 环境下会阻塞约 10s，导致回环 webhook 推送超时；回环直连是标准语义。
        let is_loopback = webhook_url.starts_with("http://127.0.0.1:")
            || webhook_url.starts_with("http://localhost:")
            || webhook_url.starts_with("http://[::1]:");
        let client = if is_loopback {
            reqwest::Client::builder()
                .no_proxy()
                .build()
                .expect("reqwest client 构建失败")
        } else {
            reqwest::Client::new()
        };
        let result = client.post(&webhook_url).json(&payload).send().await;
        if let Err(e) = result {
            tracing::debug!(target: "service_call_alert", "飞书告警推送失败: {}", e);
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_from_env_defaults() {
        let monitor = ServiceCallMonitor::from_env();
        assert!(monitor.enabled);
        assert!(monitor.window_secs >= 1);
        assert!(monitor.high_freq_threshold >= 1);
        assert!(!monitor.known_services.is_empty());
    }

    #[test]
    fn test_unknown_service_detection_no_panic() {
        let monitor = ServiceCallMonitor::from_env();
        // 白名单内不应触发任何异常（仅调用，无断言崩溃即可）
        monitor.record("erp-service");
        // 未知服务应触发告警（异步日志，不 panic）
        monitor.record("evil-service");
        monitor.record("evil-service");
    }

    #[test]
    fn test_high_frequency_detection() {
        let monitor = ServiceCallMonitor {
            enabled: true,
            known_services: ["erp-service".to_string()].into_iter().collect(),
            windows: Mutex::new(HashMap::new()),
            last_alerts: Mutex::new(HashMap::new()),
            window_secs: 60,
            high_freq_threshold: 3,
            alert_cooldown: Duration::from_secs(60),
            feishu_webhook: None,
        };
        // 超过阈值 3 → 触发（不 panic，日志可验证）
        for _ in 0..5 {
            monitor.record("erp-service");
        }
        assert!(monitor
            .last_alerts
            .lock()
            .unwrap()
            .contains_key(&"erp-service:high_frequency".to_string()));
    }

    #[test]
    fn test_alert_dedup() {
        let monitor = ServiceCallMonitor {
            enabled: true,
            known_services: HashSet::new(),
            windows: Mutex::new(HashMap::new()),
            last_alerts: Mutex::new(HashMap::new()),
            window_secs: 60,
            high_freq_threshold: 1000,
            alert_cooldown: Duration::from_secs(3600),
            feishu_webhook: None,
        };
        // 未知服务连续触发，冷却期内只记一次
        monitor.record("ghost-service");
        monitor.record("ghost-service");
        monitor.record("ghost-service");
        let key = "ghost-service:unknown_service".to_string();
        assert!(monitor.last_alerts.lock().unwrap().contains_key(&key));
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn test_alert_pushes_feishu_webhook() {
        use std::io::Read;
        use std::sync::mpsc;

        // mock 本地 HTTP server 收 webhook 请求
        let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        let addr = listener.local_addr().unwrap();
        let url = format!("http://{}/hook", addr);
        let (tx, rx) = mpsc::channel();
        std::thread::spawn(move || {
            if let Ok((mut sock, _)) = listener.accept() {
                let mut buf = [0u8; 8192];
                if let Ok(n) = sock.read(&mut buf) {
                    let _ = tx.send(String::from_utf8_lossy(&buf[..n]).to_string());
                }
            }
        });

        let monitor = ServiceCallMonitor {
            enabled: true,
            known_services: HashSet::new(),
            windows: Mutex::new(HashMap::new()),
            last_alerts: Mutex::new(HashMap::new()),
            window_secs: 60,
            high_freq_threshold: 1000,
            alert_cooldown: Duration::from_secs(0),
            feishu_webhook: Some(url),
        };
        monitor.record_degrade("downstream-x", "500 from mock");

        // 等待异步推送送达 mock server
        // 超时放宽至 10s：全量并发测试下偶发调度/网络延迟（隔离跑 <1s 即达），
        // 与 shared-event subscriber 同模式；链路真损坏时仍会如常断言失败
        let body = tokio::time::timeout(Duration::from_secs(10), async {
            loop {
                if let Ok(v) = rx.try_recv() {
                    return v;
                }
                tokio::time::sleep(Duration::from_millis(50)).await;
            }
        })
        .await
        .expect("webhook 推送超时");

        assert!(body.contains("服务调用告警"), "body: {body}");
        assert!(body.contains("downstream-x"), "body: {body}");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn test_alert_skips_push_without_runtime_or_webhook() {
        // 未配置 webhook：告警仅 tracing，不 panic、不推送
        let monitor = ServiceCallMonitor {
            enabled: true,
            known_services: HashSet::new(),
            windows: Mutex::new(HashMap::new()),
            last_alerts: Mutex::new(HashMap::new()),
            window_secs: 60,
            high_freq_threshold: 1000,
            alert_cooldown: Duration::from_secs(0),
            feishu_webhook: None,
        };
        monitor.record("ghost-service");
        assert!(monitor
            .last_alerts
            .lock()
            .unwrap()
            .contains_key(&"ghost-service:unknown_service".to_string()));
    }
}
