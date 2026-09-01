//! # 服务调用熔断器（防雪崩）
//!
//! 状态机：`CLOSED`（正常）→ 连续失败达到阈值 → `OPEN`（快速失败）→
//! 冷却期后进入 `HALF_OPEN`（放行试探）→ 成功回 `CLOSED` / 失败重新 `OPEN`。
//!
//! 集成于 `BaseServiceClient::execute_request`，所有 `TypedServiceClient`
//! 服务间调用统一受益——下游（如 workflow）不可用时快速失败而非持续重试，
//! 避免对故障服务的调用风暴放大到调用方。
//!
//! ## 配置（环境变量，均可覆盖）
//!
//! - `SERVICE_CIRCUIT_ENABLED`：总开关（默认 `true`）。
//! - `SERVICE_CIRCUIT_FAILURE_THRESHOLD`：连续失败阈值（默认 `5`）。
//! - `SERVICE_CIRCUIT_COOLDOWN_SECS`：`OPEN` 冷却秒数（默认 `30`）。
//! - `SERVICE_CIRCUIT_HALF_OPEN_MAX`：半开试探成功数（默认 `1`）。
//!
//! ## 失败判定（`is_failure`）
//!
//! 仅"服务不可用"型错误计入失败：5xx（`ServiceError.status_code >= 500`）
//! 与网络/连接错误（`HttpRequest`）。4xx（业务错误）、解析错误不计入，
//! 避免因单一业务参数错误误熔断整条链路。

use std::sync::Mutex;
use std::time::{Duration, Instant};
use topems_shared_core::error::TopemsError;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum CircuitState {
    /// 正常状态：记录连续失败数
    Closed { failures: u32 },
    /// 熔断打开：冷却期内快速失败
    Open { opened_at: Instant },
    /// 半开：放行试探，记录试探成功数
    HalfOpen { successes: u32 },
}

/// 服务调用熔断器（进程内每客户端一个，经 `Arc` 在 clone 间共享）。
pub struct CircuitBreaker {
    state: Mutex<CircuitState>,
    enabled: bool,
    failure_threshold: u32,
    cooldown: Duration,
    half_open_max: u32,
}

