//! DSH AI 弹性容错模块
//!
//! 提供超时控制、智能重试、熔断器、降级策略等弹性容错能力。

use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use tracing::{debug, error, info, warn};

// ============================================================================
// 类型定义
// ============================================================================

/// 熔断器状态
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CircuitBreakerState {
    /// 关闭（正常放行请求）
    Closed,
    /// 打开（拒绝请求，快速失败）
    Open,
    /// 半开（允许少量请求试探）
    HalfOpen,
}

impl CircuitBreakerState {
    pub fn as_str(&self) -> &str {
        match self {
            CircuitBreakerState::Closed => "closed",
            CircuitBreakerState::Open => "open",
            CircuitBreakerState::HalfOpen => "half_open",
        }
    }
}

/// 重试策略
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum RetryStrategy {
    /// 固定间隔
    Fixed,
    /// 线性退避
    Linear,
    /// 指数退避
    Exponential,
    /// 指数退避 + 抖动
    ExponentialWithJitter,
}

/// 重试配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RetryConfig {
    /// 最大重试次数
    pub max_retries: usize,
    /// 初始重试间隔（毫秒）
    pub initial_delay_ms: u64,
    /// 最大重试间隔（毫秒）
    pub max_delay_ms: u64,
    /// 重试策略
    pub strategy: RetryStrategy,
    /// 可重试的错误类型
    pub retryable_errors: Vec<String>,
}

impl Default for RetryConfig {
    fn default() -> Self {
        Self {
            max_retries: 3,
            initial_delay_ms: 100,
            max_delay_ms: 5000,
            strategy: RetryStrategy::ExponentialWithJitter,
            retryable_errors: vec![
                "timeout".to_string(),
                "connection_error".to_string(),
                "rate_limited".to_string(),
                "server_error".to_string(),
            ],
        }
    }
}

/// 熔断器配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CircuitBreakerConfig {
    /// 失败率阈值（0-1），超过则打开熔断器
    pub failure_rate_threshold: f64,
    /// 最小请求数（达到此数量才开始计算失败率）
    pub min_request_count: usize,
    /// 熔断器打开持续时间（毫秒），之后进入半开状态
    pub open_duration_ms: u64,
    /// 半开状态允许的请求数
    pub half_open_max_requests: usize,
    /// 窗口大小（统计最近 N 个请求）
    pub window_size: usize,
}

impl Default for CircuitBreakerConfig {
    fn default() -> Self {
        Self {
            failure_rate_threshold: 0.5,
            min_request_count: 10,
            open_duration_ms: 30000,
            half_open_max_requests: 3,
            window_size: 100,
        }
    }
}

/// 超时配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeoutConfig {
    /// 默认超时时间（毫秒）
    pub default_timeout_ms: u64,
    /// 连接超时时间（毫秒）
    pub connect_timeout_ms: u64,
    /// 读取超时时间（毫秒）
    pub read_timeout_ms: u64,
    /// 写入超时时间（毫秒）
    pub write_timeout_ms: u64,
}

impl Default for TimeoutConfig {
    fn default() -> Self {
        Self {
            default_timeout_ms: 30000,
            connect_timeout_ms: 5000,
            read_timeout_ms: 30000,
            write_timeout_ms: 10000,
        }
    }
}

/// 降级策略
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FallbackStrategy {
    /// 返回默认值
    DefaultValue(String),
    /// 使用缓存值
    UseCache,
    /// 使用简化规则引擎
    SimplifiedEngine,
    /// 返回错误（不降级）
    FailFast,
}

/// 弹性容错配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResilienceConfig {
    /// 是否启用
    pub enabled: bool,
    /// 重试配置
    pub retry: RetryConfig,
    /// 熔断器配置
    pub circuit_breaker: CircuitBreakerConfig,
    /// 超时配置
    pub timeout: TimeoutConfig,
    /// 默认降级策略
    pub default_fallback: FallbackStrategy,
}

impl Default for ResilienceConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            retry: RetryConfig::default(),
            circuit_breaker: CircuitBreakerConfig::default(),
            timeout: TimeoutConfig::default(),
            default_fallback: FallbackStrategy::FailFast,
        }
    }
}

