//! Retry Handler Module
//!
//! 实现异常处理与重试机制

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;

// ==================== Retry Types ====================

/// 重试策略
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RetryPolicy {
    /// 最大重试次数
    pub max_retries: i32,
    /// 重试间隔(秒)
    pub retry_interval_secs: i32,
    /// 指数退避
    pub exponential_backoff: bool,
    /// 最大退避间隔(秒)
    pub max_backoff_secs: Option<i32>,
}

impl Default for RetryPolicy {
    fn default() -> Self {
        Self {
            max_retries: 3,
            retry_interval_secs: 60,
            exponential_backoff: true,
            max_backoff_secs: Some(3600),
        }
    }
}

/// 重试任务状态
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum RetryTaskStatus {
    Pending,
    Running,
    Completed,
    Failed,
    Cancelled,
}

/// 重试任务
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RetryTask {
    /// 任务 ID
    pub id: Uuid,
    /// 关联的执行记录 ID
    pub execution_id: Uuid,
    /// 规则代码
    pub rule_code: String,
    /// 重试次数
    pub retry_count: i32,
    /// 状态
    pub status: RetryTaskStatus,
    /// 错误信息
    pub error_message: Option<String>,
    /// 下次重试时间
    pub next_retry_at: Option<DateTime<Utc>>,
    /// 创建时间
    pub created_at: DateTime<Utc>,
    /// 更新时间
    pub updated_at: DateTime<Utc>,
}

/// 告警级别
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AlertLevel {
    Info,
    Warning,
    Error,
    Critical,
}

/// 告警记录
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Alert {
    /// 告警 ID
    pub id: Uuid,
    /// 告警级别
    pub level: AlertLevel,
    /// 告警标题
    pub title: String,
    /// 告警内容
    pub message: String,
    /// 关联的规则代码
    pub rule_code: Option<String>,
    /// 关联的执行记录 ID
    pub execution_id: Option<Uuid>,
    /// 是否已确认
    pub acknowledged: bool,
    /// 创建时间
    pub created_at: DateTime<Utc>,
}

// ==================== Retry Manager ====================

/// 重试管理器
pub struct RetryManager {
    /// 待处理任务
    pending_tasks: Arc<RwLock<HashMap<Uuid, RetryTask>>>,
    /// 历史任务
    history: Arc<RwLock<Vec<RetryTask>>>,
    /// 最大历史记录数
    max_history: usize,
    /// 告警回调
    alert_callback: Option<Box<dyn Fn(Alert) + Send + Sync>>,
}

impl RetryManager {
    /// 创建新的重试管理器
    pub fn new() -> Self {
        Self {
            pending_tasks: Arc::new(RwLock::new(HashMap::new())),
            history: Arc::new(RwLock::new(Vec::new())),
            max_history: 1000,
            alert_callback: None,
        }
    }

    /// 设置告警回调
    pub fn set_alert_callback<F>(&mut self, callback: F)
    where
        F: Fn(Alert) + Send + Sync + 'static,
    {
        self.alert_callback = Some(Box::new(callback));
    }

    /// 添加重试任务
    pub async fn add_task(&self, task: RetryTask) {
        let mut tasks = self.pending_tasks.write().await;
        tasks.insert(task.id, task);
    }

    /// 获取待处理任务
    pub async fn get_pending_tasks(&self) -> Vec<RetryTask> {
        let tasks = self.pending_tasks.read().await;
        tasks.values().cloned().collect()
    }

    /// 获取可执行的任务（已到重试时间的）
    pub async fn get_ready_tasks(&self) -> Vec<RetryTask> {
        let tasks = self.pending_tasks.read().await;
        let now = Utc::now();
        tasks
            .values()
            .filter(|t| {
                t.status == RetryTaskStatus::Pending
                    && t.next_retry_at.map(|dt| dt <= now).unwrap_or(false)
            })
            .cloned()
            .collect()
    }