impl CircuitBreaker {
    /// 从环境变量构造。
    pub fn from_env() -> Self {
        let enabled = std::env::var("SERVICE_CIRCUIT_ENABLED")
            .map(|v| v == "true" || v == "1")
            .unwrap_or(true);
        let failure_threshold = std::env::var("SERVICE_CIRCUIT_FAILURE_THRESHOLD")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(5);
        let cooldown_secs = std::env::var("SERVICE_CIRCUIT_COOLDOWN_SECS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(30);
        let half_open_max = std::env::var("SERVICE_CIRCUIT_HALF_OPEN_MAX")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(1);

        Self {
            state: Mutex::new(CircuitState::Closed { failures: 0 }),
            enabled,
            failure_threshold,
            cooldown: Duration::from_secs(cooldown_secs),
            half_open_max,
        }
    }

    /// 是否允许发起请求（`Open` 且未到冷却期 → `false` 快速失败）。
    pub fn allow_request(&self) -> bool {
        if !self.enabled {
            return true;
        }
        let mut state = match self.state.lock() {
            Ok(g) => g,
            Err(p) => p.into_inner(),
        };
        match *state {
            CircuitState::Closed { .. } => true,
            CircuitState::Open { opened_at } => {
                if opened_at.elapsed() >= self.cooldown {
                    *state = CircuitState::HalfOpen { successes: 0 };
                    true
                } else {
                    false
                }
            }
            CircuitState::HalfOpen { .. } => true,
        }
    }

    /// 记录一次成功调用。
    pub fn record_success(&self) {
        if !self.enabled {
            return;
        }
        let mut state = match self.state.lock() {
            Ok(g) => g,
            Err(p) => p.into_inner(),
        };
        match *state {
            CircuitState::Closed { .. } => {
                *state = CircuitState::Closed { failures: 0 };
            }
            CircuitState::HalfOpen { successes } => {
                if successes + 1 >= self.half_open_max {
                    tracing::info!(target: "service_circuit", "服务调用熔断恢复 CLOSED（半开试探成功）");
                    *state = CircuitState::Closed { failures: 0 };
                } else {
                    *state = CircuitState::HalfOpen {
                        successes: successes + 1,
                    };
                }
            }
            CircuitState::Open { .. } => {}
        }
    }

    /// 记录一次失败调用（仅服务不可用型错误调用）。
    pub fn record_failure(&self) {
        if !self.enabled {
            return;
        }
        let mut state = match self.state.lock() {
            Ok(g) => g,
            Err(p) => p.into_inner(),
        };
        match *state {
            CircuitState::Closed { failures } => {
                let f = failures + 1;
                if f >= self.failure_threshold {
                    tracing::warn!(
                        target: "service_circuit",
                        "服务调用熔断 OPEN：连续 {} 次失败（阈值 {}），冷却 {}s 内快速失败",
                        f, self.failure_threshold, self.cooldown.as_secs()
                    );
                    *state = CircuitState::Open {
                        opened_at: Instant::now(),
                    };
                } else {
                    *state = CircuitState::Closed { failures: f };
                }
            }
            CircuitState::HalfOpen { .. } => {
                tracing::warn!(target: "service_circuit", "服务调用熔断重新 OPEN（半开试探失败）");
                *state = CircuitState::Open {
                    opened_at: Instant::now(),
                };
            }
            CircuitState::Open { .. } => {}
        }
    }

    /// 熔断打开时的快速失败错误。
    pub fn circuit_open_error() -> TopemsError {
        TopemsError::ServiceError {
            status_code: 503,
            message: "circuit breaker open (fast fail)".into(),
        }
    }

    /// 当前是否处于熔断打开态（供诊断/metrics）。
    pub fn is_open(&self) -> bool {
        let state = match self.state.lock() {
            Ok(g) => g,
            Err(p) => p.into_inner(),
        };
        matches!(*state, CircuitState::Open { .. })
    }
}

/// 判断错误是否属于"服务不可用"型（计入熔断失败）。
pub fn is_failure(err: &TopemsError) -> bool {
    match err {
        TopemsError::ServiceError { status_code, .. } => *status_code >= 500,
        TopemsError::HttpRequest(_) => true,
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_from_env_defaults() {
        let cb = CircuitBreaker::from_env();
        assert!(cb.enabled);
        assert_eq!(cb.failure_threshold, 5);
        assert_eq!(cb.cooldown, Duration::from_secs(30));
        assert_eq!(cb.half_open_max, 1);
        assert!(!cb.is_open());
    }

    #[test]
    fn test_opens_after_threshold_failures() {
        let cb = CircuitBreaker::from_env();
        // 阈值 5，4 次失败仍 CLOSED
        for _ in 0..4 {
            cb.record_failure();
            assert!(!cb.is_open());
        }
        // 第 5 次失败 → OPEN
        cb.record_failure();
        assert!(cb.is_open());
        // OPEN 期间快速失败
        assert!(!cb.allow_request());
    }

    #[test]
    fn test_recovers_via_half_open() {
        let cb = CircuitBreaker::from_env();
        for _ in 0..5 {
            cb.record_failure();
        }
        assert!(cb.is_open());
        // 冷却未到 → 快速失败
        assert!(!cb.allow_request());
    }

    #[test]
    fn test_is_failure_classification() {
        assert!(is_failure(&TopemsError::ServiceError {
            status_code: 500,
            message: "boom".into()
        }));
        assert!(is_failure(&TopemsError::ServiceError {
            status_code: 503,
            message: "unavailable".into()
        }));
        assert!(!is_failure(&TopemsError::ServiceError {
            status_code: 404,
            message: "not found".into()
        }));
        assert!(!is_failure(&TopemsError::PermissionDenied {
            required: "x".into()
        }));
        assert!(!is_failure(&TopemsError::DatabaseQuery("down".into())));
    }
}