/// 调用结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CallResult<T: Clone + Serialize> {
    /// 是否成功
    pub success: bool,
    /// 结果数据（成功时）
    pub data: Option<T>,
    /// 错误信息（失败时）
    pub error: Option<String>,
    /// 错误类型
    pub error_type: Option<String>,
    /// 重试次数
    pub retry_count: usize,
    /// 总耗时（毫秒）
    pub total_duration_ms: u64,
    /// 是否使用了降级
    pub used_fallback: bool,
    /// 降级策略
    pub fallback_strategy: Option<String>,
}

/// 熔断器统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CircuitBreakerStats {
    /// 熔断器名称
    pub name: String,
    /// 当前状态
    pub state: CircuitBreakerState,
    /// 总请求数
    pub total_requests: u64,
    /// 成功请求数
    pub success_count: u64,
    /// 失败请求数
    pub failure_count: u64,
    /// 当前失败率
    pub current_failure_rate: f64,
    /// 熔断器打开次数
    pub open_count: u64,
    /// 最后一次状态变更时间
    pub last_state_change: String,
}

/// 弹性容错管理器统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResilienceStats {
    /// 总调用次数
    pub total_calls: u64,
    /// 成功次数
    pub success_count: u64,
    /// 失败次数
    pub failure_count: u64,
    /// 总重试次数
    pub total_retries: u64,
    /// 降级次数
    pub fallback_count: u64,
    /// 熔断拒绝次数
    pub circuit_breaker_rejections: u64,
    /// 超时次数
    pub timeout_count: u64,
    /// 各熔断器统计
    pub circuit_breakers: HashMap<String, CircuitBreakerStats>,
}

// ============================================================================
// 熔断器
// ============================================================================

/// 熔断器
#[derive(Clone)]
pub struct CircuitBreaker {
    /// 名称
    name: String,
    /// 配置
    config: CircuitBreakerConfig,
    /// 当前状态
    state: Arc<Mutex<CircuitBreakerState>>,
    /// 请求结果窗口（true=成功, false=失败）
    request_window: Arc<Mutex<Vec<bool>>>,
    /// 状态变更时间
    state_change_time: Arc<Mutex<Instant>>,
    /// 半开状态请求计数
    half_open_count: Arc<Mutex<usize>>,
    /// 统计
    stats: Arc<Mutex<CircuitBreakerStats>>,
}

impl CircuitBreaker {
    /// 创建新的熔断器
    pub fn new(name: &str, config: CircuitBreakerConfig) -> Self {
        let now = Instant::now();
        let stats = CircuitBreakerStats {
            name: name.to_string(),
            state: CircuitBreakerState::Closed,
            total_requests: 0,
            success_count: 0,
            failure_count: 0,
            current_failure_rate: 0.0,
            open_count: 0,
            last_state_change: chrono::Utc::now().to_rfc3339(),
        };

        Self {
            name: name.to_string(),
            config,
            state: Arc::new(Mutex::new(CircuitBreakerState::Closed)),
            request_window: Arc::new(Mutex::new(Vec::new())),
            state_change_time: Arc::new(Mutex::new(now)),
            half_open_count: Arc::new(Mutex::new(0)),
            stats: Arc::new(Mutex::new(stats)),
        }
    }

    /// 获取名称
    pub fn name(&self) -> &str {
        &self.name
    }

    /// 检查是否允许请求通过
    pub fn allow_request(&self) -> bool {
        let mut state = self.state.lock();
        let now = Instant::now();

        match *state {
            CircuitBreakerState::Closed => true,
            CircuitBreakerState::Open => {
                // 检查是否超时，进入半开状态
                let state_change = *self.state_change_time.lock();
                if now.duration_since(state_change)
                    >= Duration::from_millis(self.config.open_duration_ms)
                {
                    *state = CircuitBreakerState::HalfOpen;
                    *self.state_change_time.lock() = now;
                    *self.half_open_count.lock() = 0;
                    info!(circuit_breaker = %self.name, "Circuit breaker transitioned to half-open");
                    true
                } else {
                    false
                }
            }
            CircuitBreakerState::HalfOpen => {
                let mut count = self.half_open_count.lock();
                if *count < self.config.half_open_max_requests {
                    *count += 1;
                    true
                } else {
                    false
                }
            }
        }
    }