    /// 更新任务状态
    pub async fn update_task_status(
        &self,
        task_id: Uuid,
        status: RetryTaskStatus,
        error_message: Option<String>,
    ) -> bool {
        let mut tasks = self.pending_tasks.write().await;
        if let Some(task) = tasks.get_mut(&task_id) {
            task.status = status.clone();
            task.error_message = error_message;
            task.updated_at = Utc::now();

            // 如果任务完成或取消，移到历史
            if status == RetryTaskStatus::Completed || status == RetryTaskStatus::Cancelled {
                if let Some(completed_task) = tasks.remove(&task_id) {
                    let mut history = self.history.write().await;
                    history.push(completed_task);

                    // 清理过多历史
                    let len = history.len();
                    if len > self.max_history {
                        history.drain(0..len - self.max_history);
                    }
                }
            }
            return true;
        }
        false
    }

    /// 计算下次重试时间
    pub fn calculate_next_retry(&self, retry_count: i32, policy: &RetryPolicy) -> DateTime<Utc> {
        let interval_secs = if policy.exponential_backoff {
            let interval = policy.retry_interval_secs as f64 * 2.0_f64.powi(retry_count);
            if let Some(max) = policy.max_backoff_secs {
                interval.min(max as f64) as i32
            } else {
                interval as i32
            }
        } else {
            policy.retry_interval_secs
        };

        Utc::now() + chrono::Duration::seconds(interval_secs as i64)
    }

    /// 创建重试任务
    pub fn create_retry_task(
        &self,
        execution_id: Uuid,
        rule_code: String,
        policy: &RetryPolicy,
    ) -> RetryTask {
        let now = Utc::now();
        RetryTask {
            id: Uuid::new_v4(),
            execution_id,
            rule_code: rule_code.clone(),
            retry_count: 0,
            status: RetryTaskStatus::Pending,
            error_message: None,
            next_retry_at: Some(self.calculate_next_retry(0, policy)),
            created_at: now,
            updated_at: now,
        }
    }

    /// 增加重试计数
    pub async fn increment_retry(
        &self,
        task_id: Uuid,
        error_message: String,
        policy: &RetryPolicy,
    ) -> bool {
        let mut tasks = self.pending_tasks.write().await;
        if let Some(task) = tasks.get_mut(&task_id) {
            task.retry_count += 1;
            task.error_message = Some(error_message);
            task.next_retry_at = Some(self.calculate_next_retry(task.retry_count, policy));
            task.updated_at = Utc::now();

            // 如果超过最大重试次数，标记为失败
            if task.retry_count >= policy.max_retries {
                task.status = RetryTaskStatus::Failed;
            }

            return true;
        }
        false
    }

    /// 发送告警
    pub fn send_alert(&self, alert: Alert) {
        if let Some(ref callback) = self.alert_callback {
            callback(alert);
        }
    }

    /// 创建告警
    pub fn create_alert(
        &self,
        level: AlertLevel,
        title: String,
        message: String,
        rule_code: Option<String>,
        execution_id: Option<Uuid>,
    ) -> Alert {
        let alert = Alert {
            id: Uuid::new_v4(),
            level,
            title,
            message,
            rule_code,
            execution_id,
            acknowledged: false,
            created_at: Utc::now(),
        };

        // 发送告警
        self.send_alert(alert.clone());

        alert
    }

    /// 获取历史记录
    pub async fn get_history(&self, limit: usize) -> Vec<RetryTask> {
        let history = self.history.read().await;
        history.iter().rev().take(limit).cloned().collect()
    }
}

impl Default for RetryManager {
    fn default() -> Self {
        Self::new()
    }
}

// ==================== Circuit Breaker ====================

/// 熔断器状态
#[derive(Debug, Clone, PartialEq)]
pub enum CircuitBreakerState {
    Closed,   // 正常，流量通过
    Open,     // 熔断，流量被拒绝
    HalfOpen, // 半开，部分流量通过
}

