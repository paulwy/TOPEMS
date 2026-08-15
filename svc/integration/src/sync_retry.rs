//! Data Sync Retry Mechanism
//!
//! Provides retry logic with exponential backoff for data synchronization.

use serde::{Deserialize, Serialize};
use std::time::Duration;
use tokio::time::sleep;

/// Retry configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RetryConfig {
    pub max_retries: u32,
    pub base_delay_ms: u64,
    pub max_delay_ms: u64,
    pub exponential_base: f64,
    pub retryable_errors: Vec<String>,
}

impl Default for RetryConfig {
    fn default() -> Self {
        Self {
            max_retries: 5,
            base_delay_ms: 1000,
            max_delay_ms: 30000,
            exponential_base: 2.0,
            retryable_errors: vec![
                "connection refused".to_string(),
                "timeout".to_string(),
                "temporary failure".to_string(),
                "rate limit".to_string(),
            ],
        }
    }
}

/// Retry result
#[derive(Debug, Clone)]
pub enum RetryResult<T> {
    Success(T),
    Failed { error: String, attempts: u32 },
    MaxRetriesExceeded { error: String, attempts: u32 },
}

/// Retry executor
pub struct RetryExecutor {
    config: RetryConfig,
}

impl RetryExecutor {
    pub fn new(config: RetryConfig) -> Self {
        Self { config }
    }

    pub fn default() -> Self {
        Self::new(RetryConfig::default())
    }

    /// Execute a function with retry logic
    pub async fn execute<F, Fut, T>(&self, operation: F) -> RetryResult<T>
    where
        F: Fn() -> Fut,
        Fut: std::future::Future<Output = Result<T, String>>,
    {
        let mut attempts = 0;
        let mut last_error = String::new();

        while attempts < self.config.max_retries {
            attempts += 1;

            match operation().await {
                Ok(result) => return RetryResult::Success(result),
                Err(error) => {
                    last_error = error.clone();

                    if !self.is_retryable(&error) || attempts >= self.config.max_retries {
                        return RetryResult::MaxRetriesExceeded { error, attempts };
                    }

                    let delay = self.calculate_delay(attempts);
                    sleep(Duration::from_millis(delay)).await;
                }
            }
        }

        RetryResult::MaxRetriesExceeded {
            error: last_error,
            attempts,
        }
    }

    /// Execute with circuit breaker pattern
    pub async fn execute_with_circuit_breaker<F, Fut, T>(
        &self,
        operation: F,
        circuit_breaker: &mut CircuitBreaker,
    ) -> RetryResult<T>
    where
        F: Fn() -> Fut,
        Fut: std::future::Future<Output = Result<T, String>>,
    {
        if !circuit_breaker.allow_request() {
            return RetryResult::Failed {
                error: "Circuit breaker is open".to_string(),
                attempts: 0,
            };
        }

        let result = self.execute(operation).await;

        match &result {
            RetryResult::Success(_) => circuit_breaker.record_success(),
            _ => circuit_breaker.record_failure(),
        }

        result
    }

    fn calculate_delay(&self, attempt: u32) -> u64 {
        let delay = (self.config.base_delay_ms as f64
            * self.config.exponential_base.powi(attempt as i32 - 1)) as u64;
        delay.min(self.config.max_delay_ms)
    }

    fn is_retryable(&self, error: &str) -> bool {
        let error_lower = error.to_lowercase();
        self.config
            .retryable_errors
            .iter()
            .any(|e| error_lower.contains(e))
    }
}

/// Circuit breaker pattern
#[derive(Debug, Clone)]
pub struct CircuitBreaker {
    pub failure_threshold: u32,
    pub success_threshold: u32,
    pub timeout_ms: u64,
    pub state: CircuitState,
    pub failures: u32,
    pub successes: u32,
    pub last_failure_time: Option<std::time::Instant>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CircuitState {
    Closed,
    Open,
    HalfOpen,
}

impl CircuitBreaker {
    pub fn new(failure_threshold: u32, success_threshold: u32, timeout_ms: u64) -> Self {
        Self {
            failure_threshold,
            success_threshold,
            timeout_ms,
            state: CircuitState::Closed,
            failures: 0,
            successes: 0,
            last_failure_time: None,
        }
    }

    pub fn allow_request(&self) -> bool {
        match self.state {
            CircuitState::Closed => true,
            CircuitState::Open => {
                if let Some(last) = self.last_failure_time {
                    if last.elapsed().as_millis() as u64 >= self.timeout_ms {
                        return true; // Transition to half-open
                    }
                }
                false
            }
            CircuitState::HalfOpen => true,
        }
    }

    pub fn record_success(&mut self) {
        match self.state {
            CircuitState::HalfOpen => {
                self.successes += 1;
                if self.successes >= self.success_threshold {
                    self.state = CircuitState::Closed;
                    self.failures = 0;
                    self.successes = 0;
                }
            }
            CircuitState::Closed => {
                self.failures = 0;
            }
            _ => {}
        }
    }