    /// 记录成功
    pub fn record_success(&self) {
        let mut state = self.state.lock();
        let mut window = self.request_window.lock();
        let mut stats = self.stats.lock();

        window.push(true);
        if window.len() > self.config.window_size {
            window.remove(0);
        }

        stats.total_requests += 1;
        stats.success_count += 1;

        if *state == CircuitBreakerState::HalfOpen {
            // 半开状态成功，检查是否可以关闭
            let count = *self.half_open_count.lock();
            if count >= self.config.half_open_max_requests {
                *state = CircuitBreakerState::Closed;
                *self.state_change_time.lock() = Instant::now();
                window.clear();
                info!(circuit_breaker = %self.name, "Circuit breaker transitioned to closed");
            }
        }

        stats.state = *state;
    }

    /// 记录失败
    pub fn record_failure(&self) {
        let mut state = self.state.lock();
        let mut window = self.request_window.lock();
        let mut stats = self.stats.lock();

        window.push(false);
        if window.len() > self.config.window_size {
            window.remove(0);
        }

        stats.total_requests += 1;
        stats.failure_count += 1;

        // 计算失败率
        let total = window.len();
        let failures = window.iter().filter(|&&r| !r).count();
        let failure_rate = if total > 0 {
            failures as f64 / total as f64
        } else {
            0.0
        };
        stats.current_failure_rate = failure_rate;

        match *state {
            CircuitBreakerState::Closed => {
                // 失败率超过阈值且请求数足够，打开熔断器
                if total >= self.config.min_request_count
                    && failure_rate >= self.config.failure_rate_threshold
                {
                    *state = CircuitBreakerState::Open;
                    *self.state_change_time.lock() = Instant::now();
                    stats.open_count += 1;
                    warn!(
                        circuit_breaker = %self.name,
                        failure_rate = failure_rate,
                        "Circuit breaker opened"
                    );
                }
            }
            CircuitBreakerState::HalfOpen => {
                // 半开状态失败，重新打开
                *state = CircuitBreakerState::Open;
                *self.state_change_time.lock() = Instant::now();
                stats.open_count += 1;
                warn!(circuit_breaker = %self.name, "Circuit breaker re-opened from half-open");
            }
            _ => {}
        }

        stats.state = *state;
    }

    /// 获取当前状态
    pub fn state(&self) -> CircuitBreakerState {
        *self.state.lock()
    }

    /// 获取统计
    pub fn stats(&self) -> CircuitBreakerStats {
        self.stats.lock().clone()
    }

    /// 重置熔断器
    pub fn reset(&self) {
        let mut state = self.state.lock();
        *state = CircuitBreakerState::Closed;
        *self.state_change_time.lock() = Instant::now();
        self.request_window.lock().clear();
        *self.half_open_count.lock() = 0;
        info!(circuit_breaker = %self.name, "Circuit breaker reset");
    }
}

// ============================================================================
// 重试计算器
// ============================================================================

/// 重试延迟计算器
pub struct RetryDelayCalculator;

impl RetryDelayCalculator {
    /// 计算重试延迟
    pub fn calculate(config: &RetryConfig, attempt: usize) -> Duration {
        let base_delay = config.initial_delay_ms as f64;
        let max_delay = config.max_delay_ms as f64;

        let delay_ms = match config.strategy {
            RetryStrategy::Fixed => base_delay,
            RetryStrategy::Linear => base_delay * (attempt as f64 + 1.0),
            RetryStrategy::Exponential => base_delay * 2f64.powi(attempt as i32),
            RetryStrategy::ExponentialWithJitter => {
                let exp_delay = base_delay * 2f64.powi(attempt as i32);
                let jitter = exp_delay * 0.3 * (rand::random::<f64>() - 0.5);
                exp_delay + jitter
            }
        };

        let clamped = delay_ms.clamp(base_delay, max_delay);
        Duration::from_millis(clamped as u64)
    }

    /// 判断错误是否可重试
    pub fn is_retryable(config: &RetryConfig, error_type: &str) -> bool {
        config
            .retryable_errors
            .iter()
            .any(|e| error_type.contains(e))
    }
}

// ============================================================================
// 弹性容错管理器
// ============================================================================