/// 熔断器
#[derive(Debug)]
pub struct CircuitBreaker {
    /// 当前状态
    state: Arc<RwLock<CircuitBreakerState>>,
    /// 失败计数
    failure_count: Arc<RwLock<u32>>,
    /// 成功计数
    success_count: Arc<RwLock<u32>>,
    /// 熔断阈值
    failure_threshold: u32,
    /// 半开恢复阈值
    half_open_recovery_threshold: u32,
    /// 熔断持续时间(秒)
    open_duration_secs: u64,
    /// 上次状态变更时间
    last_state_change: Arc<RwLock<Option<DateTime<Utc>>>>,
}

impl CircuitBreaker {
    /// 创建新的熔断器
    pub fn new(
        failure_threshold: u32,
        half_open_recovery_threshold: u32,
        open_duration_secs: u64,
    ) -> Self {
        Self {
            state: Arc::new(RwLock::new(CircuitBreakerState::Closed)),
            failure_count: Arc::new(RwLock::new(0)),
            success_count: Arc::new(RwLock::new(0)),
            failure_threshold,
            half_open_recovery_threshold,
            open_duration_secs,
            last_state_change: Arc::new(RwLock::new(None)),
        }
    }

    /// 记录成功
    pub async fn record_success(&self) {
        let mut success_count = self.success_count.write().await;
        *success_count += 1;

        // 如果是半开状态，达到恢复阈值后关闭
        let state = self.state.read().await;
        if *state == CircuitBreakerState::HalfOpen {
            if *success_count >= self.half_open_recovery_threshold {
                drop(state);
                self.set_state(CircuitBreakerState::Closed).await;
            }
        }
    }

    /// 记录失败
    pub async fn record_failure(&self) {
        let mut failure_count = self.failure_count.write().await;
        *failure_count += 1;

        // 检查是否需要打开熔断器
        let state = self.state.read().await;
        if *state == CircuitBreakerState::Closed && *failure_count >= self.failure_threshold {
            drop(state);
            self.set_state(CircuitBreakerState::Open).await;
        }
    }

    /// 检查是否允许请求
    pub async fn is_allowed(&self) -> bool {
        let state = self.state.read().await;
        let last_change = self.last_state_change.read().await;

        match *state {
            CircuitBreakerState::Closed => true,
            CircuitBreakerState::Open => {
                // 检查熔断是否超时
                if let Some(last) = *last_change {
                    let elapsed = Utc::now() - last;
                    if elapsed.num_seconds() >= self.open_duration_secs as i64 {
                        // 超时，切换到半开
                        drop(state);
                        drop(last_change);
                        self.set_state(CircuitBreakerState::HalfOpen).await;
                        return true;
                    }
                }
                false
            }
            CircuitBreakerState::HalfOpen => true,
        }
    }

    /// 获取当前状态
    pub async fn get_state(&self) -> CircuitBreakerState {
        self.state.read().await.clone()
    }

    /// 设置状态
    async fn set_state(&self, new_state: CircuitBreakerState) {
        let mut state = self.state.write().await;
        *state = new_state.clone();

        let mut last_change = self.last_state_change.write().await;
        *last_change = Some(Utc::now());

        // 重置计数
        if new_state == CircuitBreakerState::Closed {
            let mut failures = self.failure_count.write().await;
            *failures = 0;
            let mut successes = self.success_count.write().await;
            *successes = 0;
        } else if new_state == CircuitBreakerState::HalfOpen {
            let mut successes = self.success_count.write().await;
            *successes = 0;
        }
    }

    /// 重置熔断器
    pub async fn reset(&self) {
        self.set_state(CircuitBreakerState::Closed).await;
    }
}

impl Default for CircuitBreaker {
    fn default() -> Self {
        Self::new(5, 2, 60)
    }
}

