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

#[derive(Debug, Clone, PartialEq)]
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