/// 弹性容错管理器
#[derive(Clone)]
pub struct ResilienceManager {
    /// 配置
    config: ResilienceConfig,
    /// 熔断器集合（名称 -> 熔断器）
    circuit_breakers: Arc<Mutex<HashMap<String, CircuitBreaker>>>,
    /// 统计
    stats: Arc<Mutex<ResilienceStats>>,
}

impl ResilienceManager {
    /// 创建新的弹性容错管理器
    pub fn new(config: ResilienceConfig) -> Self {
        let stats = ResilienceStats {
            total_calls: 0,
            success_count: 0,
            failure_count: 0,
            total_retries: 0,
            fallback_count: 0,
            circuit_breaker_rejections: 0,
            timeout_count: 0,
            circuit_breakers: HashMap::new(),
        };

        Self {
            config,
            circuit_breakers: Arc::new(Mutex::new(HashMap::new())),
            stats: Arc::new(Mutex::new(stats)),
        }
    }

    /// 使用默认配置创建
    pub fn with_defaults() -> Self {
        Self::new(ResilienceConfig::default())
    }

    /// 获取配置
    pub fn config(&self) -> &ResilienceConfig {
        &self.config
    }

    /// 注册熔断器
    pub fn register_circuit_breaker(&self, name: &str, config: Option<CircuitBreakerConfig>) {
        let cb_config = config.unwrap_or_else(|| self.config.circuit_breaker.clone());
        let cb = CircuitBreaker::new(name, cb_config);
        self.circuit_breakers.lock().insert(name.to_string(), cb);
    }

    /// 获取熔断器
    pub fn get_circuit_breaker(&self, name: &str) -> Option<CircuitBreaker> {
        self.circuit_breakers.lock().get(name).cloned()
    }

    /// 检查熔断器是否允许请求
    pub fn allow_request(&self, circuit_breaker_name: &str) -> bool {
        if let Some(cb) = self.get_circuit_breaker(circuit_breaker_name) {
            cb.allow_request()
        } else {
            // 未注册的熔断器默认允许
            true
        }
    }

    /// 记录调用结果
    pub fn record_result(&self, circuit_breaker_name: &str, success: bool) {
        if let Some(cb) = self.get_circuit_breaker(circuit_breaker_name) {
            if success {
                cb.record_success();
            } else {
                cb.record_failure();
            }
        }

        let mut stats = self.stats.lock();
        stats.total_calls += 1;
        if success {
            stats.success_count += 1;
        } else {
            stats.failure_count += 1;
        }
    }

    /// 记录重试
    pub fn record_retry(&self) {
        self.stats.lock().total_retries += 1;
    }

    /// 记录降级
    pub fn record_fallback(&self) {
        self.stats.lock().fallback_count += 1;
    }

    /// 记录熔断拒绝
    pub fn record_circuit_breaker_rejection(&self) {
        self.stats.lock().circuit_breaker_rejections += 1;
    }

    /// 记录超时
    pub fn record_timeout(&self) {
        self.stats.lock().timeout_count += 1;
    }

    /// 获取统计
    pub fn get_stats(&self) -> ResilienceStats {
        let mut stats = self.stats.lock().clone();

        // 更新各熔断器统计
        let cbs = self.circuit_breakers.lock();
        for (name, cb) in cbs.iter() {
            stats.circuit_breakers.insert(name.clone(), cb.stats());
        }

        stats
    }