// ==================== Error Types ====================

/// 转换执行错误
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversionError {
    /// 错误代码
    pub code: String,
    /// 错误消息
    pub message: String,
    /// 错误详情
    pub details: Option<serde_json::Value>,
    /// 是否可重试
    pub retryable: bool,
}

impl ConversionError {
    pub fn new(code: &str, message: &str, retryable: bool) -> Self {
        Self {
            code: code.to_string(),
            message: message.to_string(),
            details: None,
            retryable,
        }
    }

    pub fn with_details(mut self, details: serde_json::Value) -> Self {
        self.details = Some(details);
        self
    }

    /// 目标系统错误（通常不可重试）
    pub fn target_system_error(message: &str) -> Self {
        Self::new("TARGET_SYSTEM_ERROR", message, false)
    }

    /// 源系统错误（可能可重试）
    pub fn source_system_error(message: &str) -> Self {
        Self::new("SOURCE_SYSTEM_ERROR", message, true)
    }

    /// 网络错误（可重试）
    pub fn network_error(message: &str) -> Self {
        Self::new("NETWORK_ERROR", message, true)
    }

    /// 转换规则错误（通常不可重试）
    pub fn rule_error(message: &str) -> Self {
        Self::new("RULE_ERROR", message, false)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_retry_manager_add_and_get() {
        let manager = RetryManager::new();
        let policy = RetryPolicy::default();

        let task = manager.create_retry_task(Uuid::new_v4(), "test_rule".to_string(), &policy);

        manager.add_task(task.clone()).await;
        let pending = manager.get_pending_tasks().await;
        assert_eq!(pending.len(), 1);
    }

    #[tokio::test]
    async fn test_retry_manager_increment_retry() {
        let manager = RetryManager::new();
        let policy = RetryPolicy::default();

        let task = manager.create_retry_task(Uuid::new_v4(), "test_rule".to_string(), &policy);

        manager.add_task(task.clone()).await;
        manager
            .increment_retry(task.id, "Test error".to_string(), &policy)
            .await;

        let pending = manager.get_pending_tasks().await;
        assert_eq!(pending[0].retry_count, 1);
    }

    #[tokio::test]
    async fn test_calculate_next_retry() {
        let manager = RetryManager::new();

        // 指数退避
        let policy = RetryPolicy {
            max_retries: 3,
            retry_interval_secs: 10,
            exponential_backoff: true,
            max_backoff_secs: Some(100),
        };

        let next = manager.calculate_next_retry(0, &policy);
        assert!(next > Utc::now());

        let next1 = manager.calculate_next_retry(1, &policy);
        let next2 = manager.calculate_next_retry(2, &policy);
        // 每次重试间隔应该翻倍
        let diff1 = next1.signed_duration_since(next);
        let diff2 = next2.signed_duration_since(next1);
        assert!(diff2 > diff1);
    }

    #[tokio::test]
    async fn test_circuit_breaker_normal() {
        let cb = CircuitBreaker::new(3, 2, 60);

        assert!(cb.is_allowed().await);
        assert_eq!(cb.get_state().await, CircuitBreakerState::Closed);
    }

    #[tokio::test]
    async fn test_circuit_breaker_open() {
        let cb = CircuitBreaker::new(2, 1, 60);

        // 记录失败直到达到阈值
        cb.record_failure().await;
        cb.record_failure().await;

        assert_eq!(cb.get_state().await, CircuitBreakerState::Open);
        assert!(!cb.is_allowed().await);
    }

    #[tokio::test]
    async fn test_conversion_error() {
        let error = ConversionError::network_error("Connection timeout");
        assert!(error.retryable);
        assert_eq!(error.code, "NETWORK_ERROR");

        let error2 = ConversionError::rule_error("Invalid mapping");
        assert!(!error2.retryable);
        assert_eq!(error2.code, "RULE_ERROR");
    }
}