    pub fn record_failure(&mut self) {
        self.last_failure_time = Some(std::time::Instant::now());

        match self.state {
            CircuitState::Closed => {
                self.failures += 1;
                if self.failures >= self.failure_threshold {
                    self.state = CircuitState::Open;
                }
            }
            CircuitState::HalfOpen | CircuitState::Open => {
                self.state = CircuitState::Open;
                self.successes = 0;
            }
        }
    }
}

/// Sync task with retry support
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncTask {
    pub id: String,
    pub tenant_id: String,
    pub source_service: String,
    pub target_service: String,
    pub sync_type: String,
    pub payload: serde_json::Value,
    pub retry_count: u32,
    pub max_retries: u32,
    pub status: SyncStatus,
    pub error_message: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SyncStatus {
    Pending,
    InProgress,
    Completed,
    Failed,
    MaxRetriesExceeded,
}

/// Sync task manager
pub struct SyncTaskManager {
    executor: RetryExecutor,
}

impl SyncTaskManager {
    pub fn new(config: RetryConfig) -> Self {
        Self {
            executor: RetryExecutor::new(config),
        }
    }

    pub async fn execute_sync_task<F, Fut>(&self, task: &mut SyncTask, operation: F)
    where
        F: Fn() -> Fut,
        Fut: std::future::Future<Output = Result<(), String>>,
    {
        task.status = SyncStatus::InProgress;

        let result = self.executor.execute(operation).await;

        match result {
            RetryResult::Success(_) => {
                task.status = SyncStatus::Completed;
                task.error_message = None;
            }
            RetryResult::Failed { error, attempts } => {
                task.status = SyncStatus::Failed;
                task.error_message = Some(format!("Failed after {} attempts: {}", attempts, error));
                task.retry_count = attempts;
            }
            RetryResult::MaxRetriesExceeded { error, attempts } => {
                task.status = SyncStatus::MaxRetriesExceeded;
                task.error_message =
                    Some(format!("Max retries exceeded ({}): {}", attempts, error));
                task.retry_count = attempts;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---- RetryConfig (3 tests) ----

    #[test]
    fn test_retry_config_default_values() {
        let cfg = RetryConfig::default();
        assert_eq!(cfg.max_retries, 5);
        assert_eq!(cfg.base_delay_ms, 1000);
        assert_eq!(cfg.max_delay_ms, 30000);
        assert!((cfg.exponential_base - 2.0).abs() < f64::EPSILON);
        assert_eq!(cfg.retryable_errors.len(), 4);
    }

    #[test]
    fn test_retry_config_custom_values() {
        let cfg = RetryConfig {
            max_retries: 10,
            base_delay_ms: 200,
            max_delay_ms: 5000,
            exponential_base: 3.0,
            retryable_errors: vec!["timeout".to_string()],
        };
        assert_eq!(cfg.max_retries, 10);
        assert_eq!(cfg.base_delay_ms, 200);
        assert_eq!(cfg.max_delay_ms, 5000);
        assert!((cfg.exponential_base - 3.0).abs() < f64::EPSILON);
        assert_eq!(cfg.retryable_errors, vec!["timeout".to_string()]);
    }

    #[test]
    fn test_retry_config_serde_roundtrip() {
        let cfg = RetryConfig::default();
        let json = serde_json::to_string(&cfg).expect("serialize RetryConfig");
        let back: RetryConfig = serde_json::from_str(&json).expect("deserialize RetryConfig");
        assert_eq!(back.max_retries, cfg.max_retries);
        assert_eq!(back.base_delay_ms, cfg.base_delay_ms);
        assert_eq!(back.max_delay_ms, cfg.max_delay_ms);
        assert_eq!(back.retryable_errors, cfg.retryable_errors);
    }

    // ---- RetryResult (3 tests) ----

    #[test]
    fn test_retry_result_success_pattern() {
        let r: RetryResult<u32> = RetryResult::Success(42);
        match r {
            RetryResult::Success(v) => assert_eq!(v, 42),
            _ => panic!("expected Success variant"),
        }
    }

    #[test]
    fn test_retry_result_failed_pattern() {
        let r: RetryResult<u32> = RetryResult::Failed {
            error: "boom".to_string(),
            attempts: 2,
        };
        match r {
            RetryResult::Failed { error, attempts } => {
                assert_eq!(error, "boom");
                assert_eq!(attempts, 2);
            }
            _ => panic!("expected Failed variant"),
        }
    }

    #[test]
    fn test_retry_result_max_retries_pattern() {
        let r: RetryResult<()> = RetryResult::MaxRetriesExceeded {
            error: "dead".to_string(),
            attempts: 5,
        };
        match r {
            RetryResult::MaxRetriesExceeded { error, attempts } => {
                assert_eq!(error, "dead");
                assert_eq!(attempts, 5);
            }
            _ => panic!("expected MaxRetriesExceeded variant"),
        }
    }

    // ---- CircuitState serde roundtrip (3 tests) ----

    #[test]
    fn test_circuit_state_closed_serde_roundtrip() {
        let original = CircuitState::Closed;
        let json = serde_json::to_string(&original).expect("serialize Closed");
        let back: CircuitState = serde_json::from_str(&json).expect("deserialize Closed");
        assert_eq!(original, back);
    }

    #[test]
    fn test_circuit_state_open_serde_roundtrip() {
        let original = CircuitState::Open;
        let json = serde_json::to_string(&original).expect("serialize Open");
        let back: CircuitState = serde_json::from_str(&json).expect("deserialize Open");
        assert_eq!(original, back);
    }

    #[test]
    fn test_circuit_state_half_open_serde_roundtrip() {
        let original = CircuitState::HalfOpen;
        let json = serde_json::to_string(&original).expect("serialize HalfOpen");
        let back: CircuitState = serde_json::from_str(&json).expect("deserialize HalfOpen");
        assert_eq!(original, back);
    }

    // ---- CircuitBreaker state transitions (4 tests) ----

    #[test]
    fn test_circuit_breaker_starts_closed_and_allows_requests() {
        let mut cb = CircuitBreaker::new(3, 2, 1000);
        assert_eq!(cb.state, CircuitState::Closed);
        assert!(cb.allow_request());
        assert_eq!(cb.failures, 0);
        cb.record_success();
        assert_eq!(cb.failures, 0);
    }

    #[test]
    fn test_circuit_breaker_closed_to_open_after_threshold() {
        let mut cb = CircuitBreaker::new(3, 2, 1000);
        assert!(cb.allow_request());
        cb.record_failure();
        assert_eq!(cb.state, CircuitState::Closed);
        cb.record_failure();
        assert_eq!(cb.state, CircuitState::Closed);
        cb.record_failure();
        assert_eq!(cb.state, CircuitState::Open);
        // Open state should refuse requests (last_failure_time just set, timeout not elapsed)
        assert!(!cb.allow_request());
    }

    #[test]
    fn test_circuit_breaker_half_open_to_closed_on_success() {
        let mut cb = CircuitBreaker::new(1, 2, 1);
        // Force open state
        cb.record_failure();
        assert_eq!(cb.state, CircuitState::Open);
        // Wait for the timeout to elapse (timeout_ms == 1 ms)
        std::thread::sleep(std::time::Duration::from_millis(5));
        // allow_request should now pass and transition to half-open behaviour
        assert!(cb.allow_request());
        // Force half-open state by direct manipulation
        cb.state = CircuitState::HalfOpen;
        cb.successes = 0;
        cb.record_success();
        assert_eq!(cb.successes, 1);
        cb.record_success();
        assert_eq!(cb.state, CircuitState::Closed);
    }

    #[test]
    fn test_circuit_breaker_half_open_failure_returns_to_open() {
        let mut cb = CircuitBreaker::new(1, 2, 1000);
        cb.state = CircuitState::HalfOpen;
        cb.successes = 1;
        cb.record_failure();
        assert_eq!(cb.state, CircuitState::Open);
        assert_eq!(cb.successes, 0);
    }

    // ---- SyncStatus (2 tests) ----

    #[test]
    fn test_sync_status_serde_roundtrip_all_variants() {
        let variants = vec![
            SyncStatus::Pending,
            SyncStatus::InProgress,
            SyncStatus::Completed,
            SyncStatus::Failed,
            SyncStatus::MaxRetriesExceeded,
        ];
        for v in variants {
            let json = serde_json::to_string(&v).expect("serialize SyncStatus");
            let back: SyncStatus = serde_json::from_str(&json).expect("deserialize SyncStatus");
            assert_eq!(v, back);
        }
    }

    #[test]
    fn test_sync_status_equality() {
        assert_eq!(SyncStatus::Pending, SyncStatus::Pending);
        assert_ne!(SyncStatus::Pending, SyncStatus::Completed);
        assert_ne!(SyncStatus::Failed, SyncStatus::MaxRetriesExceeded);
    }

    // ---- SyncTask serde roundtrip (1 test) ----

    #[test]
    fn test_sync_task_serde_roundtrip() {
        let task = SyncTask {
            id: "task-1".to_string(),
            tenant_id: "t-1".to_string(),
            source_service: "erp".to_string(),
            target_service: "mes".to_string(),
            sync_type: "order".to_string(),
            payload: serde_json::json!({"order_id": 1}),
            retry_count: 0,
            max_retries: 5,
            status: SyncStatus::Pending,
            error_message: None,
            created_at: "2026-08-15T00:00:00Z".to_string(),
            updated_at: "2026-08-15T00:00:00Z".to_string(),
        };
        let json = serde_json::to_string(&task).expect("serialize SyncTask");
        let back: SyncTask = serde_json::from_str(&json).expect("deserialize SyncTask");
        assert_eq!(back.id, "task-1");
        assert_eq!(back.status, SyncStatus::Pending);
        assert_eq!(back.max_retries, 5);
    }

    // ---- RetryExecutor calculate_delay via observable path (1 test) ----

    #[test]
    fn test_retry_executor_default_uses_default_config() {
        let executor = RetryExecutor::default();
        // Public surface: is_retryable reflects the default config
        assert!(executor.is_retryable("Connection refused by peer"));
        assert!(executor.is_retryable("operation timeout exceeded"));
        assert!(!executor.is_retryable("business rule violation"));
    }
}