    /// 执行带弹性容错的调用
    pub async fn execute_with_resilience<F, Fut, T>(
        &self,
        operation_name: &str,
        circuit_breaker_name: Option<&str>,
        operation: F,
    ) -> CallResult<T>
    where
        F: Fn() -> Fut,
        Fut: std::future::Future<Output = Result<T, (String, String)>>,
        T: Clone + Serialize,
    {
        let start = Instant::now();
        let cb_name = circuit_breaker_name.unwrap_or(operation_name);

        // 确保熔断器已注册
        if self.get_circuit_breaker(cb_name).is_none() {
            self.register_circuit_breaker(cb_name, None);
        }

        // 检查熔断器
        if !self.allow_request(cb_name) {
            self.record_circuit_breaker_rejection();
            let duration = start.elapsed().as_millis() as u64;
            warn!(operation = %operation_name, "Request rejected by circuit breaker");
            return CallResult {
                success: false,
                data: None,
                error: Some("服务暂不可用，请稍后重试".to_string()),
                error_type: Some("circuit_breaker_open".to_string()),
                retry_count: 0,
                total_duration_ms: duration,
                used_fallback: false,
                fallback_strategy: None,
            };
        }

        let mut retry_count = 0;
        let retry_config = &self.config.retry;

        loop {
            match operation().await {
                Ok(data) => {
                    self.record_result(cb_name, true);
                    let duration = start.elapsed().as_millis() as u64;
                    debug!(operation = %operation_name, retry_count = retry_count, "Operation succeeded");
                    return CallResult {
                        success: true,
                        data: Some(data),
                        error: None,
                        error_type: None,
                        retry_count,
                        total_duration_ms: duration,
                        used_fallback: false,
                        fallback_strategy: None,
                    };
                }
                Err((error, error_type)) => {
                    // 检查是否可以重试
                    if retry_count < retry_config.max_retries
                        && RetryDelayCalculator::is_retryable(retry_config, &error_type)
                    {
                        self.record_retry();
                        retry_count += 1;
                        let delay = RetryDelayCalculator::calculate(retry_config, retry_count - 1);
                        debug!(
                            operation = %operation_name,
                            retry_count = retry_count,
                            delay_ms = delay.as_millis(),
                            error = %error,
                            "Retrying operation"
                        );
                        tokio::time::sleep(delay).await;
                        continue;
                    }

                    // 不再重试，记录失败
                    self.record_result(cb_name, false);
                    let duration = start.elapsed().as_millis() as u64;
                    error!(operation = %operation_name, error = %error, "Operation failed after retries");

                    return CallResult {
                        success: false,
                        data: None,
                        error: Some(error),
                        error_type: Some(error_type),
                        retry_count,
                        total_duration_ms: duration,
                        used_fallback: false,
                        fallback_strategy: None,
                    };
                }
            }
        }
    }
}

// ============================================================================
// 测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_circuit_breaker_state_as_str() {
        assert_eq!(CircuitBreakerState::Closed.as_str(), "closed");
        assert_eq!(CircuitBreakerState::Open.as_str(), "open");
        assert_eq!(CircuitBreakerState::HalfOpen.as_str(), "half_open");
    }

    #[test]
    fn test_retry_config_default() {
        let config = RetryConfig::default();
        assert_eq!(config.max_retries, 3);
        assert_eq!(config.initial_delay_ms, 100);
        assert_eq!(config.strategy, RetryStrategy::ExponentialWithJitter);
    }

    #[test]
    fn test_circuit_breaker_config_default() {
        let config = CircuitBreakerConfig::default();
        assert_eq!(config.failure_rate_threshold, 0.5);
        assert_eq!(config.min_request_count, 10);
        assert_eq!(config.window_size, 100);
    }

    #[test]
    fn test_timeout_config_default() {
        let config = TimeoutConfig::default();
        assert_eq!(config.default_timeout_ms, 30000);
        assert_eq!(config.connect_timeout_ms, 5000);
    }

    #[test]
    fn test_resilience_config_default() {
        let config = ResilienceConfig::default();
        assert!(config.enabled);
    }

    #[test]
    fn test_circuit_breaker_creation() {
        let cb = CircuitBreaker::new("test", CircuitBreakerConfig::default());
        assert_eq!(cb.name(), "test");
        assert_eq!(cb.state(), CircuitBreakerState::Closed);
    }

    #[test]
    fn test_circuit_breaker_allow_request_closed() {
        let cb = CircuitBreaker::new("test", CircuitBreakerConfig::default());
        assert!(cb.allow_request());
    }

    #[test]
    fn test_circuit_breaker_record_success() {
        let cb = CircuitBreaker::new("test", CircuitBreakerConfig::default());
        cb.record_success();
        let stats = cb.stats();
        assert_eq!(stats.success_count, 1);
        assert_eq!(stats.total_requests, 1);
    }

    #[test]
    fn test_circuit_breaker_record_failure() {
        let cb = CircuitBreaker::new("test", CircuitBreakerConfig::default());
        cb.record_failure();
        let stats = cb.stats();
        assert_eq!(stats.failure_count, 1);
    }

    #[test]
    fn test_circuit_breaker_opens_after_failures() {
        let config = CircuitBreakerConfig {
            failure_rate_threshold: 0.5,
            min_request_count: 4,
            open_duration_ms: 30000,
            half_open_max_requests: 3,
            window_size: 10,
        };
        let cb = CircuitBreaker::new("test", config);

        // 4 次失败，失败率 100%，应该打开熔断器
        for _ in 0..4 {
            cb.record_failure();
        }

        assert_eq!(cb.state(), CircuitBreakerState::Open);
        assert!(!cb.allow_request());
    }

    #[test]
    fn test_circuit_breaker_reset() {
        let config = CircuitBreakerConfig {
            failure_rate_threshold: 0.5,
            min_request_count: 4,
            open_duration_ms: 30000,
            half_open_max_requests: 3,
            window_size: 10,
        };
        let cb = CircuitBreaker::new("test", config);

        for _ in 0..4 {
            cb.record_failure();
        }
        assert_eq!(cb.state(), CircuitBreakerState::Open);

        cb.reset();
        assert_eq!(cb.state(), CircuitBreakerState::Closed);
    }

    #[test]
    fn test_retry_delay_calculator_fixed() {
        let config = RetryConfig {
            strategy: RetryStrategy::Fixed,
            initial_delay_ms: 100,
            ..Default::default()
        };
        let delay = RetryDelayCalculator::calculate(&config, 0);
        assert_eq!(delay.as_millis(), 100);
    }

    #[test]
    fn test_retry_delay_calculator_exponential() {
        let config = RetryConfig {
            strategy: RetryStrategy::Exponential,
            initial_delay_ms: 100,
            max_delay_ms: 10000,
            ..Default::default()
        };
        let delay0 = RetryDelayCalculator::calculate(&config, 0);
        let delay1 = RetryDelayCalculator::calculate(&config, 1);
        let delay2 = RetryDelayCalculator::calculate(&config, 2);
        assert_eq!(delay0.as_millis(), 100);
        assert_eq!(delay1.as_millis(), 200);
        assert_eq!(delay2.as_millis(), 400);
    }

    #[test]
    fn test_is_retryable() {
        let config = RetryConfig::default();
        assert!(RetryDelayCalculator::is_retryable(&config, "timeout_error"));
        assert!(RetryDelayCalculator::is_retryable(
            &config,
            "connection_error"
        ));
        assert!(!RetryDelayCalculator::is_retryable(
            &config,
            "validation_error"
        ));
    }

    #[test]
    fn test_resilience_manager_creation() {
        let manager = ResilienceManager::with_defaults();
        assert!(manager.config().enabled);
    }

    #[test]
    fn test_resilience_manager_register_circuit_breaker() {
        let manager = ResilienceManager::with_defaults();
        manager.register_circuit_breaker("test", None);
        assert!(manager.get_circuit_breaker("test").is_some());
    }

    #[test]
    fn test_resilience_manager_stats() {
        let manager = ResilienceManager::with_defaults();
        manager.register_circuit_breaker("test", None);
        manager.record_result("test", true);
        manager.record_retry();
        manager.record_fallback();

        let stats = manager.get_stats();
        assert_eq!(stats.total_calls, 1);
        assert_eq!(stats.success_count, 1);
        assert_eq!(stats.total_retries, 1);
        assert_eq!(stats.fallback_count, 1);
    }

    #[tokio::test]
    async fn test_execute_with_resilience_success() {
        let manager = ResilienceManager::with_defaults();
        let result: CallResult<String> = manager
            .execute_with_resilience("test", None, || async { Ok("success".to_string()) })
            .await;

        assert!(result.success);
        assert_eq!(result.data.unwrap(), "success");
        assert_eq!(result.retry_count, 0);
    }

    #[tokio::test]
    async fn test_execute_with_resilience_retry() {
        let manager = ResilienceManager::with_defaults();
        let attempt_count = Arc::new(Mutex::new(0));

        let result: CallResult<String> = manager
            .execute_with_resilience("test", None, || {
                let count = attempt_count.clone();
                async move {
                    let mut c = count.lock();
                    *c += 1;
                    if *c < 3 {
                        Err(("timeout".to_string(), "timeout".to_string()))
                    } else {
                        Ok("success".to_string())
                    }
                }
            })
            .await;

        assert!(result.success);
        assert_eq!(result.retry_count, 2);
        assert_eq!(*attempt_count.lock(), 3);
    }
}
